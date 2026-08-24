export interface AuthIdentityUser {
  readonly is_anonymous?: boolean | null
  readonly email_confirmed_at?: string | null
}

export function isRegisteredConfirmedUser(user: AuthIdentityUser | null | undefined): boolean {
  return user != null && user.is_anonymous !== true && Boolean(user.email_confirmed_at)
}
