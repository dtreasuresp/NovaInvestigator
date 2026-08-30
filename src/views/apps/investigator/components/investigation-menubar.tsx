'use client'

import React, { useState } from 'react'
import { useRouter } from 'next/navigation'
import {
  FileTextIcon,
  DownloadIcon,
  PlusCircleIcon,
  LayersIcon,
  BarChart3Icon,
  CompassIcon,
  Loader2Icon,
  FileSpreadsheetIcon,
  LayoutDashboardIcon,
  KanbanIcon,
  SlidersHorizontalIcon,
  GlobeIcon,
  LayoutGridIcon,
  CalculatorIcon,
  ListTodoIcon,
  BookOpenIcon,
  SearchCodeIcon,
  SettingsIcon,
  AwardIcon,
  ListCheckIcon
} from 'lucide-react'
import { toast } from 'sonner'

import {
  Menubar,
  MenubarMenu,
  MenubarTrigger,
  MenubarContent,
  MenubarGroup,
  MenubarItem,
  MenubarSeparator,
  MenubarLabel,
  MenubarSub,
  MenubarSubTrigger,
  MenubarSubContent
} from '@/components/ui/menubar'
import { INVESTIGATOR_BASE_PATH } from '@/utils/investigator/constants'

export interface InvestigationMenubarProps {
  investigationId?: string
  onCreateProject?: (type?: 'blank' | 'derived') => void
  onCreateNewInvestigation?: () => void
  onLoadDemo?: () => void
  onExportPdf?: (type: 'summary' | 'full') => void
  onExportDocx?: (type: 'summary' | 'full') => void
  isExporting?: boolean
  isExportingDocx?: boolean
}

