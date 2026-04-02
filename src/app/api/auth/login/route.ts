import { NextRequest, NextResponse } from 'next/server';

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
  if (accounts.size === 0) {
    const legacyPass = process.env.GIS_PASSWORD || 'hchg2620';
    accounts.set('gis', legacyPass);
    accounts.set('admin', legacyPass);
    // Also allow any username with the legacy password
    accounts.set('__any__', legacyPass);
  }
  return accounts;
}

function isValid(username: string, password: string): boolean {
  const accounts = parseAccounts();
  const stored = accounts.get(username);
  if (stored && stored === password) return true;
  // Legacy: any username with the single password
  const anyPass = accounts.get('__any__');
  if (anyPass && anyPass === password) return true;
  return false;
}

export async function POST(req: NextRequest) {
  try {
    const { username, password } = await req.json();
    if (!username || !password || !isValid(username, password)) {
      return NextResponse.json({ error: '帳號或密碼錯誤' }, { status: 401 });
    }

    // Set auth cookie: base64(username:password), HttpOnly, Secure
    const cookieVal = Buffer.from(`${username}:${password}`).toString('base64');
    const res = NextResponse.json({ ok: true });
    res.cookies.set('gis_auth', cookieVal, {
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return res;
  } catch {
    return NextResponse.json({ error: '伺服器錯誤' }, { status: 500 });
  }
}
