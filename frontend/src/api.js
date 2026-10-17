// One helper for talking to the backend. It adds the login token automatically.
//
//   await api("/scooters/mine")                              GET
//   await api("/auth/login", { method: "POST", body: {...} }) JSON body
//   await api("/sightings", { method: "POST", body: formData }) photo upload

const TOKEN_KEY = "token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function setToken(token) {
  if (token) localStorage.setItem(TOKEN_KEY, token);
  else localStorage.removeItem(TOKEN_KEY);
}

export async function api(path, { method = "GET", body } = {}) {
  const headers = {};
  const token = getToken();
  if (token) headers.Authorization = `Bearer ${token}`;

  let payload = body;
  if (body !== undefined && !(body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
    payload = JSON.stringify(body);
  }

  const res = await fetch(`/api${path}`, { method, headers, body: payload });
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new Error(data?.detail ?? `Request failed (${res.status})`);
  return data;
}
