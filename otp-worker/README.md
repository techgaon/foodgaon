# FoodGaon SMS OTP

Message Central VerifyNow sends and validates a six-digit SMS code. The Worker then signs a Firebase custom token with `fg_phone`. Existing phone-login Firebase UIDs remain unchanged, preserving orders and profiles. Verified migration replaces the legacy trial password with a random password. Disabled Firebase accounts stay disabled.

Deployment: `foodgaon-otp.surajbhanpandey853.workers.dev`, Firebase project `petpyaar-a3ea6`.

## Secrets and settings

Set `MC_CUSTOMER_ID`, `MC_PASSWORD`, `FB_SA_JSON` on the Worker. Store passwords and service-account JSON as encrypted Secrets, never in this repository or the app. Optional `REVIEW_PHONE` / encrypted `REVIEW_CODE` permit one ordinary customer review account without an SMS. Never assign this account staff privileges.

`keep_vars = true` preserves dashboard variables; encrypted Secrets persist across deployments. Existing KV is retained for compatibility; new sessions use the SQLite Durable Object `OTP_STATE`. It serializes verification and consumption to prevent simultaneous reuse. Deployment must include the `v1` migration in `wrangler.toml`.

Limits: one send per number per 60 seconds, five per hour per number, 40 send/verify requests per IP per hour, five validation attempts per session, and at most 50 SMS send attempts per UTC day (configurable `DAILY_SMS_LIMIT`). Counters persist in the Durable Object. These limits reduce abuse; they are not a guarantee against all automated requests. No automatic recharge or paid-plan upgrade is configured here.

Only configured browser origins pass CORS. `/health` reports configuration presence, not SMS delivery success. Errors never return provider responses or credentials. Request bodies contain phone numbers and OTPs; do not add request-body logging.

## Release order

1. Deploy and verify the Worker and its encrypted Secrets. Check the no-SMS review login first.
2. Test `node tests/otp-worker.mjs`, Firebase emulator `tests/otp-rules.cjs`, and the Vite build.
3. Publish the app update with the Message Central bridge; distribute the updated Android build.
4. Deploy `firestore.rules` before activating real mode. The rules keep trial access while `config/app.otpMode` is `mock`; in `real` mode old phone-email/password sessions lose access. Phone claims are trusted only for Firebase's `custom` provider. Google and native Firebase phone login remain supported.
5. Set `config/app.otpApi` to the Worker URL and `otpMode` to `real` only after confirming SMS delivery. Admins and restaurants then use real OTP, not the old trial PIN. Existing sessions may need to sign in again. Older APKs that lack the server bridge need updating.

The default remains trial mode until explicitly activated. Never publish review credentials in a PR, app bundle, screenshot, or logs. Enter review access instructions privately in Play Console when authorized.

## Checks

`tests/otp-worker.mjs` mocks provider/Firebase APIs: no paid SMS is sent. It checks signed claims, stable UID, disabled accounts, wrong codes, concurrent replay, expiry, origin rejection, and daily limits. `tests/otp-rules.cjs` uses the Firebase Firestore emulator and the official Firebase rules testing library; install that library in the sibling `FoodGaon verification tools/rules-test` directory before running it.
