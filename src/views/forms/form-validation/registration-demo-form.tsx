'use client'

import * as React from 'react'

import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

import { CheckCheckIcon } from 'lucide-react'

import { Alert, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Field, FieldError, FieldLabel, FieldLegend, FieldSet } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useI18n } from '@/hooks/use-i18n'

// Define the form schema
const formSchema = z.object({
  name: z.string().min(2, 'El nombre debe tener al menos 2 caracteres.'),
  phone: z
    .string()
    .min(1, 'El teléfono es obligatorio')
    .regex(/^\+?[0-9()\-\s]{8,20}$/, 'Introduce un número de teléfono válido.'),
  company: z.string().min(2, 'El nombre de empresa debe tener al menos 2 caracteres.'),
  email: z.string().min(1, 'El correo electrónico es obligatorio').email({ message: 'Introduce un correo válido.' }),
  orderId: z.string().min(3, 'El ID de orden/caso es obligatorio.'),
  issue: z.string().min(1, {
    message: 'Por favor selecciona un motivo.'
  }),
  department: z.string().min(1, {
    message: 'Por favor selecciona un departamento.'
  }),
  priority: z.string().min(1, {
    message: 'Por favor selecciona una prioridad.'
  }),
  selectedOption: z.enum(['replace', 'refund', 'support'], {
    required_error: 'Debes seleccionar una opción.'
  }),
  message: z.string().min(20, 'Describe el motivo con al menos 20 caracteres.')
})

type FormValues = z.infer<typeof formSchema>

const ContactUSFormDemo = () => {
  const { t } = useI18n()

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      name: '',
      phone: '',
      company: '',
      email: '',
      orderId: '',
      issue: '',
      department: '',
      priority: '',
      selectedOption: undefined,
      message: ''
    }
  })

  function onSubmit() {
    toast.custom(() => (
      <Alert className='border-green-600 text-green-600 sm:w-122 dark:border-green-400 dark:text-green-400 *:[svg]:row-span-1'>
        <CheckCheckIcon />
        <AlertTitle>{t('forms.successMessage') || 'Solicitud enviada con éxito. Nuestro equipo te responderá a la brevedad.'}</AlertTitle>
      </Alert>
    ))
  }

  return (
    <Card className='w-full shadow-none'>
      <CardHeader>
        <CardTitle>{t('forms.assistanceForm') || 'Formulario de Asistencia'}</CardTitle>
        <CardDescription>{t('forms.assistanceFormDesc') || 'Describe tu consulta o incidencia para que nuestro equipo técnico te asista.'}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={form.handleSubmit(onSubmit)} className='grid w-full grid-cols-1 gap-6 md:grid-cols-2'>
          <Controller
            name='name'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t('forms.name')}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder={t('forms.namePlaceholder')}
                  autoComplete='name'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='phone'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t('forms.phone')}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder={t('forms.phonePlaceholder') || '+34 600 000 000'}
                  autoComplete='tel'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='company'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t('forms.company')}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder={t('forms.company')}
                  autoComplete='organization'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='email'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t('forms.email')}</FieldLabel>
                <Input
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder={t('forms.emailPlaceholder')}
                  autoComplete='email'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='orderId'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor={field.name}>{t('forms.referenceId') || 'ID de Referencia'}</FieldLabel>
                <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder={t('forms.referenceIdPlaceholder') || 'Ej. INV-2026-001'} />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Issue Select Field */}
          <Controller
            name='issue'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='issue'>{t('forms.requestType') || 'Tipo de Solicitud'}</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='issue' className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder={t('forms.selectRequestType') || 'Selecciona el tipo'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='damaged'>{t('forms.techIncident') || 'Incidencia técnica'}</SelectItem>
                    <SelectItem value='got-different'>{t('forms.billingQuery') || 'Facturación y pagos'}</SelectItem>
                    <SelectItem value='not-like'>{t('forms.productInquiry') || 'Consulta de producto'}</SelectItem>
                    <SelectItem value='other'>{t('forms.otherIssue') || 'Otro asunto'}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='department'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='department'>{t('forms.department') || 'Departamento'}</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='department' className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder={t('forms.selectDepartment') || 'Selecciona departamento'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='sales'>{t('forms.deptSales') || 'Ventas'}</SelectItem>
                    <SelectItem value='billing'>{t('forms.deptBilling') || 'Facturación'}</SelectItem>
                    <SelectItem value='returns'>{t('forms.deptGovernance') || 'Gobernanza'}</SelectItem>
                    <SelectItem value='technical'>{t('forms.deptSupport') || 'Soporte Técnico'}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Controller
            name='priority'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid}>
                <FieldLabel htmlFor='priority'>{t('common.priority') || 'Prioridad'}</FieldLabel>
                <Select name={field.name} value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id='priority' className='w-full' aria-invalid={fieldState.invalid}>
                    <SelectValue placeholder={t('forms.selectPriority') || 'Selecciona prioridad'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value='low'>{t('forms.priorityLow') || 'Baja'}</SelectItem>
                    <SelectItem value='medium'>{t('forms.priorityMedium') || 'Media'}</SelectItem>
                    <SelectItem value='high'>{t('forms.priorityHigh') || 'Alta'}</SelectItem>
                    <SelectItem value='urgent'>{t('forms.priorityUrgent') || 'Urgente'}</SelectItem>
                  </SelectContent>
                </Select>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          {/* Radio Group Field */}
          <Controller
            name='selectedOption'
            control={form.control}
            render={({ field, fieldState }) => (
              <FieldSet className='md:col-span-2'>
                <FieldLegend variant='label'>{t('forms.howCanWeHelp') || '¿Cómo podemos ayudarte?'}</FieldLegend>
                <RadioGroup name={field.name} value={field.value ?? ''} onValueChange={field.onChange}>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='replace' id='want-replace' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-replace' className='font-normal'>
                      {t('forms.optLicense') || 'Reemplazo de licencia o servicio'}
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='refund' id='want-refund' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-refund' className='font-normal'>
                      {t('forms.optRefund') || 'Ajuste de cobro o reembolso'}
                    </FieldLabel>
                  </Field>
                  <Field orientation='horizontal' data-invalid={fieldState.invalid}>
                    <RadioGroupItem value='support' id='want-support' aria-invalid={fieldState.invalid} />
                    <FieldLabel htmlFor='want-support' className='font-normal'>
                      {t('forms.optSupport') || 'Asesoría y acompañamiento técnico'}
                    </FieldLabel>
                  </Field>
                </RadioGroup>
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </FieldSet>
            )}
          />

          {/* Message Textarea Field */}
          <Controller
            name='message'
            control={form.control}
            render={({ field, fieldState }) => (
              <Field data-invalid={fieldState.invalid} className='md:col-span-2'>
                <FieldLabel htmlFor={field.name}>{t('common.description')}</FieldLabel>
                <Textarea
                  {...field}
                  id={field.name}
                  aria-invalid={fieldState.invalid}
                  placeholder={t('forms.messagePlaceholder') || 'Proporciona información detallada sobre tu requerimiento...'}
                  className='min-h-30 resize-none'
                />
                {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
              </Field>
            )}
          />

          <Button type='submit' className='md:col-span-2 md:w-fit'>
            {t('forms.send') || 'Enviar solicitud'}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}

export default ContactUSFormDemo
