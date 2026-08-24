const COMMERCIAL_OPERATIONAL_PATH_PREFIXES = ['/apps', '/pages/user-profile', '/pages/user-settings'] as const

const COMMERCIAL_ACCESS_EXEMPT_PATH_PREFIXES = [
  '/billing',
  '/pages/auth',
  '/pages/pricing'
] as const

const matchesPathPrefix = (pathname: string, prefixes: readonly string[]) =>
  prefixes.some(prefix => pathname === prefix || pathname.startsWith(`${prefix}/`))

export const isCommercialAccessExemptRoute = (pathname: string, searchParams?: Pick<URLSearchParams, 'get'>) => {
  if (matchesPathPrefix(pathname, COMMERCIAL_ACCESS_EXEMPT_PATH_PREFIXES)) {
    return true
  }

  return pathname === '/pages/user-settings' && searchParams?.get('setting') === 'billing'
}

export const shouldBlockCommercialAccess = (
  pathname: string,
  searchParams?: Pick<URLSearchParams, 'get'>
) =>
  matchesPathPrefix(pathname, COMMERCIAL_OPERATIONAL_PATH_PREFIXES) &&
  !isCommercialAccessExemptRoute(pathname, searchParams)
