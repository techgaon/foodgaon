import { km } from './utils.js';
export const hasPoint = p => p && p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)) && Math.abs(Number(p.lat)) <= 90 && Math.abs(Number(p.lng)) <= 180;
export function deliverySlabs(rest = {}) {
  if (Array.isArray(rest.deliverySlabs)) return rest.deliverySlabs;
  if (rest.minOrderBands && Object.keys(rest.minOrderBands).length) return [{ upToKm: 4, minOrder: rest.minOrderBands.near ?? rest.minOrder ?? 0 }, { upToKm: 8, minOrder: rest.minOrderBands.mid ?? rest.minOrder ?? 0 }, { upToKm: 20, minOrder: rest.minOrderBands.far ?? rest.minOrder ?? 0 }];
  return [];
}
export function validSlabs(slabs, radius) {
  let previous = 0;
  return Array.isArray(slabs) && slabs.length <= 8 && slabs.every(s => { const end = Number(s.upToKm); const minimum = Number(s.minOrder); const ok = s.upToKm !== '' && s.minOrder !== '' && Number.isFinite(end) && end > previous && end <= Number(radius) && Number.isFinite(minimum) && minimum >= 0; previous = end; return ok; }) && (!slabs.length || previous === Number(radius));
}
export function minimumOrderFor(rest = {}, config = {}, distance = null) {
  const base = Number(rest.minOrder ?? config.minOrder ?? 0);
  if (distance == null || !Number.isFinite(distance) || distance < 0) return base;
  const match = deliverySlabs(rest).find(s => distance <= Number(s.upToKm));
  return match && match.minOrder !== '' && Number.isFinite(Number(match.minOrder)) && Number(match.minOrder) >= 0 ? Number(match.minOrder) : base;
}
export function servesAddress(rest, address, config = {}) {
  if (!hasPoint(address)) return true; // No delivery location selected yet.
  if (!hasPoint(rest)) return false; // A shop without a pin cannot promise delivery to a selected location.
  const radius = Number(rest.radiusKm ?? config.radiusKm ?? 5);
  return radius > 0 && km(address, rest) <= radius;
}

export function editableDeliverySlabs(rest) {
  if (Array.isArray(rest.deliverySlabs)) return rest.deliverySlabs;
  const radius = Number(rest.radiusKm ?? 5);
  const rows = deliverySlabs(rest).filter(s => Number(s.upToKm) <= radius);
  if (rows.length && Number(rows[rows.length - 1].upToKm) < radius) rows.push({ upToKm: radius, minOrder: minimumOrderFor(rest, {}, radius) });
  return rows;
}
