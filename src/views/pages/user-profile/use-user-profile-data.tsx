'use client'

import { useState, useEffect, createContext, useContext } from 'react'

export type ProfileOverviewData = {
  profile: {
    id: string
    email: string
    displayName: string
    firstName: string
    lastName: string
    avatarUrl: string | null
    mobile: string
    country: string
    languages: string
    skype: string
    role: string
    institutionalRole: string
    status: string
    createdAt: string
    tenantName: string
  }
  metrics: {
    tasksCompiled: number
    totalConnections: number
    projectsCompiled: number
  }
  timeline: Array<{
    id: string | number
    description: string
    timestamp: string
    detail?: string
    attachment?: { name: string; fileType: 'pdf' | 'image' | 'doc' | 'excel' }
    person?: { name: string; initials: string; avatar?: string; role?: string }
    teamMembers?: Array<{ name: string; initials: string; avatar?: string }>
    teamExtraCount?: number
  }>
  connections: Array<{
    id: string
    name: string
    initials: string
    avatar: string | null
    role: string
    institutionalRole: string
    tags: { label: string }[]
    stats: { projects: string; tasks: string; connections: string }
    isConnected: boolean
    email: string
  }>
  teams: Array<{
    id: string
    name: string
    description: string
    initials: string
    avatar: string | null
    totalMembers: string
    memberAvatars: Array<{ name: string; avatar?: string; initials: string }>
    tags: { label: string }[]
    isFavorite: boolean
  }>
  projects: Array<{
    id: string
    name: string
    client: string
    logo: string
    budget: string
    efiScore: number
    efeScore: number
    startDate: string
    deadline: string
    description: string
    allHours: string
    daysLeft: string
    tasksCount: number
    totalTasks: number
    progressPercent: number
    teamMembers: Array<{ name: string; avatar?: string; initials: string }>
    commentsCount: number
    status: string
  }>
}

const UserProfileContext = createContext<{
  data: ProfileOverviewData | null
  loading: boolean
  reload: () => Promise<void>
}>({
  data: null,
  loading: true,
  reload: async () => { }
})

export function UserProfileProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<ProfileOverviewData | null>(null)
  const [loading, setLoading] = useState(true)

  const loadData = async (isSilent = false) => {
    try {
      if (!isSilent) setLoading(true)
      const res = await fetch('/api/user/profile-overview', { cache: 'no-store' })
      if (res.ok) {
        const json = await res.json()
        if (json.ok) {
          setData(json)
        }
      }
    } catch {
      // ignore
    } finally {
      if (!isSilent) setLoading(false)
    }
  }

  useEffect(() => {
    loadData(false)

    // Silent background revalidation on profile/workspace updates (avoids page flickering or reloading dialogs)
    const handleUpdated = () => {
      void loadData(true)
    }

    window.addEventListener('novastore:profile-updated', handleUpdated)
    window.addEventListener('novastore:workspace-updated', handleUpdated)

    return () => {
      window.removeEventListener('novastore:profile-updated', handleUpdated)
      window.removeEventListener('novastore:workspace-updated', handleUpdated)
    }
  }, [])

  return (
    <UserProfileContext.Provider value={{ data, loading, reload: loadData }}>
      {children}
    </UserProfileContext.Provider>
  )
}

export function useUserProfileData() {
  return useContext(UserProfileContext)
}
