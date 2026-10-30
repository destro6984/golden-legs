# MikroORM z PostgreSQL i Docker Compose

Cele:
- Skonfigurować MikroORM 7 z PostgreSQL w `packages/db` (konfiguracja, pula połączeń, migracje)
- Dodać `compose.yaml` z kontenerem PostgreSQL do developmentu
- Opisać komendy i zasady pracy z bazą w `AGENTS.md` i `README.md`

Spec: brak
Status: done

## Wpisy

### 2026-10-30
Commit: `compose.yaml` (PostgreSQL 18), `.env.example`, `getOrm()` i konfiguracja MikroORM w `packages/db`, skrypty `db:*`, dokumentacja i lekcje.
Decyzje/pułapki: encje przez `defineEntity()`; zmienne `DB_*` wspólne dla compose i MikroORM; port 5433, bo 5432 zajęty lokalnie; MikroORM 7 nie czyta `.env` i łączy się leniwie.
Weryfikacja: kontener, `migration:list/create/up` i zapytanie przez `getOrm()` na żywej bazie; lint, typecheck, build przechodzą.
Do zrobienia: integracja z Next.js (`.env` z katalogu głównego, `serverExternalPackages`) razem z Awilixem.
