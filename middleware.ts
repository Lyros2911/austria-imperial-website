/**
 * Next.js Middleware — Admin Auth + Partner Auth + i18n Locale Routing
 *
 * 1. /admin/* (legacy) → redirect to /de/admin/*
 * 2. /partner/* (legacy) → redirect to /de/partner/*
 * 3. /api/* routes → pass through
 * 4. /{locale}/admin/login → intlMiddleware (public)
 * 5. /{locale}/admin/* → JWT admin auth + intlMiddleware
 * 6. /{locale}/partner/login → intlMiddleware (public)
 * 7. /{locale}/partner/* → JWT partner auth + intlMiddleware
 * 8. Everything else → intlMiddleware
 */

import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import createMiddleware from 'next-intl/middleware';
import { routing } from '@/i18n/routing';

const ADMIN_COOKIE = 'aigg-admin-session';
const PARTNER_COOKIE = 'aigg-partner-session';

function getSecret() {
  const secret = process.env.AUTH_SECRET;
  if (!secret) return null;
  return new TextEncoder().encode(secret);
}

// next-intl locale middleware
const intlMiddleware = createMiddleware(routing);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Legacy /admin/* → redirect to /de/admin/* ──
  if (pathname.startsWith('/admin')) {
    const newPath = `/de${pathname}`;
    const url = new URL(newPath, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  // ── Legacy /partner/* → redirect to /de/partner/* ──
  if (pathname.startsWith('/partner')) {
    const newPath = `/de${pathname}`;
    const url = new URL(newPath, request.url);
    url.search = request.nextUrl.search;
    return NextResponse.redirect(url, 308);
  }

  // ── API routes: pass through ──
  if (pathname.startsWith('/api')) {
    return NextResponse.next();
  }

  // ── Check if this is a locale-prefixed admin route ──
  const adminMatch = pathname.match(/^\/(de|en|ar)\/admin(\/.*)?$/);

  if (adminMatch) {
    const locale = adminMatch[1];
    const adminPath = adminMatch[2] || '';

    // /{locale}/admin/login is public
    if (adminPath === '/login') {
      return intlMiddleware(request);
    }

    // JWT auth check for all other admin routes
    const token = request.cookies.get(ADMIN_COOKIE)?.value;
    const secret = getSecret();

    if (!token || !secret) {
      const loginUrl = new URL(`/${locale}/admin/login`, request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, secret);
      return intlMiddleware(request);
    } catch {
      const loginUrl = new URL(`/${locale}/admin/login`, request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Check if this is a locale-prefixed partner route ──
  const partnerMatch = pathname.match(/^\/(de|en|ar)\/partner(\/.*)?$/);

  if (partnerMatch) {
    const locale = partnerMatch[1];
    const partnerPath = partnerMatch[2] || '';

    // /{locale}/partner/login is public
    if (partnerPath === '/login') {
      return intlMiddleware(request);
    }

    // JWT auth check for all other partner routes
    const token = request.cookies.get(PARTNER_COOKIE)?.value;
    const secret = getSecret();

    if (!token || !secret) {
      const loginUrl = new URL(`/${locale}/partner/login`, request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }

    try {
      await jwtVerify(token, secret);
      return intlMiddleware(request);
    } catch {
      const loginUrl = new URL(`/${locale}/partner/login`, request.url);
      loginUrl.searchParams.set('from', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // ── Everything else: next-intl locale routing ──
  return intlMiddleware(request);
}

export const config = {
  matcher: [
    // Match all paths except static files and _next
    '/((?!_next|images|favicon\\.ico|apple-touch-icon\\.png|robots\\.txt|sitemap\\.xml).*)',
  ],
};
