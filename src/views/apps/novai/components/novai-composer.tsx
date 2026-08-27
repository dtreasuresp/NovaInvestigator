'use client'

import {
  Lock,
  ShieldAlert,
  Zap,
  MessageSquare,
  Target,
  BarChart3,
  Search,
  Code2,
  Layers,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from '@/components/ui/dropdown-menu'
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputTools,
  PromptInputSubmit
} from '@/components/ai-elements/prompt-input'

import type { AiQuotaInfo, NovaiContext, NovaiMode } from '@/features/novai/schema'
import { NOVAI_MODES } from '@/features/novai/adapters/modes'

interface NovaiComposerProps {
  input: string
  setInput: (value: string) => void
  onSend: () => void
  onStop: () => void
  isLoading: boolean
  quota: AiQuotaInfo | null
  contextApp?: NovaiContext['app']
  setContextApp?: (app: NovaiContext['app']) => void
  selectedMode?: NovaiMode
  setSelectedMode?: (mode: NovaiMode) => void
}

export function NovaiComposer({
  input,
  setInput,
  onSend,
  onStop,
  isLoading,
  quota,
  selectedMode = 'CHAT',
  setSelectedMode
}: NovaiComposerProps) {
  const dailyRem = quota?.dailyRemaining ?? quota?.daily?.remaining ?? null
  const dailyLim = quota?.dailyLimitValue ?? quota?.daily?.limitValue ?? null

  const isQuotaExhausted =
    quota !== null &&
    ((quota.limitValue !== null && quota.remaining !== null && quota.remaining <= 0) ||
      (dailyLim !== null && dailyRem !== null && dailyRem <= 0))

  const isNotAllowed = quota !== null && !quota.allowed
  const isDisabled = isNotAllowed || isQuotaExhausted

  const modeIcons: Record<NovaiMode, typeof MessageSquare> = {
    CHAT: MessageSquare,
    CONSULTANT: Target,
    ANALYST: BarChart3,
    RESEARCHER: Search,
    DEVELOPER: Code2,
    ARCHITECT: Layers,
    OPERATOR: Activity
  }

  const CurrentModeIcon = modeIcons[selectedMode] || MessageSquare

  const placeholder =
    selectedMode === 'CONSULTANT'
      ? 'Pide una auditoría de cruces DAFO, ponderaciones EFI/EFE o estrategias CAME...'
      : selectedMode === 'DEVELOPER'
        ? 'Pregunta sobre esquemas SQL, Route Handlers, TypeScript o componentes React...'
        : selectedMode === 'ARCHITECT'
          ? 'Consulta sobre seguridad ReBAC, aislamiento multi-tenant o Stripe...'
          : selectedMode === 'ANALYST'
            ? 'Pide estadísticas de proyectos, avance de tareas o tasas de cobertura...'
            : selectedMode === 'OPERATOR'
              ? 'Consulta el estado de tableros Kanban, prioridades o cuellos de botella...'
              : 'Escribe tu consulta para NovAi...'

  return (
    <div className='w-full max-w-3xl mx-auto px-3 sm:px-4 pb-3 pt-1 shrink-0'>
      {/* Quota or Permission Alert */}
      {isNotAllowed ? (
        <div className='mb-2.5 p-3 rounded-2xl border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center justify-between shadow-xs'>
          <div className='flex items-center gap-2'>
            <ShieldAlert className='size-4 shrink-0' />
            <span>NovAi no está incluido en tu plan actual. Contacta al administrador para activarlo.</span>
          </div>
        </div>
      ) : isQuotaExhausted ? (
        <div className='mb-2.5 p-3 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/70 dark:bg-amber-950/20 text-xs text-amber-800 dark:text-amber-300 flex items-center gap-2 shadow-xs'>
          <Lock className='size-4 shrink-0 text-amber-600' />
          <span>Has alcanzado el límite de consultas de NovAi. Se renovará según el período de tu plan.</span>
        </div>
      ) : null}

      {/* PromptInput with single clean container styling */}
      <PromptInput
        onSubmit={(_msg, _evt) => {
          if (!isLoading && input.trim() && !isDisabled) {
            onSend()
          }
        }}
        className='w-full [&_[data-slot=input-group]]:rounded-2xl [&_[data-slot=input-group]]:border-border/70 [&_[data-slot=input-group]]:bg-card/90 dark:[&_[data-slot=input-group]]:bg-card/90 [&_[data-slot=input-group]]:shadow-sm [&_[data-slot=input-group]]:transition-all'
      >
        <PromptInputTextarea
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder={placeholder}
          className='w-full resize-none border-0 bg-transparent px-4 pt-3.5 pb-2 text-sm placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:outline-none min-h-[48px] max-h-[180px] leading-relaxed'
        />

        {/* Composer Controls Bar */}
        <PromptInputFooter className='flex items-center justify-between px-3 pb-2.5 pt-0.5 gap-2 flex-wrap sm:flex-nowrap'>
          <PromptInputTools className='flex items-center gap-2 flex-wrap'>
            {/* 7 Operational Modes Selector */}
            {setSelectedMode && (
              <DropdownMenu>
                <DropdownMenuTrigger
                  render={
                    <Button
                      size='sm'
                      variant='ghost'
                      className='h-7 gap-1.5 rounded-full border border-border/50 bg-background/80 hover:bg-muted px-2.5 text-xs font-medium text-foreground cursor-pointer shadow-2xs'
                    >
                      <CurrentModeIcon className='size-3.5 text-muted-foreground' />
                      <span className='max-w-[120px] truncate'>{selectedMode}</span>
                    </Button>
                  }
                />
                <DropdownMenuContent align='start' className='w-64 rounded-xl'>
                  <div className='px-2.5 py-1.5 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider'>
                    Modo de Operación NovAi
                  </div>
                  <DropdownMenuSeparator />
                  {(Object.keys(NOVAI_MODES) as NovaiMode[]).map(modeKey => {
                    const def = NOVAI_MODES[modeKey]
                    const Icon = modeIcons[modeKey]
                    const isSelected = selectedMode === modeKey

                    return (
                      <DropdownMenuItem
                        key={modeKey}
                        onClick={() => setSelectedMode(modeKey)}
                        className={`gap-2.5 text-xs py-1.5 cursor-pointer ${isSelected ? 'bg-primary/10 font-semibold text-primary' : ''}`}
                      >
                        <Icon className={`size-4 shrink-0 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                        <div className='flex flex-col'>
                          <span>{def.title}</span>
                          <span className='text-[10px] text-muted-foreground line-clamp-1'>{def.description}</span>
                        </div>
                      </DropdownMenuItem>
                    )
                  })}
                </DropdownMenuContent>
              </DropdownMenu>
            )}

            {/* Quota Badge Indicator */}
            {quota && (
              <Badge
                variant={!quota.allowed || isQuotaExhausted ? 'destructive' : 'secondary'}
                className='h-7 px-2.5 gap-1.5 rounded-full text-[11px] font-mono border border-border/40 shadow-2xs shrink-0'
              >
                <Zap className='size-3 text-amber-500 shrink-0' />
                <span>
                  {!quota.allowed
                    ? 'Sin cuota'
                    : quota.limitValue === null
                      ? 'Ilimitado'
                      : `${quota.remaining ?? 0} / ${quota.limitValue}`}
                </span>
                {dailyLim !== null && (
                  <span className='opacity-75 text-[10px] pl-1 border-l border-current/20'>
                    Hoy: {dailyRem ?? 0}/{dailyLim}
                  </span>
                )}
              </Badge>
            )}
          </PromptInputTools>

          {/* Action Button via PromptInputSubmit with status / onStop */}
          <div className='flex items-center gap-2 shrink-0 ml-auto'>
            <PromptInputSubmit
              status={isLoading ? 'streaming' : 'ready'}
              onStop={onStop}
              disabled={!input.trim() || isDisabled}
              className='size-8 rounded-full shadow-xs'
            />
          </div>
        </PromptInputFooter>
      </PromptInput>

      {/* Sidelined Disclaimer */}
      <p className='mt-2 text-center text-[11px] text-muted-foreground/60 select-none'>
        NovAi puede cometer errores. Verifica la formulación metodológica y los datos estratégicos.
      </p>
    </div>
  )
}

