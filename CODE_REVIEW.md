# Code review — GoldenLegs

Zasady przeglądu kodu w tym repozytorium. Skille `om-code-review` i `om-auto-review-pr` stosują ten plik automatycznie, a ludzie czytają go tutaj.

Ten plik nie powtarza standardu. Pełna lista kontrolna (struktura, bezpieczeństwo, poprawność) jest w sekcji „Review checklist” w [`.ai/specs/2026-10-30-engineering-standards.md`](.ai/specs/2026-10-30-engineering-standards.md), a reguły architektury w [`AGENTS.md`](AGENTS.md). Recenzent stosuje oba dokumenty oraz kontrole specyficzne dla repozytorium z sekcji poniżej.

## Priorytety

1. **Poprawność**: zmiana robi to, co deklaruje, a test pada na starym kodzie.
2. **Bezpieczeństwo**: auth po stronie serwera, sprawdzanie właściciela rekordu, brak sekretów w logach i odpowiedziach, zapis wyłącznie sparsowanego wyniku Zod.
3. **Kontrakty**: zmiany w powierzchniach z [`BACKWARD_COMPATIBILITY.md`](BACKWARD_COMPATIBILITY.md) mają wymaganą ścieżkę migracji.
4. **Architektura i konwencje**: kierunek zależności, warstwy, nazewnictwo.
5. **Jakość**: czytelność, brak martwego kodu, diff odpowiada wyłącznie celowi zmiany.

## Kontrole specyficzne dla repozytorium

### Granice pakietów

- Importy idą w kierunku `app → core → db`, a `ui` importuje tylko `app`. Reguły `no-restricted-imports` w `eslint.config.mjs` i `packages/app/eslint.config.mjs` nie zostały poluzowane.
- `core` nie importuje `next` ani `react`. Tylko `db` importuje `@mikro-orm/*`, a `app` nie importuje `@golden-legs/db`.
- Inne pakiety importujemy po nazwie (`@golden-legs/core`), nigdy ścieżką względną. `core` i `db` eksportują wyłącznie przez `src/index.ts`.
- `@golden-legs/core` i `@golden-legs/db` nie trafiają do komponentów `"use client"`.
- Nowa biblioteka do zadania, które ma już swoją bibliotekę (ORM, DI, CSS, komponenty), jest blokerem bez zgody człowieka.

### Warstwa HTTP

- Każdy route handler jest opakowany w `apiHandler` i nie ma własnego `try/catch` ani ręcznego `Response.json`.
- Handler lub strona sięgająca do bazy najpierw wywołuje `await connection()` z `next/server`. Nie ma `export const dynamic`.
- Serwisy wywołujemy przez `withScope(({ fooService }) => ...)`. `container.resolve` w logice biznesowej i importowanie gotowych instancji serwisów są blokerami.
- Serwis zgłasza błędy klasami z `core/src/http/errors.ts` i nigdy nie buduje odpowiedzi HTTP.
- Wzorzec referencyjny: `packages/app/app/api/health/route.ts` z `HealthService`.

### DI (Awilix)

- Nowy serwis dodaje dokładnie jedną linię w `core/src/container/container.ts` i jedną w `cradle.ts`, bez `loadModules`.
- Serwis używający `em` jest rejestrowany jako `.scoped()`.

### Baza danych (MikroORM)

- Encje definiujemy przez `defineEntity()`, bez dekoratorów, i dopisujemy je do `entities` w `packages/db/src/entities/index.ts`.
- Zmiana encji przychodzi z wygenerowaną migracją i snapshotem w tym samym PR. Edycja migracji już zastosowanej jest blokerem.
- Nic w `packages/db` nie łączy się z bazą ani nie czyta `DB_*` przy imporcie (build działa bez bazy). Nowy runtime’owy pakiet `@mikro-orm/*` trafia do `serverExternalPackages`.
- `MikroORM.init()` nie występuje poza `getOrm()`, a globalny EntityManager nie jest używany.

### Zmienne środowiskowe

- `process.env` czytamy tylko w `src/env.ts` danego pakietu. Nowa zmienna jest w schemacie Zod i w `.env.example` (bez wartości).
- Błędy walidacji env podają nazwy zmiennych, nigdy wartości.

### Interfejs

- Prymitywy shadcn w `packages/ui/src/components/ui/` pochodzą z `npx shadcn@latest add`, a nie z ręcznego pisania.
- Kolory i promienie zmieniamy w motywie (`packages/ui/src/styles/globals.css`), nie w komponentach.
- Komponenty `packages/ui` dostają dane przez propsy i same niczego nie pobierają. `fetch('/api/...')` występuje tylko w `apiCall`.
- Nowy komponent jest w miejscu wskazanym przez regułę „Gdzie trafia nowy komponent” w `AGENTS.md`.

### Testy

- Pokrycie testami jednostkowymi wynosi 100% (linie, instrukcje, gałęzie, funkcje). Obniżenie progu w `vitest.config.mts` lub dopisanie pliku do `coverage.exclude` jest blokerem.
- Test jednostkowy `<nazwa>.test.ts(x)` leży obok testowanego pliku, a zależności zewnętrzne są zamockowane.
- Nowy endpoint lub ekran ma test integracyjny w `packages/app/tests/integration/*.int.test.ts`, który przechodzi przez prawdziwą bazę.

### Proces AI

- Każdy commit zawiera wpis w dzienniku `.ai/runs/YYYY-MM-DD-slug.md` (2–5 linii). Wcześniejsze wpisy i nazwa pliku się nie zmieniają.
- Zmiana zakresu funkcji, która ma specyfikację w `.ai/specs/`, najpierw aktualizuje specyfikację.

## Stopnie ważności

- **blocker**: złamana reguła bezpieczeństwa z checklisty standardu, złamana granica pakietów, niezgodność z `BACKWARD_COMPATIBILITY.md` bez ścieżki migracji, pokrycie poniżej 100%, czerwona bramka walidacji.
- **major**: błąd poprawności bez testu regresyjnego, brak testu integracyjnego dla nowego endpointu lub ekranu, pozycje oznaczone „(major)” w checkliście standardu.
- **minor**: nazewnictwo, czytelność, drobne odstępstwa od konwencji bez wpływu na działanie.
- **nit**: sprawy gustu. Nie blokują i trafiają do follow-upu.

Werdykt `changes-requested` wymaga co najmniej jednego blockera lub majora.

## Bramka walidacji

Zgodnie z `.ai/agentic.config.json`: `npm audit --audit-level=moderate`, `npm run lint`, `npm run typecheck`, `npm run test:coverage`, `npm run test:integration` (ta komenda buduje aplikację i wymaga Dockera).
