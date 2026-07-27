import nodemailer from "nodemailer";
import type { Transporter } from "nodemailer";
import { getAppUrl } from "@/lib/utils";

const FROM = process.env.SMTP_FROM ?? "Electronic LP <electroniclpok@gmail.com>";
const STORE = "Electronic LP";
const BASE_URL = getAppUrl();

/** Casilla interna donde llegan los mensajes del formulario de contacto. */
export const CONTACT_INBOX = process.env.CONTACT_EMAIL ?? "electroniclpok@gmail.com";

// ─── Transport ────────────────────────────────────────────────

/** Error tipado para distinguir "SMTP no configurado" de "SMTP falló". */
export class MailNotConfiguredError extends Error {
  constructor() {
    super("SMTP no está configurado (faltan SMTP_HOST / SMTP_USER / SMTP_PASSWORD)");
    this.name = "MailNotConfiguredError";
  }
}

export function isMailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASSWORD);
}

let cachedTransporter: Transporter | null = null;

function getTransporter(): Transporter {
  if (!isMailConfigured()) throw new MailNotConfiguredError();
  if (cachedTransporter) return cachedTransporter;

  const port = Number(process.env.SMTP_PORT ?? 587);
  cachedTransporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 usa TLS implícito; 587 usa STARTTLS.
    secure: port === 465,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASSWORD,
    },
  });

  return cachedTransporter;
}

async function send(options: {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}): Promise<void> {
  const transporter = getTransporter();
  await transporter.sendMail({
    from: FROM,
    to: options.to,
    replyTo: options.replyTo,
    subject: options.subject,
    html: options.html,
  });
}

/**
 * Envía sin propagar el error, devolviendo si funcionó. Se usa donde el fallo
 * del mail no debe romper la operación de negocio (ej: confirmación de pedido:
 * el pedido ya se creó y cobró, no tiene sentido revertirlo por un SMTP caído).
 * El error queda logueado para poder diagnosticarlo.
 */
async function sendSafe(label: string, options: Parameters<typeof send>[0]): Promise<boolean> {
  try {
    await send(options);
    return true;
  } catch (error) {
    if (error instanceof MailNotConfiguredError) {
      console.warn(`[mail] ${label} no enviado: SMTP sin configurar.`);
    } else {
      console.error(`[mail] Falló el envío de ${label}:`, error);
    }
    return false;
  }
}

// ─── Escapado ─────────────────────────────────────────────────

/**
 * Escapa texto provisto por el usuario antes de interpolarlo en el HTML del
 * mail. Sin esto, un nombre de producto o un mensaje de contacto puede inyectar
 * markup arbitrario (links de phishing, imágenes de tracking) en un correo que
 * sale con la identidad de la tienda.
 */
