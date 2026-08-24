'use client'

// React Imports
import { type ComponentType } from 'react'

import { useEffect, useState } from 'react'

// Next Imports
import Link from 'next/link'
import { usePathname, useSearchParams } from 'next/navigation'

// Third-party Imports
import * as Icon from 'lucide-react'
import { ChevronRightIcon, LockKeyholeIcon, SquareArrowOutUpRightIcon } from 'lucide-react'

// Type Imports
import type { MenuGroupSubItem, MenuItem, MenuSubItem } from '@/configs/navConfig'
import type { PlatformCapabilityKey } from '@/features/access/capabilityManifest'
import type { BillingPlan } from '@/lib/billing/types'

// Component Imports
import LogoSvg from '@/assets/svg/logo'
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem
} from '@/components/ui/sidebar'

// Config Imports
import { navItems } from '@/configs/navConfig'
import themeConfig from '@/configs/themeConfig'
import { getAppItemAccess } from '@/configs/permissions'

// Hook Imports
import { usePermissions } from '@/hooks/use-permissions'
import { usePlanCatalog } from '@/hooks/use-plan-catalog'
import { useI18n } from '@/hooks/use-i18n'

// Util Imports
import { cn } from '@/lib/utils'

import { getNavApps } from '@/lib/nav-apps'

const NAV_LABEL_MAP: Record<string, string> = {
  Dashboard: 'nav.dashboard',
  Investigations: 'nav.investigations',
  Projects: 'nav.projects',
  Apps: 'nav.apps',
  Investigator: 'nav.investigator',
  Administration: 'nav.administration',
  Users: 'nav.users',
  List: 'nav.userList',
  View: 'nav.userView',
  Invitations: 'nav.invitations',
  'Roles & Permissions': 'nav.roles',
  Roles: 'nav.rolesList',
  Permissions: 'nav.permissionsList',
  'Registration cleanup': 'nav.registrationCleanup',
  'Pending registrations': 'nav.pendingRegistrations',
  'Digital Verification Identity': 'nav.digitalVerification',
  'Review queue': 'nav.reviewQueue',
  'Platform Billing': 'nav.platformBilling',
  'Billing Management': 'nav.billingManagement',
  'User access': 'nav.userAccess',
  'User Access': 'nav.userAccess',
  'User Settings': 'nav.userSettings',
  General: 'nav.general',
  Workspace: 'nav.workspace',
  Members: 'nav.members',
  'Digital Identity Verification': 'nav.vidVerification',
  'Billing & Usage': 'nav.billingUsage',
  'User Profile': 'nav.userProfile',
  Connections: 'nav.connections',
  Platform: 'nav.platform',
  Pricing: 'nav.pricing',
  'Planes y Precios': 'nav.pricing',
  Billing: 'nav.billing',
  Settings: 'nav.settings',
  Profile: 'nav.profile',
  Security: 'nav.security',
  Teams: 'nav.teams',
  Organizations: 'nav.organizations',
  'Try Demo': 'nav.tryDemoBadge',
  'Try demo': 'nav.tryDemoBadge',
  Context: 'investigator.context',
  Resumen: 'investigator.summary',
  Summary: 'investigator.summary',
  'Internal Environment': 'investigator.efi',
  'External Environment': 'investigator.efe',
  'SWOT Analysis': 'investigator.dafo',
  'Quantitative Strategic': 'investigator.qspm',
  'CAME Analysis': 'investigator.came',
  Manager: 'investigator.manager',
  EFI: 'investigator.efi',
  EFE: 'investigator.efe',
  DAFO: 'investigator.dafo',
  QSPM: 'investigator.qspm',
  CAME: 'investigator.came',
  Gestor: 'investigator.manager'
}

type NavGroupItem = MenuItem & { locked?: boolean }

const isSubGroup = (item: MenuSubItem): item is MenuGroupSubItem => 'childItems' in item

const isExternalLink = (href: string) => href.startsWith('http://') || href.startsWith('https://')

const hasPlatformCapability = (
  capability: PlatformCapabilityKey | undefined,
  capabilities: ReadonlySet<PlatformCapabilityKey> | null
) => capability === undefined || (capabilities !== null && capabilities.has(capability))

const filterPlatformMenuItems = (
  items: MenuItem[],
  capabilities: ReadonlySet<PlatformCapabilityKey> | null
): MenuItem[] => {
  const visibleItems: MenuItem[] = []

  for (const item of items) {
    if (!hasPlatformCapability(item.platformCapability, capabilities)) {
      continue
    }

    if (!item.childItems) {
      visibleItems.push(item)
      continue
    }

    const childItems: MenuSubItem[] = []

    for (const subItem of item.childItems) {
      if (!isSubGroup(subItem)) {
        if (hasPlatformCapability(subItem.platformCapability, capabilities)) {
          childItems.push(subItem)
        }

        continue
      }

      const visibleLeaves = subItem.childItems.filter(leaf =>
        hasPlatformCapability(leaf.platformCapability, capabilities)
      )

      if (visibleLeaves.length > 0) {
        childItems.push({ ...subItem, childItems: visibleLeaves })
      }
    }

    if (childItems.length > 0) {
      visibleItems.push({ ...item, childItems })
    }
  }

  return visibleItems
}

