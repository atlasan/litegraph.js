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
// - RUNNER_ALLOWED_ORIGINS: comma-separated extra page origins allowed to open the WebSocket, e.g.
//   "http://127.0.0.1:8000" to drive the runner from the editor. Pages on the runner itself always are.
//
// Every refusal is logged with the setting that would allow it.

import { logger } from '../logger.js';

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

function originOf(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:' ? url.origin : null;
  } catch { return null; }
}

export function allowedOrigins(env = process.env) {
  return new Set((env.RUNNER_ALLOWED_ORIGINS || '').split(',').map((entry) => originOf(entry.trim())).filter(Boolean));
}

/**
 * Why a WebSocket upgrade is refused, with the setting that would allow it; null when allowed.
 * Non-browser clients send no Origin and are accepted (they can already reach the loopback port).
 * Browser clients must come from a page served by this runner (same host and port as the Host
 * header) or from an origin listed in RUNNER_ALLOWED_ORIGINS.
 * @returns {string|null}
 */
export function upgradeRefusal({ origin, host }, env = process.env) {
  if (!isAllowedHost(host, env)) return hostRefusal(host);
  if (origin === undefined) return null;
  const pageOrigin = originOf(origin);
  if (!pageOrigin) return `origin ${origin} is not a web page origin`;
  if (allowedOrigins(env).has(pageOrigin)) return null;
  // compare in URL-normalised form, so a default port ("localhost:80" vs "http://localhost") matches
  let hostUrl;
  try { hostUrl = new URL(`${new URL(pageOrigin).protocol}//${host}`); } catch { return `invalid Host ${host}`; }
  if (pageOrigin === hostUrl.origin) return null;
  return `page origin ${pageOrigin} is not this runner; to allow it, start the runner with RUNNER_ALLOWED_ORIGINS=${pageOrigin}`;
}

/** True when a WebSocket upgrade may proceed (see upgradeRefusal). */
export function isAllowedUpgrade(request, env = process.env) {
  return upgradeRefusal(request, env) === null;
}

function hostRefusal(hostHeader) {
  const hostname = hostnameOf(hostHeader);
  if (!hostname) return 'missing or invalid Host header';
  return `Host ${hostname} is not allowed; to allow it, start the runner with RUNNER_ALLOWED_HOSTS=${hostname.replace(/^\[|\]$/g, '')}`;
}

/** Express middleware rejecting requests whose Host header is not this runner. */
export function hostGuard(req, res, next) {
  if (isAllowedHost(req.headers.host)) return next();
  const reason = hostRefusal(req.headers.host);
  logger.warn(`Refused HTTP request: ${reason}`);
  res.status(403).type('text/plain').send(`Graph runner: ${reason}.\n`);
}
