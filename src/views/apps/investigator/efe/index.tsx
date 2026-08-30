'use client'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// View Imports
import { FactorEditor, RatingScale } from '../components/factor-editor'

export const InvestigatorEfeView = () => {
  const { t } = useI18n()

  return (
    <div className='flex flex-col gap-5'>
      <FactorEditor
        group='external'
        title={t('investigator.efe')}
        description={t('investigator.externalAnalysis')}
      />
      <RatingScale group='external' />
    </div>
  )
}

export default InvestigatorEfeView