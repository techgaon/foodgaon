// Offer content language is separate from the app interface language.
export function offerCodes({ fundedBy, value, generated = [] }) {
  const amount = String(value).replace(/[^0-9]/g, '').slice(0, 4) || '10';
  const codes = fundedBy === 'admin' ? [`FOODGAON${amount}`, `GAON${amount}`, `FGSAVE${amount}`] : generated;
  return [...new Set(codes.map(c => String(c).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12)).filter(c => c.length >= 4))].slice(0, 3);
}
export function offerLine(text, language, { type, value }) {
  if (language === 'en' || /[\u0900-\u097f]/u.test(text || '')) return text;
  // A model can return Roman Hindi even when asked for Devanagari. Never show that as the default Hindi line.
  return language === 'awa' ? `आपन पसंद कै खाना मँगावौ, ${type === 'flat' ? `₹${value}` : `${value}%`} कै छूट पावौ!` : `अपना पसंदीदा खाना मँगाएँ और ${type === 'flat' ? `₹${value}` : `${value}%`} की छूट पाएँ!`;
}
export function offerTarget({ admin, restaurantId = '', fundedBy }) {
  return { restaurantId, fundedBy: admin ? (restaurantId ? fundedBy : 'admin') : 'restaurant' };
}
