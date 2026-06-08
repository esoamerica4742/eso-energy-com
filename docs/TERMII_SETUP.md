# Termii SMS for Supabase Phone OTP

Use Termii to deliver **Supabase Auth** OTPs (Eso Pay phone login at `/pay-auth`).
Supabase still generates and validates the OTP — Termii only sends the SMS.

**Never put Termii keys in the mobile app** (`eso-energy-mobile/.env`). They live in Supabase Edge secrets only.

---

## 1. Termii Dashboard

1. Log in at [termii.com](https://termii.com).
2. **Settings → API token** — copy your **API key** (Termii uses one API key for SMS send; there is no separate “secret” for this flow).
3. **Sender ID** — register an alphanumeric ID (e.g. `ESOENERGY`) and wait for approval.
4. Ensure your Termii account is **live** (not sandbox) and has SMS balance.

---

## 2. Deploy the SMS hook (Supabase)

From `eso-energy-com` (replace `YOUR_PROJECT_REF`):

```powershell
cd "C:\Users\Preci\ESO ENERGY PROJECT\eso-energy-com"
npx supabase@latest login
npx supabase@latest link --project-ref YOUR_PROJECT_REF
```

Set secrets (paste your real values):

```powershell
npx supabase@latest secrets set TERMII_API_KEY="your-termii-api-key"
npx supabase@latest secrets set TERMII_SENDER_ID="ESOENERGY"
```

Deploy the function (**no JWT** — Supabase Auth calls it via signed webhook):

```powershell
npx supabase@latest functions deploy sms-hook --no-verify-jwt
```

---

## 3. Enable Send SMS Hook (Supabase Dashboard)

1. Open **Authentication → Hooks**  
   `https://supabase.com/dashboard/project/YOUR_PROJECT_REF/auth/hooks`
2. **Add hook → Send SMS**
3. Enable **Send SMS hook**
4. Type: **HTTPS**
5. URL:

   `https://YOUR_PROJECT_REF.supabase.co/functions/v1/sms-hook`

6. Click **Generate secret**, copy it, then:

   ```powershell
   npx supabase@latest secrets set SEND_SMS_HOOK_SECRET="v1,whsec_....paste-full-secret...."
   ```

   Use the **full** value from the dashboard (including `v1,whsec_`).

---

## 4. Enable Phone auth

1. **Authentication → Providers → Phone** → **Enable**
2. You do **not** need Twilio/MessageBird when the Send SMS hook is enabled — the hook replaces built-in SMS sending.
3. Save.

---

## 5. Mobile app

No Termii variables in `.env`. Only:

```env
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

Phone OTP uses `signInWithOtp({ phone })` against the same Supabase project.

If you temporarily use **email for Eso Pay** (Option 1), phone + Termii are only needed when you route users back to `/pay-auth`.

Restart Expo after any `.env` change:

```powershell
cd eso-energy-mobile
npx expo start -c
```

---

## 6. Test

1. Supabase **Authentication → Users** (optional: delete test users).
2. In the app: **Access → Eso Pay** (phone flow) or `/pay-auth`.
3. Enter a Nigerian number (`+234…`).
4. Check **Edge Functions → sms-hook → Logs** if SMS does not arrive.

Common issues:

| Symptom | Fix |
|--------|-----|
| Hook 401 | Regenerate hook secret; re-set `SEND_SMS_HOOK_SECRET` |
| Termii 401/403 | Wrong API key or sender ID not approved |
| No SMS, hook 200 | Check Termii balance; number format `234803…` |
| OTP invalid | Supabase issue, not Termii — check Auth logs |

---

## Security

- Rotate Termii API key if it was ever committed to git or placed in mobile `.env`.
- Do not commit `.env` files with live keys.