function isLinkActive(
  href: string,
  activePath: string | undefined,
  pathname: string,
  searchParams: Pick<URLSearchParams, 'get'>
): boolean {
  if (activePath) {
    return pathname.startsWith(activePath)
  }

  if (href.includes('?')) {
    const [hrefPath, hrefQuery] = href.split('?')

    if (pathname !== hrefPath) return false

    const hrefParams = new URLSearchParams(hrefQuery)

    for (const [key, value] of hrefParams.entries()) {
      if (searchParams.get(key) !== value) return false
    }

    return true
  }

  return pathname === href
}

const LockedAppMenuItem = ({ item, planName }: { item: MenuItem; planName?: string }) => {
  const { t } = useI18n()
  const Tag = item.icon ? (Icon[item.icon] as ComponentType) : null
  const displayLabel = NAV_LABEL_MAP[item.label] ? t(NAV_LABEL_MAP[item.label]) : item.label
  const badgeText = planName ?? item.badge
  const tooltip = badgeText ? `${displayLabel} — ${badgeText}` : `${displayLabel} (${t('common.locked')})`

  return (
    <SidebarMenuItem>
      <SidebarMenuButton
        tooltip={tooltip}
        render={<Link href='/pages/pricing' />}
        className='text-sidebar-foreground/50 hover:text-sidebar-foreground/75!'
      >
        {Tag && <Tag />}
        <span className={cn('min-w-0 flex-1 truncate', badgeText ? 'pr-16' : 'pr-6')}>{displayLabel}</span>
        <SidebarMenuBadge
          className={cn(
            'bg-muted text-muted-foreground/80 flex items-center gap-1 rounded-full px-1.5 py-0.5 text-xs font-normal',
            item.badgeClassName
          )}
        >
          <LockKeyholeIcon className='size-3 shrink-0' />
          {badgeText && <span className='truncate'>{badgeText}</span>}
        </SidebarMenuBadge>
      </SidebarMenuButton>
    </SidebarMenuItem>
  )
}

