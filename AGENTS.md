# GoldenLegs

Założenia architektoniczne poniżej są obowiązkowe. Nie wprowadzaj innej biblioteki do tych samych zadań (innego ORM, kontenera DI, frameworka CSS czy biblioteki komponentów) bez zgody człowieka.

Pełny standard inżynierski (tabela nazewnictwa, zasady, minimum bezpieczeństwa, checklista review, docelowa struktura) jest w `.ai/specs/2026-10-30-engineering-standards.md`. Przeczytaj go przed dodaniem nowej funkcji. Poniżej są reguły, których łamać nie wolno.

## Stos technologiczny

- **Next.js** (najnowsza wersja, App Router), **React**, **TypeScript** w trybie `strict`.
- **PostgreSQL** z **MikroORM**: encje, migracje, pula połączeń.
- **Awilix**: kontener Dependency Injection.
- **Tailwind CSS**: strony frontendowe (publiczne).
- **shadcn/ui**: strony backendowe (panel administracyjny).
- **npm workspaces**: monorepo, jeden `package-lock.json` w katalogu głównym.

## Monorepo

| Pakiet | Katalog | Odpowiedzialność | Może importować |
|---|---|---|---|
| `@golden-legs/app` | `packages/app` | aplikacja Next.js: routing, strony, route handlers (tylko warstwa HTTP i renderowanie) | `core`, `ui` |
| `@golden-legs/core` | `packages/core` | serwisy (logika biznesowa), kontener DI i `Cradle`, warstwa `http/` (błędy, `apiHandler`), logger | `db` |
| `@golden-legs/db` | `packages/db` | konfiguracja MikroORM, encje, migracje; jedyny pakiet importujący `@mikro-orm/*` | nic z workspace |
| `@golden-legs/ui` | `packages/ui` | komponenty interfejsu, w tym shadcn/ui; dane dostaje przez propsy | nic z workspace |

- Kierunek zależności: `app → core → db`, a `ui` importuje tylko `app`. Pilnuje tego ESLint (`no-restricted-imports` w `eslint.config.mjs` i `packages/app/eslint.config.mjs`). Nie luzuj tych reguł dla wygody.
- `core` nie importuje `next` ani `react`. Typy ORM (`EntityManager`, `MikroORM`) bierze z `@golden-legs/db`, nie z `@mikro-orm/*`.
- `app` nie importuje `@golden-legs/db`: do bazy sięga wyłącznie przez serwisy z `core`.
- Importuj inne pakiety po nazwie (`@golden-legs/core`), nigdy ścieżką względną (`../../core`).
- `core` i `db` udostępniają publiczne API tylko przez `src/index.ts`. `ui` eksportuje ścieżki zgodnie z konwencją shadcn: `@golden-legs/ui/components/...`, `@golden-legs/ui/lib/...`, `@golden-legs/ui/globals.css`. Wewnątrz `ui` importy idą przez aliasy `#components/*`, `#lib/*` i `#hooks/*` (`imports` w `package.json`). Pakiety eksportują kod źródłowy TypeScript, który kompiluje Next.js. Każdy nowy pakiet dopisz do `transpilePackages` w `packages/app/next.config.ts`.
- Zależność instaluj w pakiecie, który jej używa: `npm install <pakiet> -w @golden-legs/<nazwa>`.

## Dependency Injection (Awilix)

- Kontener i jego typ są w `packages/core/src/container/`: `container.ts` rejestruje każdą zależność ręcznie (bez `loadModules`), a `cradle.ts` deklaruje interfejs `Cradle`. Nowy serwis to jedna nowa linia w każdym z tych plików.
- Serwisy to klasy, które dostają zależności przez konstruktor (tryb `InjectionMode.PROXY`: `constructor({ em }: { em: EntityManager })`). Nie wywołuj `container.resolve` w logice biznesowej i nie importuj gotowych instancji serwisów.
- W Route Handlers, Server Actions i Server Components wywołuj serwisy przez `withScope(({ fooService }) => fooService.bar())` z `@golden-legs/core`. Każde wywołanie tworzy nowy scope (osobny `em`) i sprząta go na końcu.
- Zależności związane z jednym żądaniem (np. `em`) rejestruj jako `.scoped()`. Kontener działa w trybie `strict`, więc singleton zależny od zależności scoped rzuci błąd: serwis używający `em` też musi być scoped.

## Koncepty domenowe

- Kod domenowy nie trafia do `modules/`. Każdy koncept (np. `orders`) to podkatalog o tej samej nazwie w warstwach, które go potrzebują:
  - `packages/db/src/entities/<koncept>/<nazwa>.entity.ts`
  - `packages/core/src/services/<koncept>/<nazwa>.service.ts`
  - `packages/core/src/validators/<koncept>/` (wspólne schematy Zod, gdy są potrzebne)
  - `packages/app/app/api/<koncept>/route.ts` i odpowiadające strony
