'use client'

// Third-party Imports
import { Bar, BarChart } from 'recharts'

// Component Imports
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { type ChartConfig, ChartContainer } from '@/components/ui/chart'
import { Separator } from '@/components/ui/separator'
import { useI18n } from '@/hooks/use-i18n'

// Product reached data
const productReachChartData = [
  { month: 'Enero', reached: 168 },
  { month: 'Febrero', reached: 305 },
  { month: 'Marzo', reached: 213 },
  { month: 'Abril', reached: 330 },
  { month: 'Mayo', reached: 305 }
]

const productReachChartConfig = {
  reached: {
    label: 'Alcance',
    color: 'var(--primary)'
  }
} satisfies ChartConfig

// Order placed data
const orderPlacedChartData = [
  { month: 'Enero', orders: 168 },
  { month: 'Febrero', orders: 305 },
  { month: 'Marzo', orders: 213 },
  { month: 'Abril', orders: 330 },
  { month: 'Mayo', orders: 305 }
]

const orderPlacedChartConfig = {
  orders: {
    label: 'Órdenes',
    color: 'color-mix(in oklab, var(--primary) 10%, transparent)'
  }
} satisfies ChartConfig

const ProductInsightsCard = ({ className }: { className?: string }) => {
  const { t } = useI18n()

  return (
    <Card className={className}>
      <CardHeader className='flex justify-between'>
        <div className='flex flex-col gap-1'>
          <span className='text-lg font-semibold'>{t('dashboards.productInsights') || 'Métricas de Producto'}</span>
          <span className='text-muted-foreground text-sm'>{t('dashboards.publishedAt', { date: '12 MAY 2026 - 6:10 PM' }) || 'Publicado el 12 MAY 2026 - 6:10 PM'}</span>
        </div>
        <img src='/images/widgets/image-7.webp' alt={t('common.preview') || 'Vista previa de producto'} className='w-20.5 rounded-md' />
      </CardHeader>
      <CardContent>
        <Separator />
      </CardContent>
      <CardContent className='space-y-4'>
        <div className='flex items-center justify-between gap-1'>
          <div className='flex flex-col gap-1'>
            <span className='text-xs'>{t('dashboards.productReach') || 'Alcance del producto'}</span>
            <span className='text-2xl font-semibold'>21,153</span>
          </div>
          <ChartContainer config={productReachChartConfig} className='min-h-13 max-w-18'>
            <BarChart accessibilityLayer data={productReachChartData} barSize={8}>
              <Bar dataKey='reached' fill='var(--color-reached)' radius={2} />
            </BarChart>
          </ChartContainer>
        </div>

        <div className='flex items-center justify-between gap-1'>
          <div className='flex flex-col gap-1'>
            <span className='text-xs'>{t('dashboards.ordersProcessed') || 'Órdenes procesadas'}</span>
            <span className='text-2xl font-semibold'>2,123</span>
          </div>
          <ChartContainer config={orderPlacedChartConfig} className='min-h-13 max-w-18'>
            <BarChart accessibilityLayer data={orderPlacedChartData} barSize={8}>
              <Bar dataKey='orders' fill='var(--color-orders)' radius={2} />
            </BarChart>
          </ChartContainer>
        </div>
      </CardContent>
    </Card>
  )
}

export default ProductInsightsCard
