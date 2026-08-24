import * as React from 'react'

const MOBILE_BREAKPOINT = 1280

export function useIsMobile() {
  const subscribe = (onStoreChange: () => void) => {
    const mql = window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`)

    mql.addEventListener('change', onStoreChange)

    return () => mql.removeEventListener('change', onStoreChange)
  }

  const getSnapshot = () => window.matchMedia(`(max-width: ${MOBILE_BREAKPOINT - 1}px)`).matches
  const getServerSnapshot = () => false

  return React.useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot)
}
