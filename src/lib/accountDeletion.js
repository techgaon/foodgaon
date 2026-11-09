export const DELETION_POLICY_URL = 'https://techgaon.in/delete-account/';
export const DELETION_EMAIL = 'contact@techgaon.in';
const DELETION_WHATSAPP = '919129203268';

// Draft only: the user must send it in their chosen app. No account is deleted here.
export function deletionRequest({ phone = '', email = '' } = {}, translate = s => s) {
  const digits = String(phone).replace(/\D/g, '');
  const mobile = /^[6-9]\d{9}$/.test(digits) ? '+91' + digits : /^91[6-9]\d{9}$/.test(digits) ? '+' + digits : '';
  const cleanEmail = String(email).trim();
  const realEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) && !/@login\.foodgaon\.app$/i.test(cleanEmail) ? cleanEmail : '';
  const identity = [mobile && `${translate('Registered mobile')}: ${mobile}`, realEmail && `${translate('Google email')}: ${realEmail}`].filter(Boolean);
  const text = [translate('Please delete my FoodGaon account and associated personal data.'), ...identity,
    ...(!identity.length ? [translate('My registered mobile number or Google email:')] : []),
    translate('Please verify that I control this account before processing the request.'),
    translate('Please explain any records that must be retained and why.')].join('\n');
  return { text, mobile, email: realEmail,
    emailHref: `mailto:${DELETION_EMAIL}?subject=${encodeURIComponent('FoodGaon account and data deletion request')}&body=${encodeURIComponent(text)}`,
    whatsappHref: `https://wa.me/${DELETION_WHATSAPP}?text=${encodeURIComponent(text)}` };
}
