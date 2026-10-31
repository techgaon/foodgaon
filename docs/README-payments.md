# FoodGaon — ऑनलाइन भुगतान चालू करने के कदम (Razorpay Route)

ऐप में ऑनलाइन भुगतान का पूरा ढाँचा बन चुका है, पर **बंद** है। नीचे के कदम पूरे होने पर एडमिन → Settings → Payments में
"Online payment gateway" पर टिक करते ही चालू हो जाएगा।

## पैसा कैसे बँटता है
- ग्राहक पूरा बिल ऑनलाइन देता है → Razorpay
- रेस्टोरेंट का हिस्सा (बिल − 5% GST − FoodGaon फ़ीस − पुराना COD बकाया) → **सीधे रेस्टोरेंट के खाते में**, डिलीवरी होने तक रुका (on hold)
- बाकी (5% GST + FoodGaon फ़ीस) → TechGaon AI Services का चालू खाता
- डिलीवर होते ही रेस्टोरेंट का पैसा छूट जाता है; रद्द/अस्वीकार होने पर ग्राहक को पूरा पैसा वापस (रेस्टोरेंट का हिस्सा भी वापस खिंच जाता है)

## एक बार के काम (भाई के खाते से)
1. **Razorpay खाता** — razorpay.com पर TECHGAON AI SERVICES के नाम से, चालू खाता + GST + PAN से KYC।
2. **Route चालू करवाएँ** — Razorpay सपोर्ट को लिखें: "Please enable Route (marketplace split payments) for our food ordering platform FoodGaon".
3. **API keys** — Razorpay Dashboard → Account & Settings → API Keys → Generate. Key ID और Key Secret मिलेंगे।
4. **Webhook** — Dashboard → Webhooks → Add:
   - URL: `https://asia-south1-petpyaar-a3ea6.cloudfunctions.net/razorpayWebhook`
   - Events: `payment.captured`, `payment.failed`
   - एक secret (कोई भी लंबा पासवर्ड) लिखें — यही RAZORPAY_WEBHOOK_SECRET है।
5. **Firebase Blaze प्लान** — Firebase console → Upgrade (कार्ड जोड़ना होगा; छोटे इस्तेमाल पर ख़र्च लगभग शून्य)।
6. **Service account key** — Firebase console → Project settings → Service accounts → Generate new private key (JSON फ़ाइल)।
7. **GitHub में secrets डालें** — github.com/techgaon/foodgaon → Settings → Secrets and variables → Actions → New repository secret:
   `FIREBASE_SERVICE_ACCOUNT` (JSON फ़ाइल का पूरा text), `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET`, `RAZORPAY_WEBHOOK_SECRET`।
   **ये चाबियाँ कभी WhatsApp/चैट में न भेजें।**
8. **Deploy** — Actions → "FoodGaon server" → Run workflow → `server-and-rules`।
9. **हर रेस्टोरेंट जोड़ें** — एडमिन → Restaurants → "Connect online pay" (उसकी आवेदन फ़ाइल से बैंक जानकारी Razorpay को जाती है)।
   कुछ घंटों में "Check online pay" दबाने पर ✓ Online pay दिखेगा।
10. एडमिन → Settings → Payments → "Online payment gateway" ✔ → Save।

पहले Razorpay की **test keys** से पूरा चलाकर देखें, फिर live keys डालकर दोबारा `server-and-rules` चलाएँ।