export function InvestigationMenubar({
  investigationId,
  onCreateProject,
  onCreateNewInvestigation,
  onLoadDemo,
  onExportPdf,
  onExportDocx,
  isExporting = false,
  isExportingDocx = false
}: InvestigationMenubarProps) {
  const router = useRouter()
  const [internalExportingDocx, setInternalExportingDocx] = useState(false)

  const handleExportDocx = async (reportType: 'summary' | 'full') => {
    if (onExportDocx) {
      onExportDocx(reportType)
      return
    }

    if (!investigationId) {
      toast.error('Debe seleccionar una investigación para exportar.')
      return
    }

    try {
      setInternalExportingDocx(true)
      toast.info(`Generando informe ${reportType === 'summary' ? 'Resumen' : 'Completo'} en Word (DOCX)...`)

      const res = await fetch(`/api/investigations/${investigationId}/export/docx?type=${reportType}`, {
        method: 'POST'
      })

      if (!res.ok) {
        if (res.status === 409) {
          toast.error('Límite de cuota mensual de exportación alcanzado para su plan.')
          return
        }
        throw new Error('Error al generar el documento Word.')
      }

      const blob = await res.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `informe-estrategico-${reportType}-${investigationId.slice(0, 8)}.docx`
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      toast.success('Documento Word descargado correctamente.')
    } catch (err) {
      toast.error('No se pudo generar el documento Word.')
    } finally {
      setInternalExportingDocx(false)
    }
  }

  const isGenerating = isExporting || isExportingDocx || internalExportingDocx

  return (
    <div className='flex w-full items-center justify-between gap-3'>
      <Menubar>
        {/* 1. INVESTIGACIÓN */}
        <MenubarMenu>
          <MenubarTrigger>
            Investigación
          </MenubarTrigger>
          <MenubarContent align='start'>
            <MenubarGroup>
              <MenubarSub>
                <MenubarSubTrigger>
                  <FileTextIcon className='mr-2 size-3.5 text-muted-foreground' />
                  Nueva
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarGroup>
                    <MenubarItem 
                      disabled={isGenerating}
                      onClick={() => {
                        onCreateNewInvestigation?.()
                        router.push(`${INVESTIGATOR_BASE_PATH}/context`)
                      }}
                    >
                      <FileTextIcon className='mr-2 size-3.5 text-primary' />
                      En blanco
                    </MenubarItem>
                    <MenubarItem
                      disabled={isGenerating}
                      onClick={() => {
                        onLoadDemo?.()
                        router.push(`${INVESTIGATOR_BASE_PATH}/context`)
                      }}
                    >
                      <FileSpreadsheetIcon className='mr-2 size-3.5 text-amber-500' />
                      Cargar demo
                    </MenubarItem>
                  </MenubarGroup>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/summary`)}>
                <FileTextIcon className='mr-2 size-3.5 text-primary' />
                Resumen
              </MenubarItem>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/context`)}>
                <SearchCodeIcon className='mr-2 size-3.5 text-primary' />
                Contexto
              </MenubarItem>
            </MenubarGroup>
            <MenubarGroup>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/investigations`)}>
                <SettingsIcon className='mr-2 size-3.5 text-muted-foreground' />
                Expedientes
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* 2. ANÁLISIS */}
        <MenubarMenu>
          <MenubarTrigger>
            Análisis
          </MenubarTrigger>
          <MenubarContent align='start'>
            <MenubarGroup>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/efi`)}>
                <SlidersHorizontalIcon className='mr-2 size-3.5' />
                Factores Internos (EFI)
              </MenubarItem>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/efe`)}>
                <GlobeIcon className='mr-2 size-3.5' />
                Factores Externos (EFE)
              </MenubarItem>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/dafo`)}>
                <LayoutGridIcon className='mr-2 size-3.5' />
                Cruces Estratégicos (DAFO))
              </MenubarItem>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/qspm`)}>
                <CalculatorIcon className='mr-2 size-3.5' />
                Decisión Estratégica (QSPM)
              </MenubarItem>
            </MenubarGroup>
            <MenubarGroup>
              <MenubarItem onClick={() => router.push(`${INVESTIGATOR_BASE_PATH}/came`)}>
                <AwardIcon className='mr-2 size-3.5 text-primary' />
                Plan Operativo (CAME)
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* 3. PROYECTOS */}
        <MenubarMenu>
          <MenubarTrigger>
            Proyectos
          </MenubarTrigger>
          <MenubarContent align='start'>
            <MenubarGroup>
              <MenubarSub>
                <MenubarSubTrigger>
                  <PlusCircleIcon className='mr-2 size-3.5 text-primary' />
                  Nuevo proyecto
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarGroup>
                    <MenubarItem onClick={() => onCreateProject?.('blank')}>
                      <FileTextIcon className='mr-2 size-3.5 text-primary' />
                      En blanco
                    </MenubarItem>
                    <MenubarItem onClick={() => onCreateProject?.('derived')}>
                      <ListTodoIcon className='mr-2 size-3.5 text-amber-500' />
                      Derivado de CAME
                    </MenubarItem>
                  </MenubarGroup>
                </MenubarSubContent>
              </MenubarSub>
              <MenubarItem onClick={() => router.push('/apps/projects')}>
                <LayersIcon className='mr-2 size-3.5 text-muted-foreground' />
                Ver proyectos
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* 4. EXPORTAR */}
        <MenubarMenu>
          <MenubarTrigger>
            Exportar
          </MenubarTrigger>
          <MenubarContent align='start'>
            <MenubarLabel>Exportación Documental</MenubarLabel>
            <MenubarGroup>
              {/* Submenú Informe Resumen */}
              <MenubarSub>
                <MenubarSubTrigger>
                  <FileTextIcon className='mr-2 size-3.5 text-muted-foreground' />
                  Informe resumen
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarGroup>
                    <MenubarItem
                      disabled={isGenerating}
                      onClick={() => onExportPdf?.('summary')}
                    >
                      <FileTextIcon className='mr-2 size-3.5 text-red-500' />
                      PDF (.pdf)
                    </MenubarItem>
                    <MenubarItem
                      disabled={isGenerating}
                      onClick={() => handleExportDocx('summary')}
                    >
                      <FileSpreadsheetIcon className='mr-2 size-3.5 text-blue-500' />
                      DOCX (.docx)
                    </MenubarItem>
                  </MenubarGroup>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarGroup>
            <MenubarSeparator />
            <MenubarGroup>

              {/* Submenú Informe Completo */}
              <MenubarSub>
                <MenubarSubTrigger>
                  <FileTextIcon className='mr-2 size-3.5 text-primary' />
                  Informe completo
                </MenubarSubTrigger>
                <MenubarSubContent>
                  <MenubarGroup>
                    <MenubarItem
                      disabled={isGenerating}
                      onClick={() => onExportPdf?.('full')}
                    >
                      <FileTextIcon className='mr-2 size-3.5 text-red-500' />
                      PDF (.pdf)
                    </MenubarItem>
                    <MenubarItem
                      disabled={isGenerating}
                      onClick={() => handleExportDocx('full')}
                    >
                      <FileSpreadsheetIcon className='mr-2 size-3.5 text-blue-500' />
                      DOCX (.docx)
                    </MenubarItem>
                  </MenubarGroup>
                </MenubarSubContent>
              </MenubarSub>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>

        {/* 5. VISTA */}
        <MenubarMenu>
          <MenubarTrigger>
            Vista
          </MenubarTrigger>
          <MenubarContent align='start'>
            <MenubarLabel>Módulos de Visualización</MenubarLabel>
            <MenubarGroup>
              <MenubarItem onClick={() => router.push('/dashboard/investigations')}>
                <LayoutDashboardIcon className='mr-2 size-3.5 text-primary' />
                Dashboard
              </MenubarItem>
              <MenubarItem onClick={() => router.push('/apps/kanban')}>
                <KanbanIcon className='mr-2 size-3.5 text-primary' />
                Kanban
              </MenubarItem>
            </MenubarGroup>
          </MenubarContent>
        </MenubarMenu>
      </Menubar>

      {/* Indicador de progreso de exportación */}
      {isGenerating && (
        <div className='flex items-center gap-1.5 rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary shadow-xs animate-pulse'>
          <Loader2Icon className='size-3.5 animate-spin' />
          <span className='font-medium'>Generando documento...</span>
        </div>
      )}
    </div>
  )
}
