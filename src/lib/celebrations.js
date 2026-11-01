export const RELATIONS = [['spouse', 'Spouse'], ['child', 'Child'], ['parent', 'Parent'], ['sibling', 'Sibling'], ['other', 'Other family member']];
export function localDate(now = new Date()) {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}
export function validPastDate(value, today = localDate()) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value < '1900-01-01' || value > today) return false;
  const [y, m, d] = value.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}
export function celebrationMessages(profile, today = localDate()) {
  if (!profile || profile.celebrationsEnabled === false) return [];
  const messages = [];
  const add = (name, birthday, anniversary, prefix) => {
    if (!name?.trim()) return;
    if (validPastDate(birthday, today) && birthday && birthday.slice(5) === today.slice(5)) messages.push({ id: `${prefix}-birthday`, text: `${name.trim()} जी, जन्मदिन की हार्दिक शुभकामनाएँ! आपका दिन खुशियों और मिठास से भरा रहे।` });
    if (validPastDate(anniversary, today) && anniversary && anniversary.slice(5) === today.slice(5)) messages.push({ id: `${prefix}-anniversary`, text: `${name.trim()} जी, शादी की सालगिरह की हार्दिक शुभकामनाएँ! आपके जीवन में प्यार और खुशियाँ बनी रहें।` });
  };
  add(profile.name, profile.birthday, profile.anniversary, 'self');
  for (const [i, member] of (Array.isArray(profile.family) ? profile.family : []).entries()) add(member.name, member.birthday, member.anniversary, `family-${i}`);
  return messages;
}
