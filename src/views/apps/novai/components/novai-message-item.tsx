'use client'

import { useState } from 'react'
import { Sparkles, User, Copy, Check, RefreshCw, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger
} from '@/components/ui/tooltip'
import {
  Message,
  MessageContent,
  MessageResponse,
  MessageActions
} from '@/components/ai-elements/message'
import type { ChatMessage } from '../types'

interface NovaiMessageItemProps {
  message: ChatMessage
  isLast: boolean
  isLoading: boolean
  onRegenerate?: () => void
}

export function NovaiMessageItem({ message, isLast, isLoading, onRegenerate }: NovaiMessageItemProps) {
  const isUser = message.role === 'user'
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(message.content)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  if (isUser) {
    return (
      <Message from='user' className='max-w-3xl mx-auto w-full'>
        <div className='flex items-start justify-end gap-3 w-full group'>
          <MessageContent className='max-w-[85%] sm:max-w-[75%] rounded-2xl rounded-tr-xs bg-primary px-4 py-3 text-sm text-primary-foreground shadow-xs'>
            <p className='whitespace-pre-wrap leading-relaxed'>{message.content}</p>
          </MessageContent>
          <div className='size-8 rounded-full bg-muted border border-border/80 flex items-center justify-center text-muted-foreground shrink-0 mt-0.5 shadow-2xs'>
            <User className='size-4' />
          </div>
        </div>
      </Message>
    )
  }

  return (
    <Message from='assistant' className='max-w-3xl mx-auto w-full animate-in fade-in duration-300'>
      <div className='flex items-start gap-3.5 w-full group'>
        {/* NovAi Stylized Avatar */}
        <div className='relative size-8 rounded-xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white flex items-center justify-center shrink-0 shadow-md border border-white/20 mt-0.5'>
          <Sparkles className='size-4 animate-pulse' />
        </div>

        <div className='flex-1 space-y-2.5 min-w-0'>
          {/* Message Header */}
          <div className='flex items-center gap-2'>
            <span className='text-xs font-bold text-foreground'>NovAi</span>
            <span className='text-[10px] font-mono text-muted-foreground'>
              {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>

          {/* Message Body with AI Elements MessageResponse */}
          <MessageContent className='rounded-2xl rounded-tl-xs border border-border/70 bg-card/80 px-4 py-3.5 shadow-2xs backdrop-blur-xs'>
            {message.content ? (
              <MessageResponse>{message.content}</MessageResponse>
            ) : isLoading && isLast ? (
              <div className='flex items-center gap-2 text-xs text-muted-foreground py-1'>
                <RefreshCw className='size-3.5 animate-spin text-primary' />
                <span>NovAi está formulando la respuesta...</span>
              </div>
            ) : null}

            {/* Streaming Cursor */}
            {message.isStreaming && (
              <span className='inline-block size-2 rounded-full bg-primary animate-ping ml-1' />
            )}

            {/* Error notice */}
            {message.error && (
              <div className='mt-2.5 p-2.5 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-center gap-2'>
                <AlertCircle className='size-4 shrink-0' />
                <span>{message.error}</span>
              </div>
            )}
          </MessageContent>

          {/* Assistant Actions Toolbar using AI Elements MessageActions */}
          {!message.isStreaming && message.content && (
            <MessageActions className='opacity-0 group-hover:opacity-100 transition-opacity text-xs gap-1'>
              <Tooltip>
                <TooltipTrigger
                  render={
                    <Button
                      size='icon-xs'
                      variant='ghost'
                      onClick={handleCopy}
                      aria-label='Copiar respuesta'
                      className='text-muted-foreground hover:text-foreground'
                    />
                  }
                >
                  {copied ? <Check className='size-3 text-emerald-500' /> : <Copy className='size-3' />}
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copied ? 'Copiado' : 'Copiar respuesta'}</p>
                </TooltipContent>
              </Tooltip>

              {isLast && onRegenerate && !isLoading && (
                <Tooltip>
                  <TooltipTrigger
                    render={
                      <Button
                        size='icon-xs'
                        variant='ghost'
                        onClick={onRegenerate}
                        aria-label='Regenerar respuesta'
                        className='text-muted-foreground hover:text-foreground'
                      />
                    }
                  >
                    <RefreshCw className='size-3' />
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Regenerar respuesta</p>
                  </TooltipContent>
                </Tooltip>
              )}
            </MessageActions>
          )}
        </div>
      </div>
    </Message>
  )
}

