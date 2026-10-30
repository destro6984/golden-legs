# Schemat zmiennych środowiskowych w Zod

Cele:
- Walidować zmienne środowiskowe schematem Zod zamiast ręcznego `requireEnv`
- Zachować build bez sekretów i komunikaty błędów bez wartości
- Opisać zasady pracy ze zmiennymi w `AGENTS.md` i specyfikacji

Spec: [.ai/specs/2026-10-30-engineering-standards.md](../specs/2026-10-30-engineering-standards.md)
Status: done

## Wpisy

### 2026-10-30
Commit: `packages/db/src/env.ts` z `parseDbEnv()` (Zod 4), użyty w `createConfig()`; sekcja „Zmienne środowiskowe” w `AGENTS.md`, aktualizacja specyfikacji i lekcja.
Dodatkowo: główny `npm run lint` obejmuje tylko `packages/`. Wcześniej lintował całe repo i wywalał się na nieśledzonych skillach w `.claude/skills/`.
Decyzje/pułapki: schemat w `db`, nie w `core/src/config/env.ts`, bo `db` jest jedynym konsumentem i nie może importować `core`; hook blokuje komendy zawierające nazwę pliku z sekretami.
Weryfikacja: CLI migracji i `/api/health` (200) z prawdziwą konfiguracją; błędne `DB_PORT` i puste `DB_PASSWORD` dają listę błędów bez wartości; lint, typecheck, build przechodzą.
Do zrobienia: nic.
