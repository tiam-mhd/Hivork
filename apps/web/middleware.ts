import { LOCALE_COOKIE_NAME } from '@hivork/i18n';
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/** Must match `STAFF_SESSION_COOKIE` in `lib/auth/session-marker.ts`. */
const STAFF_SESSION_COOKIE = 'hivork_staff_session';

function resolveLocalePath(request: NextRequest): {
  locale: 'fa' | 'en';
  pathname: string;
  externalPath: string;
} {
  const original = request.nextUrl.pathname;
  if (original === '/en') {
    return { locale: 'en', pathname: '/', externalPath: '/en' };
  }
  if (original.startsWith('/en/')) {
    const pathname = original.slice(3) || '/';
    return { locale: 'en', pathname, externalPath: original };
  }
  return { locale: 'fa', pathname: original, externalPath: original };
}

function withLocaleCookie(response: NextResponse, locale: 'fa' | 'en'): NextResponse {
  response.cookies.set(LOCALE_COOKIE_NAME, locale, {
    path: '/',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  });
  return response;
}

function applyAuthGuards(
  request: NextRequest,
  pathname: string,
  externalPath: string,
  locale: 'fa' | 'en',
  response: NextResponse,
): NextResponse {
  const hasSession = Boolean(request.cookies.get(STAFF_SESSION_COOKIE)?.value);
  const isAdminRoute = pathname.startsWith('/admin');
  const isAuthRoute =
    pathname.startsWith('/login') ||
    pathname.startsWith('/register') ||
    pathname.startsWith('/auth/');

  if (isAdminRoute && !hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = locale === 'en' ? '/en/login' : '/login';
    loginUrl.searchParams.set('next', externalPath);
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && hasSession) {
    const dashboardUrl = request.nextUrl.clone();
    dashboardUrl.pathname = locale === 'en' ? '/en/admin/dashboard' : '/admin/dashboard';
    dashboardUrl.search = '';
    return NextResponse.redirect(dashboardUrl);
  }

  return response;
}

export function middleware(request: NextRequest) {
  const { locale, pathname, externalPath } = resolveLocalePath(request);

  let response: NextResponse;
  if (locale === 'en' && request.nextUrl.pathname !== pathname) {
    const rewriteUrl = request.nextUrl.clone();
    rewriteUrl.pathname = pathname;
    response = NextResponse.rewrite(rewriteUrl);
  } else {
    response = NextResponse.next();
  }

  response = withLocaleCookie(response, locale);
  return applyAuthGuards(request, pathname, externalPath, locale, response);
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/login/:path*',
    '/register',
    '/auth/:path*',
    '/en',
    '/en/:path*',
  ],
};
