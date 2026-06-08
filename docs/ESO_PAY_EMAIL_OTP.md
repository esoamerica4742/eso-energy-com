# Eso Pay email: 6-digit code (not magic link)

Eso Pay and Monitoring both use `signInWithOtp({ email })` **without** `emailRedirectTo`. Supabase still sends a **magic link** if the **Magic Link** email template contains `{{ .ConfirmationURL }}`.

## Fix (hosted project)

### Option A — script (recommended)

1. Create a [Supabase access token](https://supabase.com/dashboard/account/tokens).
2. Add to `eso-energy-com/.env`:
   ```
   SUPABASE_ACCESS_TOKEN=sbp_...
   ```
3. Run:
   ```bash
   node scripts/apply-email-otp-template.mjs
   ```

### Option B — Dashboard

1. [Supabase Dashboard](https://supabase.com/dashboard) → your project → **Authentication** → **Email Templates**.
2. Open **Magic Link**.
3. Replace the body with the contents of `supabase/templates/magic-link-otp.html` (must include `{{ .Token }}`, must **not** include `{{ .ConfirmationURL }}`).
4. Subject example: `Your ESO Energy sign-in code`.
5. Save.

## Verify

Request a code from the app (Eso Pay Bills → email). The email should show a **6-digit code**, not a “Log in” / “Confirm” link.

## “I don’t receive the code” (Gmail / Eso Pay)

1. Check **spam**, **Promotions**, and **Updates** (sender is usually Supabase `noreply@…`).
2. Wait **2–3 minutes** (free-tier mail can be slow).
3. Wait **60 seconds** between resends (rate limit).
4. If email arrives with only a **link**, fix the Magic Link template (`{{ .Token }}` only).
5. For reliable Gmail delivery: **Authentication → SMTP** → add Resend or SendGrid.
6. **Authentication → Providers → Email** must be **enabled**.

Test API (not delivery):

```bash
cd eso-energy-mobile
node scripts/probe-mobile-supabase.mjs
```

## Reference

- [Passwordless email logins (OTP)](https://supabase.com/docs/guides/auth/auth-email-passwordless#with-otp)
- Mobile: `eso-energy-mobile/src/lib/authOtp.js`
