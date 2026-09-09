# Document Request Form

A full-stack Next.js (App Router) + TypeScript app:

- A styled one-time form collecting **name** and **email**.
- On submit, the backend stores the entry in a database and emails a PDF to
  that address using a free Gmail SMTP sender (Nodemailer).
- If someone tries to use the form link again (same browser, or the same
  email address from any device), they see **"You've already sent this"**
  instead of being able to submit twice.

## 1. Install

```bash
npm install
```

## 2. Configure environment variables

Copy the example file and fill it in:

```bash
cp .env.example .env
```

- `DATABASE_URL` — your Neon connection string, copied from the Neon
  dashboard's "Connection string" panel. Keep `?sslmode=require` at the end.
- `GMAIL_USER` / `GMAIL_APP_PASSWORD` — the free mail sender. Turn on 2-Step
  Verification on that Gmail account, then create an **App Password** at
  https://myaccount.google.com/apppasswords and paste it in (not your normal
  password).
- `ADMIN_EMAIL` — the admin's inbox. It's set as the `Reply-To` on every
  email sent to users, so replies land with the admin.
- `PDF_FILE_PATH` — path to the PDF that gets attached and sent. A dummy
  placeholder already lives at `public/documents/dummy.pdf` — replace that
  file whenever you like; you don't need to touch any code.

## 3. Set up the database

```bash
npm run db:push
```

This creates the `Submission` table in your Neon database, matching
`prisma/schema.prisma`.

## 4. Run it

```bash
npm run dev
```

Visit http://localhost:3000.

## How the "one submission only" rule works

- The database has a `UNIQUE` constraint on `email` — the backend is the
  source of truth, so the same email can never be submitted twice even from
  a different browser or device.
- The browser also remembers (via `localStorage`) which email it submitted,
  so a returning visitor sees the "already submitted" screen immediately on
  page load, without needing to resubmit first.

## Swapping in your real PDF and mail sender later

- **PDF**: replace `public/documents/dummy.pdf` with your real file (same
  filename, or update `PDF_FILE_PATH` in `.env`).
- **Mail sender**: `lib/mailer.ts` is the only file that talks to email.
  Gmail SMTP is free and works out of the box here; if you outgrow it,
  swap the `nodemailer.createTransport(...)` call for a provider like
  Resend or SendGrid — nothing else in the app needs to change.

## Project structure

```
app/
  page.tsx            — the form (client component)
  layout.tsx          — fonts + metadata
  globals.css         — aurora background + Tailwind
  api/submit/route.ts — POST to submit, GET to check submission status
lib/
  prisma.ts           — Prisma client singleton
  mailer.ts           — Gmail SMTP sender + PDF attachment
prisma/
  schema.prisma       — Submission model (name, email [unique], emailSent)
public/documents/
  dummy.pdf           — placeholder PDF, replace anytime
```
