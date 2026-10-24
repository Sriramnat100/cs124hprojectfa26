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
  if (!res.ok && data === null && res.status >= 500) {
    // Vite answers with an empty 500 when the backend isn't running.
    throw new Error("Can't reach the backend. Is uvicorn running in another terminal?");
  }
  if (res.status === 401 && token) {
    // The session expired (or was logged out elsewhere): forget it and log in again.
    setToken(null);
    window.location.assign("/login");
  }
  if (!res.ok) throw new Error(data?.detail ?? `Request failed (${res.status})`);
  return data;
}
