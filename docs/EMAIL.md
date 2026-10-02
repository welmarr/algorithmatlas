# Email delivery

## Local Mailpit

Start optional services:

```powershell
# Set SIM_DB_PASSWORD in an ignored .env or your shell first.
docker compose -f compose.yaml -f compose.db.yaml -f compose.auth.yaml up -d db mailpit
```

Mailpit's SMTP port is 127.0.0.1:11025; its inbox/API is http://127.0.0.1:18025. Ports are loopback-only. Mail is captured locally and not delivered externally. Storage is a temporary filesystem.

For host development configure DATABASE_URL, APP_URL=http://127.0.0.1:3000, EMAIL_TRANSPORT=mailpit, SMTP_HOST=127.0.0.1, SMTP_PORT=11025. Apply pnpm db:migrate before starting the web process. For browser tests also set MAILPIT_API=http://127.0.0.1:18025 and E2E_DATABASE_URL to the disposable database. APP_URL must match E2E_PORT.

The Compose web overlay uses service hostname mailpit:1025. A production Next server sets Secure cookies, so use browser localhost for local Compose development.

## Delivery and recovery

The fixed sender defaults to accounts@algorithmatlas.test. Subjects and bodies contain no password. Verification and reset links are one-use and expire. Resend replaces earlier verification links. Missing SMTP configuration produces AUTH_EMAIL_UNAVAILABLE; learning continues. Forgot-password intentionally returns the same response even if delivery fails.

For real SMTP, omit EMAIL_TRANSPORT=mailpit, configure SMTP_HOST/PORT/USER/PASSWORD and APP_URL with HTTPS. SMTP requires TLS and certificate validation; SMTP_SECURE=true selects implicit TLS. Secrets remain server-only. Nodemailer disables file/URL attachment resolution and SMTP debug logs, with 5-second transport timeouts. See [Nodemailer SMTP](https://nodemailer.com/smtp) and [Mailpit API](https://mailpit.axllent.org/docs/api-v1/).

Mailpit must never be exposed publicly. Delete only this project's test messages/containers during cleanup. No external email was used in milestone tests.
