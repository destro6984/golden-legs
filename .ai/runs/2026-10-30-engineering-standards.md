# Standard inżynierski, warstwa HTTP i poprawka `.env`

Cele:
- Wyłączyć `experimental.agentFeedback` i usunąć jego blok z `packages/app/AGENTS.md`
- Naprawić wczytywanie `.env` z katalogu głównego w Next.js
- Dostosować standard z DevMentor do GoldenLegs i wdrożyć: kierunek `app → core → db`, kontener w `core`, `core/http`, granice w ESLint

Spec: [.ai/specs/2026-10-30-engineering-standards.md](../specs/2026-10-30-engineering-standards.md)
Status: done

## Wpisy

### 2026-10-30
Commit: `agentFeedback` wyłączony; `.env` przez `process.loadEnvFile()`; kontener/`Cradle`/`withScope`, `AppError`, `apiHandler`, logger pino i `HealthService` w `core`; ESLint pilnuje granic; standard w specs, oryginał DevMentor w archive.
Decyzje/pułapki: `loadEnvConfig` cache'uje pierwsze wywołanie, a `--env-file` nie przechodzi przez `NODE_OPTIONS`; `force-dynamic` zastąpione `await connection()` (Next 16); odpowiedź `/api/health` ma teraz kopertę `{ ok, data }`.
Weryfikacja: `/api/health` z prawdziwym `.env` w dev i prod (200, 503 z logiem przyczyny, 200 po powrocie bazy); każda reguła granic odrzuca zakazany import; lint, typecheck, build, `npm audit` czyste.
Do zrobienia: schemat env w Zod, shadcn z `ui/src/backend/`, `makeCrudRoute`/`auth.ts` przy pierwszym koncepcie.
