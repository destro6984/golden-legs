# Instalator `npm run setup`

Issue: #1
Status: proposed

## 📝 TLDR

Osoba, która pierwszy raz uruchamia GoldenLegs lokalnie (człowiek albo agent AI), musi dziś ręcznie wykonać pięć kroków z sekcji „Uruchomienie” w `README.md`. Proponujemy jedną komendę `npm run setup`, która sprawdzi wymagania, zainstaluje zależności, utworzy `.env` z losowym hasłem do bazy, uruchomi PostgreSQL i zastosuje migracje. Instalator będzie idempotentny: przy ponownym uruchomieniu pominie kroki, które są już wykonane.

## 📝 Problem Statement

- Kroki z `README.md` („Uruchomienie”): `npm install`, `cp .env.example .env`, ręczne uzupełnienie `DB_PASSWORD`, `npm run db:up`, `npm run db:migrate`.
- Pominięcie hasła kończy się błędem `docker compose`, bo `compose.yaml` wymaga niepustej zmiennej (`${DB_PASSWORD:?set DB_PASSWORD in .env}`).
- Zmiana hasła po pierwszym starcie wolumenu psuje logowanie, bo obraz `postgres` ustawia je tylko raz (`.ai/lessons.md`). Ręczna konfiguracja łatwo w to wpada.
- Agenci AI uruchamiają środowisko bez TTY, więc każdy krok wymagający ręcznej edycji pliku ich blokuje.

## 📝 Proposed Solution

Skrypt w czystym Node (`scripts/setup.mjs`, wyłącznie moduły `node:*`) uruchamiany przez `"setup": "node scripts/setup.mjs"` w głównym `package.json`. Wykonuje kroki po kolei. Każdy krok najpierw sprawdza, czy jest już zrobiony, i wtedy go pomija, a na końcu skrypt wypisuje podsumowanie i następną komendę (`npm run dev`).

| # | Krok | Kiedy pomijany | Błąd |
|---|---|---|---|
| 1 | Sprawdzenie Node.js względem `engines.node` (`>=22.17.0`) | nigdy (tylko odczyt) | kod 1, komunikat z wymaganą i bieżącą wersją |
| 2 | Sprawdzenie `docker compose version` i działającego demona (`docker info`) | nigdy (tylko odczyt) | kod 1, komunikat, co zainstalować lub uruchomić |
| 3 | `npm install` | nigdy (npm sam jest idempotentny i przy aktualnych zależnościach kończy się szybko) | kod wyjścia npm |
| 4 | Utworzenie `.env` z `.env.example` z losowym `DB_PASSWORD` | `.env` istnieje (nigdy nie jest nadpisywany) | istniejący `.env` z pustym `DB_PASSWORD` → kod 1 i instrukcja, bez modyfikacji pliku; brak `.env` przy istniejącym wolumenie bazy → kod 1 przed zapisem (zob. niżej) |
| 5 | `npm run db:up` | nigdy (`docker compose up -d --wait` sam jest idempotentny) | kod wyjścia, wskazówka o porcie `DB_PORT` |
| 6 | `npm run db:migrate` | nigdy (MikroORM pomija zastosowane migracje) | kod wyjścia |

Kroki 1–2 kończą się przed jakąkolwiek zmianą na dysku. Krok 4 przed utworzeniem `.env` sprawdza, czy istnieje już wolumen `postgres-data` tego projektu compose (`docker volume ls -q` z filtrami po etykietach `com.docker.compose.project` i `com.docker.compose.volume`, a nazwa projektu pochodzi z `docker compose config --format json`). Jeśli tak, nowe losowe hasło na pewno nie pasowałoby do bazy (`.ai/lessons.md`), więc instalator kończy się kodem 1 z dwiema opcjami: przywróć poprzedni `.env` albo usuń dane przez `docker compose down -v`. Sam niczego nie usuwa. Hasło: `randomBytes(24).toString("base64url")` z `node:crypto`. Skrypt go nie wypisuje. Plik `.env` powstaje z treści `.env.example` (zachowane komentarze i pozostałe wartości), z podmienioną linią `DB_PASSWORD=`.

**Odrzucone alternatywy:**
- Skrypt w TypeScripcie przez `tsx`: `tsx` jest devDependency, a `npm run setup` musi działać przed `npm install`.
- TypeScript przez `node --experimental-strip-types`: na Node < 22.6 nieznana flaga przerywa start, zanim skrypt zdąży wypisać czytelny komunikat o wersji.
- Skrypt powłoki (`setup.sh`): trudny do testowania jednostkowego ze 100% pokryciem i nieprzenośny.
- Interaktywne pytanie o hasło: blokuje uruchomienia bez TTY (agenci, CI).

