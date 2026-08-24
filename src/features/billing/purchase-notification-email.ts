import { getApplicationUrl } from '@/lib/billing/config'
import { sendResendEmail } from '@/lib/email/resend'

export interface DelegatedPurchaseNotificationInput {
  ownerEmail: string
  ownerName: string
  buyerName: string
  buyerEmail: string
  workspaceName: string
  tenantName: string
  previousPlanName: string | null
  newPlanName: string
  amountFormatted: string
  operationType: 'upgrade' | 'downgrade' | 'renewal' | 'new_subscription'
  featuresSummary?: string[]
}

function escapeHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')
}

export async function sendPurchaseNotificationToOwnerEmail(input: DelegatedPurchaseNotificationInput): Promise<void> {
  const applicationUrl = getApplicationUrl()
  const billingUrl = `${applicationUrl}/pages/user-settings?setting=billing`
  const logoUrl = `${applicationUrl}/images/brands/novastore_icon_logo_color.png`
  const applicationName = process.env.RESEND_FROM_NAME?.trim() || 'NovaStore'
  const appName = escapeHtml(applicationName)
  const ownerName = escapeHtml(input.ownerName)
  const buyerName = escapeHtml(input.buyerName)
  const buyerEmail = escapeHtml(input.buyerEmail)
  const workspaceName = escapeHtml(input.workspaceName)
  const tenantName = escapeHtml(input.tenantName)
  const newPlanName = escapeHtml(input.newPlanName)
  const previousPlanName = input.previousPlanName ? escapeHtml(input.previousPlanName) : null
  const amountFormatted = escapeHtml(input.amountFormatted)
  const safeBillingUrl = escapeHtml(billingUrl)

  const operationBadge =
    input.operationType === 'upgrade'
      ? '<span style="display:inline-block;padding:3px 8px;font-size:12px;font-weight:600;color:#22c55e;background:#14532d;border-radius:4px;">Mejora de Plan (Upgrade)</span>'
      : input.operationType === 'downgrade'
        ? '<span style="display:inline-block;padding:3px 8px;font-size:12px;font-weight:600;color:#eab308;background:#713f12;border-radius:4px;">Reducción de Plan (Downgrade)</span>'
        : input.operationType === 'renewal'
          ? '<span style="display:inline-block;padding:3px 8px;font-size:12px;font-weight:600;color:#38bdf8;background:#0c4a6e;border-radius:4px;">Asunción / Renovación de Pago</span>'
          : '<span style="display:inline-block;padding:3px 8px;font-size:12px;font-weight:600;color:#a855f7;background:#581c87;border-radius:4px;">Nueva Suscripción</span>'

  const operationLabel =
    input.operationType === 'upgrade'
      ? 'Mejora de Plan (Upgrade)'
      : input.operationType === 'downgrade'
        ? 'Reducción de Plan (Downgrade)'
        : input.operationType === 'renewal'
          ? 'Asunción / Renovación de Pago'
          : 'Nueva Suscripción'

  await sendResendEmail({
    to: input.ownerEmail,
    subject: `[${applicationName}] Actualización de suscripción en ${input.workspaceName} por ${input.buyerName}`,
    html: `
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Actualización de suscripción en ${workspaceName}</title>
        </head>
        <body style="margin:0;background:#09090b;color:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
          <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
            ${appName}: ${buyerName} ha realizado una compra de suscripción para ${workspaceName}.
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
                        Actualización de Suscripción en tu Espacio de Trabajo
                      </h1>
                      <p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#a1a1aa;">
                        Hola <strong style="color:#ffffff;">${ownerName}</strong>,
                      </p>
                      <p style="margin:0 0 20px;font-size:15px;line-height:1.6;color:#a1a1aa;">
                        Te informamos que el usuario delegado <strong style="color:#ffffff;">${buyerName}</strong> (${buyerEmail}) ha completado una compra de suscripción para el espacio de trabajo <strong style="color:#ffffff;">${workspaceName}</strong> en la organización <strong style="color:#ffffff;">${tenantName}</strong>.
                      </p>

                      <div style="background:#27272a;border-radius:8px;padding:20px;margin-bottom:24px;">
                        <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#fafafa;text-transform:uppercase;letter-spacing:0.5px;">
                          Detalle de la transacción:
                        </p>
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="font-size:14px;color:#d4d4d8;line-height:1.8;">
                          <tr>
                            <td style="color:#a1a1aa;padding:4px 0;width:40%;">Operación:</td>
                            <td style="padding:4px 0;font-weight:500;">${operationBadge}</td>
                          </tr>
                          ${
                            previousPlanName
                              ? `<tr>
                                  <td style="color:#a1a1aa;padding:4px 0;">Plan anterior:</td>
                                  <td style="padding:4px 0;font-weight:500;">${previousPlanName}</td>
                                </tr>`
                              : ''
                          }
                          <tr>
                            <td style="color:#a1a1aa;padding:4px 0;">Nuevo plan activo:</td>
                            <td style="padding:4px 0;font-weight:700;color:#ffffff;">${newPlanName}</td>
                          </tr>
                          <tr>
                            <td style="color:#a1a1aa;padding:4px 0;">Importe:</td>
                            <td style="padding:4px 0;font-weight:600;color:#ffffff;">${amountFormatted}</td>
                          </tr>
                          <tr>
                            <td style="color:#a1a1aa;padding:4px 0;">Comprador / Pagador:</td>
                            <td style="padding:4px 0;">${buyerName} (${buyerEmail})</td>
                          </tr>
                        </table>
                      </div>

                      <div style="background:#18181b;border:1px solid #3f3f46;border-radius:8px;padding:16px;margin-bottom:24px;">
                        <p style="margin:0 0 8px;font-size:13px;font-weight:600;color:#22c55e;">
                          🔒 Garantía de no duplicidad de cobros &amp; Propiedad intacta
                        </p>
                        <p style="margin:0;font-size:13px;color:#a1a1aa;line-height:1.5;">
                          Si tu método de pago estaba vinculado a la suscripción anterior de este espacio, ha sido desvinculado automáticamente para evitar cobros dobles. A partir de ahora el pago recurrente recae en el comprador delegado. <strong style="color:#ffffff;">Sigues siendo el Propietario (Owner)</strong> de tu organización y conservas todos tus accesos y facultades de administración.
                        </p>
                      </div>

                      <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 0 24px;">
                        <tr>
                          <td align="center" style="border-radius:8px;background:#3b82f6;">
                            <a href="${safeBillingUrl}" target="_blank" rel="noopener noreferrer" style="display:inline-block;padding:12px 24px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:8px;">
                              Ver Facturación del Workspace
                            </a>
                          </td>
                        </tr>
                      </table>
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
Hola ${input.ownerName},

Te informamos que ${input.buyerName} (${input.buyerEmail}) ha completado una compra de suscripción para el espacio de trabajo "${input.workspaceName}" (${input.tenantName}) en ${applicationName}.

Detalle de la transacción:
- Tipo de operación: ${operationLabel}
${input.previousPlanName ? `- Plan anterior: ${input.previousPlanName}\n` : ''}- Nuevo plan activo: ${input.newPlanName}
- Importe: ${input.amountFormatted}
- Pagador: ${input.buyerName} (${input.buyerEmail})

Gobernanza y facturación:
- Tu método de pago anterior ha sido desvinculado del cobro automático para evitar duplicidad de cargos.
- Sigues siendo el Propietario (Owner) de la organización con todas tus facultades administrativas.

Puedes revisar los detalles de facturación en:
${billingUrl}

© ${new Date().getFullYear()} ${applicationName} — DGTECNOVA SRL.
    `.trim()
  })
}
