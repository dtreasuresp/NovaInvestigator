'use client'

import { BookOpen, Globe, ChevronDownIcon } from 'lucide-react'
import { Sources, SourcesTrigger, SourcesContent, Source } from '@/components/ai-elements/sources'
import type { SourceItemData, EvidenceItemData } from '../types'

interface NovaiSourcesGroupProps {
  sources?: SourceItemData[]
  evidences?: EvidenceItemData[]
  className?: string
}

export function NovaiSourcesGroup({ sources, evidences, className = '' }: NovaiSourcesGroupProps) {
  const allSources = sources ?? []
  const evidenceSources = (evidences ?? []).map(e => ({
    name: e.factorName ? `${e.factorCode ?? ''} · ${e.factorName}`.trim() : e.factorName ?? 'Evidencia',
    excerpt: e.snippet,
    sourceType: 'internal' as const,
    documentName: e.documentName,
    factorCode: e.factorCode
  }))

  const combined = [...allSources]
  // Evidencias internas se muestran como fuentes internas agrupadas, no como tarjetas separadas
  const internalEvidences = evidenceSources.filter(e => e.excerpt)
  const total = combined.length + (internalEvidences.length > 0 ? 1 : 0)
  // Para no saturar, si hay evidencias, las colapsamos en un solo grupo
  const displaySources = combined.length > 0 ? combined : []
  const hasEvidenceGroup = internalEvidences.length > 0

  const totalCount = displaySources.length + (hasEvidenceGroup ? internalEvidences.length : 0)
  if (totalCount === 0) return null

  // Si solo hay pocas fuentes (<=2) y pocas evidencias, mostrar colapsado por defecto
  const shouldCollapse = totalCount > 2

  return (
    <div className={`w-full my-2 not-prose ${className}`}>
      <Sources {...({ defaultOpen: !shouldCollapse } as unknown as Record<string, unknown>)} className='rounded-xl border border-border/60 bg-card/40 p-2 text-xs'>
        <SourcesTrigger count={totalCount} className='w-full'>
          <div className='flex items-center gap-2 w-full cursor-pointer p-1'>
            <span className='text-xs' aria-hidden>📚</span>
            <p className='font-semibold text-foreground text-xs'>
              {totalCount} {totalCount === 1 ? 'fuente consultada' : 'fuentes consultadas'}
            </p>
            <ChevronDownIcon className='ml-auto size-3.5 text-muted-foreground transition-transform group-data-[state=open]:rotate-180' aria-hidden />
          </div>
        </SourcesTrigger>
        <SourcesContent className='mt-2 space-y-2 pl-1'>
          {displaySources.map((src, idx) => {
            const isExternal = src.sourceType === 'external'
            return (
              <div key={idx} className='flex items-start gap-2 rounded-lg border border-border/40 bg-background p-2.5 hover:border-primary/30 transition-colors'>
                <div className='mt-0.5 p-1 rounded bg-muted text-muted-foreground shrink-0' aria-hidden>
                  {isExternal ? <Globe className='size-3 text-chart-2' /> : <BookOpen className='size-3 text-primary' />}
                </div>
                <div className='flex-1 min-w-0'>
                  <Source href={src.url} title={src.name} className='text-xs font-medium text-foreground hover:text-primary truncate block'>
                    {src.name}
                  </Source>
                  {src.excerpt && (
                    <p className='text-xs text-muted-foreground line-clamp-2 mt-1 leading-relaxed'>{src.excerpt}</p>
                  )}
                  <p className='text-xs text-muted-foreground/70 mt-1'>
                    {isExternal ? 'Fuente externa' : 'Documento interno'} {src.retrievedAt ? `· ${new Date(src.retrievedAt).toLocaleDateString()}` : ''}
                  </p>
                </div>
              </div>
            )
          })}
          {hasEvidenceGroup && (
            <div className='rounded-lg border border-border/40 bg-muted/20 p-2.5'>
              <p className='text-xs font-medium text-foreground flex items-center gap-1.5'>
                <BookOpen className='size-3 text-primary' aria-hidden /> Evidencia interna del expediente
              </p>
              <ul className='mt-1.5 space-y-1 list-disc list-inside text-xs text-muted-foreground'>
                {internalEvidences.slice(0, 5).map((e, i) => (
                  <li key={i} className='truncate'>
                    <span className='font-medium text-foreground/80'>{e.factorCode ?? e.name}</span>
                    {e.excerpt ? ` — ${e.excerpt.slice(0, 80)}${e.excerpt.length > 80 ? '…' : ''}` : ''}
                  </li>
                ))}
                {internalEvidences.length > 5 && (
                  <li className='text-muted-foreground/70'>+ {internalEvidences.length - 5} evidencias más</li>
                )}
              </ul>
            </div>
          )}
          <p className='text-xs text-muted-foreground/60 pt-1'>Fuentes verificadas por el runtime — el modelo no puede inventar fuentes.</p>
        </SourcesContent>
      </Sources>
    </div>
  )
}