## 📝 Architecture

Instalator to narzędzie deweloperskie poza pakietami workspace. Nie importuje żadnego pakietu `@golden-legs/*` i nie zmienia kodu aplikacji.

```
scripts/
  setup.mjs              punkt wejścia: buduje prawdziwe zależności, woła runSetup() i ustawia process.exitCode
  setup.test.ts          test punktu wejścia (mock run-setup.mjs, sprawdzenie exitCode)
  setup/
    steps.mjs            kroki 1–6 jako funkcje z wstrzykiwanymi zależnościami (exec, fs, log)
    steps.test.ts        testy jednostkowe kroków z mockami
    run-setup.mjs        kolejność kroków, raport pominięć, kod wyjścia
    run-setup.test.ts    testy przepływu (pierwsze i ponowne uruchomienie, błędy)
```

Zależności zewnętrzne (`node:child_process`, `node:fs`, `node:crypto`) są wstrzykiwane, więc testy nie uruchamiają Dockera ani npm. Logika jest w `steps.mjs` i `run-setup.mjs`, a `setup.mjs` tylko je składa. Punkt wejścia ustawia `process.exitCode` zamiast wołać `process.exit()`, żeby test mógł go zaimportować i sprawdzić bez kończenia procesu. Nic nie trafia do `coverage.exclude`.

Zmiany konfiguracji narzędzi, żeby skrypt podlegał tym samym bramkom co reszta kodu:
- `vitest.config.mts`: `test.include` dostaje `scripts/**/*.test.ts`, a `coverage.include` dostaje `scripts/**/*.mjs`. Próg 100% obowiązuje bez wyjątków.
- `package.json`: `lint` zmienia się na `eslint packages scripts && ...`.
- ESLint: obecna konfiguracja (`typescript-eslint` recommended) obsługuje też `.mjs`. Dla `scripts/**` nie trzeba reguł granic pakietów.

## 📝 UI/UX

Brak interfejsu w aplikacji. Komunikaty w terminalu, po polsku, po jednej linii na krok: `✓ <krok>`, `↷ <krok> — pominięto (<powód>)` albo `✗ <krok> — <co zrobić>`. Bez kolorów zależnych od TTY.

## 📝 Edge Cases & Failure Scenarios

- **Zajęty port `DB_PORT`:** `db:up` kończy się błędem i skrypt wskazuje zmienną `DB_PORT` w `.env`.
- **Istniejący wolumen bez `.env`** (np. po ręcznym usunięciu `.env`): krok 4 wykrywa wolumen i kończy się przed zapisem pliku (zob. Proposed Solution). Skrypt podaje polecenie `docker compose down -v` (kasuje dane), ale go nie wykonuje.
- **Istniejący `.env` z hasłem niepasującym do wolumenu:** `db:migrate` nie zaloguje się do bazy. Skrypt wypisze tę samą wskazówkę.
- **Istniejący `.env` z pustym `DB_PASSWORD`:** błąd z instrukcją. Plik pozostaje nietknięty.
- **Brak `.env.example`:** błąd (uszkodzony klon).
- **Przerwanie w trakcie:** ponowne uruchomienie dokończy pracę, bo każdy krok sprawdza swój stan.
- **Sekrety:** skrypt nie wypisuje treści `.env` ani hasła, a komunikaty błędów podają tylko nazwy zmiennych.

## 📝 Risks & Impact Review

