---
name: ai-elements
description: Guidelines, patterns, and component composition rules for Vercel AI Elements (@ai-elements), the official UI component suite built on shadcn/ui and Vercel AI SDK Core.
---

# Vercel AI Elements (@ai-elements) Skill

AI Elements is the official component library built by Vercel on top of `shadcn/ui` for creating AI-native interfaces.

## 1. Core Architecture & Primitives

All components are located in `src/components/ai-elements/` and follow compound component patterns:

- **`<Conversation>`**:
  - Root container for managing scroll pinning, auto-scroll to bottom, and scroll button.
  - Subcomponents: `<ConversationContent>`, `<ConversationScrollButton>`, `<ConversationHeader>`, `<ConversationEmptyState>`.
- **`<Message>`**:
  - Message bubble representation for user, assistant, and system roles.
  - Subcomponents: `<MessageHeader>`, `<MessageAvatar>`, `<MessageContent>`, `<MessageActions>`, `<MessageAction>`.
- **`<PromptInput>`**:
  - Textarea with auto-resize, submit on Enter, Shift+Enter for newline, streaming abort (`<PromptInputStop>`), and action bar.
  - Subcomponents: `<PromptInputTextarea>`, `<PromptInputActions>`, `<PromptInputSubmit>`, `<PromptInputStop>`, `<PromptInputAttachments>`.
- **`<Reasoning>` / `<ChainOfThought>`**:
  - Collapsible accordions for thinking tokens and model reasoning traces.
  - Subcomponents: `<ReasoningTrigger>`, `<ReasoningContent>`, `<ReasoningHeader>`.
- **`<Tool>` / `<ToolCall>`**:
  - Interactive cards rendering tool execution state (invoked, executing, completed, failed) and arguments.
  - Subcomponents: `<ToolHeader>`, `<ToolContent>`, `<ToolArgs>`, `<ToolResult>`.
- **`<Suggestion>`**:
  - Predefined prompts and follow-up suggestion chips.
  - Subcomponents: `<SuggestionGroup>`, `<SuggestionItem>`.
- **`<Artifact>`**:
  - Rich document / report / code / table preview cards with actions (copy, download, full view).
  - Subcomponents: `<ArtifactHeader>`, `<ArtifactTitle>`, `<ArtifactContent>`, `<ArtifactActions>`, `<ArtifactClose>`.

## 2. Integration with Vercel AI SDK (`ai`)

When integrating with `streamText` or SSE streaming:
- Connect the streaming abort controller to `<PromptInputStop onClick={() => abortController.abort()} />`.
- When tool calls are streamed or emitted, render `<Tool>` cards in the message flow.
- Format Markdown content inside `<MessageContent>` with KaTeX math and syntax highlighting.
- Maintain responsive, dark/light theme consistency with CSS tokens (`var(--color-*)`).
