import { jwtVerify } from 'jose'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS  = ['/login', '/register']
const SESSION_COOKIE = 'relay-session'

function secret() {
  const s = process.env.SESSION_SECRET ?? 'relay-crm-dev-secret-change-in-prod'
  return new TextEncoder().encode(s)
}

async function getSession(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const { payload } = await jwtVerify(token, secret())
    return payload as { sub?: string; role?: string }
  } catch {
    return null
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Always allow Google OAuth flow and static assets
  if (pathname.startsWith('/api/auth/google')) return NextResponse.next()

  const isPublic  = PUBLIC_PATHS.includes(pathname)
  const session   = await getSession(request)
  const isLoggedIn = session !== null

  if (!isLoggedIn && !isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  if (isLoggedIn && isPublic) {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  // Admin routes require ADMIN role
  if (pathname.startsWith('/admin') && session?.role !== 'ADMIN') {
    const url = request.nextUrl.clone()
    url.pathname = '/'
    return NextResponse.redirect(url)
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
