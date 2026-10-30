# Monorepo GoldenLegs i opis architektury

Cele:
- Przebudować repozytorium na monorepo (npm workspaces) z pakietami `app`, `core`, `db`, `ui`
- Zapisać założenia architektoniczne (Next.js, MikroORM, Awilix, Tailwind, shadcn/ui) w `AGENTS.md`
- Opisać architekturę w `README.md`

Spec: brak
Status: done

## Wpisy

### 2026-10-30
Commit: aplikacja Next.js przeniesiona do `packages/app`, szkielety `core`/`db`/`ui`, `tsconfig.base.json`, skrypty workspace'ów, architektura w `AGENTS.md` i `README.md`.
Decyzje/pułapki: blok Next.js przeniesiony do `packages/app/AGENTS.md` (tam `next dev` go odtwarza); wzorce `.gitignore` odkotwiczone od katalogu głównego; `typecheck` aplikacji wymaga `next typegen` przed `tsc`.
Weryfikacja: `npm run lint`, `npm run typecheck`, `npm run build` przechodzą od czystego stanu.
Do zrobienia: MikroORM, Awilix i shadcn/ui jako osobne zadania; ESLint dla `core`, `db`, `ui`.
