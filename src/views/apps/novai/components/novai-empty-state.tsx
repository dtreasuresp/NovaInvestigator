'use client'

import { Sparkles, Compass, Kanban, LineChart, ShieldCheck, Zap, ArrowUpRight } from 'lucide-react'
import { Suggestions, Suggestion } from '@/components/ai-elements/suggestion'
import type { NovaiContext } from '@/features/novai/schema'

interface NovaiEmptyStateProps {
  userName?: string | null
  onSelectPrompt: (promptText: string, context: NovaiContext['app']) => void
  currentContext: NovaiContext['app']
}

interface PromptCard {
  title: string
  description: string
  prompt: string
  context: NovaiContext['app']
  icon: typeof Compass
  category: string
}

const STARTER_PROMPTS: PromptCard[] = [
  {
    category: 'Investigador (EFI / EFE)',
    title: 'Evaluar consistencia de ponderaciones',
    description: 'Verifica si la suma de pesos en matrices internas y externas respeta el 100% metodológico.',
    prompt: 'Analiza la coherencia y balance de ponderaciones y calificaciones entre mis matrices EFI y EFE.',
    context: 'investigator',
    icon: LineChart
  },
  {
    category: 'Investigador (DAFO & CAME)',
    title: 'Explicar vector DAFO y plan CAME',
    description: 'Interpreta el cuadrante dominante y propone iniciativas de mitigación para debilidades críticas.',
    prompt: 'Explica el vector dominante de la matriz DAFO y sugiéreme 3 acciones CAME clave para las principales debilidades.',
    context: 'investigator',
    icon: Compass
  },
  {
    category: 'Investigador (QSPM)',
    title: 'Justificar selección de estrategia',
    description: 'Fundamenta cuantitativamente la estrategia ganadora según la matriz cuantitativa de Fred R. David.',
    prompt: 'Genera la justificación cuantitativa y metodológica de la estrategia con mayor TAS acumulado en la matriz QSPM.',
    context: 'investigator',
    icon: ShieldCheck
  },
  {
    category: 'Kanban & Flujo',
    title: 'Detectar cuellos de botella en tableros',
    description: 'Analiza límites de trabajo en progreso (WIP), tarjetas estancadas y optimización del lead time.',
    prompt: '¿Cómo puedo estructurar mis columnas Kanban y fijar límites WIP óptimos para un equipo ágil?',
    context: 'kanban',
    icon: Kanban
  }
]

export function NovaiEmptyState({ userName, onSelectPrompt, currentContext }: NovaiEmptyStateProps) {
  const greeting = userName ? `Hola, ${userName}` : 'Hola'

  // Filter prompts based on current context if specific, or show all
  const displayedPrompts =
    currentContext === 'general'
      ? STARTER_PROMPTS
      : STARTER_PROMPTS.filter(p => p.context === currentContext || p.context === 'investigator')

  return (
    <div className='flex flex-1 flex-col items-center justify-center p-6 text-center max-w-2xl mx-auto my-auto'>
      {/* NovAi Brand Icon */}
      <div className='relative mb-5'>
        <div className='size-12 rounded-2xl bg-muted/60 border border-border/80 flex items-center justify-center shadow-xs'>
          <Sparkles className='size-6 text-foreground' />
        </div>
      </div>

      {/* Hero Title & Subtitle */}
      <h1 className='text-2xl sm:text-3xl font-bold tracking-tight text-foreground mb-2'>
        {greeting}, ¿en qué puedo ayudarte hoy?
      </h1>
      <p className='text-xs sm:text-sm text-muted-foreground max-w-md mb-8 leading-relaxed'>
        Asistente estratégico para análisis DAFO, matrices EFI/EFE, evaluación QSPM y gestión de tableros.
      </p>

      {/* Grid of Starter Prompt Cards with AI Elements Suggestions */}
      <Suggestions className='grid grid-cols-1 sm:grid-cols-2 gap-2.5 w-full text-left'>
        {displayedPrompts.map((card, idx) => {
          const Icon = card.icon

          return (
            <Suggestion
              key={idx}
              suggestion={card.prompt}
              onClick={() => onSelectPrompt(card.prompt, card.context)}
              className='group relative flex flex-col justify-between p-3.5 rounded-2xl border border-border/60 bg-muted/20 hover:bg-muted/60 hover:border-border transition-all duration-150 shadow-2xs cursor-pointer h-auto text-left items-start'
            >
              <div className='space-y-1.5 w-full'>
                <div className='flex items-center justify-between w-full'>
                  <span className='text-[10px] font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5'>
                    <Icon className='size-3 text-muted-foreground' />
                    {card.category}
                  </span>
                  <ArrowUpRight className='size-3.5 text-muted-foreground/60 group-hover:text-foreground transition-colors' />
                </div>
                <h3 className='text-xs font-semibold text-foreground leading-snug'>
                  {card.title}
                </h3>
                <p className='text-[11px] text-muted-foreground leading-snug line-clamp-2'>
                  {card.description}
                </p>
              </div>
            </Suggestion>
          )
        })}
      </Suggestions>
    </div>
  )
}
