'use client'

// React Imports
import { useEffect } from 'react'

// Third-party Imports
import { zodResolver } from '@hookform/resolvers/zod'
import { Controller, useForm } from 'react-hook-form'
import * as z from 'zod'

// Type Imports
import { SYSTEM_MEMBER_ROLE_KEYS } from '@/features/users/types'
import type { TenantMemberSummary, TenantWorkspaceSummary } from '@/features/users/types'

// Component Imports
import { Button } from '@/components/ui/button'
import { Field, FieldDescription, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from '@/components/ui/sheet'

// Hook Imports
import { membershipStatusToUiStatus } from '@/hooks/use-user-app'
import type { InviteMemberInput, UpdateMemberRoleInput } from '@/hooks/use-user-app'

const inviteFormSchema = z.object({
  email: z.string().min(1, 'El correo es obligatorio.').email('Introduce un correo válido.'),
  roleKey: z.string().min(1, 'Selecciona un rol.'),
  workspaceId: z.string().uuid('Selecciona un workspace.')
})

const editFormSchema = z.object({
  roleKey: z.string().min(1, 'Selecciona un rol.')
})

type InviteFormValues = z.infer<typeof inviteFormSchema>
type EditFormValues = z.infer<typeof editFormSchema>

export interface ManageMemberSheetProps {
  mode: 'add' | 'edit' | null
  member: TenantMemberSummary | null
  submitting?: boolean
  workspaces: TenantWorkspaceSummary[]
  workspacesLoading?: boolean
  onClose: () => void
  onInvite: (data: InviteMemberInput) => Promise<boolean>
  onUpdateRole: (member: TenantMemberSummary, data: UpdateMemberRoleInput) => Promise<boolean>
}

// Invitations create a pending membership only — never a full auth.users row
// or password (see doc/plans/PLAN_MAESTRO_SUPABASE_BILLING_ACCESS_2026-08-07.md
// section 15.5). Editing an existing member only changes their tenant role;
// name/email are owned by Supabase Auth/the member's own profile, not by this
// admin surface. This intentionally replaces
// src/views/apps/users/dialogs/add-edit-user-sheet.tsx for the real,
// tenant-scoped member list — that file keeps serving the unrelated, still
// fake profile-editing flow under src/views/apps/users/view/*.
export function ManageMemberSheet({
  mode,
  member,
  submitting,
  workspaces,
  workspacesLoading = false,
  onClose,
  onInvite,
  onUpdateRole
}: ManageMemberSheetProps) {
  const inviteForm = useForm<InviteFormValues>({
    resolver: zodResolver(inviteFormSchema),
    defaultValues: { email: '', roleKey: 'viewer', workspaceId: '' }
  })

  const editForm = useForm<EditFormValues>({
    resolver: zodResolver(editFormSchema),
    defaultValues: { roleKey: 'viewer' }
  })

  useEffect(() => {
    if (mode === 'add') {
      inviteForm.reset({ email: '', roleKey: 'viewer', workspaceId: workspaces[0]?.id ?? '' })
    }

    if (mode === 'edit' && member) {
      editForm.reset({ roleKey: member.roleKey })
    }
  }, [editForm, inviteForm, member, mode, workspaces])

  const handleInviteSubmit = async (values: InviteFormValues) => {
    const success = await onInvite({ email: values.email, roleKey: values.roleKey, workspaceId: values.workspaceId })

    if (success) inviteForm.reset({ email: '', roleKey: 'viewer', workspaceId: workspaces[0]?.id ?? '' })
  }

  const handleEditSubmit = async (values: EditFormValues) => {
    if (!member) return
    await onUpdateRole(member, { roleKey: values.roleKey })
  }

  return (
    <Sheet open={mode !== null} onOpenChange={open => !open && onClose()}>
      <SheetContent side='right' className='w-full overflow-y-auto sm:max-w-[420px]'>
        <SheetHeader className='pb-0'>
          <SheetTitle className='text-lg font-medium'>
            {mode === 'edit' ? 'Edit Member Role' : 'Invite New User'}
          </SheetTitle>
        </SheetHeader>

        {mode === 'add' ? (
          <form onSubmit={inviteForm.handleSubmit(handleInviteSubmit)} className='flex flex-col gap-4 px-4 pb-4'>
            <FieldGroup className='gap-4'>
              <Controller
                name='email'
                control={inviteForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className='gap-2'>
                    <FieldLabel htmlFor={field.name}>Email</FieldLabel>
                    <Input
                      {...field}
                      id={field.name}
                      type='email'
                      placeholder='name@example.com'
                      aria-invalid={fieldState.invalid}
                    />
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />

              <Controller
                name='workspaceId'
                control={inviteForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className='gap-2'>
                    <FieldLabel htmlFor='invite-workspace'>Workspace</FieldLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={workspacesLoading || workspaces.length === 0}
                    >
                      <SelectTrigger id='invite-workspace' className='w-full'>
                        <SelectValue>
                          {workspaces.find(workspace => workspace.id === field.value)?.name ??
                            (workspacesLoading ? 'Loading workspaces...' : 'Select a workspace')}
                        </SelectValue>
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {workspaces.map(workspace => (
                            <SelectItem key={workspace.id} value={workspace.id}>
                              {workspace.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    {!workspacesLoading && workspaces.length === 0 ? (
                      <FieldDescription>No active workspaces are available for this tenant.</FieldDescription>
                    ) : null}
                  </Field>
                )}
              />

              <Controller
                name='roleKey'
                control={inviteForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className='gap-2'>
                    <FieldLabel htmlFor='invite-role'>Role</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id='invite-role' className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {SYSTEM_MEMBER_ROLE_KEYS.map(role => (
                            <SelectItem key={role} value={role} className='capitalize'>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                    <FieldDescription>
                      An invitation link is created; the account is only activated once accepted.
                    </FieldDescription>
                  </Field>
                )}
              />
            </FieldGroup>

            <SheetFooter className='px-0 sm:flex-row'>
              <Button type='button' variant='outline' onClick={onClose} className='sm:flex-1'>
                Cancel
              </Button>
              <Button
                type='submit'
                className='sm:flex-1'
                disabled={submitting || workspacesLoading || workspaces.length === 0}
              >
                Send Invitation
              </Button>
            </SheetFooter>
          </form>
        ) : null}

        {mode === 'edit' && member ? (
          <form onSubmit={editForm.handleSubmit(handleEditSubmit)} className='flex flex-col gap-4 px-4 pb-4'>
            <FieldGroup className='gap-4'>
              <Field className='gap-2'>
                <FieldLabel>Name</FieldLabel>
                <Input value={member.name} disabled readOnly />
              </Field>

              <Field className='gap-2'>
                <FieldLabel>Email</FieldLabel>
                <Input value={member.email ?? '—'} disabled readOnly />
                <FieldDescription>
                  Email is managed by the member&apos;s own account, not by this form.
                </FieldDescription>
              </Field>

              <Field className='gap-2'>
                <FieldLabel>Status</FieldLabel>
                <Input value={membershipStatusToUiStatus(member.status)} disabled readOnly />
              </Field>

              <Controller
                name='roleKey'
                control={editForm.control}
                render={({ field, fieldState }) => (
                  <Field data-invalid={fieldState.invalid} className='gap-2'>
                    <FieldLabel htmlFor='edit-role'>Role</FieldLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <SelectTrigger id='edit-role' className='w-full'>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent alignItemWithTrigger={false}>
                        <SelectGroup>
                          {SYSTEM_MEMBER_ROLE_KEYS.map(role => (
                            <SelectItem key={role} value={role} className='capitalize'>
                              {role}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                    {fieldState.invalid ? <FieldError errors={[fieldState.error]} /> : null}
                  </Field>
                )}
              />
            </FieldGroup>

            <SheetFooter className='px-0 sm:flex-row'>
              <Button type='button' variant='outline' onClick={onClose} className='sm:flex-1'>
                Cancel
              </Button>
              <Button type='submit' className='sm:flex-1' disabled={submitting}>
                Save Changes
              </Button>
            </SheetFooter>
          </form>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
