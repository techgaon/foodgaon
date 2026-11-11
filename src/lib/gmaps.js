/* Google Maps (JavaScript API). The browser key is restricted to techgaon.in + the app, so it is safe to ship.
   Empty key → the app keeps using the free OpenStreetMap map. */
export const GMAPS_KEY = 'AIzaSyAyP8HGSM9uWiIYT_PbFMOxIlHXC2pHLjo';
let loading = null;
export function loadGoogleMaps() {
  if (!GMAPS_KEY) return Promise.reject(new Error('no key'));
  if (window.google?.maps?.importLibrary) return Promise.resolve(window.google.maps);
  if (loading) return loading;
  loading = new Promise((res, rej) => {
    window.__fgMapsReady = () => res(window.google.maps);
    window.gm_authFailure = () => { loading = null; rej(new Error('maps auth')); window.dispatchEvent(new Event('fg-gmaps-fail')); };
    const s = document.createElement('script');
    s.src = `https://maps.googleapis.com/maps/api/js?key=${GMAPS_KEY}&v=weekly&loading=async&language=hi&region=IN&libraries=places,geocoding&callback=__fgMapsReady`;
    s.async = true; s.onerror = () => { loading = null; rej(new Error('maps load')); };
    document.head.appendChild(s);
  });
  return loading;
}
/* pin → readable address (area / village), used to pre-fill the address form */
export async function reverseGeocode(lat, lng) {
  const maps = await loadGoogleMaps();
  const { Geocoder } = await maps.importLibrary('geocoding');
  const r = await new Geocoder().geocode({ location: { lat, lng } });
  const res = r.results?.[0]; if (!res) return null;
  const get = (...types) => res.address_components.find((c) => types.some((t) => c.types.includes(t)))?.long_name || '';
  return { area: [get('sublocality_level_1', 'sublocality', 'neighborhood'), get('locality', 'administrative_area_level_3')].filter(Boolean).filter((v, i, a) => a.indexOf(v) === i).join(', '), formatted: res.formatted_address };
}
