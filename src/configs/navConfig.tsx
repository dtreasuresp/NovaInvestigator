// Third-party Imports
import type * as Icon from 'lucide-react'

// Type Imports
import type { PlatformCapabilityKey } from '@/features/access/capabilityManifest'

// Utils Imports
import { INVESTIGATOR_BASE_PATH } from '@/utils/investigator/constants'

type IconName = keyof typeof Icon

export type MenuLeafSubItem = {
  label: string
  href: string
  activePath?: string
  badge?: string
  badgeClassName?: string
  target?: '_blank' | '_self' | '_parent' | '_top'
  platformCapability?: PlatformCapabilityKey
}

export type MenuGroupSubItem = {
  label: string
  childItems: MenuLeafSubItem[]
}

export type MenuSubItem = MenuLeafSubItem | MenuGroupSubItem

export type MenuItem = {
  icon: IconName
  label: string
  moduleKey?: string
} & (
    | {
      href: string
      badge?: string
      badgeClassName?: string
      childItems?: never
      target?: '_blank' | '_self' | '_parent' | '_top'
      platformCapability?: PlatformCapabilityKey
    }
    | {
      href?: never
      badge?: string
      badgeClassName?: string
      childItems: MenuSubItem[]
      platformCapability?: PlatformCapabilityKey
    }
  )

export type NavItem = {
  groupLabel?: string
  items: MenuItem[]
}

