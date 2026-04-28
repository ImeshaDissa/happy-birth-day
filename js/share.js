import { state } from './state.js';

const SHARE_KEYS = ['name', 'candleCount', 'cakeColor', 'frostingColor', 'wishMessage', 'candleMode', 'ageNumber'];

export function generateShareURL() {
  const payload = {};
  SHARE_KEYS.forEach(k => payload[k] = state[k]);
  const encoded = btoa(unescape(encodeURIComponent(JSON.stringify(payload))));
  const url = new URL(window.location.href);
  url.search = '';
  url.searchParams.set('cake', encoded);
  return url.toString();
}

export function loadFromURL() {
  const params  = new URLSearchParams(window.location.search);
  const encoded = params.get('cake');
  if (!encoded) return false;

  try {
    const payload = JSON.parse(decodeURIComponent(escape(atob(encoded))));
    SHARE_KEYS.forEach(k => { if (payload[k] !== undefined) state[k] = payload[k]; });
    return true;
  } catch (e) {
    console.warn('Invalid share link', e);
    return false;
  }
}