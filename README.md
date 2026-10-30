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

Kontener Awilix tworzony jest raz, w `packages/app`. Pakiety eksportują funkcje rejestrujące swoje serwisy, a serwisy dostają zależności przez konstruktor. Zależności związane z jednym żądaniem, takie jak EntityManager MikroORM, rejestrowane są w scope tworzonym dla każdego żądania.

### Baza danych

Schemat bazy zmieniany jest wyłącznie migracjami MikroORM. Każde żądanie pracuje na własnym forku EntityManagera, a połączenia obsługuje pula MikroORM. Dane dostępowe pochodzą ze zmiennych środowiskowych.

## Uruchomienie

Wymagany jest Node.js 20 lub nowszy.

```bash
npm install
npm run dev         # http://localhost:3000
```

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
