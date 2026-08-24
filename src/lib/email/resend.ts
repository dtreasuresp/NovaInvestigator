interface SendEmailInput {
  to: string
  subject: string
  html: string
  text: string
}

export class ResendDeliveryError extends Error {
  constructor() {
    super('Resend no pudo entregar el correo.')
    this.name = 'ResendDeliveryError'
  }
}

const RESEND_TIMEOUT_MS = 10_000

function getResendConfig(): { apiKey: string; from: string } {
  const apiKey = process.env.RESEND_API_KEY?.trim()
  const fromEmail = process.env.RESEND_FROM_EMAIL?.trim()
  const fromName = process.env.RESEND_FROM_NAME?.trim()

  if (!apiKey || !fromEmail) {
    throw new ResendDeliveryError()
  }

  return {
    apiKey,
    from: fromName ? `${fromName} <${fromEmail}>` : fromEmail
  }
}

export async function sendResendEmail(input: SendEmailInput): Promise<void> {
  const config = getResendConfig()
  const controller = new AbortController()
  const timeoutId = setTimeout(() => controller.abort(), RESEND_TIMEOUT_MS)

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        from: config.from,
        to: [input.to],
        subject: input.subject,
        html: input.html,
        text: input.text
      }),
      signal: controller.signal
    })

    if (!response.ok) {
      throw new ResendDeliveryError()
    }
  } catch (error) {
    if (error instanceof ResendDeliveryError) {
      throw error
    }

    throw new ResendDeliveryError()
  } finally {
    clearTimeout(timeoutId)
  }
}
