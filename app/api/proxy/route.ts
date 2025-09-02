import { NextRequest, NextResponse } from 'next/server';

// Simple in-memory rate limiter and cache.
// For production, consider Redis or an edge KV store.
const rateBuckets = new Map<string, { count: number; windowStart: number }>();
const cacheStore = new Map<string, { expires: number; payload: unknown }>();

const WINDOW_MS = 60_000; // 1 minute
const MAX_REQUESTS = 60; // per IP per window
const CACHE_TTL_MS = 30_000; // 30s default TTL

function rateLimit(ip: string): boolean {
  const now = Date.now();
  const rec = rateBuckets.get(ip);
  if (!rec || now - rec.windowStart > WINDOW_MS) {
    rateBuckets.set(ip, { count: 1, windowStart: now });
    return true;
  }
  if (rec.count >= MAX_REQUESTS) return false;
  rec.count += 1;
  return true;
}

function getIP(req: NextRequest): string {
  // Try common proxy headers. NextRequest doesn't expose a direct ip property.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',')[0]?.trim() || 'unknown';
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp;
  return 'unknown';
}

function isHttpUrl(url: string): boolean {
  try {
    const u = new URL(url);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

function cacheGet(key: string) {
  const hit = cacheStore.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    cacheStore.delete(key);
    return null;
  }
  return hit.payload;
}

function cacheSet(key: string, payload: unknown, ttl = CACHE_TTL_MS) {
  cacheStore.set(key, { expires: Date.now() + ttl, payload });
}

// Allow-list of headers a client can request to be forwarded (others are stripped)
const ALLOWED_FORWARD_HEADERS = new Set(['accept', 'accept-language']);

// If the client provides authEnv: 'MY_API_KEY', we add Authorization: Bearer <process.env.MY_API_KEY>
function buildUpstreamHeaders(clientHeaders: Record<string, string> | undefined, authEnv?: string) {
  const headers: Record<string, string> = {};
  if (clientHeaders) {
    for (const [k, v] of Object.entries(clientHeaders)) {
      const key = k.toLowerCase();
      if (ALLOWED_FORWARD_HEADERS.has(key)) headers[key] = v;
    }
  }
  if (authEnv) {
    const token = process.env[authEnv];
    if (token) headers['authorization'] = `Bearer ${token}`;
  }
  return headers;
}

export async function POST(req: NextRequest) {
  const ip = getIP(req);
  if (!rateLimit(ip)) {
    return NextResponse.json({ message: 'API limit reached, try later' }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ message: 'Invalid JSON body' }, { status: 400 });
  }

  const { url, method = 'GET', headers: clientHeaders, authEnv, authQueryParam, cacheTtlMs } = (body ?? {}) as {
    url?: string;
    method?: string;
    headers?: Record<string, string>;
    authEnv?: string;
    authQueryParam?: string;
    cacheTtlMs?: number;
  };

  if (!url || typeof url !== 'string' || !isHttpUrl(url)) {
    return NextResponse.json({ message: 'A valid HTTP/HTTPS url is required' }, { status: 400 });
  }

  if (method !== 'GET') {
    // Keep proxy read-only for safety.
    return NextResponse.json({ message: 'Only GET is allowed' }, { status: 405 });
  }

  const cacheKey = `${method}:${url}`;
  const cached = cacheGet(cacheKey);
  if (cached) {
    return NextResponse.json({ data: cached, cached: true }, { headers: { 'X-Cache': 'HIT' } });
  }

  try {
    const upstreamHeaders = buildUpstreamHeaders(clientHeaders, authEnv);

    // Optionally inject API key via query param from env (e.g., apikey for Alpha Vantage)
    let targetUrl = url;
    if (authEnv && authQueryParam) {
      const token = process.env[authEnv];
      if (token) {
        const u = new URL(url);
        if (!u.searchParams.has(authQueryParam)) {
          u.searchParams.set(authQueryParam, token);
          targetUrl = u.toString();
        }
      }
    }

    const upstream = await fetch(targetUrl, { method: 'GET', headers: upstreamHeaders, cache: 'no-store' });

    if (upstream.status === 429) {
      return NextResponse.json({ message: 'Upstream rate limit exceeded, try later' }, { status: 429 });
    }

    if (!upstream.ok) {
      const text = await upstream.text();
      return NextResponse.json({ message: `Upstream error ${upstream.status}`, detail: text.slice(0, 500) }, { status: 502 });
    }

    const data = await upstream.json();
    cacheSet(cacheKey, data, typeof cacheTtlMs === 'number' ? Math.max(0, cacheTtlMs) : CACHE_TTL_MS);

    return NextResponse.json({ data, cached: false }, { headers: { 'X-Cache': 'MISS' } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Proxy request failed';
    return NextResponse.json({ message }, { status: 500 });
  }
}
