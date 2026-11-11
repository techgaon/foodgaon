import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { GMAPS_KEY, loadGoogleMaps } from '../lib/gmaps.js';

const pinHtml = (kind) => `<div class="mpin mpin-${kind}"><span>${
  kind === 'rest' ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l2-5h14l2 5M3 9h18v2a3 3 0 0 1-6 0 3 3 0 0 1-6 0 3 3 0 0 1-6 0zM5 13v8h14v-8"/></svg>'
  : kind === 'home' ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z"/></svg>'
  : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="#fff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5.5 18a3 3 0 1 0 0-6 3 3 0 0 0 0 6zm13 0a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM8 15h6l3-6h-4M14 6h3l1.5 9M5.5 15 9 9h4"/></svg>'
}</span></div>`;
const icon = (kind) => L.divIcon({ className: 'mpin-wrap', html: pinHtml(kind), iconSize: [40, 48], iconAnchor: [20, 46] });

/**
 * points: [{ id, kind: 'rest'|'home'|'rider', lat, lng }]
 * draggable: id of a point the user can drag (onDrag gets {lat,lng})
 */
export default function MapView(props) {
  const [g, setG] = React.useState(() => (GMAPS_KEY ? 'try' : 'no'));
  useEffect(() => { const f = () => setG('no'); window.addEventListener('fg-gmaps-fail', f); return () => window.removeEventListener('fg-gmaps-fail', f); }, []);
  return g === 'no' ? <LeafletMap {...props} /> : <GoogleMap {...props} onFail={() => setG('no')} />;
}

function LeafletMap({ points = [], height = 220, draggable, onDrag, line = true, follow = false, className = '' }) {
  const el = useRef(null);
  const map = useRef(null);
  const markers = useRef({});
  const poly = useRef(null);
  const fitted = useRef('');

  const layers = useRef({});
  const dragRef = useRef(null);
  dragRef.current = draggable && onDrag ? onDrag : null;
  const [sat, setSat] = React.useState(() => { try { return localStorage.getItem('pp_map_sat') === '1'; } catch { return false; } });

  useEffect(() => {
    map.current = L.map(el.current, { zoomControl: false, attributionControl: true, maxZoom: 19 }).setView([26.6178, 81.3657], 15);
    layers.current.street = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19, attribution: '© OpenStreetMap contributors' });
    // satellite photo + place names — shows houses, roads and fields even where street data is thin (villages)
    layers.current.sat = L.layerGroup([
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18, attribution: 'Imagery © Esri' }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Boundaries_and_Places/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18 }),
      L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/Reference/World_Transportation/MapServer/tile/{z}/{y}/{x}', { maxZoom: 19, maxNativeZoom: 18, opacity: 0.8 }),
    ]);
    L.control.zoom({ position: 'bottomright' }).addTo(map.current);
    // tap anywhere to move the draggable pin there
    map.current.on('click', (e) => { if (dragRef.current) dragRef.current({ lat: e.latlng.lat, lng: e.latlng.lng }); });
    // maps inside sliding sheets get the wrong size at first → keep fixing the size while it settles
    const fix = () => map.current?.invalidateSize();
    const timers = [100, 350, 800, 1500].map((ms) => setTimeout(fix, ms));
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(fix) : null;
    ro?.observe(el.current);
    return () => { timers.forEach(clearTimeout); ro?.disconnect(); map.current.remove(); map.current = null; markers.current = {}; };
  }, []);
  useEffect(() => {
    const m = map.current; if (!m) return;
    const on = sat ? layers.current.sat : layers.current.street; const off = sat ? layers.current.street : layers.current.sat;
    if (m.hasLayer(off)) m.removeLayer(off);
    if (!m.hasLayer(on)) on.addTo(m);
    try { localStorage.setItem('pp_map_sat', sat ? '1' : '0'); } catch { /* ignore */ }
  }, [sat]);

  useEffect(() => {
    const m = map.current; if (!m) return;
    const valid = points.filter((p) => p && p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    const seen = new Set();
    valid.forEach((p) => {
      seen.add(p.id);
      let mk = markers.current[p.id];
      if (!mk) {
        mk = L.marker([p.lat, p.lng], { icon: icon(p.kind), draggable: draggable === p.id }).addTo(m);
        if (draggable === p.id) mk.on('dragend', () => { const ll = mk.getLatLng(); dragRef.current?.({ lat: ll.lat, lng: ll.lng }); });
        markers.current[p.id] = mk;
      } else {
        const cur = mk.getLatLng();
        if (cur.lat !== p.lat || cur.lng !== p.lng) animateTo(mk, p);
      }
    });
    Object.keys(markers.current).forEach((id) => { if (!seen.has(id)) { markers.current[id].remove(); delete markers.current[id]; } });
    if (poly.current) { poly.current.remove(); poly.current = null; }
    if (line && valid.length > 1) {
      poly.current = L.polyline(valid.map((p) => [p.lat, p.lng]), { color: '#e8461a', weight: 4, opacity: 0.7, dashArray: '8 10' }).addTo(m);
    }
    const key = valid.map((p) => follow ? `${p.id}:${p.lat}:${p.lng}` : p.id).join(',');
    if (key && fitted.current !== key) {
      fitted.current = key;
      if (valid.length === 1) m.setView([valid[0].lat, valid[0].lng], 17);
      else m.fitBounds(L.latLngBounds(valid.map((p) => [p.lat, p.lng])), { padding: [40, 40], maxZoom: 17 });
    }
  }, [points, draggable, line, follow]); // eslint-disable-line

  return (
    <div className={'mapwrap ' + className} style={{ height }}>
      <div ref={el} className="mapview" style={{ height: '100%' }} />
      <button type="button" className="map-toggle" onClick={() => setSat(!sat)}>{sat ? '🗺️ Map' : '🛰️ Satellite'}</button>
    </div>
  );
}

