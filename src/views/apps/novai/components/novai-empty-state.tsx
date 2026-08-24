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
  const greeting = userName ? `¡Hola, ${userName}!` : '¡Hola!'

  // Filter prompts based on current context if specific, or show all
  const displayedPrompts =
    currentContext === 'general'
      ? STARTER_PROMPTS
      : STARTER_PROMPTS.filter(p => p.context === currentContext || p.context === 'investigator')

  return (
    <div className='flex flex-1 flex-col items-center justify-center p-6 text-center max-w-3xl mx-auto my-auto animate-in fade-in duration-500'>
      {/* Glowing NovAi Avatar / Badge */}
      <div className='relative mb-6'>
        <div className='absolute -inset-2 rounded-full bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-400 opacity-60 blur-xl animate-pulse' />
        <div className='relative size-14 rounded-2xl bg-card border border-primary/30 flex items-center justify-center shadow-xl'>
          <Sparkles className='size-7 text-primary animate-pulse' />
        </div>
      </div>

      {/* Hero Title & Subtitle */}
      <h1 className='text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground mb-2'>
        {greeting} ¿En qué te puedo ayudar hoy?
      </h1>
      <p className='text-xs sm:text-sm text-muted-foreground max-w-lg mb-8 leading-relaxed'>
        Soy <span className='font-semibold text-foreground'>NovAi</span>, tu copiloto experto en formulación estratégica empresarial (DAFO, EFI, EFE, QSPM, CAME), gestión de proyectos Kanban y analítica ERP.
      </p>

      {/* Grid of Starter Prompt Cards with AI Elements Suggestions */}
      <Suggestions className='grid grid-cols-1 sm:grid-cols-2 gap-3 w-full text-left'>
        {displayedPrompts.map((card, idx) => {
          return (
            <Suggestion
              key={idx}
              suggestion={card.prompt}
              onClick={() => onSelectPrompt(card.prompt, card.context)}
              className='group relative flex flex-col justify-between p-3.5 rounded-2xl border border-border/70 bg-card/60 hover:bg-card hover:border-primary/40 transition-all duration-200 shadow-2xs hover:shadow-md cursor-pointer hover:-translate-y-0.5 h-auto text-left items-start'
            >
              <div className='space-y-1.5 w-full'>
                <div className='flex items-center justify-between w-full'>
                  <span className='text-[10px] font-bold uppercase tracking-wider text-primary/80 flex items-center gap-1'>
                    <Zap className='size-2.5' />
                    {card.category}
                  </span>
                  <div className='size-6 rounded-lg bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors'>
                    <ArrowUpRight className='size-3.5' />
                  </div>
                </div>
                <h3 className='text-xs font-bold text-foreground group-hover:text-primary transition-colors'>
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