function esc(value: unknown): string {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

/** Escapa y convierte saltos de línea en <br>. */
function escMultiline(value: string): string {
  return esc(value).replace(/\r?\n/g, "<br>");
}

// ─── Email Templates ──────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${esc(title)}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f5f7; margin: 0; padding: 0; }
    .container { max-width: 600px; margin: 40px auto; background: white; border-radius: 18px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.06); }
    .header { background: linear-gradient(135deg, #1A3D6B 0%, #2563EB 100%); padding: 32px 40px; text-align: center; }
    .header h1 { color: white; margin: 0; font-size: 24px; font-weight: 600; letter-spacing: -0.5px; }
    .header p { color: rgba(255,255,255,0.8); margin: 8px 0 0; font-size: 14px; }
    .body { padding: 40px; }
    .body p { color: #333; line-height: 1.7; margin: 0 0 16px; }
    .btn { display: inline-block; background: #2563EB; color: white !important; text-decoration: none; padding: 14px 32px; border-radius: 10px; font-weight: 600; font-size: 15px; margin: 8px 0 24px; }
    .footer { background: #f5f5f7; padding: 24px 40px; text-align: center; border-top: 1px solid #e8e8e8; }
    .footer p { color: #999; font-size: 12px; margin: 0; }
    .divider { height: 1px; background: #f0f0f0; margin: 24px 0; }
    .steps { list-style: none; padding: 0; margin: 24px 0; }
    .steps li { padding: 10px 0 10px 28px; position: relative; color: #999; font-size: 14px; border-bottom: 1px solid #f5f5f7; }
    .steps li.done { color: #333; }
    .steps li.current { color: #2563EB; font-weight: 600; }
    .steps li:before { content: ''; position: absolute; left: 6px; top: 17px; width: 8px; height: 8px; border-radius: 50%; background: #e0e0e0; }
    .steps li.done:before { background: #34C759; }
    .steps li.current:before { background: #2563EB; box-shadow: 0 0 0 4px rgba(37,99,235,0.15); }
    .box { background: #f9fafb; border: 1px solid #eef0f2; border-radius: 12px; padding: 16px 20px; margin: 16px 0; }
    .box p { margin: 4px 0; font-size: 14px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${esc(STORE)}</h1>
      <p>${esc(title)}</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${esc(STORE)} · <a href="mailto:${esc(CONTACT_INBOX)}" style="color:#2563EB;">${esc(CONTACT_INBOX)}</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send Functions ───────────────────────────────────────────

/**
 * Propaga el error a propósito: si no se puede mandar el mail de verificación,
 * el registro debe informarlo en vez de dejar una cuenta inaccesible en silencio.
 */
export async function sendVerificationEmail(email: string, token: string) {
  const url = `${BASE_URL}/verify-email?token=${encodeURIComponent(token)}`;
  await send({
    to: email,
    subject: `Verificá tu cuenta en ${STORE}`,
    html: baseTemplate(
      "Verificación de cuenta",
      `<p>Gracias por registrarte. Hacé clic en el botón para verificar tu dirección de email:</p>
       <a href="${url}" class="btn">Verificar cuenta</a>
       <p style="font-size:13px;color:#666;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br>
       <span style="word-break:break-all;color:#2563EB;">${esc(url)}</span></p>
       <div class="divider"></div>
       <p style="font-size:13px;color:#999;">Si no te registraste, ignorá este email. El link expira en 24 horas.</p>`
    ),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${encodeURIComponent(token)}`;
  await send({
    to: email,
    subject: `Restablecer contraseña – ${STORE}`,
    html: baseTemplate(
      "Restablecer contraseña",
      `<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
       <a href="${url}" class="btn">Restablecer contraseña</a>
       <p style="font-size:13px;color:#666;">Si el botón no funciona, copiá y pegá este link en tu navegador:<br>
       <span style="word-break:break-all;color:#2563EB;">${esc(url)}</span></p>
       <div class="divider"></div>
       <p style="font-size:13px;color:#999;">Si no solicitaste esto, ignorá este email. El link expira en 1 hora.</p>`
    ),
  });
}

export async function sendOrderConfirmation(
  email: string,
  orderNumber: string,
  total: string,
  items: { name: string; quantity: number; price: string }[]
): Promise<boolean> {
  const itemRows = items
    .map(
      (i) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${esc(i.name)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${esc(i.quantity)}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${esc(i.price)}</td>
    </tr>`
    )
    .join("");

  return sendSafe("confirmación de pedido", {
    to: email,
    subject: `Pedido confirmado #${orderNumber} – ${STORE}`,
    html: baseTemplate(
      "¡Gracias por tu compra!",
      `<p>Tu pedido <strong>#${esc(orderNumber)}</strong> fue recibido y está siendo procesado.</p>
       <table style="width:100%;border-collapse:collapse;margin:16px 0;">
         <thead>
           <tr style="background:#f5f5f7;">
             <th style="padding:10px;text-align:left;font-size:13px;">Producto</th>
             <th style="padding:10px;text-align:center;font-size:13px;">Cantidad</th>
             <th style="padding:10px;text-align:right;font-size:13px;">Precio</th>
           </tr>
         </thead>
         <tbody>${itemRows}</tbody>
         <tfoot>
           <tr>
             <td colspan="2" style="padding:12px 0;font-weight:600;">Total</td>
             <td style="padding:12px 0;font-weight:600;text-align:right;">${esc(total)}</td>
           </tr>
         </tfoot>
       </table>
       <a href="${BASE_URL}/profile/orders" class="btn">Ver mi pedido</a>
       <p>Ante cualquier consulta escribinos a <a href="mailto:${esc(CONTACT_INBOX)}" style="color:#2563EB;">${esc(CONTACT_INBOX)}</a></p>`
    ),
  });
}

/**
 * Notifica al cliente un cambio de estado del pedido, mostrando la línea de
 * tiempo completa para que se ubique en qué punto está.
 */
export async function sendOrderStatusUpdate(options: {
  email: string;
  orderNumber: string;
  statusLabel: string;
  statusMessage: string;
  timeline: { label: string; state: "done" | "current" | "pending" }[];
  trackingNumber?: string | null;
  carrier?: string | null;
  trackingUrl?: string | null;
}): Promise<boolean> {
  const steps = options.timeline
    .map((s) => `<li class="${s.state}">${esc(s.label)}</li>`)
    .join("");

  const trackingBlock =
    options.trackingNumber || options.carrier
      ? `<div class="box">
           ${options.carrier ? `<p><strong>Empresa de envío:</strong> ${esc(options.carrier)}</p>` : ""}
           ${options.trackingNumber ? `<p><strong>Número de seguimiento:</strong> ${esc(options.trackingNumber)}</p>` : ""}
           ${options.trackingUrl ? `<p><a href="${esc(options.trackingUrl)}" style="color:#2563EB;">Seguir el envío</a></p>` : ""}
         </div>`
      : "";

  return sendSafe("actualización de estado", {
    to: options.email,
    subject: `Pedido #${options.orderNumber}: ${options.statusLabel} – ${STORE}`,
    html: baseTemplate(
      options.statusLabel,
      `<p>${escMultiline(options.statusMessage)}</p>
       <p style="font-size:14px;color:#666;">Pedido <strong>#${esc(options.orderNumber)}</strong></p>
       ${trackingBlock}
       <ul class="steps">${steps}</ul>
       <a href="${BASE_URL}/profile/orders" class="btn">Ver mi pedido</a>`
    ),
  });
}

/**
 * Instrucciones de pago para métodos offline (transferencia, efectivo, USDT),
 * donde el cliente necesita datos para completar el pago después del checkout.
 */
export async function sendPaymentInstructions(options: {
  email: string;
  orderNumber: string;
  methodLabel: string;
  amountLabel: string;
  instructions: string;
}): Promise<boolean> {
  return sendSafe("instrucciones de pago", {
    to: options.email,
    subject: `Instrucciones de pago – Pedido #${options.orderNumber}`,
    html: baseTemplate(
      "Cómo completar tu pago",
      `<p>Tu pedido <strong>#${esc(options.orderNumber)}</strong> quedó reservado. Para confirmarlo, completá el pago por <strong>${esc(options.methodLabel)}</strong>.</p>
       <div class="box">
         <p><strong>Total a abonar:</strong> ${esc(options.amountLabel)}</p>
       </div>
       <div class="box">${escMultiline(options.instructions)}</div>
       <p style="font-size:13px;color:#999;">Una vez recibido el pago vas a recibir la confirmación por este mismo medio.</p>`
    ),
  });
}

/**
 * Mensaje del formulario de contacto hacia la casilla interna.
 * El `from` sigue siendo el SMTP propio (obligatorio para no romper SPF/DKIM);
 * el correo del cliente se pone en `replyTo` para poder responderle directo.
 */
export async function sendContactFormEmail(
  name: string,
  email: string,
  subject: string,
  message: string,
  phone?: string
) {
  await send({
    to: CONTACT_INBOX,
    replyTo: email,
    subject: `[Contacto Web] ${subject}`,
    html: baseTemplate(
      "Nuevo mensaje de contacto",
      `<p><strong>Nombre:</strong> ${esc(name)}</p>
       <p><strong>Email:</strong> <a href="mailto:${esc(email)}" style="color:#2563EB;">${esc(email)}</a></p>
       ${phone ? `<p><strong>Teléfono:</strong> ${esc(phone)}</p>` : ""}
       <p><strong>Asunto:</strong> ${esc(subject)}</p>
       <div class="divider"></div>
       <p>${escMultiline(message)}</p>`
    ),
  });
}

/** Acuse de recibo al cliente que escribió por el formulario de contacto. */
export async function sendContactAcknowledgement(
  name: string,
  email: string,
  subject: string
): Promise<boolean> {
  return sendSafe("acuse de contacto", {
    to: email,
    subject: `Recibimos tu mensaje – ${STORE}`,
    html: baseTemplate(
      "Recibimos tu mensaje",
      `<p>Hola ${esc(name)},</p>
       <p>Recibimos tu consulta sobre <strong>${esc(subject)}</strong> y te vamos a responder a la brevedad.</p>
       <div class="divider"></div>
       <p style="font-size:13px;color:#999;">Este es un mensaje automático, no hace falta que lo respondas.</p>`
    ),
  });
}