- Katalog konceptu tworzysz dopiero z jego pierwszym plikiem. Bez pustych katalogów na zapas, bez plików konfiguracyjnych per koncept i bez automatycznego wykrywania modułów.
- Kroki dodawania konceptu i tabela nazewnictwa są w specyfikacji standardu (sekcje 1 i 2).

## Warstwa HTTP

- Każdy route handler jest opakowany w `apiHandler` z `@golden-legs/core`. Zwraca kopertę `{ ok: true, data }` albo `{ ok: false, error: { code, message, fieldErrors? } }` z właściwym statusem. Route handler nie pisze własnego `try/catch` ani ręcznego `Response.json`.
- Serwisy zgłaszają błędy przez klasy z `core/src/http/errors.ts` (`NotFoundError`, `ValidationError`, `ServiceUnavailableError`...). Serwis nigdy nie buduje odpowiedzi HTTP.
- Nieoczekiwane błędy `apiHandler` loguje przez `logger` z `@golden-legs/core` (pino z redakcją haseł i tokenów) i zwraca 500 bez stack trace'a.
- Route handler lub strona, które sięgają do bazy, najpierw wywołują `await connection()` z `next/server`. W Next.js 16 z Cache Components nie ma `export const dynamic`. Aplikacja musi się zbudować i uruchomić bez dostępnej bazy.
- Wzorzec referencyjny: `packages/app/app/api/health/route.ts` z `HealthService`.

## Baza danych (MikroORM)

- Wszystko, co dotyczy danych, trafia do `packages/db`: konfiguracja (`src/mikro-orm.config.ts`), encje (`src/entities/`), repozytoria, migracje (`src/migrations/`).
- Encje definiuj przez `defineEntity()`, bez dekoratorów (wymagają dodatkowej konfiguracji kompilatora i metadanych typów). Każdą encję dopisz do tablicy `entities` w `src/entities/index.ts`.
- `em` dostają serwisy z kontenera (scope żądania). `getOrm()` z `@golden-legs/db` służy tylko do rejestracji w kontenerze i skryptów. Nie wywołuj `MikroORM.init()` w innych miejscach, bo każde wywołanie tworzy nową pulę połączeń.
- Konfiguracja MikroORM to fabryka (`createConfig()`), żeby zmienne środowiskowe były czytane dopiero przy pierwszym połączeniu. `next build` importuje moduły bazy bez danych dostępowych, więc nic w `packages/db` nie może łączyć się z bazą ani czytać `DB_*` przy samym imporcie.
- Każdy pakiet `@mikro-orm/*` używany w runtime musi być w `serverExternalPackages` w `packages/app/next.config.ts` (`@mikro-orm/core` Next.js wyłącza z bundlowania sam).
- Schemat zmieniaj wyłącznie migracjami MikroORM: zmień encję, wygeneruj migrację (`npm run db:migration:create`), przejrzyj jej SQL i zacommituj ją razem ze snapshotem. Nie edytuj migracji, które zostały już zastosowane.
- Każde żądanie pracuje na własnym forku EntityManagera (`em.fork()`). Nigdy nie używaj globalnego EntityManagera.
- `@golden-legs/db` i `@golden-legs/core` działają tylko po stronie serwera: nie importuj ich w komponentach `"use client"`.
- Dane dostępowe do bazy pochodzą ze zmiennych środowiskowych `DB_*` (wzór w `.env.example`), nigdy z kodu.

## Zmienne środowiskowe

- Każdą zmienną waliduje schemat Zod w pakiecie, który ją czyta, w pliku `src/env.ts`. `DB_*` są w `packages/db/src/env.ts` (`parseDbEnv()`). Gdy `core` będzie potrzebować własnej zmiennej, powstanie `packages/core/src/config/env.ts`. Kod nie czyta `process.env` poza tymi plikami.
- Parsowanie odbywa się przy pierwszym użyciu, nie przy imporcie modułu, bo `next build` działa bez sekretów.
- Błąd walidacji podaje nazwy zmiennych i problem, nigdy wartości.
- Nowa zmienna: dopisz ją do schematu i do `.env.example` (nazwa i opis, bez prawdziwej wartości).

## Interfejs

