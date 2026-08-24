// POST / DELETE /api/workspace/avatar
//
// Handles workspace logo uploads and removal using Supabase Storage (500KB limit).
import { NextResponse } from 'next/server'

import { createSupabaseServerClient } from '@/lib/supabase/server'
import { AuthError, handleRouteError } from '@/app/api/auth/_lib/http'
import { logger } from '@/lib/logger'

const MAX_LOGO_SIZE_BYTES = 500 * 1024 // 500KB limit

async function getActiveWorkspace(supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>) {
  const {
    data: { user }
  } = await supabase.auth.getUser()

  if (!user) {
    throw AuthError.authRequired()
  }

  const { data: profile } = await supabase.from('profiles').select('primary_tenant_id').eq('id', user.id).maybeSingle()

  if (!profile?.primary_tenant_id) {
    throw AuthError.primaryTenantUnavailable()
  }

  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, tenant_id, avatar_url')
    .eq('tenant_id', profile.primary_tenant_id)
    .eq('status', 'active')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  if (!workspace) {
    throw AuthError.internal('No se encontró un espacio de trabajo activo.')
  }

  return { user, workspace }
}

export async function POST(request: Request) {
  try {
    const supabase = await createSupabaseServerClient()
    const { workspace } = await getActiveWorkspace(supabase)

    const formData = await request.formData()
    const file = formData.get('file') as File | null

    if (!file) {
      throw AuthError.validation('No se proporcionó ningún archivo de imagen.')
    }

    if (!file.type.startsWith('image/')) {
      throw AuthError.validation('El archivo debe ser una imagen válida (PNG, JPG, WebP, GIF).')
    }

    if (file.size > MAX_LOGO_SIZE_BYTES) {
      throw AuthError.validation('El archivo de imagen no debe superar los 500KB.')
    }

    const ext = file.name.split('.').pop()?.toLowerCase() || 'png'
    const allowedExtensions = ['png', 'jpg', 'jpeg', 'webp', 'gif', 'svg']
    const fileExt = allowedExtensions.includes(ext) ? ext : 'png'
    const filePath = `workspaces/${workspace.id}/logo.${fileExt}`
    const fileBuffer = Buffer.from(await file.arrayBuffer())

    // 1. Purge any existing logo files with other extensions to prevent orphaned storage objects
    const staleFilePaths = allowedExtensions
      .map(e => `workspaces/${workspace.id}/logo.${e}`)
      .filter(p => p !== filePath)

    await supabase.storage.from('avatars').remove(staleFilePaths)

    // 2. Upload to Supabase Storage ('avatars' bucket)
    const { error: uploadError } = await supabase.storage.from('avatars').upload(filePath, fileBuffer, {
      contentType: file.type,
      upsert: true
    })

    let avatarUrl: string

    if (uploadError) {
      logger.warn('Storage upload fallback to local directory for workspace logo', {
        action: 'api.workspace.avatar.fallback',
        details: { error: uploadError.message }
      })

      const fs = await import('fs/promises')
      const path = await import('path')
      const uploadsDir = path.join(process.cwd(), 'public', 'uploads', 'workspaces')

      await fs.mkdir(uploadsDir, { recursive: true })
      const localFilePath = path.join(uploadsDir, `${workspace.id}.${fileExt}`)

      await fs.writeFile(localFilePath, fileBuffer)
      avatarUrl = `/uploads/workspaces/${workspace.id}.${fileExt}?v=${Date.now()}`
    } else {
      const {
        data: { publicUrl }
      } = supabase.storage.from('avatars').getPublicUrl(filePath)

      avatarUrl = `${publicUrl}?v=${Date.now()}`
    }

    // Update workspace in database
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        avatar_url: avatarUrl,
        updated_at: new Date().toISOString()
      })
      .eq('id', workspace.id)

    if (updateError) {
      throw AuthError.internal('No se pudo actualizar el logo en la base de datos.')
    }

    return NextResponse.json({ ok: true, avatarUrl })
  } catch (error) {
    return handleRouteError(error)
  }
}

export async function DELETE() {
  try {
    const supabase = await createSupabaseServerClient()
    const { workspace } = await getActiveWorkspace(supabase)

    // Remove from storage
    await supabase.storage.from('avatars').remove([
      `workspaces/${workspace.id}/logo.png`,
      `workspaces/${workspace.id}/logo.jpg`,
      `workspaces/${workspace.id}/logo.jpeg`,
      `workspaces/${workspace.id}/logo.webp`
    ])

    // Clear avatar_url in database
    const { error: updateError } = await supabase
      .from('workspaces')
      .update({
        avatar_url: null,
        updated_at: new Date().toISOString()
      })
      .eq('id', workspace.id)

    if (updateError) {
      throw AuthError.internal('No se pudo eliminar el logo del espacio de trabajo.')
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    return handleRouteError(error)
  }
}
