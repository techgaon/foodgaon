# Restaurant login PIN

The web client supports existing default OTP 1234 accounts and six-digit restaurant PINs. Setting a PIN replaces the actual Firebase Auth password, so the default password cannot authenticate afterward. PINs are never stored in public restaurant/staff records or logs. Firebase Auth handles password verification and throttling.

- Admin: Restaurants → Set / reset login PIN. Assign a new PIN after checking the registered owner number. Reset means assigning a new PIN, not revealing the previous PIN.
- Owner: Shop → Change my login PIN. Current OTP/PIN is required for Firebase reauthentication.
- Login: registered mobile number → Restaurant PIN login. Existing default OTP mode also accepts the six-digit PIN.
- The admin callable checks admin authority, restaurant existence, owner phone and staff linkage, and refuses admin accounts. Password reset revokes refresh tokens; already issued ID tokens can remain valid until expiry.
- No existing passwords are changed merely by deploying these files.

## Deployment

Deploy only the new callable to the existing project using an authorized Firebase CLI session:

```sh
firebase deploy --project petpyaar-a3ea6 --only functions:setRestaurantLoginPin
```

Do not deploy payment functions or change Firestore rules as part of this feature. Default OTP is the existing test-phase behavior; real SMS mode remains a possession-based sign-in method. No actual owner credential was changed during UI verification.

## Validation

```sh
node tests/restaurant-pin.cjs
node tests/foodgaon.cjs
node node_modules/vite/bin/vite.js build
```

Server authorization is covered with mocked Auth/Firestore dependencies. Full live admin reset testing requires deployment and a designated disposable restaurant account. Do not test by resetting a real owner's PIN.

References: https://firebase.google.com/docs/auth/admin/manage-users and https://firebase.google.com/docs/auth/web/manage-users
