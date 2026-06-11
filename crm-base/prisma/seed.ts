import { PrismaLibSql } from '@prisma/adapter-libsql'
import { PrismaClient } from '../src/generated/prisma/client'
import bcrypt from 'bcryptjs'
import path from 'path'

const url = `file:${path.resolve(process.cwd(), 'dev.db').split('\\').join('/')}`
const adapter = new PrismaLibSql({ url })
const prisma = new PrismaClient({ adapter })

const contacts = [
  { name: 'Arjun Mehta',       email: 'arjun.mehta@nexatech.io',      phone: '+91 98200 11234', company: 'NexaTech Solutions',   designation: 'VP of Engineering',       status: 'CUSTOMER' },
  { name: 'Priya Nair',        email: 'priya.nair@brightwave.co',      phone: '+91 97300 55678', company: 'Brightwave Analytics', designation: 'Chief Data Officer',      status: 'ACTIVE'   },
  { name: 'James Okafor',      email: 'james.okafor@verdantsys.com',   phone: '+1 415 203 9871', company: 'Verdant Systems',      designation: 'Head of Sales',           status: 'LEAD'     },
  { name: 'Sofia Martínez',    email: 'sofia.m@luminos.io',            phone: '+34 612 334 567', company: 'Luminos Digital',      designation: 'Product Manager',         status: 'ACTIVE'   },
  { name: 'Chen Wei',          email: 'chen.wei@apexloop.com',         phone: '+86 138 0013 8000',company: 'ApexLoop Inc.',       designation: 'CTO',                     status: 'CUSTOMER' },
  { name: 'Aisha Bangura',     email: 'aisha.b@skyvault.africa',       phone: '+234 802 345 6789',company: 'SkyVault Africa',     designation: 'Operations Director',     status: 'LEAD'     },
  { name: 'Lucas Ferreira',    email: 'lucas.f@horizonbuild.com.br',   phone: '+55 11 91234 5678',company: 'Horizon Build',       designation: 'Business Development Mgr',status: 'INACTIVE' },
  { name: 'Elif Şahin',        email: 'elif.sahin@korumab2b.tr',       phone: '+90 532 111 2233', company: 'Koruma B2B',          designation: 'Account Executive',       status: 'ACTIVE'   },
  { name: 'Ryan Callahan',     email: 'ryan.c@polarstartup.io',        phone: '+1 628 555 0147', company: 'Polar Startup Studio', designation: 'Founder & CEO',          status: 'LEAD'     },
  { name: 'Meera Krishnaswamy',email: 'meera.k@pulsefintech.in',       phone: '+91 99400 77812', company: 'Pulse Fintech',        designation: 'Director of Partnerships',status: 'CUSTOMER' },
]

const deals = [
  // Active pipeline
  { title: 'Analytics Platform Upgrade',  company: 'Brightwave Analytics', value: 32000, stage: 'PROPOSAL',  createdAt: new Date('2026-06-01') },
  { title: 'Cloud Migration Package',     company: 'Verdant Systems',      value: 75000, stage: 'CONTACTED', createdAt: new Date('2026-06-03') },
  { title: 'Data Warehouse Setup',        company: 'ApexLoop Inc.',        value: 21500, stage: 'LEAD',      createdAt: new Date('2026-06-05') },
  { title: 'CRM Integration Suite',       company: 'Luminos Digital',      value: 14000, stage: 'PROPOSAL',  createdAt: new Date('2026-06-07') },
  { title: 'Security Audit & Compliance', company: 'Koruma B2B',           value:  9500, stage: 'CONTACTED', createdAt: new Date('2026-06-08') },
  { title: 'Partnership Portal Build',    company: 'Pulse Fintech',        value: 27000, stage: 'LEAD',      createdAt: new Date('2026-06-09') },
  // Lost
  { title: 'Mobile App Development',      company: 'Polar Startup Studio', value: 60000, stage: 'LOST',      createdAt: new Date('2026-05-20') },
  // Won — current month
  { title: 'Enterprise License',          company: 'NexaTech Solutions',   value: 48000, stage: 'WON',       createdAt: new Date('2026-06-02') },
  // Won — historical (for revenue chart)
  { title: 'Q1 Enterprise Contract',      company: 'TechCorp Alpha',       value: 35000, stage: 'WON',       createdAt: new Date('2026-01-12') },
  { title: 'Starter Package',             company: 'GrowStart LLC',        value:  8500, stage: 'WON',       createdAt: new Date('2026-01-28') },
  { title: 'Platform Migration',          company: 'MidSize Solutions',    value: 42000, stage: 'WON',       createdAt: new Date('2026-02-09') },
  { title: 'Annual License Deal',         company: 'Growth Ventures',      value: 65000, stage: 'WON',       createdAt: new Date('2026-03-05') },
  { title: 'Integration Bundle',          company: 'TechStart Inc.',       value: 18000, stage: 'WON',       createdAt: new Date('2026-03-20') },
  { title: 'Cloud Suite Rollout',         company: 'CloudBiz Ltd.',        value: 28000, stage: 'WON',       createdAt: new Date('2026-04-14') },
  { title: 'Support & Maintenance Plan',  company: 'FinOps Corp.',         value: 12000, stage: 'WON',       createdAt: new Date('2026-04-29') },
  { title: 'Data Analytics Setup',        company: 'DataFlow Inc.',        value: 55000, stage: 'WON',       createdAt: new Date('2026-05-08') },
  { title: 'AI Integration Pilot',        company: 'Novus AI Ltd.',        value: 31000, stage: 'WON',       createdAt: new Date('2026-05-22') },
]

const users = [
  { name: 'Admin User',   email: 'admin@relay.com',   password: 'admin123',   role: 'ADMIN'   },
  { name: 'Jane Manager', email: 'manager@relay.com',  password: 'manager123', role: 'MANAGER' },
  { name: 'John User',    email: 'user@relay.com',     password: 'user123',    role: 'USER'    },
]

async function main() {
  for (const c of contacts) {
    await prisma.contact.upsert({
      where: { email: c.email },
      update: {},
      create: c,
    })
  }
  console.log(`Seeded ${contacts.length} contacts.`)

  await prisma.deal.deleteMany()
  for (const d of deals) {
    await prisma.deal.create({ data: d })
  }
  console.log(`Seeded ${deals.length} deals.`)

  for (const u of users) {
    const hashed = await bcrypt.hash(u.password, 12)
    await prisma.user.upsert({
      where: { email: u.email },
      update: { role: u.role },
      create: { name: u.name, email: u.email, password: hashed, role: u.role },
    })
  }
  console.log(`Seeded ${users.length} users.`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
