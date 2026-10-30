# GoldenLegs — Engineering Standards & Package Structure

Date: 2026-10-30
Status: active (living standard; it is not moved to `implemented/`)
Source: the DevMentor standard (previous project), archived at
`.ai/specs/archive/2026-09-01-devmentor-engineering-standards.md`, adapted to GoldenLegs.
Product-specific parts (mentors, bookings, payments, persona route groups,
migration steps for DevMentor files) were dropped; rules and patterns were kept.

Decisions confirmed with the project owner on 2026-10-30:

- Dependency direction is `app → core → db`; `ui` is imported by `app` only.
- Services, the DI container and the `Cradle` live in `core`.
- Domain code uses **concept sub-folders inside the four packages**, not a module runtime.
- `awilix` stays as the DI container.

Adaptations to this repository:

- Next.js 16 with Cache Components removes `export const dynamic`. A route or page
  that touches the database calls `await connection()` from `next/server` first.
- The Next.js app lives in `packages/app/app/` (no `src/`).
- Packages are scoped `@golden-legs/<name>`.

---

## 1. Rules

### Naming

| Element | Convention | Example |
|---|---|---|
| Package | `packages/<name>`, scoped `@golden-legs/<name>` | `@golden-legs/core` |
| Domain concept folder | plural, single lowercase word, matches the event namespace | `orders`, `products` |
| Entity | PascalCase singular via `defineEntity`, file `<name>.entity.ts` in its concept folder | `Order` → `db/src/entities/orders/order.entity.ts` |
| DB table | snake_case, plural | `orders` |
| DB column | snake_case, mapped from a camelCase property | `created_at` ← `createdAt` |
| Service | PascalCase class + `Service`, file `<name>.service.ts` in its concept folder | `OrderService` → `core/src/services/orders/order.service.ts` |
| Port (external integration interface) | PascalCase + `Gateway`/`Port`, file `<name>.port.ts` | `PaymentGateway` → `core/src/services/payments/payment-gateway.port.ts` |
| Adapter (port implementation) | PascalCase + adapter name, under `adapters/` | `MockPaymentGateway` → `core/src/services/payments/adapters/mock-payment-gateway.ts` |
| DI cradle key | camelCase, one entry per dependency | `orderService: OrderService` |
| Zod schema | camelCase + `Schema`, file `<name>.schema.ts`, shared by client and server | `orderCreateSchema` → `core/src/validators/orders/order-create.schema.ts` |
| Event ID | `concept.entity.action`, past tense | `orders.order.created` |
| API route | one `route.ts` per resource under `app/api/<concept>/` | `api/orders/route.ts`, `api/orders/[id]/cancel/route.ts` |
| Page | `<segment>/page.tsx`, default export `<Segment>Page` | `orders/page.tsx` → `OrdersPage` |
| UI component | PascalCase; shadcn primitives in `components/ui/`, concept components in `components/<concept>/`, generic panel blocks in `backend/<category>/` | `OrderCard`, `CrudForm` |
| Domain error | PascalCase + `Error`, extends `AppError`, in `core/src/http/errors.ts` | `NotFoundError` |
| Route handler wrapper | `apiHandler` (and later `makeCrudRoute`) from `core/src/http` | `export const GET = apiHandler(...)` |
| Client fetch helper | `apiCall`/`apiCallOrThrow` from `ui/src/backend/api`, never raw `fetch` | `await apiCall<Order[]>("/api/orders")` |

### Reusable API & UI layers

Every route and page reuses two shared layers instead of re-implementing
fetch / validation / auth / error handling. Build a new shared piece only when a
genuinely new pattern appears; never re-implement an existing one inline.

**Server — `packages/core/src/http/`:**

- `errors.ts` — typed hierarchy: `AppError` base; `NotFoundError`, `ForbiddenError`,
  `UnauthorizedError`, `ValidationError`, `ConflictError`, `ServiceUnavailableError`.
  Services throw these; a service never builds an HTTP response.
- `apiHandler.ts` — wraps a route function, maps `AppError`s to status code and the
  JSON envelope `{ ok: true, data }` / `{ ok: false, error: { code, message, fieldErrors? } }`,
  logs unexpected failures with the shared logger and never leaks a stack trace.
  Every route handler is wrapped; no route writes its own `try/catch`.
- `makeCrudRoute.ts` — added with the first plain CRUD resource: schemas + service
  methods in, `{ GET, POST, PUT, DELETE }` out.
- `auth.ts` — added with authentication: `requireSession`, ownership assertions.
  Every non-public route calls one first.

**Client — `packages/ui/src/backend/`** (added together with shadcn/ui and the first
panel screen):

