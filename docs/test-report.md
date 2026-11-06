# Verification report

Run in the supplied Windows workspace on 2026-11-05 against the current source revision, including campaign management and migration `0005_campaign_manager`.

| Check | Result | Evidence / limitation |
|---|---|---|
| Frontend TypeScript | PASS | `npm run typecheck` exited 0. |
| Frontend lint | PASS | `npm run lint` exited 0. |
| Frontend unit tests | PASS | `npm run test`: 1 test file, 2 tests passed. |
| Frontend production build | PASS with advisory | `npm run build` exited 0. JS output is 707.21 kB minified; Vite warns over 500 kB chunk recommendation. |
| Backend Python syntax compilation | PASS | `python -m compileall -q backend/app backend/alembic backend/tests` exited 0. |
| Campaign pricing/service tests | PASS | `pytest backend/tests/test_campaigns.py -q`: 4 passed (date boundary, best-single-campaign selection, sale-price exclusion, cap/minimum and display-only behavior). |
| Clean Alembic migration | PASS | Fresh SQLite file upgraded from base through `0005_campaign_manager`. |
| Backend API integration suite | BLOCKED / NOT PASS | `pytest backend/tests/test_api.py -q -o faulthandler_timeout=20` stalled before the first health assertion while Starlette TestClient started AnyIO's Windows asyncio portal; faulthandler shows `socketpair` waiting in Python 3.11 Proactor loop. Process was interrupted. No API integration tests are claimed passed. |
| PostgreSQL integration | NOT RUN | No PostgreSQL service/credentials configured in this workspace. |
| Cloudinary image upload and persistence after restart | NOT RUN | No Cloudinary credentials configured. Local path and model code are present; production persistence is unverified. |
| Browser, mobile, console/network QA | NOT RUN | No real browser interaction/viewport run performed. |
| Order lifecycle, checkout API, appointment conflict integration | NOT RUN | Business logic is not covered by a passing API integration run. |

The checks above verify build, schema migration and campaign calculation only. They do **not** prove production readiness. Fix the Windows TestClient/AnyIO compatibility, execute authenticated API and full order/upload flows, and perform browser/mobile review against PostgreSQL and production-like object storage before launch. Scope gaps are listed in `README.md`.
