# Copilot / AI Agent Instructions — TradingApp

Purpose: Short, actionable guidance for AI coding agents to be immediately productive in this repository.

1) Big picture (how the repo is organized)
- Backend: FastAPI app under `backend/app/` (entry: `backend/app/main.py`). Routes live in `backend/app/routes/api/v1/*.py` and are mounted as `/api/v1/*`.
- Database & models: SQLAlchemy models in `backend/app/database.py`. DB session factory and `get_db()` dependency are in `backend/app/config.py`.
- Services: reusable business logic lives in `backend/app/services/` (e.g., `ib_client.py`, `order_executor.py`, `signal_processor.py`). `ib_client.py` is the canonical IB integration using `ib_insync`.
- Frontend: Next.js app in `frontend/` (run via `npm run dev`). The frontend talks to the backend API (CORS configured in `backend/app/main.py` for ports 3000/3001).

2) How to run & test locally (exact commands)
- Backend (recommended from project root):
  - Create venv and install: `python -m venv .venv; .\\.venv\\Scripts\\Activate.ps1; pip install -r backend/requirements.txt`
  - Run dev server: `cd backend && uvicorn app.main:app --reload --host 0.0.0.0 --port 8000` (or `python backend\\app\\main.py`).
  - Health and docs: `http://localhost:8000/health` and `http://localhost:8000/docs`.
- Init DB: set `DATABASE_URL` env var and run a one-off initializer: `python -c "from app.config import init_db; init_db()"` from `backend`.
- Tests / quick checks: test scripts are plain Python async scripts in `backend/` (e.g., `test_ibkr_connection.py`, `test_crypto_access.py`). Run with: `python backend\\test_ibkr_connection.py`.
- Frontend:
  - Install and run: `cd frontend; npm install; npm run dev` (Next runs on port 3000).

3) Integration & external dependencies (what agents must know)
- Interactive Brokers: IB integration uses `ib_insync` in `backend/app/services/ib_client.py`. TWS / IB Gateway typically runs on port `7497` (paper) or `7496` (live) — tests use `7497`.
- Database: Postgres is expected. `DATABASE_URL` controls DB connectivity. Models use SQLAlchemy ORM; primary keys are a mix of UUID strings and integers (see `Account.id` string UUID and `Signal.id` integer).
- Async: IB client and some services use `asyncio` / `ib_insync` async APIs. When adding new IB calls, follow `async` patterns used in `ib_client.py` (connectAsync, qualifyContractsAsync, etc.).
- Celery/Redis: dependencies are present in `backend/requirements.txt` (Celery, Redis, Kombu) — search `services/` for worker usage before assuming a running broker.

4) Project-specific conventions & patterns
- Route pattern: add a new API file under `backend/app/routes/api/v1/`, create an `APIRouter`, then import and `app.include_router(..., prefix=\"/api/v1/<name>\")` in `backend/app/main.py`.
- DB sessions: use `db: Session = Depends(get_db)` in route handlers; call `db.commit()` and `db.refresh()` where appropriate and `db.rollback()` in exception handlers.
- In-memory 'embedded' services: some modules (e.g., `accounts.py`) use small embedded service classes (like `EmbeddedAccountService`) to hold ephemeral app state — prefer adding service instances in `services/` for shared logic rather than proliferating globals.
- Logging vs prints: modules often use `logging` (logger = logging.getLogger(__name__)), but many service methods still print to stdout for important events — be consistent when extending code.
- Backups: `backend/app/backups/` contains many backup files. Prefer editing canonical files in `backend/app/` and avoid modifying backup copies.

5) Common change patterns and examples
- Adding a route: create `backend/app/routes/api/v1/foo.py` with an `APIRouter`, then in `backend/app/main.py` import `foo` and call `app.include_router(foo.router, prefix=\"/api/v1/foo\", tags=[\"Foo\"])`.
- Adding DB fields: update `backend/app/database.py` model, then either run `init_db()` (creates missing tables/columns in simple setups) or provide a migration SQL in `migrations/`.
- Adding IB logic: mirror patterns in `ib_client.py` — use `await self.ib.qualifyContractsAsync(...)`, create appropriate `Contract` types, and return JSON-friendly dicts.

6) Files to inspect for context when making changes
- `backend/app/main.py` — app registration, CORS, health endpoints
- `backend/app/routes/api/v1/*.py` — canonical route implementations (see `accounts.py`, `signals.py`, `trades.py`)
- `backend/app/services/ib_client.py` — IB connection and order placement patterns
- `backend/app/database.py` and `backend/app/config.py` — models and DB session management
- `frontend/package.json` and `frontend/app/*` — frontend scripts, Next.js pages and modules

7) Safety notes for AI edits
- Don’t remove or edit backup files in `backend/app/backups/`.
- When changing DB models, prefer adding migrations or documenting how to run `init_db()` — do not assume destructive migrations are acceptable.
- For code that interacts with IB or real accounts, default to mockable, non-production calls in tests. Avoid committing secrets; environment variables (e.g., `DATABASE_URL`, IB host/port) are the source of truth.

If anything here is unclear or you'd like more detail about specific routes, services, or run scripts, tell me which area to expand and I will iterate.
