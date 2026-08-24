// Ambient type definitions and module augmentations for AI Elements and Base UI compatibility
// This file ensures TypeScript type compatibility without modifying any official shadcn or ai-elements source files.

import type * as React from 'react'

declare module '@base-ui/react/preview-card' {
  namespace PreviewCardRoot {
    interface Props<Payload = unknown> {
      openDelay?: number
      closeDelay?: number
    }
  }
  interface PreviewCardRootProps<Payload = unknown> {
    openDelay?: number
    closeDelay?: number
  }
}

declare module '@base-ui/react/menu' {
  namespace MenuItem {
    interface Props {
      onSelect?: (event: any) => void | Promise<void>
    }
  }
  interface MenuItemProps {
    onSelect?: (event: any) => void | Promise<void>
  }
}

declare module '@base-ui/react/button' {
  namespace Button {
    interface Props {
      onClick?: (event: any) => void
    }
  }
  interface ButtonProps {
    onClick?: (event: any) => void
  }
}

declare module 'ai' {
  interface LanguageModelUsage {
    inputTokens?: number
    outputTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  }
}

declare module '@ai-sdk/ui-utils' {
  interface LanguageModelUsage {
    inputTokens?: number
    outputTokens?: number
    reasoningTokens?: number
    cachedInputTokens?: number
  }
}
