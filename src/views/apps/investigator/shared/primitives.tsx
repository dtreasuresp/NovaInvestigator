'use client'

// React Imports
import type { ReactNode } from 'react'

// Component Imports
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export const StageHeader = ({
  kicker,
  title,
  description,
  action
}: {
  kicker: string
  title: string
  description: string
  action?: ReactNode
}) => {
  return (
    <div className='flex flex-wrap items-end justify-between gap-4'>
      <div className='max-w-2xl'>
        <p className='text-primary mb-1 text-xs font-semibold tracking-widest uppercase'>{kicker}</p>
        <h2 className='font-heading text-2xl font-semibold'>{title}</h2>
        <p className='text-muted-foreground mt-1 text-sm'>{description}</p>
      </div>
      {action}
    </div>
  )
}

export const MetricCard = ({
  label,
  value,
  hint,
  tone = 'default'
}: {
  label: string
  value: ReactNode
  hint?: string
  tone?: 'default' | 'positive' | 'warning' | 'danger'
}) => {
  const toneClass = {
    default: 'border-l-primary',
    positive: 'border-l-emerald-500',
    warning: 'border-l-amber-500',
    danger: 'border-l-red-500'
  }[tone]

  return (
    <Card className={`border-l-4 ${toneClass}`}>
      <CardHeader className='p-4'>
        <CardDescription className='text-xs uppercase'>{label}</CardDescription>
        <CardTitle className='font-heading text-3xl font-semibold'>{value}</CardTitle>
      </CardHeader>
      {hint && <CardContent className='pt-0 text-xs text-muted-foreground'>{hint}</CardContent>}
    </Card>
  )
}