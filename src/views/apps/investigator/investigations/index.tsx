'use client'

// React Imports
import { useEffect, useMemo, useState } from 'react'

// Next Imports
import { useRouter } from 'next/navigation'

// Type Imports
import type { InvestigationState } from '@/types/apps/investigator-types'

// Component Imports
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'

// Hook Imports
import { useInvestigatorAnalysis } from '@/hooks/use-investigator-analysis'
import { useI18n } from '@/hooks/use-i18n'
import { cn } from '@/lib/utils'

// View Imports
import { StageHeader } from '../shared/primitives'
import { ShareInvestigationDialog } from './share-investigation-dialog'

// Icon Imports
import {
  Archive,
  ArrowUpDown,
  Copy,
  Eye,
  Lock,
  MoreVertical,
  Pencil,
  RotateCcw,
  Unlock,
  UserPlus,
  Users,
  XCircle
} from 'lucide-react'

type SortOption =
  | 'updated_desc'
  | 'updated_asc'
  | 'title_asc'
  | 'title_desc'
  | 'created_desc'
  | 'last_opened_desc'

const STATUS_CLASS: Record<string, string> = {
  borrador: 'bg-muted text-muted-foreground',
  'en análisis': 'bg-amber-100 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300',
  validada: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300',
  exportada: 'bg-primary/10 text-primary',
  cerrada: 'bg-muted text-muted-foreground',
  archivada: 'bg-muted text-muted-foreground'
}

const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

const formatDate = (value?: string | null): string => {
  if (!value) return '—'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '—'
  }

  return date.toLocaleDateString('es-ES', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  })
}

