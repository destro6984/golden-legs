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
│   ├── app/    @golden-legs/app   aplikacja Next.js
│   ├── core/   @golden-legs/core  logika domenowa i narzędzia wielokrotnego użytku
│   ├── db/     @golden-legs/db    MikroORM: encje, repozytoria, migracje
│   └── ui/     @golden-legs/ui    komponenty interfejsu wielokrotnego użytku
├── .ai/                           specyfikacje, dzienniki zadań i lekcje dla pracy z AI
├── tsconfig.base.json             wspólna konfiguracja TypeScriptu
└── package.json                   definicja workspace'ów i skrypty
```

### Zależności między pakietami

```
        app
      ↙  ↓  ↘
    ui   db   │
      ↘  ↓  ↙
        core
```

- **app** to aplikacja Next.js: routing, strony, server actions i route handlers. Tu powstaje kontener Awilix (composition root), który łączy serwisy z pozostałych pakietów.
- **core** zawiera logikę domenową i narzędzia niezależne od frameworka. Nie zależy od żadnego innego pakietu.
- **db** zawiera konfigurację MikroORM, encje, repozytoria i migracje. Działa wyłącznie po stronie serwera.
- **ui** zawiera komponenty wielokrotnego użytku, w tym komponenty shadcn/ui dla panelu administracyjnego. Komponenty dostają dane przez propsy i nie odwołują się do bazy.

Pakiety udostępniają kod źródłowy TypeScript przez `src/index.ts`, a Next.js kompiluje go dzięki opcji `transpilePackages`.

### Dependency Injection

Kontener Awilix tworzony jest raz, w `packages/app/lib/container.ts`. Pakiety eksportują funkcje rejestrujące swoje serwisy (np. `registerDb()`), a serwisy dostają zależności przez parametry fabryki. Typ zawartości kontenera to interfejs `Cradle` z `@golden-legs/core`, który każdy pakiet rozszerza o swoje zależności.

Zależności związane z jednym żądaniem, takie jak EntityManager MikroORM (`em`), żyją w scope tworzonym dla każdego żądania:

```ts
import { getRequestScope } from "@/lib/container";

const em = (await getRequestScope()).resolve("em");
```

Endpoint `GET /api/health` sprawdza połączenie z bazą przez kontener. Zwraca `200 {"status":"ok"}` albo `503`, gdy baza jest niedostępna.

### Baza danych

Schemat bazy zmieniany jest wyłącznie migracjami MikroORM. Każde żądanie pracuje na własnym forku EntityManagera, a połączenia obsługuje pula MikroORM. Dane dostępowe pochodzą ze zmiennych środowiskowych z pliku `.env` w katalogu głównym, który Next.js wczytuje przez `@next/env` w `packages/app/next.config.ts`.

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