- Strony frontendowe (publiczne) stylujemy Tailwind CSS.
- Strony backendowe (panel administracyjny) budujemy z komponentów shadcn/ui: styl `base-nova` (prymitywy Base UI, `@base-ui/react`), kolor bazowy `neutral`, ikony `lucide`.
- Motyw (zmienne CSS, tryb ciemny, `@source` dla pakietu `ui`) jest w `packages/ui/src/styles/globals.css`. `packages/app/app/globals.css` tylko go importuje. Kolory i promienie zmieniaj w motywie, nie w komponentach.
- Font aplikacji ustawia `next/font` w `layout.tsx` przez zmienną `--font-sans`, którą czyta motyw.
- `packages/app/components.json` i `packages/ui/components.json` muszą mieć ten sam `style`, `baseColor` i `iconLibrary`.
- Gdzie trafia nowy komponent:
  1. prymityw shadcn → `ui/src/components/ui/`, wyłącznie przez `npx shadcn@latest add <nazwa> -c packages/app` uruchomione z katalogu głównego (CLI zapisze go w `packages/ui`), nigdy pisany ręcznie;
  2. ogólny wzorzec panelu, niezależny od konceptu → `ui/src/backend/<kategoria>/`;
  3. komponent związany z jednym konceptem → `ui/src/components/<koncept>/`;
  4. komponent jednej strony → obok jej `page.tsx`, dopóki nie potrzebuje go druga strona.
- Panel korzysta ze wspólnych bloków z `ui/src/backend/`: `apiCall` (jedyne miejsce z `fetch('/api/...')`), `CrudForm`, `DataTable` i komponentów `feedback/`. Powstaną razem z pierwszym ekranem panelu. Do tego czasu nie twórz ich zamienników.
- Komponenty z `packages/ui` nie pobierają danych same, wszystko dostają przez propsy.

## Komendy

Uruchamiaj je z katalogu głównego repozytorium:

```bash
npm install         # instaluje zależności wszystkich pakietów
npm run dev         # serwer deweloperski, http://localhost:3000
npm run lint        # ESLint
npm run typecheck   # TypeScript we wszystkich pakietach
npm run build       # build produkcyjny
npm run db:up       # PostgreSQL w Dockerze (compose.yaml), czeka aż baza będzie gotowa
npm run db:down     # zatrzymuje kontener, dane zostają w wolumenie
npm run db:migration:create   # generuje migrację z różnicy między encjami a schematem
npm run db:migrate  # stosuje migracje
```

Wymagany jest Node.js 22.17 lub nowszy (wymóg MikroORM 7).

Zasady specyficzne dla Next.js są w `packages/app/AGENTS.md`.

# Zasady pracy z AI w tym repozytorium

Te zasady są obowiązkowe dla każdego agenta AI (Claude Code, Codex, Cursor i innych) oraz dla ludzi pracujących z AI. Wszystkie artefakty pracy z AI trzymamy w katalogu `.ai/`.

## Struktura `.ai/`

```
.ai/
├── specs/                  # specyfikacje SDD (spec-driven development)
│   ├── YYYY-MM-DD-slug.md  # specyfikacje aktywne
│   ├── implemented/        # specyfikacje w pełni zaimplementowane
│   └── archive/            # specyfikacje porzucone lub zastąpione
├── runs/                   # dzienniki zadań, jeden plik na zadanie
│   └── YYYY-MM-DD-slug.md
├── lessons.md              # indeks lekcji, jedna linia na lekcję
└── lessons/                # szczegółowe lekcje
    └── YYYY-MM-DD-slug.md
```

Nazwy plików: `YYYY-MM-DD-slug.md`. `slug` pisz małymi literami ASCII, ze słowami rozdzielonymi myślnikami, np. `2026-10-30-user-login.md`.

## Specyfikacje (`.ai/specs/`)

- Przed implementacją nowej funkcji lub większej zmiany sprawdź, czy w `.ai/specs/` jest dla niej specyfikacja. Jeśli jest, przeczytaj ją i trzymaj się jej. Jeśli zakres się zmienia, najpierw zaktualizuj specyfikację, potem kod.
- Nowa specyfikacja trafia do `.ai/specs/YYYY-MM-DD-slug.md`. Data w nazwie to dzień jej utworzenia.
- Gdy specyfikacja jest w pełni zaimplementowana, przenieś ją (`git mv`) do `.ai/specs/implemented/`.
- Gdy specyfikacja zostaje porzucona lub zastąpiona inną, przenieś ją do `.ai/specs/archive/` i dopisz na jej początku, dlaczego.

## Dzienniki zadań (`.ai/runs/`)

Każde zadanie wykonywane z AI ma jeden dziennik, uzupełniany przyrostowo.

