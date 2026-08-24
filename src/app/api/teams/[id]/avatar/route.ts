// POST /api/teams/[id]/avatar
//
// Handles team avatar uploads using Supabase Storage (500KB limit).
import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

const MAX_AVATAR_SIZE_BYTES = 500 * 1024 // 500KB limit

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const { id: teamId } = await context.params
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
    const filePath = `teams/${teamId}/avatar.${fileExt}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // Upload to Supabase Storage ('avatars' bucket)
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: true
    })

    let avatarUrl: string

    if (uploadError) {
      logger.warn('Storage upload fallback to local directory for team avatar', {
        action: 'api.teams.avatar.fallback',
        details: { error: uploadError.message }
      })

      const fs = await import('fs/promises')
      const path = await import('path')
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'teams')

      await fs.mkdir(uploadsDir, { recursive: true })
      const localFilePath = path.join(uploadsDir, `${teamId}.${fileExt}`)

      await fs.writeFile(localFilePath, fileBuffer)
      avatarUrl = `/uploads/teams/${teamId}.${fileExt}?v=${Date.now()}`
    } else {
      const {
        data: { publicUrl }
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      avatarUrl = `${publicUrl}?v=${Date.now()}`
    }

    // Update team in database
    const { error: updateError } = await supabase
      .from('teams')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', teamId)

    if (updateError) {
      throw AuthError.internal('No se pudo actualizar el avatar del equipo en la base de datos.')
    }

    return NextResponse.json({ ok: true, avatarUrl })
  } catch (error) {
    return handleRouteError(error)
  }
}
