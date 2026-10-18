// Small wrappers around the backend API.
async function request(method, path, body) {
  const res = await fetch(path, {
    method,
    headers: body ? { 'content-type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (res.status === 204) return null;
  let data = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }
  if (!res.ok) {
    const err = new Error(data?.error || `Request failed (${res.status})`);
    err.status = res.status;
    throw err;
  }
  return data;
}

export const api = {
  topics: () => request('GET', '/api/topics'),
  lab: (id) => request('GET', `/api/labs/${encodeURIComponent(id)}`),
  session: () => request('GET', '/api/session'),
  launch: (labId) => request('POST', '/api/session', { labId }),
  stop: () => request('DELETE', '/api/session'),
  submit: () => request('POST', '/api/session/submit'),
  log: () => request('GET', '/api/session/log'),
  resetEverything: () => request('POST', '/api/reset', { confirm: 'reset-everything' }),
};

// Server-sent events with automatic reconnect.
export function subscribe(onEvent) {
  let source;
  const connect = () => {
    source = new EventSource('/api/events');
    source.onmessage = (msg) => {
      try {
        onEvent(JSON.parse(msg.data));
      } catch {
        // Ignore malformed events.
      }
    };
    source.onerror = () => {
      source.close();
      setTimeout(connect, 2000);
    };
  };
  connect();
  return () => source?.close();
}
