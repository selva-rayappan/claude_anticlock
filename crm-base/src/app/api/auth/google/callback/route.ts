import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { signSession, SESSION_COOKIE } from '@/lib/auth'

export async function GET(request: NextRequest) {
  const appUrl      = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'
  const clientId    = process.env.GOOGLE_CLIENT_ID
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET

  if (!clientId || !clientSecret) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_not_configured`)
  }

  const code = request.nextUrl.searchParams.get('code')
  if (!code) {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_denied`)
  }

  try {
    // Exchange code for tokens
    const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code,
        client_id:     clientId,
        client_secret: clientSecret,
        redirect_uri:  `${appUrl}/api/auth/google/callback`,
        grant_type:    'authorization_code',
      }),
    })
    const tokens = await tokenRes.json() as { access_token?: string; error?: string }
    if (!tokens.access_token) throw new Error('No access token')

    // Get user profile
    const profileRes = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${tokens.access_token}` },
    })
    const profile = await profileRes.json() as {
      id: string; email: string; name: string; picture?: string
    }

    // Find or create user
    let user = await prisma.user.findFirst({
      where: { OR: [{ googleId: profile.id }, { email: profile.email }] },
    })

    if (user) {
      if (!user.googleId) {
        user = await prisma.user.update({
          where: { id: user.id },
          data: { googleId: profile.id, provider: 'google' },
        })
      }
    } else {
      user = await prisma.user.create({
        data: {
          name:     profile.name,
          email:    profile.email,
          googleId: profile.id,
          provider: 'google',
          role:     'USER',
        },
      })
    }

    const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role })

    const response = NextResponse.redirect(`${appUrl}/`)
    response.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      sameSite: 'lax',
      path:     '/',
      maxAge:   60 * 60 * 24 * 7,
    })
    return response
  } catch {
    return NextResponse.redirect(`${appUrl}/login?error=oauth_failed`)
  }
}
