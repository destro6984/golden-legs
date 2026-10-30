# Implementacja instalatora `npm run setup` (issue #1)

Cele:
- `npm run setup` wykonuje kroki z sekcji „Uruchomienie” w `README.md` i jest idempotentny
- `README.md` i `AGENTS.md` opisują nową komendę, a ręczne kroki zostają jako alternatywa
- 100% pokrycia testami dla `scripts/`, bramka walidacji zielona

Spec: [.ai/specs/2026-10-30-setup-installer.md](../specs/2026-10-30-setup-installer.md) (spec PR #2)
Source doc: .ai/specs/2026-10-30-setup-installer.md
Status: in-progress

Ten plik jest jednocześnie planem wykonania `om-auto-create-pr` i dziennikiem zadania z `AGENTS.md`. Dziennik projektowania specyfikacji jest na gałęzi spec PR (`.ai/runs/2026-10-30-setup-installer.md`).

## Goal

Jedna komenda `npm run setup` przygotowuje lokalne środowisko GoldenLegs od czystego klonu do działającej bazy z migracjami. Ponowne uruchomienie jest bezpieczne.

## Scope

- `scripts/setup.mjs`, `scripts/setup/steps.mjs`, `scripts/setup/run-setup.mjs` z testami obok.
- `package.json` (`setup`, `lint`), `vitest.config.mts` (include dla `scripts/`).
- `README.md` („Uruchomienie”), `AGENTS.md` („Komendy”).

Non-goals: uruchamianie `npm run dev`, instalacja Node/Dockera, Windows bez WSL, `npm run setup` w CI, typecheck dla `scripts/`, zmiany w aplikacji, `compose.yaml` i `.env.example`.

## Implementation Plan

### Phase 1: instalator `npm run setup`

1. Konfiguracja bramek dla `scripts/` (Vitest include + coverage, `lint`).
2. Kroki sprawdzające: wersja Node, Docker Compose i demon.
3. Kroki zmieniające stan: `npm install`, `.env` (z wykrywaniem wolumenu), `db:up`, `db:migrate`.
4. Przepływ `run-setup.mjs`, punkt wejścia `setup.mjs`, skrypt `setup` w `package.json`.
5. Dokumentacja: `README.md`, `AGENTS.md`.
6. Weryfikacja ręczna na czystym klonie i ponowne uruchomienie.

## Risks

- Next.js w worktree pod `.ai/tmp/` może wykryć nadrzędny `package-lock.json` i źle wyznaczyć katalog główny. Build trzeba sprawdzić w worktree.
- Weryfikacja ręczna (krok 6) uruchamia prawdziwy kontener i tworzy `.env` w tymczasowym klonie. Nie może dotknąć bazy deweloperskiej ani pliku `.env` w głównym checkoutcie, dlatego używa osobnej nazwy projektu compose.

## Progress

> Convention: `- [ ]` pending, `- [x]` done. Append ` — <commit sha>` when a step lands. Do not rename step titles.

### Phase 1: instalator npm run setup

- [x] 1.1 Konfiguracja bramek dla scripts/ — 872e02f
- [x] 1.2 Kroki sprawdzające — 872e02f
- [x] 1.3 Kroki zmieniające stan — 872e02f
- [x] 1.4 Przepływ, punkt wejścia i skrypt setup — 872e02f
- [x] 1.5 Dokumentacja README i AGENTS
- [x] 1.6 Weryfikacja ręczna

## Wpisy

### 2026-10-30
Commit: plan wykonania (pierwszy commit gałęzi `feat/setup-installer`).
Decyzje/pułapki: osobny plik dziennika, bo `.ai/runs/2026-10-30-setup-installer.md` jest już w spec PR #2 i ta sama ścieżka w obu PR-ach dałaby konflikt. Specyfikacja jest skopiowana do worktree z gałęzi `spec/setup-installer`, ale nie jest commitowana na tej gałęzi.
Do zrobienia: kroki 1.1–1.6.

### 2026-10-30
Commit: instalator `scripts/setup.mjs` (`steps.mjs`, `run-setup.mjs`, `system.mjs`) z testami (30 testów, 100% pokrycia), skrypt `setup`, `scripts/` w lincie i w pokryciu Vitest.
Decyzje/pułapki: projekt compose odczytywany przez `docker compose config --no-interpolate`, bo bez `.env` zwykły `config` pada na `${DB_*:?}`. Punkt wejścia ustawia `process.exitCode`, żeby dało się go przetestować importem. `.env` zapisywany z `flag: "wx"` i `mode: 0o600`.
Do zrobienia: dokumentacja (1.5) i weryfikacja ręczna (1.6).

### 2026-10-30
Commit: `README.md` („Uruchomienie”: `npm run setup` jako zalecana droga, ręczne kroki jako alternatywa), `AGENTS.md` (komenda), dwie lekcje.
Decyzje/pułapki: weryfikacja ręczna na świeżym klonie (osobny projekt compose `gl-setup-check`, port 5499). Bieg 1 kończy się czytelnym błędem portu (5433 zajęty przez bazę deweloperską). Biegi 2–3 kończą się kodem 0 i pomijają `.env` bez zmian (ta sama suma SHA-256). `GET /api/health` zwraca 200. Bez `.env` przy istniejącym wolumenie instalator zatrzymuje się bez zapisu. `.env` ma tryb 600, a hasło nie trafia do logu. Kontener i wolumen klonu usunięte.
Do zrobienia: pełna bramka, przegląd `om-auto-review-pr`, gotowy PR.
