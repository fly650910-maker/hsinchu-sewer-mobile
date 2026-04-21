import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const IS_PROD = process.env.NODE_ENV === 'production';

// Format: ACCOUNTS=user1:pass1,user2:pass2
function parseAccounts(): Map<string, string> {
  const accounts = new Map<string, string>();
  const raw = process.env.ACCOUNTS || '';
  if (raw) {
    for (const entry of raw.split(',')) {
      const colonIdx = entry.indexOf(':');
      if (colonIdx > 0) {
        const username = entry.slice(0, colonIdx).trim();
        const password = entry.slice(colonIdx + 1).trim();
        if (username && password) accounts.set(username, password);
      }
    }
  }
  // Legacy fallback: any username with single password
  if (accounts.size === 0) {
    const legacyPass = process.env.GIS_PASSWORD || 'hchg2620';
    accounts.set('admin', legacyPass);
    accounts.set('__any__', legacyPass);
  }
  return accounts;
}

function isValidCredentials(username: string, password: string): boolean {
  const accounts = parseAccounts();
  const stored = accounts.get(username);
  if (stored && stored === password) return true;
  // Legacy: any username with the single password
  const anyPass = accounts.get('__any__');
  if (anyPass && anyPass === password) return true;
  return false;
}

// Validate gis_auth cookie (base64 encoded "username:password")
function isValidCookie(cookieValue: string): boolean {
  try {
    const decoded = Buffer.from(cookieValue, 'base64').toString('utf-8');
    const colonIdx = decoded.indexOf(':');
    if (colonIdx < 0) return false;
    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);
    return isValidCredentials(username, password);
  } catch {
    return false;
  }
}

// Validate Basic Auth header
function isValidBasicAuth(authHeader: string): boolean {
  if (!authHeader.startsWith('Basic ')) return false;
  try {
    const decoded = atob(authHeader.slice(6));
    const colonIdx = decoded.indexOf(':');
    if (colonIdx < 0) return false;
    const username = decoded.slice(0, colonIdx);
    const password = decoded.slice(colonIdx + 1);
    return isValidCredentials(username, password);
  } catch {
    return false;
  }
}

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Static assets: always allow
  if (
    pathname.startsWith('/_next/') ||
    pathname === '/favicon.ico' ||
    pathname.endsWith('.html')
  ) {
    return NextResponse.next();
  }

  // Local dev: allow everything
  if (!IS_PROD) {
    return NextResponse.next();
  }

  // Login page and auth API: always allow (no redirect loop)
  if (pathname === '/login' || pathname.startsWith('/api/auth/')) {
    return NextResponse.next();
  }

  // Cloud mode: only /gis and /api/gis/*
  const isGisPage = pathname === '/gis' || pathname.startsWith('/gis/');
  const isGisApi  = pathname.startsWith('/api/gis/');

  if (!isGisPage && !isGisApi) {
    return NextResponse.redirect(new URL('/gis', request.url));
  }

  // Check cookie auth (for browser users)
  const authCookie = request.cookies.get('gis_auth')?.value;
  if (authCookie && isValidCookie(authCookie)) {
    return NextResponse.next();
  }

  // Check Basic Auth header (for API clients)
  const authHeader = request.headers.get('authorization') || '';
  if (isValidBasicAuth(authHeader)) {
    return NextResponse.next();
  }

  // API requests: return 401
  if (isGisApi) {
    return new NextResponse(null, {
      status: 401,
      headers: { 'WWW-Authenticate': 'Basic realm="Hsinchu Sewerage GIS"' },
    });
  }

  // Browser page requests: redirect to login page
  const loginUrl = new URL('/login', request.url);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
