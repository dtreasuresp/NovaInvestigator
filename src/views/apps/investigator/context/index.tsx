'use client'

// Component Imports
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

// Icon Imports
import { Lock } from 'lucide-react'

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

// View Imports
import { StageHeader } from '../shared/primitives'

export const InvestigatorContextView = () => {
  const { t } = useI18n()
  const { state, validation, updateMetadata, isReadOnly, hydrated, syncStatus } = useInvestigatorAnalysis()

  const isLoading = !hydrated || syncStatus === 'loading'

  const fields: { id: string; label: string; placeholder: string }[] = [
    { id: 'title', label: t('investigator.fieldTitle'), placeholder: t('investigator.fieldTitlePlaceholder') },
    { id: 'organization', label: t('investigator.fieldOrganization'), placeholder: t('investigator.fieldOrganizationPlaceholder') },
    { id: 'unit', label: t('investigator.fieldUnit'), placeholder: t('investigator.fieldUnitPlaceholder') },
    { id: 'author', label: t('investigator.fieldAuthor'), placeholder: t('investigator.fieldAuthorPlaceholder') },
    { id: 'evaluationDate', label: t('investigator.fieldEvaluationDate'), placeholder: t('investigator.fieldEvaluationDatePlaceholder') },
    { id: 'problem', label: t('investigator.fieldProblem'), placeholder: t('investigator.fieldProblemPlaceholder') },
    { id: 'objective', label: t('investigator.fieldObjective'), placeholder: t('investigator.fieldObjectivePlaceholder') },
    { id: 'assumptions', label: t('investigator.fieldAssumptions'), placeholder: t('investigator.fieldAssumptionsPlaceholder') }
  ]

  if (isLoading) {
    return (
      <div className='flex flex-col gap-5' aria-busy='true'>
        <div className='space-y-2'>
          <Skeleton className='h-4 w-28' />
          <Skeleton className='h-7 w-48' />
          <Skeleton className='h-4 w-96' />
        </div>
        <Card>
          <CardHeader className='space-y-2'>
            <Skeleton className='h-6 w-64' />
            <Skeleton className='h-4 w-48' />
          </CardHeader>
          <CardContent className='grid gap-4 sm:grid-cols-2'>
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className={i >= 5 ? 'sm:col-span-2 space-y-2' : 'space-y-2'}>
                <Skeleton className='h-4 w-24' />
                <Skeleton className={i >= 5 ? 'h-20 w-full' : 'h-10 w-full'} />
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-5'>
      <Card>
        <CardHeader>
          <CardTitle>{state.metadata.title || t('investigator.newInvestigation')}</CardTitle>
          <CardDescription>
            {t('common.details')}: <span className='font-mono text-xs'>{state.metadata.id}</span> · {t('common.status')}: {state.metadata.status}
          </CardDescription>
        </CardHeader>
        <CardContent className='grid gap-4 sm:grid-cols-2'>
          {fields.map(field => {
            const isArea = field.id === 'problem' || field.id === 'objective' || field.id === 'assumptions'
            const val = state.metadata[field.id as keyof typeof state.metadata]
            const stringVal = typeof val === 'string' || typeof val === 'number' ? String(val) : ''

            return (
              <div key={field.id} className={isArea ? 'sm:col-span-2' : ''}>
                <Label htmlFor={`metadata-${field.id}`}>{field.label}</Label>
                {isArea ? (
                  <Textarea
                    id={`metadata-${field.id}`}
                    disabled={isReadOnly}
                    className='mt-2 min-h-20'
                    placeholder={field.placeholder}
                    value={stringVal}
                    onChange={e => updateMetadata(field.id, e.target.value)}
                  />
                ) : (
                  <Input
                    id={`metadata-${field.id}`}
                    disabled={isReadOnly}
                    className='mt-2'
                    placeholder={field.placeholder}
                    value={stringVal}
                    onChange={e => updateMetadata(field.id, e.target.value)}
                  />
                )}
              </div>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}

export default InvestigatorContextView