- **Kontrakty (`BACKWARD_COMPATIBILITY.md`, sekcja 6):** nowy skrypt npm to zmiana addytywna. W tym samym PR trzeba zaktualizować `AGENTS.md` (lista komend) i `README.md`.
- **Zmienne środowiskowe (sekcja 5):** bez zmian w nazwach i schemacie. Instalator tylko kopiuje `.env.example`.
- **Odstępstwo od stosu:** `.mjs` zamiast TypeScriptu, bo skrypt musi ruszyć przed `npm install`. Ani `.mjs`, ani testy `scripts/**/*.test.ts` nie są objęte `npm run typecheck` (działa tylko w workspace'ach). Rekompensatą są ESLint i 100% pokrycia testami. Dołączenie `scripts/` do typechecku to osobna, odroczona decyzja.
- **Wycofanie:** usunięcie `scripts/`, skryptu `setup` i dopisków w configach. Brak trwałych skutków poza utworzonym `.env` i kontenerem.

## 📋 Phasing

Jedna faza: instalator z testami i dokumentacją. Każdy krok planu zostawia działającą aplikację i zieloną bramkę.

## 📋 Implementation Plan

### Phase 1: instalator `npm run setup`

1. **Konfiguracja bramek dla `scripts/`.** Dopisz `scripts/**/*.test.ts` do `test.include` i `scripts/**/*.mjs` do `coverage.include` w `vitest.config.mts`, a `scripts` do komendy `lint` w `package.json`. Test: `npm run lint` i `npm run test:coverage` przechodzą.
2. **Kroki sprawdzające (1–2).** `scripts/setup/steps.mjs`: `checkNodeVersion(current, range)` i `checkDocker(exec)` z testami zgodnej i za starej wersji Node, braku Dockera i niedziałającego demona.
3. **Kroki zmieniające stan (3–6).** `installDependencies`, `ensureEnvFile` (tworzenie z losowym hasłem, pominięcie istniejącego, błąd przy pustym `DB_PASSWORD`, brak `.env.example`, błąd bez zapisu przy istniejącym wolumenie), `startDatabase`, `runMigrations`. Testy z mockami `fs` i `exec` sprawdzają decyzje o pominięciu i to, że hasło nie trafia do logu.
4. **Przepływ i punkt wejścia.** `scripts/setup/run-setup.mjs` (kolejność, zatrzymanie na pierwszym błędzie, podsumowanie, kod wyjścia) i `scripts/setup.mjs` z testem `scripts/setup.test.ts`. Skrypt `"setup": "node scripts/setup.mjs"` w `package.json`. Testy: pierwsze uruchomienie, ponowne uruchomienie (wszystko pominięte poza krokami 5–6), błąd w kroku 2 nie zmienia dysku.
5. **Dokumentacja.** `README.md` („Uruchomienie”): `npm run setup` jako zalecana droga, a obecne ręczne kroki jako alternatywa. `AGENTS.md` („Komendy”): linia `npm run setup`.
6. **Weryfikacja ręczna.** Na czystym klonie (bez `node_modules` i `.env`) `npm run setup` kończy się kodem 0, a `GET /api/health` po `npm run dev` zwraca 200. Drugie uruchomienie kończy się kodem 0 i nie zmienia `.env` (porównanie sumy kontrolnej). Wyniki trafiają do opisu PR.

## Resolved assumptions (autonomous defaults)

Rozstrzygnięte w zgłoszeniu przez zgłaszającego: projekt to GoldenLegs (sekcja „Uruchomienie”), a pusty `DB_PASSWORD` przy tworzeniu `.env` instalator uzupełnia losowym hasłem, którego nie wypisuje.

| # | Pytanie | Przyjęta odpowiedź | Uzasadnienie |
|---|---|---|---|
| Q1 | Gdzie leży instalator i w jakim języku? | `scripts/setup.mjs` + `scripts/setup/`, czysty Node ESM | Musi ruszyć przed `npm install` i na za starym Node pokazać czytelny błąd. Katalog poza `packages/`, bo to nie jest pakiet workspace. |
| Q2 | Jak pominąć `npm install`? | Nie pomijać, zawsze uruchamiać | npm sam jest idempotentny. Własna heurystyka dodaje gałąź do testów i może błędnie pominąć potrzebną instalację. |
| Q3 | Istniejący `.env` z pustym `DB_PASSWORD` albo brak `.env` przy istniejącym wolumenie? | Błąd z instrukcją, bez modyfikacji plików i danych | Zgłoszenie wymaga, by istniejący `.env` się nie zmieniał. Zmiana hasła przy istniejącym wolumenie psuje logowanie. |
| Q4 | Czy instalator uruchamia `npm run dev`? | Nie, tylko wypisuje następną komendę | Mniejszy zakres. Zgłoszenie proponuje to samo. |
| Q5 | Czy uruchamiać `npm run setup` w CI? | Nie (odroczone) | CI ma własne kroki (`npm ci`, testcontainers). Instalator jest dla środowiska deweloperskiego. |
| Q6 | Windows bez WSL? | Bez specjalnej obsługi (poza zakresem zgłoszenia) | Zgodnie z sekcją „Zakres” w zgłoszeniu. |
