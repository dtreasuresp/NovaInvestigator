import type { NovaiContext } from '@/features/novai/schema'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  isStreaming?: boolean
  error?: string
}

export interface ChatThread {
  id: string
  title: string
  createdAt: string
  updatedAt: string
  context: NovaiContext
  messages: ChatMessage[]
}
