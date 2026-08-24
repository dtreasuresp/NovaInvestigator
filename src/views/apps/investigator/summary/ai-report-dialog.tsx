'use client'

import { useState, useEffect } from 'react'

import { Sparkles, RefreshCw, Copy, Check, AlertCircle, FileText } from 'lucide-react'

import { toast } from 'sonner'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  Artifact,
  ArtifactHeader,
  ArtifactTitle,
  ArtifactDescription,
  ArtifactActions,
  ArtifactAction,
  ArtifactContent
} from '@/components/ai-elements/artifact'
import { MessageResponse } from '@/components/ai-elements/message'
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'

export function AiReportDialog({
  onReportGenerated
}: {
  onReportGenerated?: (text: string) => void
}) {
  const { t, locale } = useI18n()
  const { state, aiQuota, isLoadingAiQuota, refreshAiQuota } = useInvestigatorAnalysis()
  const [open, setOpen] = useState(false)
  const [step, setStep] = useState<'confirm' | 'generating' | 'result'>('confirm')
  const [generatedReport, setGeneratedReport] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (open) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- reset al abrir el diálogo (patrón preexistente)
      setStep('confirm')
      setGeneratedReport('')
      void refreshAiQuota()
    }
  }, [open, refreshAiQuota])

  const handleStartGeneration = async () => {
    if (aiQuota && aiQuota.limitValue !== null && aiQuota.remaining !== null && aiQuota.remaining <= 0) {
      toast.error(t('novai.aiQuotaExhaustedDesc') || 'Has alcanzado el límite mensual de consultas de tu plan.')

      return
    }

    setStep('generating')
    setGeneratedReport('')

    try {
      const response = await fetch('/api/investigations/ai/report', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          format: 'academic',
          locale,
          state,
          investigationId: state.metadata?.id || undefined
        })
      })

      if (!response.ok) {
        const errData = await response.json().catch(() => ({}))

        throw new Error(errData.error || 'Error al generar el dictamen con IA.')
      }

      if (!response.body) {
        throw new Error('Respuesta vacía del servidor.')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let accumulatedText = ''

      while (true) {
        const { done, value } = await reader.read()

        if (done) break

        const chunkStr = decoder.decode(value, { stream: true })
        const lines = chunkStr.split('\n')

        for (const line of lines) {
          const trimmed = line.trim()

          if (!trimmed.startsWith('data: ')) continue

          try {
            const data = JSON.parse(trimmed.slice(6))

            if (data.chunk) {
              accumulatedText += data.chunk
              setGeneratedReport(accumulatedText)
            } else if (data.error) {
              throw new Error(data.error)
            }
          } catch {
            // Ignore parse errors on partial chunks
          }
        }
      }

      setStep('result')

      if (onReportGenerated && accumulatedText) {
        onReportGenerated(accumulatedText)
      }

      toast.success('Dictamen con IA redactado con éxito.')
      void refreshAiQuota()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err || 'Fallo en la redacción del dictamen.')
      toast.error(msg)
      setStep('confirm')
    }
  }

  const handleCopy = () => {
    if (typeof navigator !== 'undefined' && navigator.clipboard && generatedReport) {
      navigator.clipboard.writeText(generatedReport)
      setCopied(true)
      toast.success(t('novai.aiCopySuccess') || 'Dictamen copiado al portapapeles.')
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const isQuotaExhausted = aiQuota !== null && aiQuota.remaining !== null && aiQuota.remaining <= 0

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger
        render={
          <Button
            size='sm'
            variant='default'
            className='gap-1.5 bg-primary hover:bg-primary/90 text-primary-foreground text-xs shadow-xs cursor-pointer'
          >
            <Sparkles className='size-3.5' />
            <span>{t('novai.aiGenerateReportBtn') || 'Redactar dictamen con IA'}</span>
          </Button>
        }
      />

      <DialogContent className='sm:max-w-2xl max-h-[85vh] flex flex-col'>
        <DialogHeader>
          <div className='flex items-center gap-2'>
            <div className='p-1.5 rounded-lg bg-primary/10 text-primary'>
              <Sparkles className='size-4' />
            </div>
            <DialogTitle className='text-base font-bold'>
              {t('novai.aiReportModalTitle') || 'Redacción del informe con NovAi'}
            </DialogTitle>
          </div>
          <DialogDescription className='text-xs'>
            {t('novai.aiReportModalDesc') || 'Generación de síntesis ejecutiva y defensa metodológica de alto nivel basada en los datos de la investigación activa.'}
          </DialogDescription>
        </DialogHeader>

        {step === 'confirm' && (
          <div className='py-4 space-y-4 text-xs'>
            <div className='p-3.5 rounded-xl border bg-muted/30 space-y-2'>
              <div className='flex items-center justify-between'>
                <span className='font-semibold text-foreground'>
                  {t('novai.aiQuotaUsageTitle') || 'Consumo de Cuota de tu Plan:'}
                </span>
                {aiQuota && (
                  <Badge variant={isQuotaExhausted ? 'destructive' : 'outline'} className='text-[10px] font-mono'>
                    {aiQuota.limitValue === null
                      ? (t('novai.aiUnlimitedQueries') || 'Ilimitado')
                      : `${aiQuota.remaining ?? 0} / ${aiQuota.limitValue} ${t('novai.aiRemainingQueries') || 'disponibles'}`}
                  </Badge>
                )}
              </div>
              <p className='text-muted-foreground leading-relaxed'>
                {t('novai.aiQuotaUsageNotice') || 'Esta acción utilizará 1 consulta de tu cuota mensual de IA. La IA procesará todos los factores EFI/EFE, matrices DAFO, QSPM y plan CAME para redactar una fundamentación continua y rigurosa.'}
              </p>
            </div>

            {isQuotaExhausted && (
              <div className='p-3 rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 flex items-start gap-2 text-red-800 dark:text-red-300'>
                <AlertCircle className='size-4 shrink-0 mt-0.5' />
                <div>
                  <p className='font-semibold'>{t('novai.aiQuotaExhaustedTitle') || 'Cuota mensual agotada'}</p>
                  <p className='text-[11px] mt-0.5'>
                    {t('novai.aiQuotaExhaustedDesc') || 'Has utilizado todas las consultas de IA disponibles para este período en tu plan. Actualiza a Pro para obtener más consultas.'}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}

        {(step === 'generating' || step === 'result') && (
          <div className='flex-1 overflow-y-auto py-2 space-y-3'>
            {step === 'generating' && !generatedReport && (
              <div className='py-12 flex flex-col items-center justify-center text-center gap-3 text-muted-foreground'>
                <div className='relative'>
                  <div className='absolute -inset-1 rounded-full bg-primary/30 blur-md animate-pulse' />
                  <div className='relative size-10 rounded-full bg-primary/10 flex items-center justify-center text-primary'>
                    <RefreshCw className='size-5 animate-spin' />
                  </div>
                </div>
                <p className='text-xs font-medium'>{t('novai.aiGeneratingReportNotice') || 'Analizando expediente y redactando dictamen...'}</p>
              </div>
            )}
            {generatedReport && (
              <Artifact className='border border-border/80 bg-card/60 shadow-xs'>
                <ArtifactHeader className='bg-muted/40 px-3.5 py-2.5'>
                  <div className='flex items-center gap-2'>
                    <FileText className='size-4 text-primary shrink-0' />
                    <div>
                      <ArtifactTitle className='text-xs font-semibold'>Dictamen Estratégico Ejecutivo</ArtifactTitle>
                      <ArtifactDescription className='text-[10px]'>Síntesis metodológica generada por NovAi</ArtifactDescription>
                    </div>
                  </div>
                  <ArtifactActions>
                    <ArtifactAction
                      icon={copied ? Check : Copy}
                      onClick={handleCopy}
                      tooltip={copied ? 'Copiado' : 'Copiar dictamen'}
                    />
                  </ArtifactActions>
                </ArtifactHeader>
                <ArtifactContent className='p-4 text-xs leading-relaxed text-foreground max-h-96 overflow-y-auto'>
                  <MessageResponse>{generatedReport}</MessageResponse>
                </ArtifactContent>
              </Artifact>
            )}
          </div>
        )}

        <DialogFooter className='gap-2 sm:justify-between items-center border-t pt-3'>
          {step === 'confirm' ? (
            <>
              <Button size='sm' variant='outline' onClick={() => setOpen(false)} className='text-xs cursor-pointer'>
                {t('common.cancel') || 'Cancelar'}
              </Button>
              <Button
                size='sm'
                disabled={isLoadingAiQuota || isQuotaExhausted}
                onClick={handleStartGeneration}
                className='text-xs gap-1.5 cursor-pointer'
              >
                <Sparkles className='size-3.5' />
                {t('novai.aiConfirmAndGenerate') || 'Confirmar y redactar'}
              </Button>
            </>
          ) : (
            <>
              <Button
                size='sm'
                variant='outline'
                disabled={step === 'generating'}
                onClick={handleStartGeneration}
                className='text-xs gap-1 cursor-pointer'
              >
                <RefreshCw className='size-3' />
                {t('common.refresh') || 'Regenerar'}
              </Button>
              <div className='flex gap-2'>
                <Button size='sm' variant='outline' onClick={handleCopy} className='text-xs gap-1 cursor-pointer'>
                  {copied ? <Check className='size-3 text-emerald-600' /> : <Copy className='size-3' />}
                  {copied ? 'Copiado' : (t('common.copy') || 'Copiar')}
                </Button>
                <Button size='sm' onClick={() => setOpen(false)} className='text-xs cursor-pointer'>
                  {t('common.close') || 'Cerrar'}
                </Button>
              </div>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
