import { getApplicationUrl } from '@/lib/billing/config'
import { sendResendEmail } from '@/lib/email/resend'

interface InvitationEmailInput {
  token: string
  email: string
  tenantName: string
  workspaceName: string
  roleName: string
  inviterName: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function sendInvitationEmail(input: InvitationEmailInput): Promise<void> {
  const applicationUrl = getApplicationUrl()
  const acceptanceUrl = `${applicationUrl}/pages/auth/invitations/accept?token=${encodeURIComponent(input.token)}`
  const logoUrl = `${applicationUrl}/images/brands/novastore_icon_logo_color.png`
  const applicationName = process.env.RESEND_FROM_NAME?.trim() || 'NovaResearch'
  const appName = escapeHtml(applicationName)
  const tenantName = escapeHtml(input.tenantName)
  const workspaceName = escapeHtml(input.workspaceName)
  const roleName = escapeHtml(input.roleName)
  const inviterName = escapeHtml(input.inviterName)
  const email = escapeHtml(input.email)
  const safeAcceptanceUrl = escapeHtml(acceptanceUrl)

  await sendResendEmail({
    to: input.email,
    subject: `Invitación para unirte a ${input.tenantName} en ${applicationName}`,
    html: `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Invitación para unirte a ${tenantName} en ${appName}</title>
        </head>
        <body style="margin:0;background:#f4f4f5;color:#18181b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
            ${appName}: tienes una invitación pendiente para ${workspaceName} de ${tenantName}.
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;">
                  <tr>
                    <td style="padding:0 4px 20px;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:36px;height:36px;border-radius:10px;background:#18181b;text-align:center;vertical-align:middle;">
                            <img src="${escapeHtml(logoUrl)}" width="36" height="36" alt="" style="display:block;border:0;border-radius:10px;">
                          </td>
                          <td style="padding-left:10px;color:#18181b;font-size:16px;font-weight:700;letter-spacing:-0.01em;">
                            ${appName}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="border:1px solid #e4e4e7;border-radius:12px;background:#ffffff;">
                      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="padding:32px 32px 8px;">
                            <p style="margin:0 0 12px;color:#71717a;font-size:12px;font-weight:700;letter-spacing:0.08em;line-height:1.4;text-transform:uppercase;">
                              Invitación de acceso
                            </p>
                            <h1 style="margin:0;color:#18181b;font-size:28px;font-weight:700;letter-spacing:-0.04em;line-height:1.2;">
                              Invitación para unirte
                            </h1>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:16px 32px 0 32px;">
                            <p style="margin:0;color:#52525b;font-size:16px;line-height:1.65;">
                              Usted ha recibido una invitación de <strong style="color:#18181b;font-weight:600;">${inviterName}</strong> para unirse al espacio de trabajo <strong style="color:#18181b;font-weight:600;">${workspaceName}</strong> de <strong style="color:#18181b;font-weight:600;">${tenantName}</strong> en <strong style="color:#18181b;font-weight:600;">${appName}</strong>, con el rol <strong style="color:#18181b;font-weight:600;">${roleName}</strong>.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:20px 32px 0;">
                            <p style="margin:0;color:#52525b;font-size:16px;line-height:1.65;">
                              Si reconoce quién lo invitó, haga clic en el botón que se muestra a continuación:
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td align="center" style="padding:28px 32px 32px;">
                            <a href="${safeAcceptanceUrl}" style="display:inline-block;border-radius:8px;background:#18181b;padding:12px 18px;color:#fafafa;font-size:14px;font-weight:600;line-height:1.4;text-decoration:none;">
                              Aceptar invitación
                            </a>
                          </td>
                        </tr>
                        <tr>
                          <td style="border-top:1px solid #f4f4f5;padding:20px 32px 28px;">
                            <p style="margin:0 0 10px;color:#71717a;font-size:13px;line-height:1.55;">
                              Este enlace caduca en 7 días y solo funciona para <strong style="color:#52525b;font-weight:600;">${email}</strong>.
                            </p>
                            <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.55;">
                              Si no esperabas esta invitación, puedes ignorar este correo.
                            </p>
                          </td>
                        </tr>
                        <tr>
                          <td style="padding:0 32px 28px;">
                            <p style="margin:0;color:#a1a1aa;font-size:12px;line-height:1.55;">
                              Si el botón no funciona, copia y pega este enlace en tu navegador:
                            </p>
                            <p style="margin:6px 0 0;word-break:break-all;color:#71717a;font-size:12px;line-height:1.55;">
                              ${safeAcceptanceUrl}
                            </p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: [
      `Invitación para unirte a ${input.tenantName} en ${applicationName}`,
      '',
      `Usted ha recibido una invitación de ${input.inviterName} para unirse al espacio de trabajo ${input.workspaceName} de ${input.tenantName} en ${applicationName}, con el rol ${input.roleName}.`,
      'Si reconoce quién lo invitó, haga clic en el siguiente enlace:',
      `Aceptar invitación: ${acceptanceUrl}`,
      '',
      `Este enlace caduca en 7 días y solo funciona para ${input.email}.`,
      'Si no esperabas esta invitación, puedes ignorar este correo.',
      '',
      'Si el botón no funciona, copia y pega este enlace en tu navegador:',
      acceptanceUrl
    ].join('\n')
  })
}
