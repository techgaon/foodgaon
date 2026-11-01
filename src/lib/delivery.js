// Boundaries: 0–4, >4–8, >8–20 km; beyond 20 uses the general minimum.
export function minimumOrderFor(rest = {}, config = {}, distance = null) {
  const base = Number(rest.minOrder ?? config.minOrder ?? 0);
  const band = distance == null || !Number.isFinite(distance) || distance < 0 ? null : distance <= 4 ? 'near' : distance <= 8 ? 'mid' : distance <= 20 ? 'far' : null;
  const value = band ? rest.minOrderBands?.[band] : null;
  return value != null && value !== '' && Number.isFinite(Number(value)) && Number(value) >= 0 ? Number(value) : base;
}
