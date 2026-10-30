# Konfiguracja pipeline'u agentów (om-setup-agent-pipeline)

Cele:
- Zapisać `.ai/agentic.config.json`, z którego korzystają skille `om-*`
- Zainstalować deskryptory trackera (GitHub) i przeglądarki (agent-browser)
- Wygenerować `SDLC.md`, `CODE_REVIEW.md` i `BACKWARD_COMPATIBILITY.md`
- Założyć etykiety pipeline'u w repozytorium GitHub

Spec: brak
Status: in-progress

## Wpisy

### 2026-10-30
Commit: `.ai/agentic.config.json` (bramka: lint, typecheck, test:coverage, test:integration; QA gate włączony; pełna taksonomia etykiet), `.ai/trackers/github.md`, `.ai/browsers/agent-browser.md`, katalogi `.ai/{analysis,scripts,qa}`, wpisy w `.gitignore`, `SDLC.md`, `CODE_REVIEW.md` i `BACKWARD_COMPATIBILITY.md`.
Decyzje/pułapki: `SDLC.md` jest po angielsku, bo skille szukają w nim sekcji po nazwach z szablonu, a `CODE_REVIEW.md` i `BACKWARD_COMPATIBILITY.md` są po polsku. `.ai/runs/` służy zarówno dziennikom zadań, jak i planom uruchomień skilli `om-*`. Etykiet nie założono, bo `gh` jest zalogowany na konto bez prawa zapisu do `destro6984/golden-legs` (HTTP 404).
Do zrobienia: założyć etykiety z konta z prawem zapisu; zdecydować, czy dopisać `npm audit` do bramki (standard tego wymaga, ale są 3 znane zgłoszenia o niskim priorytecie).
