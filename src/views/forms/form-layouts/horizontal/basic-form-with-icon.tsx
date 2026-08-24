'use client'

// Third-party Imports
import { Building2Icon, MailIcon, MessageSquareIcon, PhoneIcon, UserIcon } from 'lucide-react'

// Hook Imports
import { useI18n } from '@/hooks/use-i18n'

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { Textarea } from '@/components/ui/textarea'

const BasicFormWithIcon = () => {
  const { t } = useI18n()
  return (
    <form>
      <FieldGroup className='gap-6'>
        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-name'>{t('forms.name')}</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <UserIcon className='size-4' />
              <span className='sr-only'>{t('forms.name')}</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-name' type='text' placeholder={t('forms.namePlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-company'>{t('forms.company')}</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <Building2Icon className='size-4' />
              <span className='sr-only'>{t('forms.company')}</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-company' placeholder={t('forms.companyPlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-email'>{t('forms.email')}</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <MailIcon className='size-4' />
              <span className='sr-only'>{t('forms.email')}</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-email' placeholder={t('forms.emailPlaceholder')} />
            <InputGroupAddon align='inline-end' className='text-foreground font-normal'>
              @example.com
            </InputGroupAddon>
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-phone'>{t('forms.phone')}</FieldLabel>
          <InputGroup className='sm:col-span-5'>
            <InputGroupAddon>
              <PhoneIcon className='size-4' />
              <span className='sr-only'>{t('forms.phone')}</span>
            </InputGroupAddon>
            <InputGroupInput id='horizontal-basic-icons-phone' type='tel' placeholder={t('forms.phonePlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='grid grid-cols-1 items-start gap-2 sm:grid-cols-6'>
          <FieldLabel htmlFor='horizontal-basic-icons-message'>{t('forms.message')}</FieldLabel>
          <div className='relative sm:col-span-5'>
            <div className='text-muted-foreground pointer-events-none absolute top-2.5 left-0 flex items-center justify-center pl-3 peer-disabled:opacity-50'>
              <MessageSquareIcon className='size-4' />
              <span className='sr-only'>{t('forms.message')}</span>
            </div>
            <Textarea
              id='horizontal-basic-icons-message'
              placeholder={t('forms.messagePlaceholder')}
              className='peer pl-9'
              rows={4}
            />
          </div>
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

export default BasicFormWithIcon
