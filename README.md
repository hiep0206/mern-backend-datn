# Moneo Backend

Node.js + Express + MongoDB/Mongoose backend for the Moneo personal finance application.

## Local setup

1. Install Node.js (an active LTS release is recommended).
2. Install dependencies with `npm install`.
3. Copy `.env.example` to `.env` and set your own `MONGODB_URI` and a random `JWT_SECRET` of at least 32 characters.
4. Set `GEMINI_API_KEY` to enable AI insights.
5. Set `SMTP_USER` and `SMTP_APP_PASSWORD` to enable password-reset emails.
6. Run `npm run dev`.

Never commit `.env`, real API keys, SMTP passwords, or production connection strings. Rotate any secret that has previously been committed to a public repository.

## Current architecture

- `config/`: infrastructure and security configuration.
- `src/domain/models/`: Mongoose persistence models.
- `src/core/constants/`: shared domain-independent constants.
- `src/domain/services/`: business operations and validation independent of HTTP request/response objects.
- `src/ai_engine/`: AI use cases and model integration, called by thin presentation controllers.
- `src/presentation/controllers/`: HTTP request/response handling.
- `src/presentation/routes/`: Express routes and authentication middleware.
- `src/presentation/middlewares/`: request authentication and other HTTP middleware.
- `src/analytics_reports/`: user- and period-scoped reporting calculations.

The React/Vite frontend lives in the separate `mern-frontend-datn` repository; frontend components should not be placed in this backend tree.

## API overview

- `POST /api/auth/register`, `POST /api/auth/login`
- `GET /api/transactions`, `POST /api/transactions`
- `PUT /api/transactions/:id`, `DELETE /api/transactions/:id`
- `GET /api/v1/reports/monthly?month=10&year=2026` (authenticated)
- `/api/insights` for AI insight generation
- `/api/borrows` for loan and debt records

All transaction and reporting endpoints must scope results to the authenticated user. Reports accept a month/year and default to the current month in the Asia/Ho_Chi_Minh time zone.

## Architecture roadmap

Keep the existing MERN repositories and introduce new folders only when a real feature is implemented. Planned additions include account/category/budget/bill domain models and services, report repositories under `src/infrastructure/database/repositories/`, bank statement import under `src/infrastructure/bank_sync/`, notifications, and security features. AI insight generation has been moved to `src/ai_engine/virtual_assistant.js`; classification, forecast, budget optimization, and anomaly detection remain planned features. Bank synchronization requires a supported bank/Open Banking provider; it is not implemented by creating placeholder files.
