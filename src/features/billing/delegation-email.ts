import { getApplicationUrl } from '@/lib/billing/config'
import { sendResendEmail } from '@/lib/email/resend'

interface PurchaseDelegationEmailInput {
  email: string
  recipientName: string
  granterName: string
  workspaceName: string
  tenantName: string
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function sendPurchaseDelegationEmail(input: PurchaseDelegationEmailInput): Promise<void> {
  const applicationUrl = getApplicationUrl()
  const pricingUrl = `${applicationUrl}/pages/pricing`
  const logoUrl = `${applicationUrl}/images/brands/novastore_icon_logo_color.png`
  const applicationName = process.env.RESEND_FROM_NAME?.trim() || 'NovaStore'
  const appName = escapeHtml(applicationName)
  const recipientName = escapeHtml(input.recipientName)
  const granterName = escapeHtml(input.granterName)
  const workspaceName = escapeHtml(input.workspaceName)
  const tenantName = escapeHtml(input.tenantName)
  const safePricingUrl = escapeHtml(pricingUrl)

  await sendResendEmail({
    to: input.email,
    subject: `Autorización de compra delegada en ${input.workspaceName} — ${applicationName}`,
    html: `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Autorización de compra delegada en ${workspaceName}</title>
        </head>
        <body style="margin:0;background:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
            ${appName}: has sido autorizado por ${granterName} para gestionar compras en el espacio de trabajo ${workspaceName}.
          </div>
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;">
            <tr>
              <td align="center" style="padding:32px 16px;">
                <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;background:#18181b;border:1px solid #27272a;border-radius:12px;overflow:hidden;">
                  <tr>
                    <td style="padding:32px 32px 24px;border-bottom:1px solid #27272a;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:36px;height:36px;border-radius:8px;background:#27272a;text-align:center;vertical-align:middle;">
                            <img src="${escapeHtml(logoUrl)}" width="36" height="36" alt="${appName}" style="display:block;border:0;border-radius:8px;">
                          </td>
                          <td style="padding-left:12px;font-size:18px;font-weight:600;color:#fafafa;">
                            ${appName}
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:32px;">
                      <h1 style="margin:0 0 16px;font-size:22px;font-weight:700;color:#ffffff;line-height:1.3;">
                        Permiso de compra delegado
                      </h1>
                      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#a1a1aa;">
                        Hola <strong style="color:#ffffff;">${recipientName}</strong>,
                      </p>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#a1a1aa;">
                        <strong style="color:#ffffff;">${granterName}</strong> te ha autorizado formalmente para realizar y gestionar compras de suscripciones, renovaciones y planes para el espacio de trabajo <strong style="color:#ffffff;">${workspaceName}</strong> de la organización <strong style="color:#ffffff;">${tenantName}</strong>.
                      </p>
                      <div style="background:#27272a;border-radius:8px;padding:16px 20px;margin-bottom:28px;">
                        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#fafafa;text-transform:uppercase;letter-spacing:0.5px;">
                          Facultades habilitadas:
                        </p>
                        <ul style="margin:0;padding-left:20px;color:#d4d4d8;font-size:14px;line-height:1.6;">
                          <li>Contratar y actualizar planes de suscripción para el espacio de trabajo.</li>
                          <li>Adquirir paquetes y cuotas de investigación adicionales.</li>
                          <li>Gestionar pagos y renovaciones en la pasarela de facturación.</li>
                        </ul>
                      </div>
                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                        <tr>
                          <td align="center" style="border-radius:8px;background:#3b82f6;">
                            <a href="${safePricingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                              Explorar Planes y Suscripciones
                            </a>
                          </td>
                        </tr>
                      </table>
                      <p style="margin:0;font-size:12px;color:#71717a;line-height:1.5;">
                        Si consideras que recibiste este correo por error o necesitas revocar este permiso, puedes contactar directamente al propietario de tu espacio de trabajo.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px;background:#121215;border-top:1px solid #27272a;font-size:12px;color:#71717a;text-align:center;">
                      © ${new Date().getFullYear()} ${appName} — DGTECNOVA SRL. Todos los derechos reservados.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `,
    text: `
Hola ${input.recipientName},

${input.granterName} te ha autorizado formalmente para realizar compras de suscripciones, renovaciones y planes para el espacio de trabajo "${input.workspaceName}" (${input.tenantName}) en ${applicationName}.

Facultades habilitadas:
- Contratar y actualizar planes de suscripción para el espacio de trabajo.
- Adquirir paquetes y cuotas de investigación adicionales.
- Gestionar pagos y renovaciones en la pasarela de facturación.

Puedes acceder a la sección de planes en el siguiente enlace:
${pricingUrl}

© ${new Date().getFullYear()} ${applicationName} — DGTECNOVA SRL.
    `.trim()
  })
}