export const navItems: NavItem[] = [
  {
    groupLabel: 'Dashboard',
    items: [
      {
        icon: 'LayoutDashboardIcon',
        label: 'Investigations',
        href: '/dashboard/investigations'
      },

      // {
      //  icon: 'Package',
      //  label: 'Orders',
      //  href: '/dashboard/orders'
      // },
      
      // {
      //   icon: 'TrendingUp',
      //   label: 'Sales',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/sales',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      // },
      // {
      //  icon: 'Wallet',
      //   label: 'Finance',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/finance',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      // },
      // {
      //  icon: 'Truck',
      //   label: 'Logistics',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/logistics',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      //   },
      //   {
      //    icon: 'Briefcase',
      //   label: 'Productivity',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/productivity',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      // },
      // {
      //   icon: 'Megaphone',
      //   label: 'Campaign',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/campaign',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      // },
      // {
      //   icon: 'BarChart3',
      //   label: 'Analytics',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/analytics',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      // },
      // {
      //   icon: 'CreditCard',
      //   label: 'Payments',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/payments',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      // },
      // {
      //   icon: 'ShoppingCart',
      //   label: 'eCommerce',
      //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/dashboard/ecommerce',
      //   target: '_blank',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8'
      // },
      // {
      //   icon: 'LayoutTemplate',
      //   label: 'Layouts',
      //   badge: 'Pro',
      //   badgeClassName: 'right-8',
      //   childItems: [
      //     {
      //       label: 'Full Navbar',
      //       href: 'https://shadcn-nextjs-admincn-full-navbar-layout-admin-template.vercel.app/',
      //       target: '_blank'
      //     },
      //     {
      //      label: 'Horizontal',
      //      href: 'https://shadcn-nextjs-admincn-horizontal-layout-admin-template.vercel.app/',
      //      target: '_blank'
      //   },
      //     {
      //       label: 'Split',
      //     href: 'https://shadcn-nextjs-admincn-split-layout-admin-template.vercel.app/',
      //      target: '_blank'
      //   },
      //   {
      //    label: 'Icon Menu',
      //    href: 'https://shadcn-nextjs-admincn-icon-menu-layout-admin-template.vercel.app/',
      //    target: '_blank'
      //  },
      //  {
      //   label: 'Paper',
      //  href: 'https://shadcn-nextjs-admincn-paper-layout-admin-template.vercel.app/',
      //   target: '_blank'
      // }
      //  ]
      //  }
      //]
    ]
  },
  {
    groupLabel: 'Apps',
        items: [
          // {
          //   icon: 'MailIcon',
          //   label: 'Mail',
          //   href: '/apps/mail'
          // },
          // {
          //   icon: 'CalendarIcon',
          //   label: 'Calendar',
          //   href: '/apps/calendar'
          // },
          // {
          //   icon: 'MessageCircleIcon',
          //   label: 'Chat',
          //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/apps/chat',
          //   target: '_blank',
          //   badge: 'Pro',
          //   badgeClassName: 'right-8'
          // },
          // {
          //   icon: 'SquareKanbanIcon',
          //   label: 'Kanban',
          //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/apps/kanban',
          //   target: '_blank',
          //   badge: 'Pro',
          //   badgeClassName: 'right-8'
          // },
          // {
          //   icon: 'ContactIcon',
          //   label: 'Contact',
          //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/apps/contact',
          //   target: '_blank',
          //   badge: 'Pro',
          //   badgeClassName: 'right-8'
          {
            icon: 'SparklesIcon',
            label: 'NovAi',
            href: '/apps/novai',
            moduleKey: 'novai'
          },
          {
            icon: 'SquareKanbanIcon',
            label: 'Projects',
            href: '/apps/projects',
            moduleKey: 'kanban'
          },
          {
            icon: 'ClipboardCheckIcon',
            label: 'Research',
            href: `${INVESTIGATOR_BASE_PATH}/investigations`,
            moduleKey: 'investigator'
          }
        ]
      },
      {
        groupLabel: 'Administration',
        items: [
          {
            icon: 'UsersIcon',
            label: 'Users',
            childItems: [
              { label: 'List', href: '/apps/users/list' },
              { label: 'View', href: '/apps/users/view' },
              { label: 'Invitations', href: '/apps/users/invitations' }
            ]
          },
          {
            icon: 'ShieldCheckIcon',
            label: 'Roles & Permissions',
            childItems: [
              {
                label: 'Roles',
                href: '/apps/roles'
              },
              {
                label: 'Permissions',
                href: '/apps/permissions'
              }
            ]
          },
          {
            icon: 'ShieldCheckIcon',
            label: 'Registration cleanup',
            childItems: [
              {
                label: 'Pending registrations',
                href: '/apps/platform/registration-cleanup',
                platformCapability: 'platform.auth.registrations.manage'
              }
            ]
          },
          {
            icon: 'ClipboardCheckIcon',
            label: 'Digital Verification Identity',
            childItems: [
              {
                label: 'Review queue',
                href: '/apps/platform/vid',
                platformCapability: 'platform.vid.read'
              }
            ]
          },
          {
            icon: 'CreditCardIcon',
            label: 'Platform Billing',
            childItems: [
              {
                label: 'Billing Management',
                href: '/apps/platform/billing',
                platformCapability: 'platform.billing.manage'
              }
            ]
          }
        ]
      },
      {
        groupLabel: 'User access',
        items: [
          {
            icon: 'UserCogIcon',
            label: 'User Settings',
            childItems: [
              {
                label: 'General',
                href: '/pages/user-settings?setting=general'
              },
              {
                label: 'Workspace',
                href: '/pages/user-settings?setting=workspace'
              },
              {
                label: 'Members',
                href: '/pages/user-settings?setting=members'
              },
              {
                label: 'Security',
                href: '/pages/user-settings?setting=security'
              },
              {
                label: 'Digital Identity Verification',
                href: '/pages/user-settings?setting=vid'
              },
              {
                label: 'Billing & Usage',
                href: '/pages/user-settings?setting=billing'
              }

              // {
              //   label: 'Notifications',
              //   href: '/pages/user-settings?setting=notifications'
              // },
              // {
              //   label: 'Integrations',
              //   href: '/pages/user-settings?setting=integrations'
              // }
            ]
          },
          {
            icon: 'UserIcon',
            label: 'User Profile',
            childItems: [
              {
                label: 'Profile',
                href: '/pages/user-profile?view=profile'
              },
              {
                label: 'Teams',
                href: '/pages/user-profile?view=teams'
              },
              {
                label: 'Projects',
                href: '/pages/user-profile?view=projects'
              },
              {
                label: 'Connections',
                href: '/pages/user-profile?view=connections'
              }
            ]
          },

          // {
          //   icon: 'LockKeyholeIcon',
          //   label: 'Authentication',
          //   childItems: [
          //     {
          //       label: 'Login',
          //       childItems: [
          //         { label: 'Login v1', href: '/pages/auth/login', target: '_blank' },
          //         {
          //           label: 'Login v2',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/login-v2',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //         },
          //         {
          //           label: 'Login v3',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/login-v3',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //         }
          //       ]
          //     },
          //     {
          //       label: 'Register',
          //       childItems: [
          //         { label: 'Register v1', href: '/pages/auth/register', target: '_blank' },
          //         {
          //          label: 'Register v2',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/register-v2',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //         },
          //         {
          //           label: 'Register v3',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/register-v3',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //         }
          //       ]
          //     },
          //     {
          //       label: 'Forgot Password',
          //       childItems: [
          //         { label: 'Forgot Password v1', href: '/pages/auth/forgot-password', target: '_blank' },
          //         {
          //           label: 'Forgot Password v2',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/forgot-password-v2',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //         },
          //         {
          //           label: 'Forgot Password v3',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/forgot-password-v3',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //        }
          //       ]
          //     },
          //     {
          //       label: 'Verify Email',
          //       childItems: [
          //         { label: 'Verify Email v1', href: '/pages/auth/verify-email', target: '_blank' },
          //         {
          //           label: 'Verify Email v2',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/verify-email-v2',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //         },
          //         {
          //           label: 'Verify Email v3',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/verify-email-v3',
          //           target: '_blank',
          //           badge: 'Pro',
          //           badgeClassName: 'right-8'
          //         }
          //       ]
          //     },
          //     {
          //       label: 'Reset Password',
          //       childItems: [
          //         { label: 'Reset Password v1', href: '/pages/auth/reset-password', target: '_blank' },
          //         {
          //           label: 'Reset Password v2',
          //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/reset-password-v2',
          //          target: '_blank',
          //          badge: 'Pro',
          //          badgeClassName: 'right-8'
          //        },
          //        {
          //          label: 'Reset Password v3',
          //          href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/reset-password-v3',
          //          target: '_blank',
          //          badge: 'Pro',
          //          badgeClassName: 'right-8'
          //        }
          //      ]
          //    },
          //    {
          //      label: 'Two Steps',
          //      childItems: [
          //        { label: 'Two Steps v1', href: '/pages/auth/two-steps', target: '_blank' },
          //        {
          //          label: 'Two Steps v2',
          //          href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/two-steps-v2',
          //          target: '_blank',
          //          badge: 'Pro',
          //          badgeClassName: 'right-8'
          //        },
          //        {
          //          label: 'Two Steps v3',
          //          href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/auth/two-steps-v3',
          //          target: '_blank',
          //          badge: 'Pro',
          //          badgeClassName: 'right-8'
          //        }
          //      ]
          //    }
          //  ]
          // },
          // {
          //   icon: 'BugIcon',
          //   label: 'Error Pages',
          //   childItems: [
          //     { label: 'Error Page', href: '/pages/misc/error-page', target: '_blank' },
          //     {
          //       label: 'Error Page - 404',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/misc/error-page-404',
          //       target: '_blank',
          //       badge: 'Pro',
          //       badgeClassName: 'right-8'
          //     },
          //     {
          //       label: 'Not Authorized - 401',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/misc/unauthorized-access-401',
          //       target: '_blank',
          //       badge: 'Pro',
          //       badgeClassName: 'right-8'
          //     },
          //     {
          //       label: 'Forbidden - 403',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/misc/forbidden-403',
          //       target: '_blank',
          //       badge: 'Pro',
          //       badgeClassName: 'right-8'
          //     },
          //     {
          //       label: 'Server Error - 500',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/misc/server-error-500',
          //       target: '_blank',
          //       badge: 'Pro',
          //       badgeClassName: 'right-8'
          //     },
          //     {
          //       label: 'Under Maintenance',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/misc/maintenance-page',
          //       target: '_blank',
          //       badge: 'Pro',
          //       badgeClassName: 'right-8'
          //     }
          //   ]
          // },
          // {
          //   icon: 'RocketIcon',
          //   label: 'Landing Page',
          //   href: 'https://shadcn-nextjs-flow-landing-page.vercel.app/',
          //   target: '_blank',
          //   badge: 'Pro',
          //   badgeClassName: 'right-8'
          // },
        {
          icon: 'DollarSignIcon',
          label: 'Pricing',
          href: '/pages/pricing',
          badgeClassName: 'right-8'
        },

          // {
          //   icon: 'CircleQuestionMarkIcon',
          //   label: 'FAQ',
          //   href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/faq',
          //   target: '_blank',
          //   badge: 'Pro',
          //   badgeClassName: 'right-8'
          // },
          // {
          //   icon: 'FootprintsIcon',
          //   label: 'Onboarding',
          //   badge: 'Pro',
          //   badgeClassName: 'right-8',
          //   childItems: [
          //     {
          //       label: 'Onboarding v1',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/onboarding-v1',
          //       target: '_blank'
          //     },
          //     {
          //       label: 'Onboarding v2',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/onboarding-v2',
          //       target: '_blank'
          //     }
          //   ]
          // },
          // {
          //   icon: 'FileIcon',
          //   label: 'Empty State',
          //   badge: 'Pro',
          //   badgeClassName: 'right-8',
          //   childItems: [
          //     {
          //       label: 'Empty State v1',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/empty-state-v1',
          //       target: '_blank'
          //     },
          //     {
          //       label: 'Empty State v2',
          //       href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/pages/empty-state-v2',
          //       target: '_blank'
          //     }
          //   ]
          // }
        ]
      }

      // {
      //   groupLabel: 'Forms & Tables',
      //   items: [
      //     {
      //       icon: 'LayoutTemplateIcon',
      //       label: 'Form Layouts',
      //       childItems: [
      //         { label: 'Vertical Layout', href: '/forms/form-layouts/vertical' },
      //         { label: 'Horizontal Layout', href: '/forms/form-layouts/horizontal' },
      //         {
      //           label: 'Sticky Actions',
      //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/forms/form-layouts/sticky-actions',
      //           target: '_blank',
      //           badge: 'Pro',
      //           badgeClassName: 'right-8'
      //         }
      //       ]
      //     },
      //     {
      //       icon: 'BadgeCheckIcon',
      //       label: 'Form Validation',
      //       href: '/forms/form-validation'
      //     },
      //     {
      //       icon: 'TableIcon',
      //       label: 'Data Table',
      //       href: '/datatable'
      //     },
      //     {
      //       icon: 'ListTodoIcon',
      //       label: 'Form Wizard',
      //       badge: 'Pro',
      //       badgeClassName: 'right-8',
      //       childItems: [
      //         {
      //           label: 'Icons',
      //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/forms/form-wizard/icons',
      //           target: '_blank'
      //         },
      //         {
      //           label: 'Numbered',
      //           href: 'https://shadcn-nextjs-admincn-admin-template.vercel.app/forms/form-wizard/numbered',
      //           target: '_blank'
      //         }
      //       ]
      //     }
      //   ]
      // },
      // {
      //   groupLabel: 'Components & Charts',
      //   items: [
      //     {
      //       icon: 'LayoutGrid',
      //       label: 'Components',
      //       href: 'https://shadcnstudio.com/components',
      //       target: '_blank'
      //     },
      //     {
      //       icon: 'LineChart',
      //       label: 'Charts',
      //       href: 'https://shadcnstudio.com/blocks/dashboard-and-application/charts-component',
      //       target: '_blank'
      //     },
      //     {
      //       icon: 'ChartNoAxesColumnIncreasing',
      //       label: 'Statistics',
      //       href: 'https://shadcnstudio.com/blocks/dashboard-and-application/statistics-component',
      //       target: '_blank'
      //     },
      //     {
      //       icon: 'PanelTop',
      //       label: 'Card Nav',
      //       href: 'https://shadcnstudio.com/blocks/dashboard-and-application/card-nav',
      //       target: '_blank',
      //       badge: 'Pro',
      //       badgeClassName: 'right-8'
      //     },
      //     {
      //       icon: 'Puzzle',
      //       label: 'Widgets',
      //       href: 'https://shadcnstudio.com/blocks/dashboard-and-application/widgets-component',
      //       target: '_blank'
      //     }
      //   ]
      // },
      // {
      //   groupLabel: 'Miscellaneous',
      //   items: [
      //     {
      //       icon: 'MenuIcon',
      //       label: 'Menu Level',
      //       childItems: [
      //         {
      //           label: 'Menu Item ',
      //           href: '#'
      //         },
      //         {
      //           label: 'Menu Level 1',
      //           childItems: [{ label: 'Menu Level 2', href: '#' }]
      //         }
      //       ]
      //     },
      //     {
      //       icon: 'InfoIcon',
      //       label: 'Support',
      //       href: 'https://shadcnstudio.com/support',
      //       target: '_blank'
      //     },
      //     {
      //       icon: 'BookOpenTextIcon',
      //       label: 'Documentation',
      //       href: 'https://shadcnstudio.com/docs/documentation-admin/getting-started',
      //       target: '_blank'
      //     }
      //   ]
      // }
    ]
