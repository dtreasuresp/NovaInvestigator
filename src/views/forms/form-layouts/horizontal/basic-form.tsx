'use client'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'

const BasicForm = () => {
  const { t } = useI18n()
  return (
    <form>
      <FieldGroup className='gap-6'>
        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-name'>{t('forms.name')}</FieldLabel>
          <Input id='horizontal-basic-name' className='sm:col-span-5' placeholder={t('forms.namePlaceholder')} />
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-company'>{t('forms.company')}</FieldLabel>
          <Input id='horizontal-basic-company' className='sm:col-span-5' placeholder={t('forms.companyPlaceholder')} />
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-email'>{t('forms.email')}</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupInput id='horizontal-basic-email' placeholder={t('forms.emailPlaceholder')} />
            <InputGroupAddon align='inline-end' className='text-foreground font-normal'>
              @example.com
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-phone'>{t('forms.phone')}</FieldLabel>
          <Input id='horizontal-basic-phone' className='sm:col-span-5' type='tel' placeholder={t('forms.phonePlaceholder')} />
        </Field>

        <Field className='grid grid-cols-1 items-start gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-message'>{t('forms.message')}</FieldLabel>
          <Textarea
            id='horizontal-basic-message'
            className='sm:col-span-5'
            placeholder={t('forms.messagePlaceholder')}
            rows={4}
          />
        </Field>

        <Field className='grid grid-cols-1 sm:grid-cols-6'>
          <div className='sm:col-start-2'>
            <Button type='submit'>{t('forms.send')}</Button>
          </div>
        </Field>
      </FieldGroup>
    </form>
  )
}

export default BasicForm
