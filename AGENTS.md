# GoldenLegs

Założenia architektoniczne poniżej są obowiązkowe. Nie wprowadzaj innej biblioteki do tych samych zadań (innego ORM, kontenera DI, frameworka CSS czy biblioteki komponentów) bez zgody człowieka.

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
| `@golden-legs/app` | `packages/app` | aplikacja Next.js: routing, strony, server actions, route handlers, composition root DI | `core`, `db`, `ui` |
| `@golden-legs/core` | `packages/core` | logika domenowa i narzędzia wielokrotnego użytku, niezależne od frameworka | tylko biblioteki zewnętrzne |
| `@golden-legs/db` | `packages/db` | konfiguracja MikroORM, encje, repozytoria, migracje | `core` |
| `@golden-legs/ui` | `packages/ui` | komponenty interfejsu wielokrotnego użytku, w tym komponenty shadcn/ui | `core` |

- Importuj inne pakiety po nazwie (`@golden-legs/core`), nigdy ścieżką względną (`../../core`). Zależności między pakietami nie mogą tworzyć cykli, a `app` nie jest importowany przez żaden pakiet.
- Pakiet udostępnia publiczne API tylko przez `src/index.ts`. Pakiety eksportują kod źródłowy TypeScript, który kompiluje Next.js. Każdy nowy pakiet dopisz do `transpilePackages` w `packages/app/next.config.ts`.
- Zależność instaluj w pakiecie, który jej używa: `npm install <pakiet> -w @golden-legs/<nazwa>`.

## Dependency Injection (Awilix)

- Kontener tworzymy w jednym miejscu: w composition root w `packages/app`. Pozostałe pakiety nie tworzą własnych kontenerów, tylko eksportują funkcje rejestrujące swoje zależności.
- Serwisy dostają zależności przez konstruktor lub parametry fabryki. Nie wywołuj `container.resolve` w logice biznesowej i nie importuj gotowych instancji serwisów.
- Zależności związane z jednym żądaniem (np. EntityManager MikroORM) rejestruj w scope tworzonym per żądanie (`container.createScope()`).

## Baza danych (MikroORM)

- Wszystko, co dotyczy danych, trafia do `packages/db`: konfiguracja (`src/mikro-orm.config.ts`), encje (`src/entities/`), repozytoria, migracje (`src/migrations/`).
- Encje definiuj przez `defineEntity()`, bez dekoratorów (wymagają dodatkowej konfiguracji kompilatora i metadanych typów). Każdą encję dopisz do tablicy `entities` w `src/entities/index.ts`.
- Połączenie z bazą bierz z `getOrm()` z `@golden-legs/db`. Nie wywołuj `MikroORM.init()` w innych miejscach, bo każde wywołanie tworzy nową pulę połączeń.
- Schemat zmieniaj wyłącznie migracjami MikroORM: zmień encję, wygeneruj migrację (`npm run db:migration:create`), przejrzyj jej SQL i zacommituj ją razem ze snapshotem. Nie edytuj migracji, które zostały już zastosowane.
- Każde żądanie pracuje na własnym forku EntityManagera (`em.fork()`). Nigdy nie używaj globalnego EntityManagera.
- `@golden-legs/db` działa tylko po stronie serwera: nie importuj go w komponentach `"use client"`.
- Dane dostępowe do bazy pochodzą ze zmiennych środowiskowych `DB_*` (wzór w `.env.example`), nigdy z kodu. Nową zmienną dopisz do `.env.example`.

## Interfejs

- Strony frontendowe (publiczne) stylujemy Tailwind CSS.
- Strony backendowe (panel administracyjny) budujemy z komponentów shadcn/ui. Komponenty shadcn trafiają do `packages/ui`.
- Komponent używany w więcej niż jednym miejscu przenieś do `packages/ui`. Komponent jednej strony może zostać w `packages/app`.
- Komponenty z `packages/ui` nie pobierają danych same: nie importują `db` ani serwisów, wszystko dostają przez propsy.

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
