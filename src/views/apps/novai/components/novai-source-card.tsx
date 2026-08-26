'use client'

import { FileText, Globe, ExternalLink } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Source } from '@/components/ai-elements/sources'
import type { SourceItemData } from '../types'

interface NovaiSourceCardProps {
  source: SourceItemData
  className?: string
}

export function NovaiSourceCard({ source, className = '' }: NovaiSourceCardProps) {
  const isExternal = source.sourceType === 'external'

  return (
    <div className={`rounded-xl border border-border/80 bg-card/60 p-3 shadow-2xs space-y-2 my-2 transition-all hover:border-primary/40 not-prose ${className}`}>
      <div className='flex items-center justify-between gap-2 flex-wrap'>
        <div className='flex items-center gap-2 min-w-0'>
          <div className='p-1 rounded bg-muted text-muted-foreground'>
            {isExternal ? <Globe className='size-3.5 text-blue-500' /> : <FileText className='size-3.5 text-primary' />}
          </div>
          <span className='font-semibold text-xs text-foreground truncate max-w-[220px] sm:max-w-[320px]'>
            {source.name}
          </span>
        </div>

        <Badge variant={isExternal ? 'secondary' : 'outline'} className='text-[10px] font-normal h-5'>
          {isExternal ? 'Fuente Externa' : 'Documento Interno'}
        </Badge>
      </div>

      {source.excerpt && (
        <p className='text-xs text-muted-foreground line-clamp-2 leading-relaxed bg-muted/30 p-2 rounded-lg'>
          {source.excerpt}
        </p>
      )}

      <div className='flex items-center justify-between gap-2 text-[11px] text-muted-foreground pt-1 border-t border-border/40'>
        <div className='flex items-center gap-2'>
          {source.page && <span>Pág. {source.page}</span>}
          {source.factorCount !== undefined && <span>· {source.factorCount} factores citados</span>}
        </div>

        {source.url && (
          <Source href={source.url} title='Visitar Fuente Externa' className='text-[11px] gap-1 text-primary hover:underline'>
            <span>Visitar</span>
            <ExternalLink className='size-2.5' />
          </Source>
        )}
      </div>
    </div>
  )
}
