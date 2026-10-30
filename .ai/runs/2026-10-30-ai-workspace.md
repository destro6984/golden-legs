# Struktura `.ai/` i zasady pracy z AI

Cele:
- Utworzyć `.ai/` (specs, runs, lessons) do pracy SDD z agentami AI
- Opisać strukturę i obowiązkowe zasady w `AGENTS.md` i `CLAUDE.md`
- Dopisać wybrane wskazówki Borisa Cherny'ego (planowanie, weryfikacja, lekcje po poprawkach)

Spec: brak
Status: done

## Wpisy

### 2026-10-30
Commit: katalog `.ai/` z `.gitkeep`, `lessons.md`, zasady w `AGENTS.md`, `CLAUDE.md` importujący `@AGENTS.md`.
Decyzje/pułapki: blok Next.js w `AGENTS.md` zostaje nietknięty, bo `next dev` go odtwarza; reguły są tylko w `AGENTS.md`, żeby uniknąć duplikacji.
Weryfikacja: `npm run lint`, `npx tsc --noEmit`, `npm run build` przechodzą.
Do zrobienia: nic.
