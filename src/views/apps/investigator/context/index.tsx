'use client'

// Component Imports
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

export const InvestigatorContextView = () => {
  const { t } = useI18n()
  const { state, updateMetadata, isReadOnly, hydrated, syncStatus } = useInvestigatorAnalysis()

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
      <div className='flex flex-col gap-6' aria-busy='true'>
        <div className='space-y-2'>
          <Skeleton className='h-6 w-64' />
          <Skeleton className='h-4 w-48' />
        </div>
        <div className='grid gap-6 sm:grid-cols-2'>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={i >= 5 ? 'sm:col-span-2 space-y-2' : 'space-y-2'}>
              <Skeleton className='h-4 w-24' />
              <Skeleton className={i >= 5 ? 'h-20 w-full' : 'h-10 w-full'} />
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className='flex flex-col gap-6'>
      {/* Title & Metadata Details */}
      <div className='space-y-1'>
        <h3 className='text-lg font-semibold text-foreground'>
          Título de la investigación: {state.metadata.title || t('investigator.newInvestigation')}
        </h3>
        <p className='text-xs text-muted-foreground'>
          {t('common.details')}: <span className='font-mono text-xs'>{state.metadata.id}</span> · {t('common.status')}: {state.metadata.status}
        </p>
      </div>

      {/* Form Fields Grid */}
      <div className='grid gap-4 sm:grid-cols-2'>
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
      </div>
    </div>
  )
}

export default InvestigatorContextView