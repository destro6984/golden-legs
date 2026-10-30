@AGENTS.md

# Claude Code

Pełne zasady są w `AGENTS.md` (zaimportowany powyżej). Są obowiązkowe. Najważniejsze z nich:

- Artefakty pracy z AI trzymamy w `.ai/`:
  - `.ai/specs/`: specyfikacje SDD (`YYYY-MM-DD-slug.md`), z podkatalogami `implemented/` i `archive/`.
  - `.ai/runs/`: dzienniki zadań, jeden plik na zadanie (`YYYY-MM-DD-slug.md`).
  - `.ai/lessons.md` i `.ai/lessons/`: lekcje, wnioski i usprawnienia.
- Na początku pracy przeczytaj `.ai/lessons.md` i sprawdź `.ai/runs/` oraz `.ai/specs/`.
- Dziennik zadania tworzysz przy pierwszym commicie, a potem przy **każdym** commicie dopisujesz na jego końcu wpis o długości 2–5 linii, w tym samym commicie co zmiany. Nie zmieniaj nazwy dziennika ani wcześniejszych wpisów. `Status: done` ustawiasz dopiero po ukończeniu zadania.
- Po naprawieniu błędu lub ustaleniu czegoś wartego zapamiętania zapisz lekcję w `.ai/lessons.md` (i w `.ai/lessons/`, jeśli jest dłuższa). Wiedzę o tym projekcie zapisuj w repozytorium, a nie w prywatnej pamięci Claude, żeby była dostępna dla wszystkich.
