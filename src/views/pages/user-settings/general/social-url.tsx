'use client'

// React Imports
import { useEffect, useState } from 'react'

// Third-party Imports
import { Loader2Icon, PlusIcon } from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { useI18n } from '@/hooks/use-i18n'

const SocialUrl = () => {
  const { t } = useI18n()
  const [urls, setUrls] = useState<string[]>(['', '', ''])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let active = true

    fetch('/api/user/profile')
      .then(async res => {
        if (!active) return

        if (!res.ok) return

        const data = (await res.json()) as { ok?: boolean; profile?: { socialUrls?: string[] } }

        if (data.profile?.socialUrls && data.profile.socialUrls.length > 0) {
          setUrls(data.profile.socialUrls)
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const addUrl = () => setUrls(prev => [...prev, ''])

  const updateUrl = (index: number, value: string) => setUrls(prev => prev.map((u, i) => (i === index ? value : u)))

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          socialUrls: urls.filter(u => u.trim() !== '')
        })
      })

      if (!response.ok) {
        toast.error('Failed to save social profile links.')

        return
      }

      toast.success('Social profile links updated successfully.')
    } catch {
      toast.error('Network error saving social links.')
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.socialUrlsTitle')}</h3>
          <p className='text-muted-foreground text-sm'>{t('userSettings.socialUrlsDesc')}</p>
        </div>
        <div className='flex items-center justify-center p-8 lg:col-span-2'>
          <Loader2Icon className='size-6 animate-spin text-muted-foreground' />
        </div>
      </div>
    )
  }

  return (
    <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
      {/* Vertical Tabs List */}
      <div className='flex flex-col space-y-1'>
        <h3 className='text-base font-semibold'>{t('userSettings.socialUrlsTitle')}</h3>
        <p className='text-muted-foreground text-sm'>{t('userSettings.socialUrlsDesc')}</p>
      </div>

      {/* Content */}
      <div className='space-y-6 lg:col-span-2'>
        <form onSubmit={handleSave} className='space-y-6'>
          <div className='space-y-4'>
            {urls.map((url, idx) => (
              <Input
                key={idx}
                type='url'
                placeholder='https://linkedin.com/in/username'
                value={url}
                onChange={e => updateUrl(idx, e.target.value)}
              />
            ))}
          </div>
          <div className='flex items-center justify-between gap-4'>
            <Button type='button' variant='outline' onClick={addUrl}>
              <PlusIcon className='size-4' />
              {t('userSettings.addApp')}
            </Button>
            <Button type='submit' disabled={pending}>
              {pending ? t('common.saving') : t('userSettings.saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default SocialUrl
