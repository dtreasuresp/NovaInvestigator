import type { Metadata } from 'next'

import InvestigatorDashboardView from '@/views/dashboards/investigations'

export const metadata: Metadata = {
  title: 'Dashboard Estratégico · NovaInvestigador',
  description: 'Centro de mando y diagnóstico consolidado de investigaciones estratégicas EFI, EFE, DAFO y planes CAME.'
}

const InvestigationsDashboardPage = () => {
  return <InvestigatorDashboardView />
}

export default InvestigationsDashboardPage
