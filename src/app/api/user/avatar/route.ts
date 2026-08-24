// POST / DELETE /api/user/avatar
//
// Handles avatar image uploads and removal for the authenticated user.
import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

const MAX_AVATAR_SIZE_BYTES = 500 * 1024 // 500KB limit

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      throw AuthError.validation('No se proporcionó ningún archivo de imagen.')
    }

    if (!file.type.startsWith('image/')) {
      throw AuthError.validation('El archivo debe ser una imagen válida (PNG, JPG, WebP, GIF).')
    }

    if (file.size > MAX_AVATAR_SIZE_BYTES) {
      throw AuthError.validation('El archivo de imagen no debe superar los 500KB.')
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif']
    const fileExt = allowedExtensions.includes(ext) ? ext : 'png'
    const filePath = `users/${user.id}/avatar.${fileExt}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // 1. Purge any existing avatar files with other extensions to prevent orphaned storage objects
    const staleFilePaths = allowedExtensions
      .map(e => `users/${user.id}/avatar.${e}`)
      .filter(p => p !== filePath)

    await supabase.storage.from('avatars').remove(staleFilePaths)

    // 2. Upload to Supabase Storage ('avatars' bucket) with upsert
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: true
    })

    let avatarUrl: string

    if (uploadError) {
      // Fallback: save to public/uploads/users if storage bucket unavailable
      const fs = await import('fs/promises')
      const path = await import('path')
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'users')

      await fs.mkdir(uploadsDir, { recursive: true })
      const localFilePath = path.join(uploadsDir, `${user.id}.${fileExt}`)

      await fs.writeFile(localFilePath, fileBuffer)
      avatarUrl = `/uploads/users/${user.id}.${fileExt}?v=${Date.now()}`
    } else {
      const {
        data: { publicUrl }
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      avatarUrl = `${publicUrl}?v=${Date.now()}`
    }

    // 2. Persist ONLY the lightweight URL in the profiles table (approx 80 bytes)
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      logger.error('Failed to update avatar_url in profiles', {
        action: 'api.user.avatar.update',
        details: { error: profileError.message }
      })
      throw AuthError.internal('No se pudo actualizar el avatar en el perfil.')
    }

    // 3. Guarantee auth user_metadata stays clean without bloated strings
    const nextMeta = { ...(user.user_metadata ?? {}) }

    nextMeta.avatarUrl = null
    nextMeta.avatar_url = null
    await supabase.auth.updateUser({
      data: nextMeta
    })

    return NextResponse.json({ ok: true, avatarUrl })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient()

    const {
      data: { user }
    } = await supabase.auth.getUser()

    if (!user) {
      throw AuthError.authRequired()
    }

    // 1. Remove avatar files from Supabase Storage (both new users/ path and legacy path)
    await supabase.storage.from('avatars').remove([
      `users/${user.id}/avatar.png`,
      `users/${user.id}/avatar.jpg`,
      `users/${user.id}/avatar.jpeg`,
      `users/${user.id}/avatar.webp`,
      `users/${user.id}/avatar.gif`,
      `${user.id}/avatar.png`,
      `${user.id}/avatar.jpg`,
      `${user.id}/avatar.jpeg`,
      `${user.id}/avatar.webp`,
      `${user.id}/avatar.gif`
    ])

    // 2. Clear avatar_url in profiles table
    const { error: profileError } = await supabase
      .from('profiles')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (profileError) {
      throw AuthError.internal('No se pudo eliminar el avatar del perfil.')
    }

    // 3. Ensure auth user_metadata is clean
    const nextMeta = { ...(user.user_metadata ?? {}) }

    nextMeta.avatarUrl = null
    nextMeta.avatar_url = null
    await supabase.auth.updateUser({
      data: nextMeta
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
