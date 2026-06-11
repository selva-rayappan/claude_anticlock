'use server'

import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'
import { signSession, SESSION_COOKIE } from '@/lib/auth'

export async function login(_: unknown, formData: FormData) {
  const email    = formData.get('email')?.toString().trim().toLowerCase()
  const password = formData.get('password')?.toString()

  if (!email || !password) return { error: 'Email and password are required.' }

  const user = await prisma.user.findUnique({ where: { email } })
  if (!user || !user.password) return { error: 'Invalid email or password.' }

  const valid = await bcrypt.compare(password, user.password)
  if (!valid) return { error: 'Invalid email or password.' }

  const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role })
  const jar   = await cookies()
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
  redirect('/')
}

export async function register(_: unknown, formData: FormData) {
  const name     = formData.get('name')?.toString().trim()
  const email    = formData.get('email')?.toString().trim().toLowerCase()
  const password = formData.get('password')?.toString()
  const confirm  = formData.get('confirm')?.toString()

  if (!name || !email || !password) return { error: 'All fields are required.' }
  if (password.length < 8) return { error: 'Password must be at least 8 characters.' }
  if (password !== confirm) return { error: 'Passwords do not match.' }

  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) return { error: 'An account with this email already exists.' }

  const hashed = await bcrypt.hash(password, 12)
  const user   = await prisma.user.create({
    data: { name, email, password: hashed, role: 'USER', provider: 'credentials' },
  })

  const token = await signSession({ sub: user.id, email: user.email, name: user.name, role: user.role })
  const jar   = await cookies()
  jar.set(SESSION_COOKIE, token, { httpOnly: true, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 7 })
  redirect('/')
}

export async function logout() {
  const jar = await cookies()
  jar.delete(SESSION_COOKIE)
  redirect('/login')
}
