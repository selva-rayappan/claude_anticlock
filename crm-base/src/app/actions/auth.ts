'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

const SESSION_COOKIE = 'relay-session'
const SESSION_TOKEN  = 'authenticated'

export async function login(_: unknown, formData: FormData) {
  const username = formData.get('username')?.toString().trim()
  const password = formData.get('password')?.toString()

  if (username === 'admin' && password === 'admin123') {
    const jar = await cookies()
    jar.set(SESSION_COOKIE, SESSION_TOKEN, {
      httpOnly: true,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })
    redirect('/')
  }

  return { error: 'Invalid username or password.' }
}

export async function logout() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/login')
}
