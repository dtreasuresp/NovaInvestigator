// GET /api/countries
//
// Returns the complete dataset of world countries (~245 ISO-3166 entries)
// with common names and FlagCDN URLs.
import { NextResponse } from 'next/server'

import { WORLD_COUNTRIES } from '@/lib/countries/countries-data'

export async function GET() {
  return NextResponse.json(
    { ok: true, countries: WORLD_COUNTRIES },
    {
      headers: {
        'Cache-Control': 'public, max-age=86400, s-maxage=86400'
      }
    }
  )
}
