import UpgradeWizard from '@/views/pages/pricing/billing/upgrade'

type UpgradePageProps = {
  searchParams: Promise<{
    plan?: string | string[] | undefined
  }>
}

const UpgradePage = async ({ searchParams }: UpgradePageProps) => {
  const params = await searchParams
  const planValue = Array.isArray(params.plan) ? params.plan[0] : params.plan

  return <UpgradeWizard initialPlanCode={planValue?.trim() ? planValue.trim() : null} />
}

export default UpgradePage