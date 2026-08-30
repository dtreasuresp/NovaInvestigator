'use client'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// View Imports
import { FactorEditor, RatingScale } from '../components/factor-editor'

export const InvestigatorEfiView = () => {
  const { t } = useI18n()

  return (
    <div className='flex flex-col gap-5'>
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