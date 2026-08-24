'use client'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// View Imports
import { StageHeader } from '../shared/primitives'
import { FactorEditor, RatingScale } from '../shared/factor-editor'

export const InvestigatorEfeView = () => {
  const { t } = useI18n()

  return (
    <div className='flex flex-col gap-5'>
      <StageHeader
        kicker={`03 · ${t('investigator.efe')}`}
        title={t('investigator.externalAnalysis')}
        description={t('investigator.subtitle')}
      />
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