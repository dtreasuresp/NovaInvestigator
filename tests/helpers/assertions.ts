import assert from 'node:assert/strict'

export function toBeCloseTo(actual: number, expected: number, digits = 2): void {
  const tolerance = Math.pow(10, -digits)
  const diff = Math.abs(actual - expected)

  assert.ok(diff < tolerance, `expected ${actual} to be close to ${expected} within ${tolerance} (diff ${diff})`)
}