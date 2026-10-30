# Instalator `npm run setup` (issue #1)

Cele:
- Jedna komenda `npm run setup`, która wykonuje kroki z sekcji „Uruchomienie” w `README.md`
- Instalator idempotentny: ponowne uruchomienie pomija wykonane kroki
- `README.md` z `npm run setup` jako zalecaną drogą i ręcznymi krokami jako alternatywą

Spec: [.ai/specs/2026-10-30-setup-installer.md](../specs/2026-10-30-setup-installer.md)
Status: in-progress

## Wpisy

### 2026-10-30
Commit: specyfikacja `.ai/specs/2026-10-30-setup-installer.md` (spec PR, `om-auto-write-spec`, ścieżka feature w `om-auto-fix-issue`).
Decyzje/pułapki: skrypt w czystym Node (`scripts/setup.mjs`), bo musi ruszyć przed `npm install`. Losowe `DB_PASSWORD` tylko przy tworzeniu `.env`; istniejący `.env` nigdy nie jest zmieniany. `scripts/` trzeba dopisać do lintu i do pokrycia w Vitest.
Do zrobienia: implementacja według planu ze specyfikacji, na osobnym PR.