- `api/apiCall.ts` — the only place `fetch('/api/...')` is allowed; parses the envelope
  defensively and returns a typed `ApiResult<T>`.
- `forms/CrudForm.tsx` — schema-driven form, shows server `fieldErrors`,
  `Cmd/Ctrl+Enter` submits, `Escape` cancels.
- `tables/DataTable.tsx` — column-config list with loading/empty/error states,
  pagination and row actions.
- `feedback/{LoadingMessage,ErrorMessage,EmptyState}.tsx` — the only sanctioned
  loading/error/empty renderers.

The JSON envelope is a shape convention, not a shared type: `core/src/http` and
`ui/src/backend/api` each declare their own, because `ui` must not import `core`.
A shared package for it is an ask-first architecture change.

**Where a new reusable component goes:**

1. Raw shadcn primitive → `ui/src/components/ui/`, only via `npx shadcn@latest add <name>`.
2. Generic, concept-agnostic panel pattern → `ui/src/backend/<category>/`.
3. Component tied to one concept's domain shape → `ui/src/components/<concept>/`.
4. Component used by one page → next to that `page.tsx` until a second page needs it.

### Architecture

- Dependency direction `app → core → db`; `ui` importable by `app` only. Enforced by
  ESLint `no-restricted-imports`; do not loosen it for convenience.
- `db` is the only package that imports `@mikro-orm/*`; it re-exports the types other
  packages need (`EntityManager`, `MikroORM`).
- `core` never imports `next` or `react`.
- A concept folder is created only when its first file is added.
- External integrations go through a port interface in `core` with a mock adapter
  first and a real adapter later, without touching callers.
- Domain events (when first needed) use a typed in-process emitter in
  `core/src/events`, registered as a singleton in the `Cradle`. No queues or workers.
- Shared Zod schemas live in `core/src/validators/<concept>/` and are imported by both
  the route and the form.
- A route or page that touches the database calls `await connection()` first. The app
  must build and boot with no database reachable.
- Check-then-write on shared state runs in a DB transaction in the service layer,
  backed by a unique constraint where possible.

### Engineering principles

When two principles pull apart, prefer the smaller, more explicit change.

- **SRP** — entity file: schema only; service: one concept's rules; route: HTTP wiring
  only (validation → auth → service call → envelope).
- **DRY** — a schema, the fetch helper and the error envelope are each written once.
  About to copy a `try/catch` or a validation block? Extract it.
- **Separation of concerns** — persistence in `db`, business rules in `core`,
  HTTP/rendering in `app`, presentation in `ui`. A page never issues a raw ORM query.
- **Dependency inversion** — services depend on ports, not vendor SDKs; awilix wires
  the adapter at startup.
- **Explicit over implicit** — `core/src/container/container.ts` registers every
  dependency by hand (no `loadModules`); a new service is a new line in
  `container.ts` and `cradle.ts`.
- **Convention over configuration, narrowly** — the `<concept>/` folder convention
  only works if every concept follows it.
- **YAGNI** — no folder before its first file, no plugin/module loader.
- **Composition over inheritance** — services compose other services and ports,
  no base-class template methods.
- **Fail closed** — an error inside an authorization or ownership check denies.
- **Idempotency** — state transitions that can be retried (webhooks, payment
  confirmation) must be safe to run twice.

### Security & validation minimums

- Passwords: `bcrypt`/`bcryptjs` with cost ≥ 12; documented upgrade path `argon2id`
  (memory ≥ 19 MiB, iterations ≥ 2, parallelism 1).
- JWT: at least `HS256`, secret ≥ 32 random bytes from the validated env schema, short
  expiry; no refresh flow unless specified.
- Cookies: `httpOnly`, `secure` in production, `sameSite=lax` (or `strict` for auth),
  scoped `path`. Never store tokens in `localStorage`.
- CSRF: `sameSite` cookies plus a required custom header on state-changing requests
  (`apiCall` sets it).
- Rate limiting on login, registration and password reset.
- Ownership checks on every mutation; a missing one is a blocker like a missing auth check.
- No mass assignment: write endpoints persist the parsed Zod output, never the raw body.
- No SQL built from user input; use MikroORM APIs or parameters.
- Server recomputes anything that affects money; client-supplied prices are never trusted.
- Secrets only via env (validated by a Zod env schema once it exists); the logger
  redacts passwords, tokens, cookies and authorization headers.
- Generic auth error messages ("invalid credentials").
- UUID primary keys.
- `npm audit` is part of the validation gate; don't add a dependency for something
  20 lines of local code covers.

### Code quality

