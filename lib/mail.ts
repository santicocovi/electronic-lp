import nodemailer from "nodemailer";
import { getAppUrl } from "@/lib/utils";

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT ?? 587),
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

const FROM = process.env.SMTP_FROM ?? "Electronic LP <electroniclpok@gmail.com>";
const STORE = "Electronic LP";
const BASE_URL = getAppUrl();

// ─── Email Templates ──────────────────────────────────────────

function baseTemplate(title: string, body: string): string {
  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
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
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${STORE}</h1>
      <p>${title}</p>
    </div>
    <div class="body">
      ${body}
    </div>
    <div class="footer">
      <p>© ${new Date().getFullYear()} ${STORE} · <a href="mailto:electroniclpok@gmail.com" style="color:#2563EB;">electroniclpok@gmail.com</a></p>
    </div>
  </div>
</body>
</html>`;
}

// ─── Send Functions ───────────────────────────────────────────

export async function sendVerificationEmail(email: string, token: string) {
  const url = `${BASE_URL}/verify-email?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Verificá tu cuenta en ${STORE}`,
    html: baseTemplate(
      "Verificación de cuenta",
      `<p>Gracias por registrarte. Hacé clic en el botón para verificar tu dirección de email:</p>
       <a href="${url}" class="btn">Verificar cuenta</a>
       <div class="divider"></div>
       <p style="font-size:13px;color:#999;">Si no te registraste, ignorá este email. El link expira en 24 horas.</p>`
    ),
  });
}

export async function sendPasswordResetEmail(email: string, token: string) {
  const url = `${BASE_URL}/reset-password?token=${token}`;
  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Restablecer contraseña – ${STORE}`,
    html: baseTemplate(
      "Restablecer contraseña",
      `<p>Recibimos una solicitud para restablecer la contraseña de tu cuenta.</p>
       <a href="${url}" class="btn">Restablecer contraseña</a>
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
) {
  const itemRows = items
    .map(
      (i) => `<tr>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;">${i.name}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:center;">${i.quantity}</td>
      <td style="padding:8px 0;border-bottom:1px solid #f0f0f0;text-align:right;">${i.price}</td>
    </tr>`
    )
    .join("");

  await transporter.sendMail({
    from: FROM,
    to: email,
    subject: `Pedido confirmado #${orderNumber} – ${STORE}`,
    html: baseTemplate(
      "¡Gracias por tu compra!",
      `<p>Tu pedido <strong>#${orderNumber}</strong> fue recibido y está siendo procesado.</p>
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
             <td style="padding:12px 0;font-weight:600;text-align:right;">${total}</td>
           </tr>
         </tfoot>
       </table>
       <a href="${BASE_URL}/profile/orders" class="btn">Ver mi pedido</a>
       <p>Ante cualquier consulta escribinos a <a href="mailto:electroniclpok@gmail.com" style="color:#2563EB;">electroniclpok@gmail.com</a></p>`
    ),
  });
}

export async function sendContactFormEmail(
  name: string,
  email: string,
  subject: string,
  message: string,
  phone?: string
) {
  await transporter.sendMail({
    from: FROM,
    to: "electroniclpok@gmail.com",
    replyTo: email,
    subject: `[Contacto Web] ${subject}`,
    html: baseTemplate(
      "Nuevo mensaje de contacto",
      `<p><strong>Nombre:</strong> ${name}</p>
       <p><strong>Email:</strong> ${email}</p>
       ${phone ? `<p><strong>Teléfono:</strong> ${phone}</p>` : ""}
       <p><strong>Asunto:</strong> ${subject}</p>
       <div class="divider"></div>
       <p>${message.replace(/\n/g, "<br>")}</p>`
    ),
  });
}
