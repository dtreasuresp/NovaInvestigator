'use client'

// React Imports
import { useEffect, useRef, useState } from 'react'

// Third-party Imports
import { ImageIcon, Loader2Icon, Trash2Icon, UploadCloudIcon } from 'lucide-react'
import { toast } from 'sonner'

// Component Imports
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'

// Helper Imports
import { WORLD_COUNTRIES, type CountryItem } from '@/lib/countries/countries-data'
import { compressImage } from '@/utils/image-compression'
import { useI18n } from '@/hooks/use-i18n'

const PersonalInfo = () => {
  const { t } = useI18n()
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  // Dynamic Countries List State
  const [countriesList, setCountriesList] = useState<CountryItem[]>(WORLD_COUNTRIES)

  // Form State
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [mobile, setMobile] = useState('')
  const [country, setCountry] = useState('US')
  const [line1, setLine1] = useState('')
  const [line2, setLine2] = useState('')
  const [city, setCity] = useState('')
  const [state, setState] = useState('')
  const [postalCode, setPostalCode] = useState('')
  const [gender, setGender] = useState('')
  const [role, setRole] = useState('user')

  // Avatar State
  const [preview, setPreview] = useState<string | null>(null)
  const [avatarUploading, setAvatarUploading] = useState(false)

  // Fetch countries from /api/countries
  useEffect(() => {
    let active = true

    fetch('/api/countries')
      .then(async res => {
        if (!active || !res.ok) return

        const data = (await res.json()) as { ok?: boolean; countries?: CountryItem[] }

        if (data.countries && data.countries.length > 0) {
          setCountriesList(data.countries)
        }
      })
      .catch(() => { })

    return () => {
      active = false
    }
  }, [])

  // Fetch initial profile
  useEffect(() => {
    let active = true

    fetch('/api/user/profile')
      .then(async res => {
        if (!active) return

        if (!res.ok) {
          toast.error('Could not load profile information.')

          return
        }

        const data = (await res.json()) as {
          ok?: boolean
          profile?: {
            firstName: string
            lastName: string
            avatarUrl: string | null
            mobile: string
            country: string
            line1?: string
            line2?: string
            city?: string
            state?: string
            postalCode?: string
            gender: string
            role: string
          }
        }

        if (data.profile) {
          setFirstName(data.profile.firstName ?? '')
          setLastName(data.profile.lastName ?? '')
          setMobile(data.profile.mobile ?? '')
          setCountry(data.profile.country || 'US')
          setLine1(data.profile.line1 ?? '')
          setLine2(data.profile.line2 ?? '')
          setCity(data.profile.city ?? '')
          setState(data.profile.state ?? '')
          setPostalCode(data.profile.postalCode ?? '')
          setGender(data.profile.gender ?? '')
          setRole(data.profile.role || 'user')
          setPreview(data.profile.avatarUrl ?? null)
        }
      })
      .catch(() => {
        if (active) toast.error('Network error loading profile.')
      })
      .finally(() => {
        if (active) setLoading(false)
      })

    return () => {
      active = false
    }
  }, [])

  const handleAvatarSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]

    if (!f) return

    if (!f.type.startsWith('image/')) {
      toast.error('Por favor, selecciona un archivo de imagen válido.')
      e.currentTarget.value = ''

      return
    }

    setAvatarUploading(true)

    try {
      // Auto-compress and resize image client-side to lightweight 512x512 WebP
      const optimizedFile = await compressImage(f, {
        maxWidth: 512,
        maxHeight: 512,
        quality: 0.85,
        cropToSquare: true
      })

      if (optimizedFile.size > 500 * 1024) {
        toast.error('La imagen optimizada aún supera el límite permitido.')

        return
      }

      const formData = new FormData()

      formData.append('file', optimizedFile)

      const response = await fetch('/api/user/avatar', {
        method: 'POST',
        body: formData
      })

      const payload = (await response.json()) as { ok?: boolean; avatarUrl?: string; error?: { message?: string } }

      if (!response.ok || !payload.avatarUrl) {
        toast.error(payload.error?.message ?? 'Error al subir el avatar.')

        return
      }

      setPreview(payload.avatarUrl)
      window.dispatchEvent(new Event('novastore:profile-updated'))
      toast.success('Avatar actualizado con éxito.')
    } catch {
      toast.error('Error de red al subir el avatar.')
    } finally {
      setAvatarUploading(false)
      if (e.target) e.target.value = ''
    }
  }

  const handleRemoveAvatar = async () => {
    setAvatarUploading(true)

    try {
      const response = await fetch('/api/user/avatar', { method: 'DELETE' })

      if (!response.ok) {
        toast.error('Error al eliminar el avatar.')

        return
      }

      setPreview(null)
      if (inputRef.current) inputRef.current.value = ''
      window.dispatchEvent(new Event('novastore:profile-updated'))
      toast.success('Avatar eliminado con éxito.')
    } catch {
      toast.error('Error de red al eliminar el avatar.')
    } finally {
      setAvatarUploading(false)
    }
  }

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setPending(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName,
          lastName,
          mobile,
          country,
          line1,
          line2,
          city,
          state,
          postalCode,
          gender,
          role
        })
      })

      if (!response.ok) {
        toast.error('Error al guardar los cambios del perfil.')

        return
      }

      window.dispatchEvent(new Event('novastore:profile-updated'))
      toast.success('Tu información personal se ha actualizado correctamente.')
    } catch {
      toast.error('Error de red al guardar el perfil.')
    } finally {
      setPending(false)
    }
  }

  const openPicker = () => inputRef.current?.click()

  const selectedCountry = countriesList.find(c => c.value.toLowerCase() === country.toLowerCase()) ||
    countriesList.find(c => c.label.toLowerCase() === country.toLowerCase()) ||
    countriesList.find(c => c.value === 'US')

  if (loading) {
    return (
      <div className='grid grid-cols-1 gap-10 lg:grid-cols-3'>
        <div className='flex flex-col space-y-1'>
          <h3 className='text-base font-semibold'>{t('userSettings.personalInfoTitle')}</h3>
          <p className='text-muted-foreground text-sm'>{t('userSettings.personalInfoDesc')}</p>
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
        <h3 className='text-base font-semibold'>{t('userSettings.personalInfoTitle')}</h3>
        <p className='text-muted-foreground text-sm'>{t('userSettings.personalInfoDesc')}</p>
      </div>

      {/* Content */}
      <div className='space-y-6 lg:col-span-2'>
        <form onSubmit={handleSave} className='mx-auto space-y-6'>
          {/* Avatar Upload */}
          <div className='w-full space-y-2'>
            <Label>{t('userSettings.yourAvatar')}</Label>
            <div className='flex items-center gap-4'>
              <div
                role='button'
                tabIndex={0}
                aria-label={t('userSettings.uploadAvatar')}
                onClick={openPicker}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    openPicker()
                  }
                }}
                className='flex h-20 w-20 cursor-pointer items-center justify-center overflow-hidden rounded-full border border-dashed hover:opacity-95'
              >
                {avatarUploading ? (
                  <Loader2Icon className='size-6 animate-spin text-muted-foreground' />
                ) : preview ? (
                  <img src={preview} alt={t('userSettings.avatar') || 'Foto de perfil'} className='h-full w-full object-cover' />
                ) : (
                  <ImageIcon />
                )}
              </div>

              <div className='flex items-center gap-2'>
                <input ref={inputRef} type='file' accept='image/*' className='hidden' onChange={handleAvatarSelect} />
                <Button
                  type='button'
                  variant='outline'
                  onClick={openPicker}
                  disabled={avatarUploading}
                  className='flex items-center gap-2'
                >
                  <UploadCloudIcon />
                  {t('userSettings.uploadAvatar')}
                </Button>
                <Button
                  type='button'
                  variant='ghost'
                  onClick={handleRemoveAvatar}
                  disabled={!preview || avatarUploading}
                  className='text-destructive!'
                >
                  <Trash2Icon />
                </Button>
              </div>
            </div>
            <p className='text-muted-foreground text-sm'>{t('userSettings.avatarConstraint')}</p>
          </div>

          <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='firstName'>{t('userSettings.firstName')}</Label>
              <Input
                id='firstName'
                value={firstName}
                onChange={e => setFirstName(e.target.value)}
                placeholder='John'
              />
            </div>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='lastName'>{t('userSettings.lastName')}</Label>
              <Input
                id='lastName'
                value={lastName}
                onChange={e => setLastName(e.target.value)}
                placeholder='Doe'
              />
            </div>
            <div className='flex flex-col items-start gap-2'>
              <Label htmlFor='mobile'>{t('userSettings.mobile')}</Label>
              <Input
                id='mobile'
                type='tel'
                value={mobile}
                onChange={e => setMobile(e.target.value)}
                placeholder='+1 (555) 123-4567'
              />
            </div>

            {/* Standard Country Select Component matching Gender & Role 100% */}
            <div className='flex flex-col items-start gap-2 w-full'>
              <Label htmlFor='country'>{t('userSettings.country')}</Label>
              <Select value={country} onValueChange={v => setCountry(v ?? 'US')}>
                <SelectTrigger id='country' className='w-full'>
                  <SelectValue placeholder={t('userSettings.selectCountry')}>
                    {selectedCountry ? (
                      <span className='flex items-center gap-2 truncate'>
                        <img src={selectedCountry.flag} alt={selectedCountry.label} className='h-3.5 w-5 shrink-0 rounded-xs object-cover' />
                        <span className='truncate'>{selectedCountry.label}</span>
                      </span>
                    ) : (
                      <span>{t('userSettings.selectCountry')}</span>
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false} className='max-h-60 overflow-y-auto'>
                  <SelectGroup>
                    {countriesList.map(c => (
                      <SelectItem key={c.value} value={c.value}>
                        <div className='flex items-center gap-2'>
                          <img src={c.flag} alt={c.label} className='h-3.5 w-5 shrink-0 rounded-xs object-cover' />
                          <span className='truncate'>{c.label}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='gender'>{t('userSettings.gender')}</Label>
              <Select value={gender} onValueChange={v => setGender(v ?? '')}>
                <SelectTrigger id='gender' className='w-full'>
                  <SelectValue placeholder={t('userSettings.selectGender')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='male'>{t('userSettings.genderMale')}</SelectItem>
                    <SelectItem value='female'>{t('userSettings.genderFemale')}</SelectItem>
                    <SelectItem value='other'>{t('userSettings.genderOther')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>

            <div className='space-y-2'>
              <Label htmlFor='role'>{t('userSettings.role')}</Label>
              <Select value={role} onValueChange={v => setRole(v ?? '')}>
                <SelectTrigger id='role' className='w-full'>
                  <SelectValue placeholder={t('users.selectRole')} />
                </SelectTrigger>
                <SelectContent>
                  <SelectGroup>
                    <SelectItem value='admin'>{t('roles.roleAdmin')}</SelectItem>
                    <SelectItem value='user'>{t('roles.roleMember')}</SelectItem>
                    <SelectItem value='other'>{t('userSettings.genderOther')}</SelectItem>
                  </SelectGroup>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Billing & Residential Address Subsection */}
          <div className='pt-2'>
            <Separator className='my-6' />
            <div className='mb-4 space-y-1'>
              <h4 className='text-sm font-semibold text-foreground'>{t('userSettings.billingAddressTitle')}</h4>
              <p className='text-xs text-muted-foreground'>
                {t('userSettings.billingAddressDesc')}
              </p>
            </div>

            <div className='grid grid-cols-1 gap-6 sm:grid-cols-2'>
              <div className='flex flex-col items-start gap-2 sm:col-span-2'>
                <Label htmlFor='line1'>{t('userSettings.addressLine1')}</Label>
                <Input
                  id='line1'
                  value={line1}
                  onChange={e => setLine1(e.target.value)}
                  placeholder={t('userSettings.addressLine1')}
                />
              </div>

              <div className='flex flex-col items-start gap-2 sm:col-span-2'>
                <Label htmlFor='line2'>{t('userSettings.addressLine2')}</Label>
                <Input
                  id='line2'
                  value={line2}
                  onChange={e => setLine2(e.target.value)}
                  placeholder={t('userSettings.addressLine2')}
                />
              </div>

              <div className='flex flex-col items-start gap-2'>
                <Label htmlFor='city'>{t('userSettings.city')}</Label>
                <Input
                  id='city'
                  value={city}
                  onChange={e => setCity(e.target.value)}
                  placeholder={t('userSettings.city')}
                />
              </div>

              <div className='flex flex-col items-start gap-2'>
                <Label htmlFor='state'>{t('userSettings.stateProvince')}</Label>
                <Input
                  id='state'
                  value={state}
                  onChange={e => setState(e.target.value)}
                  placeholder={t('userSettings.stateProvince')}
                />
              </div>

              <div className='flex flex-col items-start gap-2'>
                <Label htmlFor='postalCode'>{t('userSettings.postalCode')}</Label>
                <Input
                  id='postalCode'
                  value={postalCode}
                  onChange={e => setPostalCode(e.target.value)}
                  placeholder={t('userSettings.postalCode')}
                />
              </div>
            </div>
          </div>

          <div className='flex justify-end pt-2'>
            <Button type='submit' className='max-sm:w-full' disabled={pending}>
              {pending ? t('common.saving') : t('userSettings.saveChanges')}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default PersonalInfo