- No `any`; narrow unknown values at runtime.
- Self-documenting code; comments only for a non-obvious why.
- Extract copy-pasted blocks with branching logic; three similar lines are fine.
- No feature before it is needed.
- One thing per function at one level of abstraction; early returns over nesting.
- No empty `catch`: handle, log with context, or rethrow.
- No magic numbers or strings; name the constant and explain non-obvious values.
- Booleans read positively; no bare `true`/`false` arguments at call sites.
- No dead code, commented-out code or debug `console.log`.
- A diff traces entirely to its stated purpose.

### Review checklist

Structure & conventions:

- Concept folders follow the naming table; entity and service pair up.
- No import breaks `app → core → db` or reaches into another concept's internals.
- Routes use `apiHandler`/`makeCrudRoute`, forms `CrudForm`, lists `DataTable`; a
  bespoke version needs a stated reason.
- `npm run lint`, `npm run typecheck`, `npm run build` and relevant tests pass.

Security (blockers unless marked):

- [ ] Auth enforced server-side on every non-public route.
- [ ] Authorization checks the specific record (no IDOR).
- [ ] Check-then-act on shared resources protected by a transaction or unique constraint.
- [ ] No secret, token or password in logs, errors or client payloads.
- [ ] No unparameterized untrusted input in queries, shell commands or file paths.
- [ ] Write endpoints persist parsed Zod output only.
- [ ] Cookie flags preserved when auth-cookie code changes. (major)
- [ ] Security decisions fail closed.
- [ ] Security bug fixes ship a regression test. (major)
- [ ] Brute-force control on login/registration/password reset. (major)

Correctness & tests:

- Race-sensitive flows have an integration test for the concurrent case.
- Server-side revalidation of anything client-supplied that affects money or ownership.
- A behavior change ships a test that fails on the old code; a bug fix ships a
  regression test.

---

## 2. Adding a new domain concept

1. `packages/db/src/entities/<concept>/<name>.entity.ts`; register it in `entities/index.ts`.
2. `packages/core/src/services/<concept>/<name>.service.ts`; register it in
   `core/src/container/container.ts` (`asClass(...).scoped()` when it uses `em`) and
   add its key to `core/src/container/cradle.ts`.
3. Input validation in `packages/core/src/validators/<concept>/<name>-<action>.schema.ts`.
4. Domain events, if any, in `core/src/events` (`concept.entity.action`), emitted after
   a successful mutation.
5. HTTP in `packages/app/app/api/<concept>/route.ts`: `await connection()`, then
   `apiHandler` (or `makeCrudRoute` for plain CRUD), auth/ownership checks, then
   service calls through `withScope`. Never a bare `try/catch` with a manual response.
6. Pages fetch through `apiCall`, use `CrudForm`, `DataTable` and the `feedback/`
   components; check `ui/src/backend/` and `ui/src/components/<concept>/` before
   writing a new component.
7. Never create `modules/<concept>/`, per-concept setup files or auto-discovery.

---

## 3. Target package structure

```
packages/
  app/                     Next.js (app/ router directory, no src/)
    app/api/<concept>/route.ts
    app/api/health/route.ts
  core/src/
    container/{container.ts,cradle.ts}
    logger.ts
    http/{errors.ts,apiHandler.ts}          (+ makeCrudRoute.ts, auth.ts when needed)
    services/<concept>/<name>.service.ts
    validators/<concept>/<name>.schema.ts   (when needed)
    events/                                  (when needed)
  db/src/
    mikro-orm.config.ts
    orm.ts
    entities/<concept>/<name>.entity.ts
    migrations/
  ui/src/
    components/ui/                           (shadcn primitives only)
    components/<concept>/
    backend/{api,forms,tables,feedback}/
```

---

## 4. Rollout

Done on 2026-10-30:

1. Dependency direction switched to `app → core → db`; container and `Cradle` moved
   to `core/src/container/`; boundaries enforced by ESLint for all packages.
2. `core/src/http/` with `errors.ts` and `apiHandler.ts`; shared `logger.ts`.
3. `/api/health` rewritten as the reference example (`HealthService` + `apiHandler`
   + `withScope`).
4. shadcn/ui set up in `packages/ui` (style `base-nova`, Base UI, `neutral`, lucide);
   no primitives added yet.

Next, each when its first real use appears:

5. Zod env schema (`core/src/config/env.ts`) replacing ad-hoc `requireEnv`.
6. `ui/src/backend/` (apiCall, CrudForm, DataTable, feedback) with the first panel screen.
7. `makeCrudRoute`, `auth.ts`, `validators/`, `events/` with their first concept.
