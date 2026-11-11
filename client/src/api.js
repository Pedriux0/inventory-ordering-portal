// one small helper for every call to the express api
// it adds the JWT, turns the json answer into data, and turns error answers into a thrown Error
// so pages can just do: try { await api.get('/products') } catch (err) { show err.message }

const TOKEN_KEY = 'portal_token';

// sessionStorage: the token is gone when the browser tab is closed
// (safer than localStorage, which would keep the login forever)
export function getToken() {
  return sessionStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) sessionStorage.setItem(TOKEN_KEY, token);
  else sessionStorage.removeItem(TOKEN_KEY);
}

// called when the server says our token is no longer valid (expired after 8h, etc)
let onUnauthorized = () => {};
export function setUnauthorizedHandler(handler) {
  onUnauthorized = handler;
}

async function request(method, path, body, { withTotal = false } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  // a 401 on any call except login means the session is over
  if (res.status === 401 && path !== '/auth/login') {
    onUnauthorized();
  }

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    // the api always answers errors as { error: '...' }, and never with internal details
    const err = new Error(data.error || 'Something went wrong. Please try again later.');
    err.status = res.status;
    throw err;
  }
  // paged lists (week 7): the api sends how many records match in the X-Total-Count header
  if (withTotal) {
    return { items: data, total: Number(res.headers.get('X-Total-Count') ?? data.length) };
  }
  return data;
}

export const api = {
  get: (path) => request('GET', path),
  // { items, total } for a paged list, e.g. api.getPage('/products?page=2&limit=25')
  getPage: (path) => request('GET', path, undefined, { withTotal: true }),
  post: (path, body) => request('POST', path, body),
  put: (path, body) => request('PUT', path, body),
};

// small display helpers used by several pages
export const money = (value) =>
  Number(value).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

export const shortDate = (value) => (value ? String(value).slice(0, 10) : '');

// today as YYYY-MM-DD in the user's own timezone (for date inputs)
export function today() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

// "1 unit", "4 units"
export const plural = (count, word) => `${count} ${word}${count === 1 ? '' : 's'}`;

// "2026-10-20" -> "Oct 20, 2026" for showing to people (docs/UX_EVALUATION.md)
// built from the parts so the timezone can never move it to another day
export function displayDate(value) {
  const text = shortDate(value);
  const [year, month, day] = text.split('-').map(Number);
  if (!year || !month || !day) return text;
  return new Date(year, month - 1, day).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}
