# Zgodność wsteczna — GoldenLegs

Ten plik opisuje, które powierzchnie projektu są chronionym kontraktem i jak zmieniać je bezpiecznie. Skille recenzujące sprawdzają zmiany względem tego pliku, a skille implementujące ostrzegają, gdy zmiana go łamie.

Projekt jest na wczesnym etapie (wersja `0.1.0`, brak zewnętrznych konsumentów API), więc kontrakty dotyczą przede wszystkim spójności między pakietami monorepo i instancjami, które już działają. Gdy pojawi się zewnętrzny konsument (aplikacja mobilna, integracja), zaostrz tę politykę i dopisz okresy deprecjacji.

## Powierzchnie chronione

### 1. Koperta odpowiedzi HTTP

Każdy route handler w `packages/app/app/api/` zwraca przez `apiHandler`:

- sukces: `{ ok: true, data }` ze statusem 200,
- błąd: `{ ok: false, error: { code, message, fieldErrors? } }`.

Kody i statusy błędów (`packages/core/src/http/errors.ts`, `apiHandler.ts`):

| Klasa | `code` | Status |
|---|---|---|
| `ValidationError` | `VALIDATION_ERROR` | 400 |
| `UnauthorizedError` | `UNAUTHORIZED` | 401 |
| `ForbiddenError` | `FORBIDDEN` | 403 |
| `NotFoundError` | `NOT_FOUND` | 404 |
| `ConflictError` | `CONFLICT` | 409 |
| `ServiceUnavailableError` | `SERVICE_UNAVAILABLE` | 503 |
| (błąd nieoczekiwany) | `INTERNAL_ERROR` | 500 |

**Zmiana łamiąca:** zmiana kształtu koperty, zmiana nazwy pola, zmiana lub usunięcie `code`, zmiana statusu przypisanego do kodu, ujawnienie stack trace'a. Kopertę będzie parsować też `apiCall` w `packages/ui/src/backend/api`, który powstanie z pierwszym ekranem panelu (osobny typ, bo `ui` nie importuje `core`).
**Wymagana ścieżka:** zmiana w `apiHandler` i `apiCall` w jednym PR, testy obu stron, opis w PR. Nowy kod błędu to zmiana addytywna.

### 2. Endpointy API

| Endpoint | Odpowiedź | Konsumenci |
|---|---|---|
| `GET /api/health` | `{ ok: true, data: { status: "ok" } }` albo 503 `SERVICE_UNAVAILABLE` | testy integracyjne, monitoring i healthchecki wdrożenia |

**Zmiana łamiąca:** usunięcie lub zmiana ścieżki, metody, kształtu `data` albo semantyki statusu.
**Wymagana ścieżka:** nowa ścieżka obok starej, aktualizacja konsumentów (testy integracyjne, konfiguracja wdrożenia), usunięcie starej w osobnym PR. Każdy nowy endpoint dopisz do tej tabeli.

### 3. Publiczne API pakietów

- `@golden-legs/core`: wyłącznie eksporty z `packages/core/src/index.ts` (`APP_NAME`, `Cradle`, `getContainer`, `withScope`, `AppContainer`, `logger`, `apiHandler`, `ApiError`, `ApiResult`, klasy błędów, `FieldErrors`, `HealthService`, `HealthStatus`) oraz klucze interfejsu `Cradle` (`packages/core/src/container/cradle.ts`).
- `@golden-legs/db`: wyłącznie eksporty z `packages/db/src/index.ts` (`EntityManager`, `MikroORM`, `getOrm`, `pingDatabase`, `entities`).
- `@golden-legs/ui`: ścieżki z `exports` w `packages/ui/package.json`: `./globals.css`, `./components/*`, `./lib/*`, `./hooks/*`.

**Zmiana łamiąca:** usunięcie lub zmiana nazwy eksportu albo klucza `Cradle`, zmiana sygnatury, zmiana mapowania `exports`.
**Wymagana ścieżka:** wszystkie pakiety są w jednym monorepo, więc wystarczy zaktualizować każdego konsumenta w tym samym PR. `typecheck` i `build` muszą przejść. Importowanie ścieżek wewnętrznych z pominięciem `src/index.ts` jest niedozwolone i nie stanowi kontraktu.

### 4. Schemat bazy danych

Schemat zmieniamy wyłącznie migracjami MikroORM w `packages/db/src/migrations/` (razem ze snapshotem).

**Zmiana łamiąca:** edycja migracji już zastosowanej, usunięcie lub zmiana nazwy tabeli albo kolumny, zawężenie typu, dodanie `NOT NULL` bez wartości domyślnej przy istniejących danych.
**Wymagana ścieżka:** nowa migracja (nigdy edycja starej), dla usunięć i zmian nazw podejście expand → migrate → contract w osobnych PR-ach, plan wycofania w opisie PR i etykieta `risk-high`.

### 5. Zmienne środowiskowe

`DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD` (schemat w `packages/db/src/env.ts`, wzór w `.env.example`). Czyta je też `compose.yaml`.

**Zmiana łamiąca:** zmiana nazwy lub usunięcie zmiennej, nowa zmienna wymagana bez wartości domyślnej, zmiana znaczenia lub formatu.
**Wymagana ścieżka:** aktualizacja schematu, `.env.example`, `compose.yaml` i CI w tym samym PR, nota w opisie PR dla osób z lokalnym plikiem env. Nowa zmienna opcjonalna to zmiana addytywna.

### 6. Komendy npm

Skrypty z głównego `package.json` udokumentowane w `AGENTS.md` (`dev`, `build`, `start`, `lint`, `typecheck`, `test`, `test:coverage`, `test:integration`, `app:ephemeral`, `db:up`, `db:down`, `db:migrate`, `db:migration:create`). Korzystają z nich CI (`.github/workflows/ci.yml`), bramka walidacji w `.ai/agentic.config.json` i skille agentów.

**Zmiana łamiąca:** zmiana nazwy lub usunięcie skryptu, zmiana jego znaczenia (np. `test:integration` bez builda).
**Wymagana ścieżka:** aktualizacja `AGENTS.md`, CI, `.ai/agentic.config.json` i `SDLC.md` w tym samym PR.

## Poza kontraktem

- Struktura wewnętrzna pakietów, która nie jest eksportowana przez `src/index.ts` lub `exports`.
- Wygląd stron (zmiany wizualne podlegają QA, a nie tej polityce).
- Pliki w `.ai/` poza `agentic.config.json`.
