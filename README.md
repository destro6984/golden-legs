# GoldenLegs

Aplikacja webowa zbudowana na Next.js, React i TypeScript, z bazą PostgreSQL.

## Stos technologiczny

| Obszar | Technologia |
|---|---|
| Framework | Next.js (App Router), React, TypeScript |
| Baza danych | PostgreSQL |
| ORM | MikroORM: encje, migracje, pula połączeń |
| Dependency Injection | Awilix |
| Strony frontendowe | Tailwind CSS |
| Strony backendowe (panel administracyjny) | shadcn/ui |
| Monorepo | npm workspaces |

## Architektura

Projekt jest monorepo. Kod podzielony jest na pakiety w katalogu `packages/`:

```
golden-legs/
├── packages/
│   ├── app/    @golden-legs/app   aplikacja Next.js: routing, strony, route handlers
│   ├── core/   @golden-legs/core  serwisy, kontener DI, warstwa HTTP, logger
│   ├── db/     @golden-legs/db    MikroORM: konfiguracja, encje, migracje
│   └── ui/     @golden-legs/ui    komponenty interfejsu wielokrotnego użytku
├── .ai/                           specyfikacje, dzienniki zadań i lekcje dla pracy z AI
├── compose.yaml                   PostgreSQL do developmentu
├── eslint.config.mjs              ESLint i granice pakietów dla core, db, ui
├── tsconfig.base.json             wspólna konfiguracja TypeScriptu
└── package.json                   definicja workspace'ów i skrypty
```

### Zależności między pakietami

```
  app ──→ core ──→ db
   │
   └────→ ui
```

- **app** to warstwa HTTP i renderowania: strony i route handlers. Do bazy sięga wyłącznie przez serwisy z `core`.
- **core** zawiera logikę biznesową (serwisy), kontener Awilix, warstwę HTTP (`AppError`, `apiHandler`) i logger. Nie importuje `next` ani `react`.
- **db** zawiera konfigurację MikroORM, encje i migracje. Jako jedyny pakiet importuje `@mikro-orm/*` i nie zależy od żadnego innego pakietu.
- **ui** zawiera komponenty wielokrotnego użytku, w tym komponenty shadcn/ui dla panelu administracyjnego. Dane dostaje przez propsy i nie importuje innych pakietów.

Kierunek zależności pilnuje ESLint (`no-restricted-imports`). Pakiety udostępniają kod źródłowy TypeScript (`core` i `db` przez `src/index.ts`, `ui` przez ścieżki w stylu shadcn), a Next.js kompiluje go dzięki opcji `transpilePackages`.

### Interfejs (shadcn/ui)

shadcn/ui jest skonfigurowany w `packages/ui` (styl `base-nova` na Base UI, kolor `neutral`, ikony lucide). Motyw jest w `packages/ui/src/styles/globals.css` i importuje go `packages/app/app/globals.css`. Komponent dodajesz z katalogu głównego:

```bash
npx shadcn@latest add <komponent> -c packages/app   # trafia do packages/ui/src/components/ui/
```

```tsx
import { Button } from "@golden-legs/ui/components/ui/button";
```

Kod domenowy jest podzielony na koncepty: ten sam podkatalog (np. `orders/`) powtarza się w `db/src/entities/`, `core/src/services/` i `app/app/api/`. Pełny standard: [.ai/specs/2026-10-30-engineering-standards.md](.ai/specs/2026-10-30-engineering-standards.md).

### Dependency Injection i warstwa HTTP

Kontener Awilix jest w `packages/core/src/container/`. `container.ts` rejestruje ręcznie każdą zależność, a `cradle.ts` opisuje jej typ. Serwisy dostają zależności przez konstruktor. EntityManager MikroORM (`em`) i serwisy, które go używają, żyją w scope tworzonym dla każdego wywołania `withScope`.

Route handler to tylko opakowanie: `apiHandler` zamienia wynik na kopertę JSON, a błędy serwisów (`NotFoundError`, `ServiceUnavailableError`...) na właściwy status:

```ts
import { connection } from "next/server";
import { apiHandler, withScope } from "@golden-legs/core";

export const GET = apiHandler(async () => {
  await connection();
  return withScope(({ healthService }) => healthService.check());
});
```

`GET /api/health` zwraca `200 {"ok":true,"data":{"status":"ok"}}` albo `503 {"ok":false,"error":{"code":"SERVICE_UNAVAILABLE",...}}`, gdy baza jest niedostępna.

### Baza danych

Schemat bazy zmieniany jest wyłącznie migracjami MikroORM. Każde żądanie pracuje na własnym forku EntityManagera, a połączenia obsługuje pula MikroORM. Dane dostępowe pochodzą ze zmiennych środowiskowych z pliku `.env` w katalogu głównym, który `packages/app/next.config.ts` wczytuje przez `process.loadEnvFile()`.

## Uruchomienie

Wymagany jest Node.js 22.17 lub nowszy oraz Docker z Docker Compose.

```bash
npm install
cp .env.example .env    # uzupełnij DB_PASSWORD
npm run db:up           # PostgreSQL w kontenerze, port 5433 na hoście
npm run db:migrate      # stosuje migracje
npm run dev             # http://localhost:3000
```

Zmienne `DB_*` z pliku `.env` w katalogu głównym czyta zarówno `docker compose`, jak i CLI MikroORM. Kontener PostgreSQL inicjuje bazę tylko przy pierwszym uruchomieniu, więc zmiana `DB_USER` lub `DB_PASSWORD` później wymaga usunięcia wolumenu: `docker compose down -v` (kasuje dane).

### Baza danych i migracje

```bash
npm run db:up                 # uruchamia kontener i czeka, aż baza będzie gotowa
npm run db:down               # zatrzymuje kontener, dane zostają w wolumenie
npm run db:migration:create   # generuje migrację z różnicy między encjami a schematem
npm run db:migrate            # stosuje migracje
```

Encje i migracje są w `packages/db/src/`. Pozostałe komendy CLI MikroORM wywołasz przez `npm run orm -w @golden-legs/db -- <komenda>`.

Pozostałe komendy:

```bash
npm run lint        # ESLint
npm run typecheck   # TypeScript we wszystkich pakietach
npm run build       # build produkcyjny
npm run start       # uruchomienie zbudowanej aplikacji
```

Zależność dodawaj do pakietu, który jej używa:

```bash
npm install <pakiet> -w @golden-legs/db
```

## Praca z AI

Zasady dla agentów AI i ludzi pracujących z AI są w [AGENTS.md](AGENTS.md).
