import { getContacts } from '@/app/actions/contacts'
import { ContactsClient } from '@/components/contacts/ContactsClient'

export const dynamic = 'force-dynamic'

export default async function ContactsPage() {
  const contacts = await getContacts()
  return <ContactsClient initialContacts={contacts} />
}
