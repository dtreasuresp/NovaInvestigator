import assert from 'node:assert/strict'
import { describe, it } from 'node:test'

import {
  DICTIONARIES,
  DEFAULT_LOCALE,
  SUPPORTED_LANGUAGES,
  normalizeLocale
} from '../../src/locales'

describe('i18n dictionary and locale resolution', () => {
  it('normalizes various language strings and regional codes to supported locales', () => {
    assert.equal(normalizeLocale('es'), 'es')
    assert.equal(normalizeLocale('ES'), 'es')
    assert.equal(normalizeLocale('es-ES'), 'es')
    assert.equal(normalizeLocale('es-CL'), 'es')
    assert.equal(normalizeLocale('en-US'), 'en')
    assert.equal(normalizeLocale('en-GB'), 'en')
    assert.equal(normalizeLocale('de-DE'), 'de')
    assert.equal(normalizeLocale('pt-BR'), 'pt')
    assert.equal(normalizeLocale('ko-KR'), 'ko')
    assert.equal(normalizeLocale('korean'), 'ko')
    assert.equal(normalizeLocale('spanish'), 'es')
    assert.equal(normalizeLocale('deutsch'), 'de')
    assert.equal(normalizeLocale(null), DEFAULT_LOCALE)
    assert.equal(normalizeLocale('unknown-xx'), DEFAULT_LOCALE)
  })

  it('exposes 5 supported languages with complete metadata', () => {
    assert.equal(SUPPORTED_LANGUAGES.length, 5)

    const codes = SUPPORTED_LANGUAGES.map(l => l.code)

    assert.deepEqual(codes, ['es', 'en', 'de', 'pt', 'ko'])

    for (const lang of SUPPORTED_LANGUAGES) {
      assert.ok(lang.name.length > 0)
      assert.ok(lang.nativeName.length > 0)
      assert.ok(lang.flag.length > 0)
      assert.ok(lang.bcp47.length > 0)
    }
  })

  it('ensures all translation dictionaries contain the required namespaces and keys', () => {
    const requiredNamespaces = ['common', 'nav', 'investigator', 'dashboard', 'billing', 'auth']

    for (const [localeCode, dict] of Object.entries(DICTIONARIES)) {
      for (const ns of requiredNamespaces) {
        assert.ok(
          ns in dict,
          `Dictionary '${localeCode}' is missing required namespace '${ns}'`
        )
      }

      // Check common keys
      assert.ok(dict.common.save.length > 0)
      assert.ok(dict.common.cancel.length > 0)
      assert.ok(dict.common.readOnlyMode.length > 0)

      // Check nav keys
      assert.ok(dict.nav.dashboard.length > 0)
      assert.ok(dict.nav.investigations.length > 0)
      assert.ok(dict.nav.projects.length > 0)
      assert.ok(dict.nav.registrationCleanup.length > 0)
      assert.ok(dict.nav.userSettings.length > 0)
      assert.ok(dict.nav.digitalVerification.length > 0)

      // Check investigator keys
      assert.ok(dict.investigator.context.length > 0)
      assert.ok(dict.investigator.summary.length > 0)
      assert.ok(dict.investigator.dafo.length > 0)
      assert.ok(dict.investigator.qspm.length > 0)
      assert.ok(dict.investigator.came.length > 0)
      assert.ok(dict.investigator.qspmTitle.length > 0)
      assert.ok(dict.investigator.addAlternative.length > 0)
      assert.ok(dict.investigator.quantitativeMatrix.length > 0)
      assert.ok(dict.investigator.strategicAttractiveRanking.length > 0)
      assert.ok(dict.investigator.decisionRationale.length > 0)
      assert.ok(dict.investigator.code.length > 0)
      assert.ok(dict.investigator.name.length > 0)
      assert.ok(dict.investigator.ratingScaleTitle.length > 0)
      assert.ok(dict.investigator.fieldTitle.length > 0)
      assert.ok(dict.investigator.actionOpen.length > 0)

      // Check userMenu keys
      assert.ok(dict.userMenu.myAccount.length > 0)
      assert.ok(dict.userMenu.settings.length > 0)
      assert.ok(dict.userMenu.logout.length > 0)
    }
  })
})
