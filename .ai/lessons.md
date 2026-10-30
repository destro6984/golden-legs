# Lessons

Indeks ustaleń, wniosków i usprawnień zapisanych przez agentów AI i ludzi.
Krótka lekcja to jedna linia tutaj. Dłuższa ma własny plik w `lessons/`, a tutaj trafia tylko link do niego.

Format wpisu:

```
- YYYY-MM-DD — <krótki wniosek> [szczegóły](lessons/YYYY-MM-DD-slug.md)
```

## Wpisy

<!-- Nowe wpisy dopisuj na końcu listy. -->

- 2026-10-30 — MikroORM 7 nie wczytuje sam pliku `.env`. Skrypty CLI w `packages/db` robią to przez `node --env-file-if-exists=../../.env`. Kod aplikacji musi dostać zmienne z procesu.
- 2026-10-30 — MikroORM 7 łączy się z bazą leniwie: `orm.checkConnection()` zaraz po `getOrm()` zwraca `ok: false`, choć pierwsze zapytanie przechodzi. Połączenie testuj zapytaniem.
- 2026-10-30 — Obraz `postgres` ustawia użytkownika i hasło tylko przy pierwszym starcie wolumenu. Po zmianie `DB_PASSWORD` trzeba `docker compose down -v`, inaczej logowanie się nie powiedzie.
- 2026-10-30 — Port 5432 na maszynie deweloperskiej bywa zajęty przez lokalny PostgreSQL, dlatego kontener wystawia bazę na `DB_PORT` (domyślnie 5433).
- 2026-10-30 — `next build` zbiera dane route handlerów, importując ich moduły. Konfiguracja czytająca `DB_*` przy imporcie wywalała build („Missing environment variable DB_HOST”). Rozwiązanie: konfiguracja MikroORM jako fabryka, a w handlerze `await connection()` przed dostępem do bazy.
- 2026-10-30 — Rozszerzanie (`declare module`) interfejsu, który moduł tylko re-eksportuje, nie działa w TypeScripcie niezawodnie. Dlatego `Cradle` jest zadeklarowany bezpośrednio w `packages/core/src/index.ts`. (Nieaktualne od przejścia na `app → core → db`: `Cradle` jest w `core/src/container/cradle.ts` i nie jest rozszerzany z innych pakietów.)
- 2026-10-30 — Promise cache'owany na `globalThis` (`getOrm`, `getContainer`) czyści się po odrzuceniu. Inaczej jedna nieudana próba połączenia psułaby każde kolejne żądanie aż do restartu serwera.
- 2026-10-30 — `loadEnvConfig()` z `@next/env` w `next.config.ts` nic nie robi: Next.js wywołuje ją wcześniej dla `packages/app`, a funkcja cache'uje pierwszy wynik. Flaga `node --env-file-if-exists` też odpada, bo Next.js przekazuje ją workerom przez `NODE_OPTIONS`, a Node na to nie pozwala. Działa `process.loadEnvFile()` w `next.config.ts`. Wczytywanie env testuj z prawdziwym plikiem, nie ze zmiennymi ustawionymi w powłoce, bo te maskują błąd.
- 2026-10-30 — `shadcn init` nie działa w samym `packages/ui` („could not detect a supported framework”). Motyw i `utils.ts` wygenerowano na tymczasowej kopii aplikacji Next.js i przeniesiono do `ui`. Komponenty dodawaj przez `npx shadcn@latest add <nazwa> -c packages/app`, a CLI zapisze je w `packages/ui`.
- 2026-10-30 — CLI shadcn w braku TTY zatrzymuje się na pytaniach, a przekierowanie przez `| tail` ukrywa pytanie. Uruchamiaj z `< /dev/null` i flagami (`-y`, `-f`, `-b`, `-p`, `--no-reinstall`, `--no-monorepo`).
- 2026-10-30 — Tailwind v4 skanuje tylko pakiet aplikacji. Bez `@source ".."` w `packages/ui/src/styles/globals.css` klasy użyte wyłącznie w komponentach `ui` nie trafiłyby do CSS.
- 2026-10-30 — `npm audit` zgłasza 3 problemy o niskim priorytecie z `deepmerge` w CLI `shadcn` (devDependency `ui`, potrzebna tylko dla `shadcn/tailwind.css` przy budowaniu). Proponowana poprawka (`shadcn@1.0.0`) to downgrade, więc jej nie stosujemy.