function animateTo(mk, p) {
  const from = mk.getLatLng(); const t0 = performance.now(); const dur = 900;
  const step = (t) => {
    const k = Math.min(1, (t - t0) / dur); const e = k * (2 - k);
    mk.setLatLng([from.lat + (p.lat - from.lat) * e, from.lng + (p.lng - from.lng) * e]);
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

/* ---------- Google Maps version (same props) ---------- */
const PIN_COLOR = { rest: '#e8461a', home: '#1e9e55', rider: '#1b74e4' };
function pinEl(kind) { const d = document.createElement('div'); d.innerHTML = pinHtml(kind); d.firstChild.style.setProperty('--c', PIN_COLOR[kind] || '#e8461a'); return d.firstChild; }
function GoogleMap({ points = [], height = 220, draggable, onDrag, line = true, follow = false, className = '', search = false, onFail }) {
  const el = useRef(null); const box = useRef(null);
  const map = useRef(null); const lib = useRef(null);
  const markers = useRef({}); const poly = useRef(null); const fitted = useRef('');
  const dragRef = useRef(null); dragRef.current = draggable && onDrag ? onDrag : null;
  const [ready, setReady] = React.useState(false);
  const [sat, setSat] = React.useState(() => { try { return localStorage.getItem('pp_map_sat') === '1'; } catch { return false; } });

  useEffect(() => {
    let dead = false;
    (async () => {
      try {
        const maps = await loadGoogleMaps(); if (dead) return;
        const [{ Map }, { AdvancedMarkerElement }] = await Promise.all([maps.importLibrary('maps'), maps.importLibrary('marker')]);
        lib.current = { maps, AdvancedMarkerElement };
        map.current = new Map(el.current, { center: { lat: 26.6178, lng: 81.3657 }, zoom: 15, mapId: 'DEMO_MAP_ID', disableDefaultUI: true, zoomControl: true, gestureHandling: 'greedy', clickableIcons: false, mapTypeId: sat ? 'hybrid' : 'roadmap' });
        map.current.addListener('click', (e) => { if (dragRef.current) dragRef.current({ lat: e.latLng.lat(), lng: e.latLng.lng() }); });
        if (search && box.current) {
          try {
            const { PlaceAutocompleteElement } = await maps.importLibrary('places');
            const pac = new PlaceAutocompleteElement({ includedRegionCodes: ['in'], locationBias: { center: { lat: 26.6178, lng: 81.3657 }, radius: 30000 } });
            pac.setAttribute('placeholder', 'गाँव / मोहल्ला / जगह खोजें');
            const pick = async (place) => { if (!place) return; await place.fetchFields({ fields: ['location'] }); const ll = place.location; if (ll && dragRef.current) dragRef.current({ lat: ll.lat(), lng: ll.lng() }); };
            pac.addEventListener('gmp-select', (e) => pick(e.placePrediction?.toPlace()));
            pac.addEventListener('gmp-placeselect', (e) => pick(e.place));
            box.current.appendChild(pac);
          } catch { /* search is optional */ }
        }
        setReady(true);
      } catch { if (!dead) onFail?.(); }
    })();
    return () => { dead = true; Object.values(markers.current).forEach((m) => { m.map = null; }); markers.current = {}; poly.current?.setMap(null); };
  }, []); // eslint-disable-line
  useEffect(() => { if (map.current) map.current.setMapTypeId(sat ? 'hybrid' : 'roadmap'); try { localStorage.setItem('pp_map_sat', sat ? '1' : '0'); } catch { /* ignore */ } }, [sat]);

  useEffect(() => {
    const m = map.current; if (!ready || !m) return;
    const { maps, AdvancedMarkerElement } = lib.current;
    const valid = points.filter((p) => p && p.lat != null && p.lng != null && Number.isFinite(Number(p.lat)) && Number.isFinite(Number(p.lng)));
    const seen = new Set();
    valid.forEach((p) => {
      seen.add(p.id); const pos = { lat: Number(p.lat), lng: Number(p.lng) };
      let mk = markers.current[p.id];
      if (!mk) {
        mk = new AdvancedMarkerElement({ map: m, position: pos, content: pinEl(p.kind), gmpDraggable: draggable === p.id });
        if (draggable === p.id) mk.addListener('dragend', () => { const ll = mk.position; dragRef.current?.({ lat: typeof ll.lat === 'function' ? ll.lat() : ll.lat, lng: typeof ll.lng === 'function' ? ll.lng() : ll.lng }); });
        markers.current[p.id] = mk;
      } else mk.position = pos;
    });
    Object.keys(markers.current).forEach((id) => { if (!seen.has(id)) { markers.current[id].map = null; delete markers.current[id]; } });
    poly.current?.setMap(null); poly.current = null;
    if (line && valid.length > 1) poly.current = new maps.Polyline({ map: m, path: valid.map((p) => ({ lat: Number(p.lat), lng: Number(p.lng) })), strokeOpacity: 0, icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 0.8, strokeColor: '#e8461a', scale: 3 }, offset: '0', repeat: '14px' }] });
    const key = valid.map((p) => follow ? `${p.id}:${p.lat}:${p.lng}` : p.id).join(',');
    if (key && fitted.current !== key) {
      fitted.current = key;
      if (valid.length === 1) { m.setCenter({ lat: Number(valid[0].lat), lng: Number(valid[0].lng) }); m.setZoom(18); }
      else { const b = new maps.LatLngBounds(); valid.forEach((p) => b.extend({ lat: Number(p.lat), lng: Number(p.lng) })); m.fitBounds(b, 40); }
    }
  }, [points, draggable, line, follow, ready]); // eslint-disable-line

  return (
    <div className={'mapwrap gmap ' + className} style={{ height }}>
      {search && <div ref={box} className="map-search" />}
      <div ref={el} className="mapview" style={{ height: '100%' }} />
      <button type="button" className="map-toggle" onClick={() => setSat(!sat)}>{sat ? '🗺️ Map' : '🛰️ Satellite'}</button>
    </div>
  );
}
