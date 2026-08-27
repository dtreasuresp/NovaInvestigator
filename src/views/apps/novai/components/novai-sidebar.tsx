'use client'

import { useState } from 'react'
import {
  MessageSquare,
  Plus,
  Trash2,
  Search,
  Sparkles,
  Zap,
  Edit2,
  Check,
  X,
  Compass,
  Kanban,
  HelpCircle,
  ChevronLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import type { AiQuotaInfo } from '@/features/novai/schema'
import type { ChatThread } from '../types'

interface NovaiSidebarProps {
  threads: ChatThread[]
  activeThreadId: string | null
  onSelectThread: (id: string) => void
  onNewThread: () => void
  onDeleteThread: (id: string) => void
  onRenameThread: (id: string, title: string) => void
  quota: AiQuotaInfo | null
  isLoadingQuota: boolean
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export function NovaiSidebar({
  threads,
  activeThreadId,
  onSelectThread,
  onNewThread,
  onDeleteThread,
  onRenameThread,
  quota,
  isLoadingQuota,
  isCollapsed,
  onToggleCollapse
}: NovaiSidebarProps) {
  const [search, setSearch] = useState('')
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const startRename = (thread: ChatThread, e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(thread.id)
    setEditTitle(thread.title)
  }

  const saveRename = (id: string, e?: React.FormEvent) => {
    e?.preventDefault()
    
    if (editTitle.trim()) {
      onRenameThread(id, editTitle.trim())
    }
    
    setEditingId(null)
  }

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation()
    setEditingId(null)
  }

  const safeThreads = (threads || []).filter((t): t is ChatThread => Boolean(t && t.id))
  const filteredThreads = safeThreads.filter(t =>
    (t.title || '').toLowerCase().includes(search.toLowerCase())
  )

  // Group threads by recency
  const now = new Date()
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime()
  const yesterdayStart = todayStart - 86400000
  const lastWeekStart = todayStart - 7 * 86400000

  const getThreadTime = (t: ChatThread) => {
    const raw = t.updatedAt || t.createdAt
    const time = raw ? new Date(raw).getTime() : 0

    return Number.isNaN(time) ? 0 : time
  }

  const groups = {
    today: filteredThreads.filter(t => getThreadTime(t) >= todayStart),
    yesterday: filteredThreads.filter(
      t => getThreadTime(t) >= yesterdayStart && getThreadTime(t) < todayStart
    ),
    lastWeek: filteredThreads.filter(
      t => getThreadTime(t) >= lastWeekStart && getThreadTime(t) < yesterdayStart
    ),
    older: filteredThreads.filter(t => getThreadTime(t) < lastWeekStart)
  }

  if (isCollapsed) {
    return (
      <div className='hidden md:flex absolute inset-y-0 left-0 z-30 flex-col items-center border-r border-border/60 bg-card/85 backdrop-blur-md py-4 px-2 w-14 shrink-0 justify-between h-full transition-all duration-200'>
        <div className='flex flex-col items-center gap-3'>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size='icon'
                    variant='outline'
                    onClick={onToggleCollapse}
                    className='size-9 rounded-xl border-border/70 shadow-xs'
                  >
                    <ChevronLeft className='size-4 rotate-180' />
                  </Button>
                }
              />
              <TooltipContent side='right'>Expandir panel lateral</TooltipContent>
            </Tooltip>
          </TooltipProvider>

          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger
                render={
                  <Button
                    size='icon'
                    onClick={onNewThread}
                    className='size-9 rounded-xl bg-primary text-primary-foreground shadow-xs hover:bg-primary/90'
                  >
                    <Plus className='size-4' />
                  </Button>
                }
              />
              <TooltipContent side='right'>Nuevo Chat (Ctrl+K)</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        <div className='flex flex-col items-center gap-2'>
          <div className='size-8 rounded-full bg-primary/10 flex items-center justify-center text-primary'>
            <Sparkles className='size-4 animate-pulse' />
          </div>
        </div>
      </div>
    )
  }

  return (
    <>
      {/* Mobile Backdrop Overlay */}
      <div
        className='fixed inset-0 z-40 bg-black/60 backdrop-blur-xs md:hidden'
        onClick={onToggleCollapse}
        aria-hidden='true'
      />

      <aside className='fixed md:absolute inset-y-0 left-0 z-50 md:z-30 flex w-72 md:w-80 flex-col border-r border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shrink-0 h-full justify-between transition-all duration-200 select-none'>
      {/* Header & New Chat */}
      <div className='p-3.5 space-y-3 shrink-0'>
        <div className='flex items-center justify-between'>
          <div className='flex items-center gap-2.5'>
            <div className='size-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-xs border border-primary/20'>
              <Sparkles className='size-4' />
            </div>
            <div>
              <h2 className='text-sm font-bold tracking-tight'>NovAi</h2>
              <p className='text-[11px] text-muted-foreground'>Historial de chats</p>
            </div>
          </div>
          <Button
            size='icon'
            variant='ghost'
            onClick={onToggleCollapse}
            className='size-8 text-muted-foreground hover:text-foreground'
          >
            <ChevronLeft className='size-4' />
          </Button>
        </div>

        <Button
          onClick={onNewThread}
          className='w-full justify-start gap-2 h-9 text-xs font-medium rounded-xl shadow-xs bg-foreground text-background hover:bg-foreground/90'
        >
          <Plus className='size-4' />
          <span>Nuevo chat</span>
          <span className='ml-auto font-mono text-[10px] opacity-60 border border-border/40 px-1.5 py-0.5 rounded'>Ctrl+K</span>
        </Button>

        {threads.length > 3 && (
          <div className='relative'>
            <Search className='absolute left-2.5 top-2.5 size-3.5 text-muted-foreground' />
            <Input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder='Buscar conversaciones...'
              className='h-8 pl-8 text-xs bg-background/80 rounded-lg'
            />
          </div>
        )}
      </div>

      {/* Threads List */}
      <div className='flex-1 overflow-y-auto px-2.5 space-y-4 text-xs'>
        {threads.length === 0 ? (
          <div className='flex flex-col items-center justify-center py-12 text-center text-muted-foreground space-y-2 px-4'>
            <MessageSquare className='size-8 stroke-1 opacity-40' />
            <p className='text-xs font-medium'>No hay conversaciones previas</p>
            <p className='text-[11px] text-muted-foreground/80'>Inicia un nuevo chat para recibir asesoría estratégica.</p>
          </div>
        ) : (
          <>
            <ThreadSection
              title='Hoy'
              threads={groups.today}
              activeId={activeThreadId}
              editingId={editingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              onSelect={onSelectThread}
              onStartRename={startRename}
              onSaveRename={saveRename}
              onCancelRename={cancelRename}
              onDelete={onDeleteThread}
            />
            <ThreadSection
              title='Ayer'
              threads={groups.yesterday}
              activeId={activeThreadId}
              editingId={editingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              onSelect={onSelectThread}
              onStartRename={startRename}
              onSaveRename={saveRename}
              onCancelRename={cancelRename}
              onDelete={onDeleteThread}
            />
            <ThreadSection
              title='Últimos 7 días'
              threads={groups.lastWeek}
              activeId={activeThreadId}
              editingId={editingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              onSelect={onSelectThread}
              onStartRename={startRename}
              onSaveRename={saveRename}
              onCancelRename={cancelRename}
              onDelete={onDeleteThread}
            />
            <ThreadSection
              title='Anteriores'
              threads={groups.older}
              activeId={activeThreadId}
              editingId={editingId}
              editTitle={editTitle}
              setEditTitle={setEditTitle}
              onSelect={onSelectThread}
              onStartRename={startRename}
              onSaveRename={saveRename}
              onCancelRename={cancelRename}
              onDelete={onDeleteThread}
            />
          </>
        )}
      </div>
    </aside>
  </>
  )
}

function ThreadSection({
  title,
  threads,
  activeId,
  editingId,
  editTitle,
  setEditTitle,
  onSelect,
  onStartRename,
  onSaveRename,
  onCancelRename,
  onDelete
}: {
  title: string
  threads: ChatThread[]
  activeId: string | null
  editingId: string | null
  editTitle: string
  setEditTitle: (t: string) => void
  onSelect: (id: string) => void
  onStartRename: (t: ChatThread, e: React.MouseEvent) => void
  onSaveRename: (id: string, e?: React.FormEvent) => void
  onCancelRename: (e: React.MouseEvent) => void
  onDelete: (id: string) => void
}) {
  if (threads.length === 0) return null

  return (
    <div className='space-y-1'>
      <p className='px-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70'>{title}</p>
      <div className='space-y-0.5'>
        {threads.filter((t): t is ChatThread => Boolean(t && t.id)).map(thread => {
          const isActive = thread.id === activeId
          const isEditing = thread.id === editingId
          const isInvestigator = thread.context?.app === 'investigator'
          const isKanban = thread.context?.app === 'kanban'

          const IconComponent = isInvestigator ? Compass : isKanban ? Kanban : HelpCircle

          if (isEditing) {
            return (
              <form
                key={thread.id}
                onSubmit={e => onSaveRename(thread.id, e)}
                className='flex items-center gap-1 p-1 rounded-lg bg-background border border-primary/50'
              >
                <Input
                  autoFocus
                  value={editTitle}
                  onChange={e => setEditTitle(e.target.value)}
                  className='h-7 text-xs px-2 border-0 focus-visible:ring-0'
                />
                <Button size='icon' type='submit' variant='ghost' className='size-6 text-emerald-500'>
                  <Check className='size-3.5' />
                </Button>
                <Button size='icon' type='button' variant='ghost' onClick={onCancelRename} className='size-6 text-muted-foreground'>
                  <X className='size-3.5' />
                </Button>
              </form>
            )
          }

          return (
            <div
              key={thread.id}
              onClick={() => onSelect(thread.id)}
              className={`group flex items-center justify-between gap-2 px-2.5 py-2 rounded-xl text-xs cursor-pointer transition-all ${
                isActive
                  ? 'bg-primary/10 text-primary font-medium border border-primary/20 shadow-2xs'
                  : 'text-foreground/80 hover:bg-muted/60 hover:text-foreground'
              }`}
            >
              <div className='flex items-center gap-2 min-w-0 flex-1'>
                <IconComponent className={`size-3.5 shrink-0 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className='truncate'>{thread.title || 'Nueva consulta'}</span>
              </div>

              <div className='flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0'>
                <Button
                  size='icon'
                  variant='ghost'
                  onClick={e => onStartRename(thread, e)}
                  className='size-6 rounded-md hover:bg-muted text-muted-foreground hover:text-foreground'
                >
                  <Edit2 className='size-3' />
                </Button>
                <Button
                  size='icon'
                  variant='ghost'
                  onClick={e => {
                    e.stopPropagation()
                    onDelete(thread.id)
                  }}
                  className='size-6 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive'
                >
                  <Trash2 className='size-3' />
                </Button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
