import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

const PUBLIC_PATHS = ['/login']
const SESSION_COOKIE = 'relay-session'
const SESSION_TOKEN  = 'authenticated'

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl
  const isPublic    = PUBLIC_PATHS.includes(pathname)
  const isLoggedIn  = request.cookies.get(SESSION_COOKIE)?.value === SESSION_TOKEN

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

  return NextResponse.next()
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.png$).*)'],
}
