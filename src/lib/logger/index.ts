// Central application logger (plan section 17.4).
//
// Responsibilities:
//   - Single point of truth for operational logs; no stray `console.*` in
//     production code. A few deliberately labeled `console.error` calls that
//     run inside try/catch fallbacks (e.g. logging failures) are acceptable
//     and are annotated with eslint-disable, but new code should use this.
//   - Structured fields: every entry is a JSON object, never string
//     concatenation of dynamic values.
//   - No PII / secrets / full payloads: `email`, tokens, card data, and any
//     key matching a known-sensitive name are redacted before writing.
//   - Environment awareness: `debug` is suppressed in production; `error`/
//     `warn` always go out; `info` is kept (short, structured, non-PII).
//   - Optional `correlationId` per call for cross-cutting trace correlation
//     (see src/features/billing/http.ts and src/features/vid/http.ts).
//
// This module must never depend on Supabase, Stripe, or request plumbing so
// it can be used from any layer (route handlers, services, repositories).

export type LogLevel = 'debug' | 'info' | 'warn' | 'error'

export interface LogEntry {
  readonly level: LogLevel
  readonly message: string
  readonly timestamp: string
  readonly correlationId?: string
  readonly action?: string
  readonly details?: Record<string, unknown>
}

// Keys whose values must never be logged. Matches case-insensitively against
// nested keys recursively.
const SENSITIVE_KEY_PATTERN =
  /password|passwd|token|secret|key|authorization|cookie|email|card|pan|cvv|cvc|stripe[_-]?secret|service[_-]?role|investigation|state|payload|recovery_code|otp|code$/i

const SENSITIVE_TEXT_PATTERN =
  /((?:sk|rk|pk|whsec|sbp)_[A-Za-z0-9_]{8,})|([A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,})/g

const SENSITIVE_VALUE_PLACEHOLDER = '[REDACTED]'

const keysOf = (value: Record<string, unknown>): string[] => Object.keys(value)

function isSensitiveKey(key: string): boolean {
  return SENSITIVE_KEY_PATTERN.test(key)
}

function sanitizeValue(value: unknown, path: string): unknown {
  if (value === null || value === undefined) return value

  if (typeof value === 'string') {
    if (path.length > 0 && isSensitiveKey(path)) return SENSITIVE_VALUE_PLACEHOLDER

    const redacted = value.replace(SENSITIVE_TEXT_PATTERN, SENSITIVE_VALUE_PLACEHOLDER)

    return redacted
  }

  if (typeof value === 'number' || typeof value === 'boolean' || typeof value === 'bigint') return value

  if (Array.isArray(value)) {
    return value.map((item, index) => sanitizeValue(item, `${path}[${index}]`))
  }

  if (typeof value === 'object') {
    const record = value as Record<string, unknown>

    const out: Record<string, unknown> = {}

    for (const key of keysOf(record)) {
      const childPath = path ? `${path}.${key}` : key

      out[isSensitiveKey(key) ? `${key}_redacted` : key] = sanitizeValue(record[key], childPath)
    }

    return out
  }

  return SENSITIVE_VALUE_PLACEHOLDER
}

function isProduction(): boolean {
  return process.env.NODE_ENV === 'production'
}

export interface Logger {
  readonly debug: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) => void
  readonly info: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) => void
  readonly warn: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) => void
  readonly error: (message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) => void
}

/**
 * Creates a logger with an optional fixed `action` prefix (e.g.
 * `logger.action('webhooks/stripe')`) so related calls share context without
 * repeating a long action string. Never throws.
 */
export function createLogger(fixedAction?: string): Logger {
  const emit = (level: LogLevel, message: string, fields?: Omit<LogEntry, 'level' | 'message' | 'timestamp'>) => {
    try {
      const entry: LogEntry = {
        level,
        message,
        timestamp: new Date().toISOString(),
        ...(fields?.action ?? fixedAction ? { action: fields?.action ?? fixedAction } : {}),
        ...(fields?.correlationId ? { correlationId: fields.correlationId } : {}),
        ...(fields?.details !== undefined ? { details: sanitizeValue(fields.details, 'details') as Record<string, unknown> } : {})
      }

      if (level === 'debug' && isProduction()) return

      const line = JSON.stringify(entry)

      switch (level) {
        case 'debug':
           
          console.debug(line)
          break
        case 'info':
           
          console.info(line)
          break
        case 'warn':
           
          console.warn(line)
          break
        case 'error':
           
          console.error(line)
          break
      }
    } catch (error) {
      // A malformed diagnostic must not hide the original logging failure.
      // Keep the fallback deliberately small so it cannot contain request data.
      const errorType = error instanceof Error ? error.name : typeof error

      console.error(
        JSON.stringify({
          level: 'error',
          message: 'application_logger_failed',
          timestamp: new Date().toISOString(),
          details: { errorType }
        })
      )
    }
  }

  return {
    debug: (message, fields) => emit('debug', message, fields),
    info: (message, fields) => emit('info', message, fields),
    warn: (message, fields) => emit('warn', message, fields),
    error: (message, fields) => emit('error', message, fields)
  }
}

/**
 * Default application logger instance, used across route handlers and
 * services. Create scoped children with `logger{ action: '...' }` or
 * `createLogger('scope')` where tighter grouping is desired.
 */
export const logger = createLogger()
