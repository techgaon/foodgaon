import React from 'react';
import { Logo, Wordmark } from '../ui.jsx';
import { feeTerms, feeLine, feeLineHi, AGREEMENT_VERSION } from '../lib/partner.js';
import { fmtDateTime, plain } from '../lib/utils.js';

const FIRM = {
  name: 'TECHGAON AI SERVICES', owner: 'Suraj Bhan Pandey', gstin: '09DBSPP3533H1Z5',
  addr: '00, Pandey Home, PO & PS Subeha, Rampur, Haidergarh, District Barabanki, Uttar Pradesh – 225125',
  udyam: 'UDYAM-UP-14-0065110', email: 'contact@techgaon.in', phone: '+91 91292 03268',
};

/** Restaurant Partner Agreement — shown in the app (to read and accept) and saved as PDF (to print and sign).
 *  `a` = partner application (or restaurant data), `config` = app config. Text is fixed in Hindi + English. */
export default function PartnerAgreement({ a = {}, config = {}, accepted }) {
  const f = a.terms || feeTerms(config, a);
  const firmGstin = config.gstin || FIRM.gstin;
  const firmAddr = config.firmAddress && config.firmAddress.length > 30 ? config.firmAddress : FIRM.addr;
  const blank = (v, w = 160) => (v ? <b>{v}</b> : <span className="ag-blank" style={{ width: w }} />);
  return (
    <div className="agreement" data-notr="">
      <div className="doc-head">
        <div className="row gap"><Logo size={40} /><div><Wordmark size={24} /><div className="doc-firm">{FIRM.name}</div></div></div>
        <div className="doc-title"><b>Restaurant Partner Agreement</b><small>रेस्टोरेंट पार्टनर अनुबंध · {AGREEMENT_VERSION}</small></div>
      </div>

      <div className="ag-parties">
        <div>
          <small>Platform / प्लेटफ़ॉर्म</small>
          <b>FoodGaon — a service of {FIRM.name}</b>
          <span>Proprietor: {FIRM.owner}</span>
          <span>{firmAddr}</span>
          <span>GSTIN: {firmGstin} · Udyam: {FIRM.udyam}</span>
          <span>{FIRM.phone} · {FIRM.email}</span>
        </div>
        <div>
          <small>Restaurant partner / रेस्टोरेंट</small>
          <span>Name: {blank(a.restName)}</span>
          <span>Owner: {blank(a.ownerName)} · Mobile: {blank(plain(a.ownerPhone), 90)}</span>
          <span>Address: {blank(a.address, 220)}</span>
          <span>FSSAI: {blank(a.fssai, 120)} · PAN: {blank(a.pan, 90)}</span>
          <span>GSTIN: {a.gstin ? <b>{a.gstin}</b> : 'Not registered'}</span>
        </div>
      </div>

      <div className="ag-promise" lang="hi">
        <b>FoodGaon का वादा — ग्राहक से</b>
        <span>✔ वही दाम जो दुकान पर</span><span>✔ वही मात्रा, वही स्वाद</span><span>✔ कोई प्लेटफ़ॉर्म फ़ीस, पैकिंग चार्ज या छुपा शुल्क नहीं</span><span>✔ घर तक मुफ़्त डिलीवरी</span>
      </div>

      <h4 className="ag-h" lang="hi">सरल भाषा में मुख्य बातें</h4>
      <ol className="ag-list" lang="hi">
        <li>FoodGaon आपका मेन्यू ऐप पर दिखाएगा और ऑर्डर आप तक पहुँचाएगा। खाना आप बनाएँगे, पैक करेंगे और <b>अपने डिलीवरी बॉय</b> से पहुँचाएँगे।</li>
        <li><b>दाम, मात्रा और गुणवत्ता बिलकुल दुकान जैसी</b> रहेगी। FoodGaon पर दाम काउंटर से ज़्यादा नहीं होगा, पैकिंग का ख़र्च दाम में ही शामिल रहेगा।</li>
        <li>खाने पर 5% GST <b>FoodGaon सरकार को जमा करेगा</b> (धारा 9(5))। इन ऑर्डरों पर आपको GST नहीं भरना है।</li>
        <li>FoodGaon की फ़ीस: <b>{feeLineHi(f)}</b>। इसका टैक्स बिल FoodGaon देगा।</li>
        <li>ऑनलाइन भुगतान का आपका हिस्सा सीधे <b>आपके बैंक खाते</b> में जाएगा। नकद (COD) और सीधे UPI वाले ऑर्डरों का GST + फ़ीस आप हर हफ़्ते FoodGaon को भेजेंगे; बकाया ज़्यादा होने पर ऑनलाइन रकम से काटा जा सकता है और COD रोका जा सकता है।</li>
        <li>स्वीकार करने से पहले ग्राहक मुफ़्त रद्द कर सकता है। आपकी तरफ़ से रद्द होने या आपकी गलती से ख़राब खाने पर ग्राहक का पैसा लौटेगा और उसका ख़र्च आपका होगा।</li>
        <li>ग्राहक की राय और जाँच-ऑर्डर से गुणवत्ता देखी जाएगी। बार-बार शिकायत पर पहले चेतावनी, फिर कुछ दिन रोक, फिर हटाना।</li>
        <li>FoodGaon का नाम, लोगो, ऐप और सॉफ़्टवेयर TechGaon AI Services का है; उसकी नक़ल या बदलाव नहीं करेंगे। आपका नाम, लोगो और फ़ोटो आपके ही रहेंगे।</li>
        <li>कोई भी पक्ष 7 दिन की लिखित सूचना (WhatsApp/ईमेल भी) देकर अलग हो सकता है; बकाया हिसाब साफ़ करना होगा। फ़ीस बदलनी हो तो 15 दिन पहले बताया जाएगा।</li>
      </ol>

      <h4 className="ag-h">Terms</h4>
      <ol className="ag-list en">
        <li><b>Service.</b> FoodGaon lists the Restaurant's menu on its app and website and passes customer orders to the Restaurant. The Restaurant prepares, packs and delivers each order with its own delivery staff, within its delivery area.</li>
        <li><b>Same price, same portion, same quality.</b> Prices on FoodGaon shall not exceed the Restaurant's counter prices. Portion size, recipe and quality shall be the same as served at the counter. Food shall be freshly prepared. Packing cost is included in the item price; no extra charge of any kind is collected from the customer.</li>
        <li><b>Food safety.</b> The Restaurant holds a valid FSSAI licence/registration, follows hygiene rules, and lists only vegetarian items, as FoodGaon is a pure-vegetarian platform.</li>
        <li><b>GST.</b> FoodGaon, as the electronic commerce operator under Section 9(5) of the CGST Act, 2017, collects and pays the 5% GST on restaurant services supplied through FoodGaon. The Restaurant shall not charge GST again on these orders and shall report them as required by law.</li>
        <li><b>FoodGaon fee.</b> {feeLine(f)}. FoodGaon issues a tax invoice for its fee.</li>
        <li><b>Payments.</b> Online payments are collected through FoodGaon's payment gateway and split automatically; the Restaurant's share is settled to its bank account as per the gateway's settlement cycle after delivery. For cash-on-delivery and direct-UPI orders, the customer pays the Restaurant directly and the Restaurant pays FoodGaon's dues (GST + fee) every week (1–7, 8–14, 15–21, 22–28, 29–month end) by the next day. Unpaid dues may be adjusted from online settlements, and cash on delivery may be paused while dues exceed the limit set by FoodGaon.</li>
        <li><b>Cancellations and refunds.</b> A customer may cancel free of charge before the Restaurant accepts. If the Restaurant cancels, or a complaint about quality, quantity or a wrong item is found valid, the customer is refunded and the cost is borne by the Restaurant. A cancellation by the customer after acceptance is not refunded.</li>
        <li><b>Quality checks.</b> FoodGaon monitors ratings, complaints and test orders. Repeated valid complaints may lead to a warning, temporary suspension, or removal.</li>
        <li><b>Brand and software.</b> The FoodGaon name, logo, app, website and software belong to TechGaon AI Services. The Restaurant shall not copy, modify, rebrand or resell them. The Restaurant keeps its own name, logo and photos and permits FoodGaon to display them.</li>
        <li><b>Data.</b> Customer details are used only to fulfil orders and shall not be misused or shared.</li>
        <li><b>Term.</b> This agreement continues until ended by either party with 7 days' written notice (WhatsApp or e-mail is enough). All dues are settled on exit. FoodGaon gives 15 days' notice before changing its fee; the Restaurant may exit instead.</li>
        <li><b>Disputes.</b> Both parties will first try to settle any dispute by talking. Courts at Barabanki, Uttar Pradesh have jurisdiction.</li>
        <li><b>Acceptance.</b> This agreement is accepted electronically in the FoodGaon app and also by signing a printed copy. Both are valid.</li>
      </ol>

      {accepted?.name && (
        <div className="doc-note">
          Accepted electronically by <b>{accepted.name}</b>{accepted.ms ? ` on ${fmtDateTime(accepted.ms)}` : ''} from mobile {plain(a.ownerPhone)}. Fee locked at acceptance: {feeLine(f)}.
        </div>
      )}

      <div className="ag-sign">
        <div><span className="ag-line" /><small>For the Restaurant — signature, name, stamp</small><small>Date:</small></div>
        <div><span className="ag-line" /><small>For TECHGAON AI SERVICES (FoodGaon)</small><small>Date:</small></div>
      </div>
    </div>
  );
}
