'use client'

// React Imports
import * as React from 'react'

// Third-party Imports
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import { toast } from 'sonner'
import * as z from 'zod'

// Component Imports
import { Input } from '@/components/ui/input'
import { Field, FieldDescription, FieldError, FieldLabel } from '@/components/ui/field'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useI18n } from '@/hooks/use-i18n'

// Schema for validation mode demo
const modeSchema = z.object({
  onChange: z.string().min(5, 'Debe contener al menos 5 caracteres').max(20, 'Debe contener como máximo 20 caracteres'),
  onBlur: z.string().min(5, 'Debe contener al menos 5 caracteres').max(20, 'Debe contener como máximo 20 caracteres'),
  onSubmit: z.string().min(5, 'Debe contener al menos 5 caracteres').max(20, 'Debe contener como máximo 20 caracteres'),
  onTouched: z.string().min(5, 'Debe contener al menos 5 caracteres').max(20, 'Debe contener como máximo 20 caracteres')
})

type ModeFormValues = z.infer<typeof modeSchema>

const ValidationModesDemo = () => {
  const { t } = useI18n()

  // Form with onChange mode
  const onChangeForm = useForm<Pick<ModeFormValues, 'onChange'>>({
    resolver: zodResolver(z.object({ onChange: modeSchema.shape.onChange })),
    mode: 'onChange',
    defaultValues: {
      onChange: ''
    }
  })

  // Form with onBlur mode
  const onBlurForm = useForm<Pick<ModeFormValues, 'onBlur'>>({
    resolver: zodResolver(z.object({ onBlur: modeSchema.shape.onBlur })),
    mode: 'onBlur',
    defaultValues: {
      onBlur: ''
    }
  })

  // Form with onSubmit mode
  const onSubmitForm = useForm<Pick<ModeFormValues, 'onSubmit'>>({
    resolver: zodResolver(z.object({ onSubmit: modeSchema.shape.onSubmit })),
    mode: 'onSubmit',
    defaultValues: {
      onSubmit: ''
    }
  })

  // Form with onTouched mode
  const onTouchedForm = useForm<Pick<ModeFormValues, 'onTouched'>>({
    resolver: zodResolver(z.object({ onTouched: modeSchema.shape.onTouched })),
    mode: 'onTouched',
    defaultValues: {
      onTouched: ''
    }
  })

  return (
    <div className='space-y-4'>
      <div className='space-y-1'>
        <h2 className='text-lg font-semibold'>{t('forms.validationModesTitle') || 'Demostración de Modos de Validación'}</h2>
        <p className='text-muted-foreground'>
          {t('forms.validationModesDesc') || 'Comprueba cómo los diferentes modos de validación responden a la interacción del usuario. Escribe en cada campo para ver cuándo se evalúa.'}
        </p>
      </div>

      <div className='grid gap-6 md:grid-cols-2 xl:grid-cols-4'>
        {/* onChange Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>{t('forms.modeOnChange') || 'Modo onChange'}</CardTitle>
            <CardDescription>{t('forms.modeOnChangeDesc') || 'Valida en cada pulsación de tecla'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onChangeForm.handleSubmit(() => {
                toast.success(t('forms.formValidSuccess') || 'Formulario onChange validado con éxito')
                onChangeForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onChange'
                control={onChangeForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t('forms.testField') || 'Campo de Prueba'}</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder={t('notifications.type')} />
                    <FieldDescription>
                      {t('forms.errorInstantDesc') || 'El error aparece al instante mientras escribes'}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  {t('common.save')}
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onChangeForm.reset()}>
                  {t('common.refresh')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* onBlur Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>{t('forms.modeOnBlur') || 'Modo onBlur'}</CardTitle>
            <CardDescription>{t('forms.modeOnBlurDesc') || 'Valida al salir del campo'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onBlurForm.handleSubmit(() => {
                toast.success(t('forms.formValidSuccess') || 'Formulario onBlur validado con éxito')
                onBlurForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onBlur'
                control={onBlurForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t('forms.testField') || 'Campo de Prueba'}</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder={t('notifications.type')} />
                    <FieldDescription>
                      {t('forms.errorAfterBlurDesc') || 'El error aparece después de abandonar el campo'}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  {t('common.save')}
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onBlurForm.reset()}>
                  {t('common.refresh')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* onSubmit Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>{t('forms.modeOnSubmit') || 'Modo onSubmit (Por defecto)'}</CardTitle>
            <CardDescription>{t('forms.modeOnSubmitDesc') || 'Valida únicamente al enviar'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onSubmitForm.handleSubmit(() => {
                toast.success(t('forms.formValidSuccess') || 'Formulario onSubmit validado con éxito')
                onSubmitForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onSubmit'
                control={onSubmitForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t('forms.testField') || 'Campo de Prueba'}</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder={t('notifications.type')} />
                    <FieldDescription>
                      {t('forms.errorOnSubmitOnlyDesc') || 'El error aparece únicamente al hacer clic en enviar'}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  {t('common.save')}
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onSubmitForm.reset()}>
                  {t('common.refresh')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* onTouched Mode */}
        <Card>
          <CardHeader>
            <CardTitle className='text-lg font-semibold'>{t('forms.modeOnTouched') || 'Modo onTouched'}</CardTitle>
            <CardDescription>{t('forms.modeOnTouchedDesc') || 'Valida en blur y luego en cada cambio'}</CardDescription>
          </CardHeader>
          <CardContent>
            <form
              onSubmit={onTouchedForm.handleSubmit(() => {
                toast.success(t('forms.formValidSuccess') || 'Formulario onTouched validado con éxito')
                onTouchedForm.reset()
              })}
              className='space-y-4'
            >
              <Controller
                name='onTouched'
                control={onTouchedForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid}>
                    <FieldLabel htmlFor={field.name}>{t('forms.testField') || 'Campo de Prueba'}</FieldLabel>
                    <Input {...field} id={field.name} aria-invalid={fieldState.invalid} placeholder={t('notifications.type')} />
                    <FieldDescription>
                      {t('forms.errorTouchedDesc') || 'Primera validación en blur, luego en tiempo real'}
                    </FieldDescription>
                    {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
                  </Field>
                )}
              />
              <div className='flex gap-2'>
                <Button type='submit' size='sm'>
                  {t('common.save')}
                </Button>
                <Button type='button' variant='outline' size='sm' onClick={() => onTouchedForm.reset()}>
                  {t('common.refresh')}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Table */}
      <div className='overflow-hidden rounded-lg border'>
        <table className='w-full text-sm'>
          <thead className='bg-muted'>
            <tr>
              <th className='p-4 text-left font-semibold'>{t('common.filter') || 'Modo'}</th>
              <th className='p-4 text-left font-semibold'>{t('common.status') || 'Momento de Validación'}</th>
              <th className='p-4 text-left font-semibold'>{t('common.details') || 'Caso Recomendado'}</th>
            </tr>
          </thead>
          <tbody className='divide-y'>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>
                <code className='font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded'>onChange</code>
              </td>
              <td className='p-4'>{t('forms.modeOnChangeTiming') || 'Cada pulsación de tecla'}</td>
              <td className='p-4'>{t('forms.modeOnChangeRec') || 'Retroalimentación en tiempo real (ej. seguridad de contraseña)'}</td>
            </tr>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>
                <code className='font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded'>onBlur</code>
              </td>
              <td className='p-4'>{t('forms.modeOnBlurTiming') || 'Al abandonar el campo'}</td>
              <td className='p-4'>{t('forms.modeOnBlurRec') || 'Validación menos intrusiva (recomendado para la mayoría de casos)'}</td>
            </tr>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>
                <code className='font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded'>onSubmit</code>
              </td>
              <td className='p-4'>{t('forms.modeOnSubmitTiming') || 'Al enviar el formulario'}</td>
              <td className='p-4'>{t('forms.modeOnSubmitRec') || 'Formularios simples y directos'}</td>
            </tr>
            <tr className='hover:bg-muted/20 transition-colors'>
              <td className='p-4 font-medium'>
                <code className='font-mono text-xs font-semibold bg-muted px-1.5 py-0.5 rounded'>onTouched</code>
              </td>
              <td className='p-4'>{t('forms.modeOnTouchedTiming') || 'Primer blur y luego cada cambio'}</td>
              <td className='p-4'>{t('forms.modeOnTouchedRec') || 'Equilibrio óptimo entre experiencia y retroalimentación'}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  )
}

export default ValidationModesDemo
