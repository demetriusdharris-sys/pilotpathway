# Supabase auth email templates

These live in the Supabase dashboard under **Authentication → Email Templates**, not in this repo. There is no other copy. This file exists so a bad edit can be rolled back and so the coupling below is written down somewhere.

---

## Confirm signup

### Why it was changed

`{{ .ConfirmationURL }}` produces a PKCE link. PKCE stores a `code_verifier` in the browser that started the signup, so the link only works in that same browser — open it on a different device, or in a mail app's in-app browser, and it fails with "link did not work."

Our audience is mobile-first. A student signs up on a phone and taps the link from their mail app; a guardian does the same from an invite. This was the first step of the funnel leaking, for exactly the people this product exists for.

`token_hash` + `verifyOtp` needs nothing stored in the browser, because the token travels in the URL. `src/app/auth/callback/route.ts` already handled that link shape, so the fix was config only — no code change.

### Current template (after the change)

```html
<h2>Confirm your email address</h2>

<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=email">Confirm email address</a></p>
```

### Previous template (rollback to this if confirmations break)

```html
<h2>Confirm your email address</h2>

<p>Follow the link below to confirm this email address and finish signing up.</p>
<p><a href="{{ .ConfirmationURL }}">Confirm email address</a></p>
```

### What the link resolves to

`{{ .RedirectTo }}` is whatever `signUp` passed as `emailRedirectTo`, so the finished URL looks like:

```
https://pilotpathway.vercel.app/auth/callback?next=%2Fdashboard&token_hash=<hash>&type=email
```

The callback reads `next` through `safeNext`, verifies the OTP, and redirects.

### Load-bearing coupling — do not "tidy" this away

**`signUp` appends `?next=` to `emailRedirectTo` unconditionally**, even when the value is just `/dashboard`. That is what guarantees `{{ .RedirectTo }}` already carries a query string, so the template can append `&token_hash=...` and produce a valid URL.

Make that append conditional and every confirmation link becomes
`https://.../auth/callback&token_hash=...` — malformed, and nobody can confirm an account. If you ever want `?next=` omitted when it is just the default, the template has to change in the same breath.

### Known edge case

A confirmation email triggered from somewhere other than our `signUp` — resending from the Supabase dashboard, for instance — may have an empty `{{ .RedirectTo }}`, which would produce a broken link. Our own signup flow always sets it.

---

## Reset password

### Why it must be changed

Exactly the same reason as Confirm signup. The default `{{ .ConfirmationURL }}` is a PKCE link, so a student who asks for a reset on their phone and opens the email in their mail app's browser gets "link did not work" — and this is worse than the signup case, because a student resetting their password is already locked out and has no other way in.

### Template to paste into Supabase (Authentication → Email Templates → Reset Password)

```html
<h2>Set a new password</h2>

<p>Follow the link below to choose a new password. It works once, and it expires.</p>
<p><a href="{{ .RedirectTo }}&token_hash={{ .TokenHash }}&type=recovery">Set a new password</a></p>

<p>If you did not ask for this, you can ignore this email — your password stays as it is.</p>
```

### Default template (rollback to this only if the change itself breaks something)

```html
<h2>Reset Password</h2>

<p>Follow this link to reset the password for your user:</p>
<p><a href="{{ .ConfirmationURL }}">Reset Password</a></p>
```

### What the link resolves to

`{{ .RedirectTo }}` is what `requestPasswordReset` passed, so:

```
https://pilotpathway.vercel.app/auth/callback?next=%2Freset-password&token_hash=<hash>&type=recovery
```

The callback already accepts `recovery` as an OTP type — it needed no change. It verifies the token, which establishes a session, and redirects to `/reset-password`, where the student sets the new password.

**`type=recovery` is not interchangeable with `type=email`.** The callback validates the value against Supabase's list and refuses anything else.

### The same load-bearing coupling

`requestPasswordReset` always passes `?next=/reset-password`, so `{{ .RedirectTo }}` always carries a query string and the template's `&token_hash=` is valid. Do not make that conditional.

### Why no current password is asked for

The person setting the password is, by definition, someone who does not have the old one. Possession of the single-use, short-lived link is what authorises the change — the same standard as the confirmation link.

---

## Other templates

Not currently customised and not currently used: magic link, change email address. If either is ever used, it needs the same `token_hash` treatment.
