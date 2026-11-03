# Direct Merchant UPI / Pay via UPI Live

Adds `upi_live` alongside the existing `upi_now` screenshot, `upi_rider`, COD and optional gateway methods. No gateway or settlement path is changed. Platform fees/GST remain in the existing restaurant dues ledger, because the entire customer payment goes to the restaurant.

Parag (`restaurant.id === 'parag'`) defaults to the exact payee decoded from the user-supplied BHIM QR on 3 November 2026:

`upi://pay?pa=8081824545@upi&pn=PARAG%20MILK%20PARLOUR%20AND%20RESTAURANT`

The original QR contains no MCC. At the user's explicit request, the Parag app default adds MCC 5812 for testing, with mccSource=user-provided. This is not bank-verified MCC and does not alter the recorded original QR URI. Other merchants do not inherit this code. This default is shipped in app code; it is not a live Firestore migration. An explicitly saved directUpi configuration still takes precedence; the merchant/admin editor can set MCC 5812 there. Saving the restaurant/admin Merchant UPI editor persists an explicit `restaurants/{id}.directUpi` configuration and overrides the default (including disabling it). Other restaurants have no default payee. The existing manual-payment QR is unchanged.

Settings support a QR photo, URI paste, VPA, payee name, optional four-digit bank-provided MCC, and enable/disable. A source QR is a source of payee details, not proof of merchant onboarding. Adding MCC cannot change a personal VPA into a merchant account. This QR cannot guarantee acceptance by every UPI app.

Orders are created once in `awaiting_payment`, with the merchant snapshot and amount. Android opens the generic chooser via the existing Capacitor ActivityResult plugin. SUCCESS submits the existing order as a **customer payment claim**, never `paid: true`. ApprovalRefNo/UTR is kept separate from txnRef (which may just echo the order reference). Failure, cancellation, unknown or pending replies require explicit customer confirmation after checking the UPI app. Web uses a gesture button to open UPI and a one-tap confirmation after returning. A green tick means the order was sent, with restaurant payment confirmation still pending.

Restaurant alerts/cards show Direct Merchant UPI, amount, available UTR and pending confirmation. The restaurant checks its bank/business app/soundbox and presses Received. No screenshot, callback, customer-entered UTR or browser-return event is bank verification. Real automatic payment verification needs the acquiring bank/PSP's server-side transaction status interface.

Pending direct-payment drafts remain visible in customer Orders after reload and can be resumed without opening another payment automatically. The same draft ID is used on confirmation/retry. Do not pay again if already debited. The existing app uses client-calculated bills and Firestore order creation; this feature does not add a trusted server-side pricing service.

Validation: existing repository behavior tests, `node tests/direct-upi.cjs`, production Vite build, plus isolated browser flow tests (`tests/direct-upi-ui.cjs`, Playwright required). These tests mock UPI and Firestore: they do not transfer money, validate the VPA with the bank, prove merchant onboarding, or prove interoperability with an installed UPI app. The trial APK workflow compiles the native plugin; phone-based real payment/cancel/resume testing remains necessary before production rollout. Rule changes must be deployed separately with the existing rules workflow.

Official references:

- https://developers.google.com/pay/india/api/android/in-app-payments
- https://developers.google.com/pay/india/api/android/overview
- https://developer.android.com/training/basics/intents/result
