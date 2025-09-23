export const API_BASE =
  import.meta.env.VITE_API_BASE?.replace(/\/+$/, '') || 'http://localhost:8080';

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let msg = '';
    try { msg = await res.text(); } catch {}
    throw new Error(msg || res.statusText);
  }
  return res.json();
}

export const api = {
  get: <T>(path: string) => fetch(`${API_BASE}${path}`, { credentials: 'include' }).then(handle<T>),
  post: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handle<T>),
  put: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handle<T>),
  patch: <T>(path: string, body: unknown) =>
    fetch(`${API_BASE}${path}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(body),
    }).then(handle<T>),
  delete: <T>(path: string) =>
    fetch(`${API_BASE}${path}`, { method: 'DELETE', credentials: 'include' }).then(handle<T>),
};
