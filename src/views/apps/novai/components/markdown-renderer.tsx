'use client'

import { useState } from 'react'
import katex from 'katex'
import { Check, Copy } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface MarkdownRendererProps {
  content: string
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  if (!content) return null

  // Split content by code blocks and display math blocks ($$...$$ and \[...\])
  const parts = content.split(/(```[\s\S]*?```|\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\])/g)

  return (
    <div className='space-y-3 leading-relaxed text-sm text-foreground/90'>
      {parts.map((part, index) => {
        if (!part) return null

        if (part.startsWith('```') && part.endsWith('```')) {
          const firstLineEnd = part.indexOf('\n')
          const language = part.slice(3, firstLineEnd > 0 ? firstLineEnd : 3).trim() || 'text'
          const code = firstLineEnd > 0 ? part.slice(firstLineEnd + 1, -3) : part.slice(3, -3)

          return <CodeBlock key={index} code={code} language={language} />
        }

        if (part.startsWith('$$') && part.endsWith('$$')) {
          const math = part.slice(2, -2)
          return <MathBlock key={index} math={math} />
        }

        if (part.startsWith('\\[') && part.endsWith('\\]')) {
          const math = part.slice(2, -2)
          return <MathBlock key={index} math={math} />
        }

        return <TextBlock key={index} text={part} />
      })}
    </div>
  )
}

function MathBlock({ math }: { math: string }) {
  let html = ''
  try {
    html = katex.renderToString(math.trim(), {
      displayMode: true,
      throwOnError: false
    })
  } catch {
    html = ''
  }

  if (!html) {
    return <div className='my-3 font-mono text-xs text-muted-foreground'>{math}</div>
  }

  return (
    <div
      className='my-3.5 overflow-x-auto rounded-xl border border-border/70 bg-muted/20 py-3.5 px-4 text-center shadow-xs transition-colors hover:bg-muted/30 [&_.katex-display]:my-0 [&_.katex]:text-[1.05rem]'
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function InlineMath({ math }: { math: string }) {
  let html = ''
  try {
    html = katex.renderToString(math.trim(), {
      displayMode: false,
      throwOnError: false
    })
  } catch {
    html = ''
  }

  if (!html) {
    return <span className='font-mono text-xs'>{math}</span>
  }

  return (
    <span
      className='inline-block px-0.5 align-baseline text-[0.95em]'
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}

function CodeBlock({ code, language }: { code: string; language: string }) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code.trim())
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignore
    }
  }

  return (
    <div className='my-3 overflow-hidden rounded-xl border border-border/80 bg-zinc-950 text-zinc-100 shadow-md dark:border-zinc-800'>
      <div className='flex items-center justify-between border-b border-zinc-800 bg-zinc-900/80 px-4 py-1.5 text-xs font-mono text-zinc-400'>
        <span className='font-semibold uppercase text-primary-foreground/70'>{language}</span>
        <Button
          size='sm'
          variant='ghost'
          onClick={handleCopy}
          className='h-7 gap-1.5 px-2 text-xs text-zinc-300 hover:bg-zinc-800 hover:text-white'
        >
          {copied ? (
            <>
              <Check className='size-3.5 text-emerald-400' />
              <span className='text-emerald-400'>Copiado</span>
            </>
          ) : (
            <>
              <Copy className='size-3.5' />
              <span>Copiar</span>
            </>
          )}
        </Button>
      </div>
      <div className='overflow-x-auto p-4 font-mono text-xs leading-relaxed'>
        <pre className='text-zinc-200'>
          <code>{code.trim()}</code>
        </pre>
      </div>
    </div>
  )
}

function TextBlock({ text }: { text: string }) {
  if (!text.trim()) return null

  // Check if block contains markdown table
  const lines = text.split('\n')
  const elements: React.ReactNode[] = []
  let tableBuffer: string[] = []
  let inTable = false

  const flushTable = (keyIndex: number) => {
    if (tableBuffer.length >= 2) {
      elements.push(<TableBlock key={`table-${keyIndex}`} lines={tableBuffer} />)
    } else {
      tableBuffer.forEach((tblLine, idx) => {
        elements.push(<ParagraphLine key={`p-tbl-${keyIndex}-${idx}`} line={tblLine} />)
      })
    }
    tableBuffer = []
    inTable = false
  }

  lines.forEach((line, i) => {
    const isTableRow = line.trim().startsWith('|') && line.trim().endsWith('|')

    if (isTableRow) {
      inTable = true
      tableBuffer.push(line.trim())
    } else {
      if (inTable) {
        flushTable(i)
      }
      elements.push(<ParagraphLine key={i} line={line} />)
    }
  })

  if (inTable) {
    flushTable(lines.length)
  }

  return <div className='space-y-2'>{elements}</div>
}

