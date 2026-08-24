'use client'

// Third-party Imports
import { Building2Icon, MapIcon, MapPinIcon, PhoneIcon, SignpostIcon, UserIcon } from 'lucide-react'

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field'
import { InputGroup, InputGroupAddon, InputGroupInput } from '@/components/ui/input-group'
import { useI18n } from '@/hooks/use-i18n'

const BasicFormWithIcon = () => {
  const { t } = useI18n()

  return (
    <form>
      <FieldGroup className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
        <Field className='gap-2'>
          <FieldLabel htmlFor='basic-with-icons-first-name'>{t('forms.firstName')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <UserIcon className='size-4' />
              <span className='sr-only'>{t('forms.firstName')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-first-name' placeholder={t('forms.firstNamePlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='basic-with-icons-last-name'>{t('forms.lastName')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <UserIcon className='size-4' />
              <span className='sr-only'>{t('forms.lastName')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-last-name' placeholder={t('forms.lastNamePlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='basic-with-icons-mobile'>{t('forms.mobile')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <PhoneIcon className='size-4' />
              <span className='sr-only'>{t('forms.mobile')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-mobile' type='tel' placeholder={t('forms.mobilePlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='basic-with-icons-pincode'>{t('forms.pincode')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <MapPinIcon className='size-4' />
              <span className='sr-only'>{t('forms.pincode')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-pincode' placeholder={t('forms.pincodePlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='gap-2 sm:col-span-2'>
          <FieldLabel htmlFor='basic-with-icons-address'>{t('forms.address')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <MapPinIcon className='size-4' />
              <span className='sr-only'>{t('forms.address')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-address' placeholder={t('forms.addressPlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='gap-2 sm:col-span-2'>
          <FieldLabel htmlFor='basic-with-icons-landmark'>{t('forms.landmark')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <SignpostIcon className='size-4' />
              <span className='sr-only'>{t('forms.landmark')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-landmark' placeholder={t('forms.landmarkPlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='basic-with-icons-city'>{t('forms.city')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <Building2Icon className='size-4' />
              <span className='sr-only'>{t('forms.city')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-city' placeholder={t('forms.cityPlaceholder')} />
          </InputGroup>
        </Field>

        <Field className='gap-2'>
          <FieldLabel htmlFor='basic-with-icons-state'>{t('forms.state')}</FieldLabel>
          <InputGroup>
            <InputGroupAddon>
              <MapIcon className='size-4' />
              <span className='sr-only'>{t('forms.state')}</span>
            </InputGroupAddon>
            <InputGroupInput id='basic-with-icons-state' placeholder={t('forms.statePlaceholder')} />
          </InputGroup>
        </Field>
      </FieldGroup>

      <div className='mt-8'>
        <Button type='submit'>{t('common.save')}</Button>
      </div>
    </form>
  )
}

export default BasicFormWithIcon
