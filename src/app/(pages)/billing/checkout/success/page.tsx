import Link from 'next/link'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

const CheckoutSuccessPage = async ({
  searchParams
}: {
  searchParams: Promise<{ session_id?: string }>
}) => {
  const { session_id: sessionId } = await searchParams

  return (
    <div className='mx-auto flex min-h-[50vh] max-w-xl items-center justify-center'>
      <Card className='w-full'>
        <CardHeader>
          <CardTitle>Checkout received</CardTitle>
          <CardDescription>
            Your access is activated only after Stripe confirms the payment. You can return to the app while that
            confirmation is processed.
          </CardDescription>
        </CardHeader>
        <CardContent className='flex flex-wrap gap-3'>
          <Button render={<Link href='/dashboard/investigations' />} nativeButton={false}>
            Open Dashboard
          </Button>
          <Button variant='outline' render={<Link href='/pages/pricing' />} nativeButton={false}>
            Back to plans
          </Button>
          {sessionId ? <span className='text-muted-foreground basis-full text-xs'>Checkout reference received.</span> : null}
        </CardContent>
      </Card>
    </div>
  )
}

export default CheckoutSuccessPage