function TableBlock({ lines }: { lines: string[] }) {
  const headerLine = lines[0]
  const rows = lines.slice(2) // Skip separator line |---|---|

  const parseCells = (row: string) =>
    row
      .split('|')
      .slice(1, -1)
      .map(c => c.trim())

  const headers = parseCells(headerLine)

  return (
    <div className='my-3 overflow-x-auto rounded-xl border border-border/80 bg-card shadow-xs'>
      <table className='w-full text-left text-xs'>
        <thead className='border-b border-border bg-muted/60 font-semibold text-foreground'>
          <tr>
            {headers.map((h, idx) => (
              <th key={idx} className='px-3.5 py-2.5'>
                {formatInlineMarkdown(h)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-border/60'>
          {rows.map((row, rIdx) => {
            const cells = parseCells(row)
            return (
              <tr key={rIdx} className='transition-colors hover:bg-muted/30 odd:bg-muted/10'>
                {cells.map((cell, cIdx) => (
                  <td key={cIdx} className='px-3.5 py-2 text-foreground/80'>
                    {formatInlineMarkdown(cell)}
                  </td>
                ))}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ParagraphLine({ line }: { line: string }) {
  const trimmed = line.trim()

  if (!trimmed) {
    return <div className='h-2' />
  }

  // Headings
  if (trimmed.startsWith('### ')) {
    return <h3 className='pt-2 text-sm font-bold tracking-tight text-foreground'>{formatInlineMarkdown(trimmed.slice(4))}</h3>
  }
  if (trimmed.startsWith('## ')) {
    return <h2 className='pt-3 text-base font-bold tracking-tight text-foreground'>{formatInlineMarkdown(trimmed.slice(3))}</h2>
  }
  if (trimmed.startsWith('# ')) {
    return <h1 className='pt-4 text-lg font-extrabold tracking-tight text-foreground'>{formatInlineMarkdown(trimmed.slice(2))}</h1>
  }

  // Blockquotes
  if (trimmed.startsWith('> ')) {
    return (
      <blockquote className='my-2 border-l-3 border-primary/70 bg-primary/5 px-3.5 py-2 text-xs italic text-foreground/90 rounded-r-lg'>
        {formatInlineMarkdown(trimmed.slice(2))}
      </blockquote>
    )
  }

  // Bullet Lists
  if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
    return (
      <div className='flex items-start gap-2 pl-2'>
        <span className='mt-1.5 size-1.5 shrink-0 rounded-full bg-primary/70' />
        <span className='flex-1'>{formatInlineMarkdown(trimmed.slice(2))}</span>
      </div>
    )
  }

  // Numbered Lists
  const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/)
  if (numMatch) {
    return (
      <div className='flex items-start gap-2 pl-2'>
        <span className='font-mono font-semibold text-primary/80 shrink-0 text-xs'>{numMatch[1]}.</span>
        <span className='flex-1'>{formatInlineMarkdown(numMatch[2])}</span>
      </div>
    )
  }

  return <p>{formatInlineMarkdown(line)}</p>
}

function formatInlineMarkdown(text: string): React.ReactNode {
  // Regex parser for bold, italic, inline code, and inline math (\(...\) and $...$)
  const tokens = text.split(/(\*\*[\s\S]*?\*\*|\*[\s\S]*?\*|`[\s\S]*?`|\\\(.*?\\\)|\$(?:\\\$|[^\$\n])+?\$)/g)

  return tokens.map((token, i) => {
    if (!token) return null

    if (token.startsWith('**') && token.endsWith('**')) {
      return <strong key={i} className='font-semibold text-foreground'>{token.slice(2, -2)}</strong>
    }
    if (token.startsWith('*') && token.endsWith('*')) {
      return <em key={i} className='italic'>{token.slice(1, -1)}</em>
    }
    if (token.startsWith('`') && token.endsWith('`')) {
      return (
        <code key={i} className='rounded-md border border-border/80 bg-muted px-1.5 py-0.5 font-mono text-[11px] font-semibold text-primary'>
          {token.slice(1, -1)}
        </code>
      )
    }
    if (token.startsWith('\\(') && token.endsWith('\\)')) {
      return <InlineMath key={i} math={token.slice(2, -2)} />
    }
    if (token.startsWith('$') && token.endsWith('$') && token.length > 2) {
      return <InlineMath key={i} math={token.slice(1, -1)} />
    }

    return token
  })
}
