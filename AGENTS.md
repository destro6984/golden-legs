<!-- BEGIN:nextjs-agent-rules -->

## This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

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

- Nie uznawaj zmiany za skończoną bez dowodu. Przed każdym commitem uruchom `npm run lint`, `npx tsc --noEmit` i `npm run build` (oraz testy, gdy powstaną). Wszystkie muszą przejść.
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