const ResearchCard = ({
  item,
  isActive,
  isOwner,
  onOpen,
  onDuplicate,
  onRename,
  onArchive,
  onRestore,
  onClose,
  onToggleLock,
  onShare
}: {
  item: InvestigationState
  isActive: boolean
  isOwner: boolean
  onOpen: () => void
  onDuplicate: () => void
  onRename: (title: string) => void
  onArchive: () => void
  onRestore: () => void
  onClose: () => void
  onToggleLock: (isLocked: boolean) => void
  onShare: () => void
}) => {
  const { t } = useI18n()
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(item.metadata.title)

  // Sincronizar draft cuando el título del item cambie
  useEffect(() => {
    setDraft(item.metadata.title)
  }, [item.metadata.title])

  const archived = Boolean(item.metadata.archivedAt)
  const statusLabel = archived ? 'archivada' : item.metadata.status
  const factorCount = item.internal.length + item.external.length
  const isLocked = Boolean(item.metadata.isLocked)
  const accessLevel = item.metadata.accessLevel ?? 'team_write'
  const collaborators = item.metadata.collaborators ?? []

  const handleCancelRename = () => {
    setDraft(item.metadata.title)
    setEditing(false)
  }

  const commitRename = () => {
    const next = draft.trim()

    if (next && next !== item.metadata.title) {
      onRename(next)
    }

    setEditing(false)
  }

  return (
    <div
      className={cn(
        'rounded-xl border p-4 transition-colors',
        isActive ? 'ring-primary/40 ring-2 bg-primary/[0.02]' : 'hover:bg-muted/20',
        archived && 'bg-muted/40 opacity-80'
      )}
    >
      {/* Top Row: Title on Left, Badges + Open Button + 3-dots Menu on Right */}
      <div className='flex flex-col sm:flex-row sm:items-center justify-between gap-3'>
        <div className='min-w-0 flex-1'>
          <p className='truncate font-semibold text-base text-foreground'>
            {item.metadata.title || (
              <span className='text-muted-foreground'>{t('investigator.newInvestigation')}</span>
            )}
          </p>
        </div>

        {/* Badges and actions container */}
        <div className='flex flex-wrap items-center justify-between sm:justify-end gap-2 w-full sm:w-auto'>
          <div className='flex flex-wrap items-center gap-1.5 min-w-0'>
            {isActive && (
              <Badge variant='default' className='text-xs shrink-0'>
                {t('common.active')}
              </Badge>
            )}

            <Badge
              variant='outline'
              className={cn('shrink-0 text-xs font-medium', STATUS_CLASS[statusLabel] || '')}
            >
              {statusLabel}
            </Badge>

            {/* Protection / Collaboration Badge */}
            {isLocked ? (
              <Badge
                variant='outline'
                className='bg-muted text-foreground border-border gap-1 text-xs shrink-0'
              >
                <Lock className='w-3 h-3' /> {t('investigator.protectedFiles')}
              </Badge>
            ) : accessLevel === 'private' ? (
              <Badge
                variant='outline'
                className='bg-muted text-foreground border-border gap-1 text-xs shrink-0'
              >
                <Lock className='w-3 h-3' /> {t('investigator.accessPrivate')}
              </Badge>
            ) : accessLevel === 'team_read' ? (
              <Badge
                variant='outline'
                className='bg-muted text-foreground border-border gap-1 text-xs shrink-0'
              >
                <Eye className='w-3 h-3' /> {t('investigator.accessTeamRead')}
              </Badge>
            ) : (
              <Badge
                variant='outline'
                className='bg-muted text-foreground border-border gap-1 text-xs shrink-0'
              >
                <Users className='w-3 h-3' /> {t('investigator.accessCollaborative')}
              </Badge>
            )}

            {/* Collaborators Count Badge */}
            {collaborators.length > 0 && (
              <Badge
                variant='outline'
                className='bg-muted text-foreground border-border gap-1 text-xs shrink-0'
              >
                <Users className='w-3 h-3' /> {collaborators.length}{' '}
                {collaborators.length === 1 ? 'colaborador' : 'colaboradores'}
              </Badge>
            )}
          </div>

          <div className='flex items-center gap-1.5 shrink-0 ml-auto sm:ml-0'>
            {/* Primary Action: Open */}
            <Button size='sm' variant='default' onClick={onOpen} className='text-xs h-8'>
              {t('investigator.actionOpen')}
            </Button>

            {/* 3-Dots Context Menu */}
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <Button
                    size='icon'
                    variant='ghost'
                    className='size-8 text-muted-foreground hover:text-foreground'
                    aria-label={t('common.actions')}
                  >
                    <MoreVertical className='size-4' />
                  </Button>
                }
              />
            <DropdownMenuContent align='end' className='w-48'>
              <DropdownMenuGroup>
                <DropdownMenuItem
                  onClick={() => setEditing(true)}
                  disabled={archived}
                  className='gap-2 text-xs'
                >
                  <Pencil className='size-3.5' /> {t('investigator.actionRename')}
                </DropdownMenuItem>

                <DropdownMenuItem onClick={onDuplicate} className='gap-2 text-xs'>
                  <Copy className='size-3.5' /> {t('investigator.actionDuplicate')}
                </DropdownMenuItem>

                {isOwner && !archived && (
                  <DropdownMenuItem
                    onClick={() => onToggleLock(!isLocked)}
                    className='gap-2 text-xs'
                  >
                    {isLocked ? (
                      <>
                        <Unlock className='size-3.5' /> {t('investigator.actionUnlock')}
                      </>
                    ) : (
                      <>
                        <Lock className='size-3.5' /> {t('investigator.actionLock')}
                      </>
                    )}
                  </DropdownMenuItem>
                )}

                {isOwner && !archived && (isLocked || accessLevel !== 'team_write') && (
                  <DropdownMenuItem onClick={onShare} className='gap-2 text-xs'>
                    <UserPlus className='size-3.5' /> {t('investigator.actionShare')}
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>

              <DropdownMenuSeparator />

              <DropdownMenuGroup>
                {archived ? (
                  <DropdownMenuItem onClick={onRestore} className='gap-2 text-xs'>
                    <RotateCcw className='size-3.5' /> {t('investigator.actionRestore')}
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem onClick={onArchive} className='gap-2 text-xs'>
                    <Archive className='size-3.5' /> {t('investigator.actionArchive')}
                  </DropdownMenuItem>
                )}

                <DropdownMenuItem
                  onClick={onClose}
                  disabled={archived}
                  className='gap-2 text-xs'
                >
                  <XCircle className='size-3.5' /> {t('investigator.actionClose')}
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>

      {/* Bottom Row: Full-width Audit metadata grid spanning edge-to-edge */}
      <div className='mt-3 w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs text-muted-foreground bg-muted/30 p-3 rounded-lg border border-border/50'>
        <div>
          <span className='font-semibold text-foreground'>{t('investigator.author')}:</span>{' '}
          <span className='text-foreground/90'>
            {item.metadata.createdByName || item.metadata.author || '—'}
          </span>
          {item.metadata.createdAt && (
            <span className='block text-[11px] text-muted-foreground'>
              {formatDate(item.metadata.createdAt)}
            </span>
          )}
        </div>

        <div>
          <span className='font-semibold text-foreground'>{t('investigator.modifiedBy')}:</span>{' '}
          <span className='text-foreground/90'>{item.metadata.updatedByName || '—'}</span>
          <span className='block text-[11px] text-muted-foreground'>
            {formatDate(item.metadata.updatedAt)}{' '}
            {item.metadata.version ? `(v.${item.metadata.version})` : ''}
          </span>
        </div>

        <div>
          <span className='font-semibold text-foreground'>{t('common.status')}:</span>{' '}
          <span className='text-foreground/90'>{statusLabel}</span>
          <span className='block text-[11px] text-muted-foreground'>
            {formatDate(item.metadata.lastOpenedAt)}
          </span>
        </div>

        <div>
          <span className='font-semibold text-foreground'>{t('common.details')}:</span>{' '}
          <span className='text-foreground/90 font-mono text-[11px] block'>
            {factorCount} {t('investigator.factors').toLowerCase()} · {item.relationships.length}{' '}
            rel · {item.strategies.length} estr
          </span>
        </div>
      </div>

      {editing && (
        <div className='mt-3 flex items-center gap-2'>
          <Input
            value={draft}
            disabled={archived}
            className='h-8 text-sm'
            onChange={e => setDraft(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') commitRename()
              if (e.key === 'Escape') handleCancelRename()
            }}
            autoFocus
          />
          <Button size='sm' onClick={commitRename} className='h-8 text-xs'>
            {t('common.save')}
          </Button>
          <Button size='sm' variant='ghost' onClick={handleCancelRename} className='h-8 text-xs'>
            {t('common.cancel')}
          </Button>
        </div>
      )}
    </div>
  )
}

export const InvestigatorInvestigationsView = () => {
  const router = useRouter()
  const { t } = useI18n()
  
  const {
    state,
    investigations,
    syncStatus,
    currentUserId,
    createNewResearch,
    openResearch,
    duplicateResearch,
    renameResearch,
    archiveResearch,
    restoreResearch,
    closeResearch,
    toggleLock,
    updateSharing,
    loadDemo,
    localMigration,
    migrateLocalInvestigations
  } = useInvestigatorAnalysis()

  const handleOpenResearch = (item: InvestigationState) => {
    openResearch(item)
    router.push('/apps/investigator/context')
  }

  const handleCreateNew = () => {
    createNewResearch()
    router.push('/apps/investigator/context')
  }

  const handleLoadDemo = () => {
    loadDemo()
    router.push('/apps/investigator/context')
  }

  const [migrationDialogOpen, setMigrationDialogOpen] = useState(false)
  const [sharingItem, setSharingItem] = useState<InvestigationState | null>(null)
  const [hydrated, setHydrated] = useState(false)
  const [sortBy, setSortBy] = useState<SortOption>('updated_desc')

  useEffect(() => {
    
    setHydrated(true)

    try {
      const saved = localStorage.getItem(
        'novastore:investigations_sort_order'
      ) as SortOption | null

      if (saved) setSortBy(saved)
    } catch {
      // ignore
    }
  }, [])

  const handleSortChange = (newSort: SortOption) => {
    setSortBy(newSort)

    try {
      localStorage.setItem('novastore:investigations_sort_order', newSort)
    } catch {
      // ignore
    }
  }

  const isLoading = !hydrated || syncStatus === 'loading'

  const list = useMemo(() => {
    const items = [...investigations]

    return items.sort((a: InvestigationState, b: InvestigationState) => {
      switch (sortBy) {
        case 'updated_asc': {
          const tA = new Date(a.metadata.updatedAt || 0).getTime()
          const tB = new Date(b.metadata.updatedAt || 0).getTime()

          return tA - tB
        }

        case 'title_asc': {
          const nameA = (a.metadata.title || '').toLowerCase()
          const nameB = (b.metadata.title || '').toLowerCase()

          return nameA.localeCompare(nameB)
        }

        case 'title_desc': {
          const nameA = (a.metadata.title || '').toLowerCase()
          const nameB = (b.metadata.title || '').toLowerCase()

          return nameB.localeCompare(nameA)
        }

        case 'created_desc': {
          const tA = new Date(a.metadata.createdAt || 0).getTime()
          const tB = new Date(b.metadata.createdAt || 0).getTime()

          return tB - tA
        }

        case 'last_opened_desc': {
          const tA = new Date(a.metadata.lastOpenedAt || 0).getTime()
          const tB = new Date(b.metadata.lastOpenedAt || 0).getTime()

          return tB - tA
        }

        case 'updated_desc':

        default: {
          const tA = new Date(a.metadata.updatedAt || 0).getTime()
          const tB = new Date(b.metadata.updatedAt || 0).getTime()

          return tB - tA
        }
      }
    })
  }, [investigations, sortBy])

  const totalCount = investigations.length

  const activeCount = investigations.filter(
    item =>
      !item.metadata.archivedAt &&
      item.metadata.status !== 'cerrada' &&
      item.metadata.status !== 'archivada'
  ).length

  const closedCount = investigations.filter(
    item => !item.metadata.archivedAt && item.metadata.status === 'cerrada'
  ).length

  const archivedCount = investigations.filter(item => Boolean(item.metadata.archivedAt)).length

  const syncStatusLabels: Record<string, string> = {
    loading: t('investigator.syncLoading'),
    saving: t('investigator.syncSaving'),
    synced: t('investigator.syncSynced'),
    memory: t('investigator.syncMemory'),
    error: t('investigator.syncError')
  }

  return (
    <div className='flex flex-col gap-5'>
      <StageHeader
        kicker={t('investigator.manager')}
        title={t('investigator.titlemodule')}
        description={t('investigator.subtitle')}
        action={
          <div className='flex flex-wrap items-center gap-2 w-full sm:w-auto'>
            <Button variant='outline' size='sm' onClick={handleLoadDemo} className='flex-1 sm:flex-initial'>
              {t('investigator.loadDemo')}
            </Button>
            <Button size='sm' onClick={handleCreateNew} className='flex-1 sm:flex-initial'>
              + {t('investigator.newInvestigation')}
            </Button>
          </div>
        }
      />

      {localMigration.status !== 'none' && (
        <Card>
          <CardHeader>
            <CardTitle className='text-base'>
              {t('investigator.localMigrationTitle') || 'Migración de investigaciones locales'}
            </CardTitle>
          </CardHeader>
          <CardContent className='space-y-3'>
            {localMigration.status === 'error' ? (
              <>
                <p className='text-destructive text-sm' role='alert'>
                  {localMigration.error || 'No se pudo inspeccionar la copia local.'}
                </p>
                {localMigration.count > 0 && localMigration.canImport && (
                  <Button onClick={() => void migrateLocalInvestigations()}>
                    {t('common.retry') || 'Reintentar importación'}
                  </Button>
                )}
              </>
            ) : localMigration.status === 'completed' ? (
              <p className='text-sm' role='status'>
                La copia local fue importada y eliminada después de verificar todas las respuestas del
                servidor.
              </p>
            ) : (
              <>
                <p className='text-muted-foreground text-sm'>
                  Se detectaron {localMigration.count} investigación
                  {localMigration.count === 1 ? '' : 'es'} locales (
                  {formatBytes(localMigration.totalBytes)}). Puedes importarlas una sola vez a tu
                  cuenta persistente.
                </p>
                {!localMigration.canImport && (
                  <p className='text-muted-foreground text-sm'>
                    La importación requiere una cuenta autenticada con email confirmado y una
                    suscripción o compra única registrada. El trial no persiste investigaciones.
                  </p>
                )}
                {localMigration.status === 'migrating' && (
                  <p className='text-muted-foreground text-sm' role='status' aria-live='polite'>
                    Importando {localMigration.completed} de {localMigration.total}…
                  </p>
                )}
                <Button
                  disabled={!localMigration.canImport || localMigration.status === 'migrating'}
                  onClick={() => setMigrationDialogOpen(true)}
                >
                  {localMigration.status === 'migrating'
                    ? 'Importando…'
                    : 'Importar investigaciones'}
                </Button>
              </>
            )}
          </CardContent>
        </Card>
      )}

      <div className='space-y-4'>
        <div className='flex flex-wrap items-center justify-between gap-3'>
          <div>
            {isLoading ? (
              <Skeleton className='h-5 w-64' />
            ) : (
              <div className='flex flex-wrap items-center gap-2 text-sm'>
                <span className='font-semibold text-foreground'>
                  {totalCount} {t('investigator.totalFiles')}
                </span>
                <span className='text-muted-foreground'>·</span>
                <span className='text-foreground font-medium'>
                  {activeCount} {t('investigator.activeFiles')}
                </span>
                {closedCount > 0 && (
                  <>
                    <span className='text-muted-foreground'>·</span>
                    <span className='text-muted-foreground'>
                      {closedCount} {t('investigator.closedFiles')}
                    </span>
                  </>
                )}
                {archivedCount > 0 && (
                  <>
                    <span className='text-muted-foreground'>·</span>
                    <span className='text-muted-foreground'>
                      {archivedCount} {t('investigator.archivedFiles')}
                    </span>
                  </>
                )}
              </div>
            )}
          </div>

          <div className='flex items-center gap-2'>
            {/* Sort Dropdown */}
            <Select
              value={sortBy}
              onValueChange={(val: SortOption | null) => {
                if (val) handleSortChange(val)
              }}
            >
              <SelectTrigger className='h-8 text-xs gap-1.5 w-auto min-w-[190px]'>
                <ArrowUpDown className='size-3.5 text-muted-foreground shrink-0' />
                <SelectValue>
                  {sortBy === 'updated_desc' && t('investigator.sortUpdatedDesc')}
                  {sortBy === 'updated_asc' && t('investigator.sortUpdatedAsc')}
                  {sortBy === 'title_asc' && t('investigator.sortTitleAsc')}
                  {sortBy === 'title_desc' && t('investigator.sortTitleDesc')}
                  {sortBy === 'created_desc' && t('investigator.sortCreatedDesc')}
                  {sortBy === 'last_opened_desc' && t('investigator.sortLastOpenedDesc')}
                </SelectValue>
              </SelectTrigger>
              <SelectContent align='end'>
                <SelectItem value='updated_desc' className='text-xs'>
                  {t('investigator.sortUpdatedDesc')}
                </SelectItem>
                <SelectItem value='updated_asc' className='text-xs'>
                  {t('investigator.sortUpdatedAsc')}
                </SelectItem>
                <SelectItem value='title_asc' className='text-xs'>
                  {t('investigator.sortTitleAsc')}
                </SelectItem>
                <SelectItem value='title_desc' className='text-xs'>
                  {t('investigator.sortTitleDesc')}
                </SelectItem>
                <SelectItem value='created_desc' className='text-xs'>
                  {t('investigator.sortCreatedDesc')}
                </SelectItem>
                <SelectItem value='last_opened_desc' className='text-xs'>
                  {t('investigator.sortLastOpenedDesc')}
                </SelectItem>
              </SelectContent>
            </Select>

            <Badge
              variant={syncStatus === 'error' ? 'destructive' : 'outline'}
              aria-live='polite'
              aria-label={`Sincronización: ${syncStatusLabels[syncStatus] || syncStatus}`}
            >
              {syncStatusLabels[syncStatus] || syncStatus}
            </Badge>
          </div>
        </div>

        <div className='space-y-3'>
          {isLoading ? (
            Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className='rounded-xl border p-4 space-y-3'>
                <div className='flex flex-wrap items-center justify-between gap-3'>
                  <div className='flex items-center gap-2 flex-wrap'>
                    <Skeleton className='h-5 w-52' />
                  </div>
                  <div className='flex gap-1.5 items-center'>
                    <Skeleton className='h-5 w-16 rounded-full' />
                    <Skeleton className='h-5 w-20 rounded-full' />
                    <Skeleton className='h-5 w-24 rounded-full' />
                    <Skeleton className='h-8 w-24 rounded-md' />
                    <Skeleton className='size-8 rounded-md' />
                  </div>
                </div>
                <div className='w-full grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-muted/30 p-3 rounded-lg border border-border/50'>
                  <div className='space-y-1'>
                    <Skeleton className='h-3.5 w-28' />
                    <Skeleton className='h-3 w-20' />
                  </div>
                  <div className='space-y-1'>
                    <Skeleton className='h-3.5 w-32' />
                    <Skeleton className='h-3 w-24' />
                  </div>
                  <div className='space-y-1'>
                    <Skeleton className='h-3.5 w-24' />
                    <Skeleton className='h-3 w-20' />
                  </div>
                  <div className='space-y-1'>
                    <Skeleton className='h-3.5 w-36' />
                  </div>
                </div>
              </div>
            ))
          ) : list.length === 0 ? (
            <p className='text-muted-foreground py-8 text-center'>{t('common.noData')}</p>
          ) : (
            list.map((item: InvestigationState, index: number) => {
              const isItemOwner =
                !currentUserId || !item.metadata.ownerId || item.metadata.ownerId === currentUserId

              return (
                <ResearchCard
                  key={`${item.metadata.id}-${index}`}
                  item={item}
                  isActive={item.metadata.id === state.metadata.id}
                  isOwner={isItemOwner}
                  onOpen={() => handleOpenResearch(item)}
                  onDuplicate={() => duplicateResearch(item)}
                  onRename={title => renameResearch(item.metadata.id, title)}
                  onArchive={() => archiveResearch(item.metadata.id)}
                  onRestore={() => restoreResearch(item.metadata.id)}
                  onClose={() => closeResearch(item.metadata.id)}
                  onToggleLock={locked => void toggleLock(item.metadata.id, locked)}
                  onShare={() => setSharingItem(item)}
                />
              )
            })
          )}
        </div>
      </div>

      <ShareInvestigationDialog
        open={Boolean(sharingItem)}
        onOpenChange={open => {
          if (!open) setSharingItem(null)
        }}
        item={sharingItem}
        isOwner={
          !currentUserId ||
          !sharingItem?.metadata.ownerId ||
          sharingItem.metadata.ownerId === currentUserId
        }
        currentUserId={currentUserId}
        onSaveSharing={updateSharing}
      />

      <Dialog open={migrationDialogOpen} onOpenChange={setMigrationDialogOpen}>
        <DialogContent className='sm:max-w-lg'>
          <DialogHeader>
            <DialogTitle>{t('common.confirm')}</DialogTitle>
            <DialogDescription>
              Se enviarán {localMigration.count} investigación
              {localMigration.count === 1 ? '' : 'es'} ({formatBytes(localMigration.totalBytes)}) al
              servidor. La copia local solo se eliminará si todas las importaciones y respuestas se
              completan correctamente. Si algo falla, podrás reintentar sin duplicar los expedientes
              ya importados.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant='outline' onClick={() => setMigrationDialogOpen(false)}>
              {t('common.cancel')}
            </Button>
            <Button
              onClick={() => {
                setMigrationDialogOpen(false)
                void migrateLocalInvestigations()
              }}
            >
              {t('common.confirm')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export const InvestigatorGestorView = InvestigatorInvestigationsView
export default InvestigatorInvestigationsView