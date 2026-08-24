'use client'

// Component Imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { useI18n } from '@/hooks/use-i18n'

const BasicForm = () => {
  const { t } = useI18n()

  return (
    <form>
      <FieldGroup className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-first-name'>{t('forms.firstName')}</FieldLabel>
          <Input id='multi-step-personal-info-first-name' placeholder={t('forms.firstNamePlaceholder')} />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-last-name'>{t('forms.lastName')}</FieldLabel>
          <Input id='multi-step-personal-info-last-name' placeholder={t('forms.lastNamePlaceholder')} />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-mobile'>{t('forms.mobile')}</FieldLabel>
          <Input id='multi-step-personal-info-mobile' placeholder={t('forms.mobilePlaceholder')} />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-pincode'>{t('forms.pincode')}</FieldLabel>
          <Input id='multi-step-personal-info-pincode' placeholder={t('forms.pincodePlaceholder')} />
        </Field>

        <Field className='gap-2 sm:col-span-2'>
          <FieldLabel htmlFor='multi-step-personal-info-address'>{t('forms.address')}</FieldLabel>
          <Input id='multi-step-personal-info-address' placeholder={t('forms.addressPlaceholder')} />
        </Field>

        <Field className='gap-2 sm:col-span-2'>
          <FieldLabel htmlFor='multi-step-personal-info-landmark'>{t('forms.landmark')}</FieldLabel>
          <Input id='multi-step-personal-info-landmark' placeholder={t('forms.landmarkPlaceholder')} />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-city'>{t('forms.city')}</FieldLabel>
          <Input id='multi-step-personal-info-city' placeholder={t('forms.cityPlaceholder')} />
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='multi-step-personal-info-state'>{t('forms.state')}</FieldLabel>
          <Input id='multi-step-personal-info-state' placeholder={t('forms.statePlaceholder')} />
        </Field>
      </FieldGroup>

      <div className='mt-8'>
        <Button type='submit'>{t('common.save')}</Button>
      </div>
    </form>
  )
}

export default BasicForm
