# GP Agent Portal — CRM

Phase 1 of the rebuild: a real multi-agent web app with accounts and a shared database, replacing the single-file HTML portal. This phase covers login/signup and the core CRM (client records, pipeline stage, notes, tasks, follow-up dates). Email reminders, calendar sync, and folding in the Knowledge Base / Client Analyzer come in later phases.

## What's here right now

- Agent accounts (sign up, sign in, sign out) via Supabase Auth
- Client list with pipeline stage filters (Lead / Quoted / Applied / Issued / Declined)
- Client detail page: contact info, notes/interaction history log, a task list, and a follow-up date + note
- Every agent only sees their own clients; an `admin` role (set manually, see below) sees everyone's

## One-time setup

### 1. Create a Supabase project

Go to [supabase.com](https://supabase.com), create a free account, and create a new project. Free tier is plenty for a small team.

### 2. Run the database schema

In your Supabase project: **SQL Editor → New query**, paste the entire contents of `supabase/schema.sql`, and run it. This creates every table, security rule, and trigger this app needs.

### 3. Get your API keys

In your Supabase project: **Settings → API**. You'll need:
- **Project URL**
- **anon public** key
- **service_role** key (keep this one secret — it bypasses all security rules; only needed for later phases like the reminder-sending job)

### 4. Configure environment variables

```
cp .env.local.example .env.local
```

Then fill in the Supabase values you just copied. Leave the Resend/Google Calendar values blank for now — those are wired in Phase 3/4.

### 5. Install and run locally

```
npm install
npm run dev
```

Open http://localhost:3000 — it'll redirect you to `/login`. Click through to **Create an account** to make your first agent.

### 6. Make yourself an admin (optional)

By default every new signup is a plain `agent` (sees only their own clients). To make an account an `admin` (sees every agent's clients), run this in the Supabase SQL Editor:

```sql
update public.profiles set role = 'admin' where email = 'your-email@example.com';
```

## Deploying it live

The easiest path is [Vercel](https://vercel.com) (free tier, built by the makers of Next.js):

1. Push this project to a GitHub repository.
2. In Vercel: **New Project → import that repo**.
3. Add the same environment variables from `.env.local` in Vercel's project settings (**Settings → Environment Variables**).
4. Deploy. Vercel gives you a live URL immediately; you can attach your own domain afterward under **Settings → Domains**.

## What's next (already tracked as follow-up work)

- **Phase 3**: real email reminders — a scheduled job that checks the `reminders` table daily and emails agents whose follow-up is due (via Resend).
- **Phase 4**: Google Calendar two-way sync, plus a plain `.ics` feed URL any calendar app (Apple Calendar, Outlook) can subscribe to.
- **Phase 5**: move the Knowledge Base, Client Analyzer, and Downloads tab from the old single-file portal into this app, so it's genuinely one tool.
