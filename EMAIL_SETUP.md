# Fixing invite emails for good (Gmail issue)

Confirmed cause: Gmail auto-scans links in incoming emails, which burns Supabase's one-time
invite link seconds after it's sent — before anyone can click it. Since your whole team is on
Gmail, this blocks every invite. The code side of the fix is already done (a new
`/auth/confirm` page that requires an actual button click instead of just loading a link, which
scanners don't do). But Supabase won't let the invite email point there until you have your own
outbound email sending set up ("custom SMTP") — right now the email content is locked to
Supabase's default template.

## What you need to do (when you're ready — not urgent tonight)

1. **Sign up for Resend** (resend.com) — free tier is plenty for this. Get an API key.
2. **Verify your sending domain** in Resend — it'll give you a few DNS records (TXT/CNAME) to
   add wherever generationalplaybook.com's DNS is managed (GoDaddy, Namecheap, Cloudflare,
   whichever you used to buy/manage the domain).
3. **In Supabase**: Authentication → Emails → there's a "Set up custom SMTP" button — plug in
   the SMTP host/port/username/API key Resend gives you.
4. **Edit the "Invite user" email template** (Authentication → Email Templates → Invite user →
   now unlocked). Replace the link's `{{ .ConfirmationURL }}` with:
   `{{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=invite&next={{ .RedirectTo }}`
5. Send a test invite to a Gmail address and confirm it works.

Until this is done: create advisor accounts manually (Authentication → Users → Add user, set a
temporary password, text it to them) instead of using the in-app invite flow.
