import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import { getMinorExponent, isSupportedCurrency, majorToMinorUnits, minorToMajorUnits } from '../../src/lib/currency/iso4217'
import { formatAmountMinor, parseAmountMinor } from '../../src/lib/currency/format'

describe('iso 4217 minor-to-major exponent', () => {
  it('uses exponent 2 for USD and EUR', () => {
    assert.equal(getMinorExponent('USD'), 2)
    assert.equal(getMinorExponent('EUR'), 2)
  })

  it('uses exponent 0 for CLP (no subunit in circulation)', () => {
    assert.equal(getMinorExponent('CLP'), 0)
  })

  it('falls back to exponent 2 for unknown currencies but restricts supported set', () => {
    assert.equal(getMinorExponent('XXX'), 2)
    assert.equal(isSupportedCurrency('USD'), true)
    assert.equal(isSupportedCurrency('CLP'), true)
    assert.equal(isSupportedCurrency('XXX'), false)
  })

  it('converts minor to major units using the correct exponent', () => {
    assert.equal(minorToMajorUnits(1200, 'USD'), 12)
    assert.equal(minorToMajorUnits(9500, 'CLP'), 9500)
  })

  it('round-trips major <=> minor without precision loss', () => {
    const amountMinor = 1999
    const currency = 'USD'

    assert.equal(majorToMinorUnits(minorToMajorUnits(amountMinor, currency), currency), amountMinor)
  })

  it('rejects negative or non-finite amounts', () => {
    assert.throws(() => minorToMajorUnits(-1, 'USD'), RangeError)
    assert.throws(() => minorToMajorUnits(Number.NaN, 'USD'), RangeError)
  })
})

describe('currency formatting', () => {
  it('formats a CLP amount without dividing by 100 (regression for the /100 bug)', () => {
    const formatted = formatAmountMinor(9500, 'CLP', 'es-CL')

    // 9500 CLP en unidades menores -> 9500 unidades mayores (exponente 0).
    assert.match(formatted, /9500|9\.500|9\.5/)
    assert.doesNotMatch(formatted, /95[,.]00/)
  })

  it('formats a USD amount in cents', () => {
    const formatted = formatAmountMinor(1200, 'USD', 'en-US')

    assert.match(formatted, /12/)
    assert.doesNotMatch(formatted, /1200/)
  })

  it('uses the provided BCP-47 locale for grouping', () => {
    assert.match(formatAmountMinor(120000, 'USD', 'en-US'), /1,200/)
    assert.match(formatAmountMinor(120000, 'USD', 'es-CL'), /1\.200/)
  })

  it('parses a visible major-units input back to minor units', () => {
    assert.equal(parseAmountMinor('12', 'USD'), 1200)
    assert.equal(parseAmountMinor('9500', 'CLP'), 9500)
  })

  it('rejects invalid parse inputs', () => {
    assert.throws(() => parseAmountMinor('not-a-number', 'USD'), RangeError)
    assert.throws(() => parseAmountMinor('-5', 'USD'), RangeError)
  })
})
