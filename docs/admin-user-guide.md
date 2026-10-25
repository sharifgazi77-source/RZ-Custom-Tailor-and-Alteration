# Administrator guide

Run the backend and frontend locally using the README. Set `BOOTSTRAP_ADMIN_EMAIL` and a 12+ character `BOOTSTRAP_ADMIN_PASSWORD` in `backend/.env`, then run `./bootstrap-admin.ps1` once. Visit `/admin/login` to sign in. The admin API enforces the administrator role. The admin currently supports the dashboard, product create/edit (including primary image upload), and store identity/contact/hours/social settings. Order, customer, appointment, tailoring, and media-library screens are not yet operational.