1. **Utworzenie.** Utwórz `.ai/runs/YYYY-MM-DD-slug.md` przy pierwszym commicie zadania. Data w nazwie to dzień rozpoczęcia zadania. Nie zmieniaj nazwy pliku ani nie twórz nowego przy kolejnej sesji, nawet jeśli praca trwa kilka dni.
2. **Nagłówek.** Na początku pliku utrzymuj stały nagłówek: cele zadania, link do specyfikacji (jeśli istnieje) i linię `Status: in-progress` albo `Status: done`. Aktualizuj cele i status w tym nagłówku. `Status: done` ustaw dopiero po ukończeniu zadania.
3. **Wpis przy każdym commicie.** Przy każdym commicie dopisz na końcu pliku wpis o długości 2–5 linii: data, co obejmuje ten commit, decyzje lub napotkane pułapki oraz co zostało do zrobienia. Nie zmieniaj wcześniejszych wpisów. Przygotuj wpis przed commitem i dołącz go do tego samego commita co opisywane zmiany. Nie odkładaj zapisu do końca sesji.
4. **Wznowienie lub przejęcie.** Przy wznowieniu zadania lub przejęciu go od innej osoby najpierw przeczytaj istniejący dziennik i kontynuuj w tym samym pliku.

Szablon dziennika:

```markdown
# <Tytuł zadania>

Cele:
- <cel 1>
- <cel 2>

Spec: [.ai/specs/YYYY-MM-DD-slug.md](../specs/YYYY-MM-DD-slug.md)
Status: in-progress

## Wpisy

### YYYY-MM-DD
Commit: <co obejmuje ten commit>
Decyzje/pułapki: <co ustalono, na co uważać>
Do zrobienia: <co zostało>
```

## Lekcje (`.ai/lessons.md`, `.ai/lessons/`)

- Po naprawieniu błędu, odkryciu pułapki, ustaleniu konwencji lub czegokolwiek, co warto pamiętać długoterminowo, zapisz lekcję.
- Krótka lekcja: jedna linia na końcu listy w `.ai/lessons.md`.
- Dłuższa lekcja (kontekst, przyczyna, rozwiązanie): osobny plik `.ai/lessons/YYYY-MM-DD-slug.md` oraz jedna linia z linkiem do niego w `.ai/lessons.md`.
- Na początku pracy przeczytaj `.ai/lessons.md`, żeby nie powtarzać znanych błędów.
- Lekcję dołącz do commita, którego dotyczy.
- Gdy człowiek poprawi Twój kod lub sposób działania, zapisz z tego lekcję w formie reguły, która zapobiegnie powtórzeniu błędu. Jeśli reguła dotyczy sposobu pracy wszystkich agentów, dopisz ją do `AGENTS.md`.

## Planowanie

- Złożone zadanie (nowa funkcja, zmiana w kilku plikach, niejasny zakres) zaczynaj od planu i uzgodnij go z człowiekiem przed implementacją. W Claude Code użyj trybu planowania. Plan, który wykracza poza jedną sesję, zapisz jako specyfikację w `.ai/specs/`.
- Gdy implementacja się sypie (plan nie pasuje do kodu, kolejne poprawki nie pomagają), zatrzymaj się i zaplanuj od nowa, zamiast brnąć dalej.
- Gdy poprawka okazała się prowizoryczna, a teraz rozumiesz już problem, zastąp ją czystym rozwiązaniem, zamiast dokładać kolejne łatki.

## Weryfikacja

- Nie uznawaj zmiany za skończoną bez dowodu. Przed każdym commitem uruchom `npm run lint`, `npm run typecheck` i `npm run build` (oraz testy, gdy powstaną). Wszystkie muszą przejść.
- Zmiany w UI sprawdź w działającej aplikacji (`npm run dev`), a nie tylko czytając kod.
- Błędy naprawiaj samodzielnie: odtwórz problem, znajdź przyczynę, popraw i uruchom weryfikację ponownie.
- Jeśli czegoś nie udało się zweryfikować, napisz to wprost i zapisz w dzienniku zadania jako pułapkę lub rzecz do zrobienia.

## Narzędzia

- Czynność powtarzaną regularnie zamień w skill lub komendę w `.claude/skills/` i zacommituj ją do repozytorium.
- Szerokie przeszukiwanie kodu i niezależne podzadania zlecaj subagentom, żeby główny kontekst pozostał czysty.

## Kolejność działań przy każdym zadaniu

1. Przeczytaj `.ai/lessons.md`.
2. Sprawdź `.ai/runs/`, czy zadanie nie jest już w toku. Jeśli jest, przeczytaj jego dziennik i kontynuuj w nim.
3. Sprawdź `.ai/specs/`, czy istnieje specyfikacja zadania.
4. Jeśli zadanie jest złożone, najpierw je zaplanuj (zob. „Planowanie”).
5. Przed każdym commitem zweryfikuj zmiany (zob. „Weryfikacja”), a potem dopisz wpis do dziennika zadania (przy pierwszym commicie utwórz dziennik) i, jeśli jest co zapisać, lekcję. Dołącz je do tego samego commita.
6. Po ukończeniu zadania ustaw `Status: done` w dzienniku i, jeśli dotyczy, przenieś specyfikację do `.ai/specs/implemented/`.
