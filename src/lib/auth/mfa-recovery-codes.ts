import { randomInt, randomUUID, scryptSync, timingSafeEqual } from 'node:crypto'

const RECOVERY_CODE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
const RECOVERY_CODE_PART_LENGTH = 4
const RECOVERY_CODE_PARTS = 3
const RECOVERY_CODE_LENGTH = RECOVERY_CODE_PART_LENGTH * RECOVERY_CODE_PARTS
const HASH_ALGORITHM = 'scrypt'
const HASH_VERSION = '1'
const HASH_KEY_LENGTH = 32

const HASH_OPTIONS = {
  N: 16_384,
  r: 8,
  p: 1,
  maxmem: 32 * 1024 * 1024
} as const

export const MFA_RECOVERY_CODE_COUNT = 10

export interface MfaRecoveryCodeBatch {
  generationId: string
  codes: string[]
  hashes: string[]
}

export function normalizeMfaRecoveryCode(rawCode: string): string {
  const normalized = rawCode.replace(/[\s-]/g, '').toUpperCase()

  if (!new RegExp(`^[${RECOVERY_CODE_ALPHABET}]{${RECOVERY_CODE_LENGTH}}$`).test(normalized)) {
    throw new Error('Invalid MFA recovery code format.')
  }

  return normalized
}

export function hashMfaRecoveryCode(rawCode: string): string {
  const normalized = normalizeMfaRecoveryCode(rawCode)
  const salt = Buffer.from(randomUUID().replaceAll('-', ''), 'hex')
  const digest = scryptSync(normalized, salt, HASH_KEY_LENGTH, HASH_OPTIONS)

  return `${HASH_ALGORITHM}$${HASH_VERSION}$${salt.toString('base64url')}$${digest.toString('base64url')}`
}

export function verifyMfaRecoveryCode(rawCode: string, encodedHash: string): boolean {
  let normalized: string

  try {
    normalized = normalizeMfaRecoveryCode(rawCode)
  } catch {
    return false
  }

  const [algorithm, version, encodedSalt, encodedDigest] = encodedHash.split('$')

  if (algorithm !== HASH_ALGORITHM || version !== HASH_VERSION || !encodedSalt || !encodedDigest) {
    return false
  }

  try {
    const salt = Buffer.from(encodedSalt, 'base64url')
    const expectedDigest = Buffer.from(encodedDigest, 'base64url')
    const actualDigest = scryptSync(normalized, salt, HASH_KEY_LENGTH, HASH_OPTIONS)

    return expectedDigest.length === actualDigest.length && timingSafeEqual(expectedDigest, actualDigest)
  } catch {
    return false
  }
}

export function generateMfaRecoveryCodeBatch(count = MFA_RECOVERY_CODE_COUNT): MfaRecoveryCodeBatch {
  if (!Number.isSafeInteger(count) || count < 1 || count > 20) {
    throw new RangeError('MFA recovery code count must be between 1 and 20.')
  }

  const codes = Array.from({ length: count }, () => {
    const characters = Array.from(
      { length: RECOVERY_CODE_LENGTH },
      () => RECOVERY_CODE_ALPHABET[randomInt(RECOVERY_CODE_ALPHABET.length)]
    )

    return Array.from({ length: RECOVERY_CODE_PARTS }, (_, index) =>
      characters.slice(index * RECOVERY_CODE_PART_LENGTH, (index + 1) * RECOVERY_CODE_PART_LENGTH).join('')
    ).join('-')
  })

  return {
    generationId: randomUUID(),
    codes,
    hashes: codes.map(hashMfaRecoveryCode)
  }
}
