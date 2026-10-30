# Awilix i podłączenie bazy do Next.js

Cele:
- Skonfigurować kontener Awilix z composition root w `packages/app`
- Udostępnić MikroORM w kontenerze (`orm` jako singleton, `em` per żądanie)
- Podłączyć bazę do Next.js: `.env` z katalogu głównego, `serverExternalPackages`, endpoint `/api/health`

Spec: brak
Status: done

## Wpisy

### 2026-10-30
Commit: `Cradle` w `core`, `registerDb()` w `db`, `lib/container.ts` z `getRequestScope()`, `/api/health`, `loadEnvConfig` i `serverExternalPackages` w `next.config.ts`, dokumentacja i lekcje.
Decyzje/pułapki: konfiguracja MikroORM jako fabryka, bo `next build` importuje moduły bez `DB_*`; kontener w trybie `strict`; cache'owane promise czyszczone po błędzie.
Weryfikacja: `/api/health` na żywej bazie w `next start` i `next dev` (200, 503 po zatrzymaniu bazy, 200 po powrocie); lint, typecheck, build przechodzą.
Do zrobienia: użytkownik sprawdza wczytywanie `.env` z katalogu głównego; decyzja co do `experimental.agentFeedback`.
