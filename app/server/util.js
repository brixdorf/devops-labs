import crypto from 'node:crypto';

export function randomHex(length) {
  return crypto.randomBytes(Math.ceil(length / 2)).toString('hex').slice(0, length);
}

export function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Polls fn until it returns a truthy value or the timeout passes.
export async function waitFor(fn, { timeoutMs = 60000, intervalMs = 1000, description = 'condition', signal } = {}) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (signal?.aborted) throw new AbortError();
    try {
      const value = await fn();
      if (value) return value;
    } catch (err) {
      lastError = err;
    }
    await sleep(intervalMs);
  }
  const reason = lastError ? `: ${lastError.message}` : '';
  throw new Error(`Timed out waiting for ${description}${reason}`);
}

export class AbortError extends Error {
  constructor() {
    super('Launch was cancelled');
    this.name = 'AbortError';
  }
}

export function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
