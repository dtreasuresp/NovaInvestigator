'use client'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// View Imports
import { StageHeader } from '../shared/primitives'
import { FactorEditor, RatingScale } from '../shared/factor-editor'

export const InvestigatorEfiView = () => {
  const { t } = useI18n()

  return (
    <div className='flex flex-col gap-5'>
      <StageHeader
        kicker={`02 · ${t('investigator.efi')}`}
        title={t('investigator.internalAnalysis')}
        description={t('investigator.subtitle')}
      />
      <FactorEditor
        group='internal'
        title={t('investigator.efi')}
        description={t('investigator.internalAnalysis')}
      />
      <RatingScale group='internal' />
    </div>
  )
}

export default InvestigatorEfiView