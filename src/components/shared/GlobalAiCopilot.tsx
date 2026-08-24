'use client'

import { usePathname } from 'next/navigation'
import { AiCopilotSheet } from '@/views/apps/investigator/shared/ai-copilot-sheet'

export default function GlobalAiCopilot() {
  const pathname = usePathname()

  // Hide the floating trigger when already inside the dedicated full-canvas NovAi app
  if (pathname?.startsWith('/apps/novai')) {
    return null
  }

  return <AiCopilotSheet floating={true} />
}
