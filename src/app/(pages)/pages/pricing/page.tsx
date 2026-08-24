import Pricing from '@/views/pages/pricing'

type PricingPageProps = {
  searchParams: Promise<{
    onboarding?: string | string[] | undefined
  }>
}

const PricingPage = async ({ searchParams }: PricingPageProps) => {
  const params = await searchParams
  const onboardingValue = Array.isArray(params.onboarding) ? params.onboarding[0] : params.onboarding

  return <Pricing onboarding={onboardingValue === '1'} />
}

export default PricingPage
