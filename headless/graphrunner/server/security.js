// Request checks for the graph runner's HTTP and WebSocket endpoints.
//
// The runner can execute graphs, so a web page the developer visits must not be able to drive it:
// - browsers send no CORS preflight for WebSockets, so the Origin header is checked explicitly;
// - the Host header is checked against an allowlist to defeat DNS rebinding (a foreign domain that
//   resolves to 127.0.0.1 is still same-origin with itself, but its Host header names that domain).
//
// Configuration (environment):
// - RUNNER_ALLOWED_HOSTS: comma-separated extra host names (without port) accepted in Host/Origin.
//   Loopback names and the configured HOST are always accepted.

const LOOPBACK = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

function hostnameOf(hostHeader) {
  if (typeof hostHeader !== 'string' || !hostHeader) return null;
  try { return new URL(`http://${hostHeader}`).hostname.toLowerCase(); } catch { return null; }
}

// A configured name as it appears in a Host header: a bare IPv6 address ("fe80::1") is bracketed.
function configuredHostname(name) {
  const trimmed = name.trim();
  if (!trimmed) return null;
  return hostnameOf(trimmed.includes(':') && !trimmed.startsWith('[') ? `[${trimmed}]` : trimmed);
}

export function allowedHostnames(env = process.env) {
  const hosts = new Set(LOOPBACK);
  const configured = [(env.HOST && env.HOST !== '0.0.0.0' && env.HOST !== '::') ? env.HOST : '', ...(env.RUNNER_ALLOWED_HOSTS || '').split(',')];
  for (const name of configured) {
    const hostname = configuredHostname(name);
    if (hostname) hosts.add(hostname);
  }
  return hosts;
}

/** True when the Host header names this runner (not a rebinding domain). */
export function isAllowedHost(hostHeader, env = process.env) {
  const hostname = hostnameOf(hostHeader);
  return hostname !== null && allowedHostnames(env).has(hostname);
}

/**
 * True when a WebSocket upgrade may proceed.
 * Non-browser clients send no Origin and are accepted (they can already reach the loopback port).
 * Browser clients must come from a page served by this runner: same host and port as the Host header.
 */
export function isAllowedUpgrade({ origin, host }, env = process.env) {
  if (!isAllowedHost(host, env)) return false;
  if (origin === undefined) return true;
  let parsed;
  try { parsed = new URL(origin); } catch { return false; }
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') return false;
  // compare in URL-normalised form, so a default port ("localhost:80" vs "http://localhost") matches
  let hostUrl;
  try { hostUrl = new URL(`${parsed.protocol}//${host}`); } catch { return false; }
  return parsed.host === hostUrl.host;
}

/** Express middleware rejecting requests whose Host header is not this runner. */
export function hostGuard(req, res, next) {
  if (isAllowedHost(req.headers.host)) return next();
  res.status(403).json({ error: 'Host not allowed' });
}
