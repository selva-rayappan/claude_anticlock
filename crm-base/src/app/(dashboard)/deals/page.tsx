import { getDeals } from '@/app/actions/deals'
import { DealsPipeline } from '@/components/deals/DealsPipeline'

export const dynamic = 'force-dynamic'

export default async function DealsPage() {
  const deals = await getDeals()
  return <DealsPipeline initialDeals={deals} />
}
