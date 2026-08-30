'use client'

import { KanbanBoard } from './components/kanban-board'

export default function KanbanView() {
  return (
    <div className='flex flex-col space-y-6'>
      <div className='flex flex-col space-y-1'>
        <h1 className='text-2xl font-bold tracking-tight text-foreground'>
          Gestión de Proyectos
        </h1>
        <p className='text-sm text-muted-foreground'>
          Gestión ágil de tareas, iniciativas y proyectos estratégicos.
        </p>
      </div>
      <KanbanBoard />
    </div>
  )
}