const SidebarGroupedMenuItems = ({
  data,
  groupLabel,
  pathname,
  searchParams,
  planForModule
}: {
  data: NavGroupItem[]
  groupLabel?: string
  pathname: string
  searchParams: Pick<URLSearchParams, 'get'>
  planForModule: (moduleKey: string | undefined) => BillingPlan | null
}) => {
  const { t } = useI18n()
  const displayGroupLabel = groupLabel && NAV_LABEL_MAP[groupLabel] ? t(NAV_LABEL_MAP[groupLabel]) : groupLabel

  return (
    <SidebarGroup>
      {displayGroupLabel && (
        <SidebarGroupLabel className='text-sidebar-foreground/50 tracking-wider uppercase'>
          {displayGroupLabel}
        </SidebarGroupLabel>
      )}
      <SidebarGroupContent>
        <SidebarMenu>
          {data.map(item => {
            const displayItemLabel = NAV_LABEL_MAP[item.label] ? t(NAV_LABEL_MAP[item.label]) : item.label

            if (item.locked) {
              return (
                <LockedAppMenuItem key={item.label} item={item} planName={planForModule(item.moduleKey)?.name} />
              )
            }

            const Tag = item.icon ? (Icon[item.icon] as ComponentType) : null

            const isChildActive =
              item.childItems?.some(subItem =>
                isSubGroup(subItem)
                  ? subItem.childItems.some(leaf => isLinkActive(leaf.href, leaf.activePath, pathname, searchParams))
                  : isLinkActive(subItem.href, subItem.activePath, pathname, searchParams)
              ) ?? false

            return item.childItems ? (
              <Collapsible className='group/collapsible' key={item.label}>
                <SidebarMenuItem>
                  <CollapsibleTrigger
                    render={
                      <SidebarMenuButton
                        tooltip={displayItemLabel}
                        isActive={isChildActive}
                        className='data-active:bg-primary/5!'
                      />
                    }
                  >
                    {Tag && <Tag />}
                    <span className={cn('min-w-0 flex-1 truncate', item.badge && 'pr-14')}>{displayItemLabel}</span>
                    {item.badge && (
                      <SidebarMenuBadge
                        className={cn(
                          'bg-primary/10 max-w-24 truncate rounded-full px-1.5 font-normal',
                          item.badgeClassName
                        )}
                      >
                        {NAV_LABEL_MAP[item.badge] ? t(NAV_LABEL_MAP[item.badge]) : item.badge}
                      </SidebarMenuBadge>
                    )}
                    <ChevronRightIcon className='ml-auto transition-transform duration-200 group-data-open/collapsible:rotate-90' />
                  </CollapsibleTrigger>
                  <CollapsibleContent className='h-(--collapsible-panel-height) overflow-hidden transition-all duration-200 data-ending-style:h-0 data-starting-style:h-0'>
                    <SidebarMenuSub>
                      {item.childItems.map(subItem => {
                        const displaySubLabel = NAV_LABEL_MAP[subItem.label] ? t(NAV_LABEL_MAP[subItem.label]) : subItem.label

                        return isSubGroup(subItem) ? (
                          <Collapsible className='group/subcollapsible' key={subItem.label}>
                            <SidebarMenuSubItem>
                              <CollapsibleTrigger
                                nativeButton={false}
                                render={
                                  <SidebarMenuSubButton
                                    className='data-active:bg-primary/10! justify-between'
                                    isActive={subItem.childItems.some(leaf =>
                                      isLinkActive(leaf.href, leaf.activePath, pathname, searchParams)
                                    )}
                                  />
                                }
                              >
                                {displaySubLabel}
                                <ChevronRightIcon className='ml-auto shrink-0 transition-transform duration-200 group-data-open/subcollapsible:rotate-90' />
                              </CollapsibleTrigger>
                              <CollapsibleContent className='h-(--collapsible-panel-height) overflow-hidden transition-all duration-200 data-ending-style:h-0 data-starting-style:h-0'>
                                <SidebarMenuSub className='mx-0'>
                                  {subItem.childItems.map(leaf => {
                                    const displayLeafLabel = NAV_LABEL_MAP[leaf.label] ? t(NAV_LABEL_MAP[leaf.label]) : leaf.label

                                    return (
                                      <SidebarMenuSubItem key={leaf.label}>
                                        <SidebarMenuSubButton
                                          className='data-active:bg-primary/10! justify-between'
                                          render={<Link href={leaf.href} target={leaf.target} />}
                                          isActive={isLinkActive(leaf.href, leaf.activePath, pathname, searchParams)}
                                        >
                                          <span
                                            className={cn(
                                              'min-w-0 flex-1 truncate',
                                              leaf.badge && isExternalLink(leaf.href) && 'pr-8',
                                              leaf.badge && !isExternalLink(leaf.href) && 'pr-14',
                                              !leaf.badge && isExternalLink(leaf.href) && 'pr-6'
                                            )}
                                          >
                                            {displayLeafLabel}
                                          </span>
                                          {leaf.badge && (
                                            <SidebarMenuBadge
                                              className={cn(
                                                'bg-primary/10 max-w-24 truncate rounded-full px-1.5 font-normal',
                                                isExternalLink(leaf.href) && 'right-6',
                                                leaf.badgeClassName
                                              )}
                                            >
                                              {leaf.badge}
                                            </SidebarMenuBadge>
                                          )}
                                          {isExternalLink(leaf.href) && (
                                            <SquareArrowOutUpRightIcon className='ml-auto size-3.5! shrink-0 opacity-50' />
                                          )}
                                        </SidebarMenuSubButton>
                                      </SidebarMenuSubItem>
                                    )
                                  })}
                                </SidebarMenuSub>
                              </CollapsibleContent>
                            </SidebarMenuSubItem>
                          </Collapsible>
                        ) : (
                          <SidebarMenuSubItem key={subItem.label}>
                            <SidebarMenuSubButton
                              className='data-active:bg-primary/10! justify-between'
                              render={<Link href={subItem.href} target={subItem.target} />}
                              isActive={isLinkActive(subItem.href, subItem.activePath, pathname, searchParams)}
                            >
                              <span
                                className={cn(
                                  'min-w-0 flex-1 truncate',
                                  subItem.badge && isExternalLink(subItem.href) && 'pr-8',
                                  subItem.badge && !isExternalLink(subItem.href) && 'pr-14',
                                  !subItem.badge && isExternalLink(subItem.href) && 'pr-6'
                                )}
                              >
                                {displaySubLabel}
                              </span>
                              {subItem.badge && (
                                <SidebarMenuBadge
                                  className={cn(
                                    'bg-primary/10 max-w-24 truncate rounded-full px-1.5 font-normal',
                                    isExternalLink(subItem.href) && 'right-6',
                                    subItem.badgeClassName
                                  )}
                                >
                                  {NAV_LABEL_MAP[subItem.badge] ? t(NAV_LABEL_MAP[subItem.badge]) : subItem.badge}
                                </SidebarMenuBadge>
                              )}
                              {isExternalLink(subItem.href) && (
                                <SquareArrowOutUpRightIcon className='ml-auto size-3.5! shrink-0 opacity-50' />
                              )}
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        )
                      })}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            ) : (
              <SidebarMenuItem key={item.label}>
                <SidebarMenuButton
                  tooltip={displayItemLabel}
                  render={<Link href={item.href} target={item.target} />}
                  isActive={pathname === item.href}
                  className='data-active:bg-primary/10!'
                >
                  {Tag && <Tag />}
                  <span
                    className={cn(
                      'min-w-0 flex-1 truncate',
                      item.badge && isExternalLink(item.href) && 'pr-8',
                      item.badge && !isExternalLink(item.href) && 'pr-14',
                      !item.badge && isExternalLink(item.href) && 'pr-6'
                    )}
                  >
                    {displayItemLabel}
                  </span>
                  {item.badge && (
                    <SidebarMenuBadge
                      className={cn(
                        'bg-primary/10 max-w-24 truncate rounded-full px-1.5 font-normal',
                        isExternalLink(item.href) && 'right-6',
                        item.badgeClassName
                      )}
                    >
                      {NAV_LABEL_MAP[item.badge] ? t(NAV_LABEL_MAP[item.badge]) : item.badge}
                    </SidebarMenuBadge>
                  )}
                  {isExternalLink(item.href) && (
                    <SquareArrowOutUpRightIcon className='ml-auto size-3.5! shrink-0 opacity-50' />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}

const SidebarLayout = () => {
  const { t } = useI18n()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const { has, hasModule, platformCapabilities, snapshot, loading } = usePermissions()
  const { planForModule } = usePlanCatalog()

  // Remove this state when the nav-apps API is removed. Until then, this state is used to hold the external nav-apps fetched from the API JSON.
  const [externalApps, setExternalApps] = useState<MenuItem[]>([])

  useEffect(() => {
    let mounted = true

    getNavApps().then(data => {
      if (!mounted) return

      setExternalApps(
        data.map(app => ({
          icon: app.icon as MenuItem['icon'],
          label: app.name,
          href: app.href,
          badge: 'Pro',
          badgeClassName: 'right-8',
          ...(app.openInNewTab ? { target: '_blank' as const } : {})
        }))
      )
    })

    return () => {
      mounted = false
    }
  }, [])

  // Nav groups rendered in the sidebar. Apps sin acceso por plan se mantienen
  // visibles con candado (locked); las bloqueadas por capability se ocultan.
  let navGroups = navItems.map(group => ({
    ...group,
    items: filterPlatformMenuItems(group.items, platformCapabilities)
  }))

  navGroups = navGroups.map(group =>
    group.groupLabel === 'Apps' || group.groupLabel === 'Platform'
      ? {
          ...group,
          items: group.items.reduce<NavGroupItem[]>((visibleItems, item) => {
            const access = getAppItemAccess(item, has, hasModule)

            if (access === 'hidden') {
              return visibleItems
            }

            // Evita parpadear candados mientras el snapshot aún no llega.
            if (access === 'locked' && (loading || !snapshot)) {
              return visibleItems
            }

            visibleItems.push({ ...item, locked: access === 'locked' })

            return visibleItems
          }, [])
        }
      : group
  )

  // Inactivado para evitar la inyección de apps demo de la plantilla externa.
  // Se preserva la infraestructura para futuras aplicaciones dinámicas del ecosistema NovaStore ERP.
  // if (externalApps.length > 0) {
  //   navGroups = navGroups.map(item =>
  //     item.groupLabel === 'Apps' ? { ...item, items: item.items.concat(externalApps) } : item
  //   )
  // }

  navGroups = navGroups.filter(group => group.items.length > 0)

  return (
    <Sidebar collapsible='icon' variant='sidebar'>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              size='lg'
              className='gap-2.5 bg-transparent!'
              render={<Link href={`${themeConfig.homePageUrl}`} />}
            >
              <LogoSvg className='size-8' />
              <div className='flex flex-col items-start'>
                <span className='text-lg font-semibold text-nowrap'>{themeConfig.templateName}</span>
                <span className='text-xs font-light text-nowrap'>{t('nav.brandSubtitle')}</span>
              </div>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent className='group-data-[collapsible=icon]:overflow-y-auto'>
        {navGroups.map((navItem, index) => {
          return (
            <SidebarGroupedMenuItems
              key={navItem.groupLabel || index}
              data={navItem.items}
              groupLabel={navItem.groupLabel}
              pathname={pathname}
              searchParams={searchParams}
              planForModule={planForModule}
            />
          )
        })}
      </SidebarContent>
    </Sidebar>
  )
}

export default SidebarLayout
