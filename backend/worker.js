/**
 * Cloudflare Worker - recebe o POST do formulário e envia por e-mail via Resend.
 *
 * Configuração via Secrets/Variables do Worker:
 *   RESEND_API_KEY = chave da API do Resend
 *   EMAIL_FROM = remetente verificado pelo Resend, ex.: "Formulário <no-reply@seu-dominio.com>"
 *   EMAIL_TO = e-mail de destino, ex.: "seu-email@gmail.com"
 *   EMAIL_SUBJECT = assunto do e-mail (opcional)
 *   ALLOWED_ORIGIN = origem exata do GitHub Pages, ex.: https://usuario.github.io
 */

function escapeHtml(value) {
  return String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function corsHeaders(origin, allowedOrigin) {
  const allowed = allowedOrigin === "*" || origin === allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowed ? origin || allowedOrigin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get("Origin") || "";
    const headers = corsHeaders(origin, env.ALLOWED_ORIGIN || "*");

    if (request.method === "OPTIONS") {
      return new Response(null, { status: 204, headers });
    }

    if (request.method !== "POST") {
      return new Response("Method Not Allowed", { status: 405, headers });
    }

    if (env.ALLOWED_ORIGIN && env.ALLOWED_ORIGIN !== "*" && origin !== env.ALLOWED_ORIGIN) {
      return Response.json({ error: "Origin not allowed" }, { status: 403, headers });
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400, headers });
    }

    if (!body || !body.id || !body.timestamp || !body.answers || typeof body.answers !== "object") {
      return Response.json({ error: "Missing required fields" }, { status: 400, headers });
    }

    const safeId = String(body.id).match(/^[0-9a-f-]{20,80}$/i)?.[0];
    const answers = body.answers;

    if (!safeId || !String(answers.name || "").trim() || !String(answers.email || "").trim()) {
      return Response.json({ error: "Invalid payload" }, { status: 400, headers });
    }

    const subject = env.EMAIL_SUBJECT || "Nova resposta do formulário";
    const toEmail = env.EMAIL_TO;
    const fromEmail = env.EMAIL_FROM;

    if (!env.RESEND_API_KEY || !toEmail || !fromEmail) {
      return Response.json({ error: "Missing email configuration" }, { status: 500, headers });
    }

    const rows = [
      ["Nome", answers.name],
      ["E-mail", answers.email],
      ["Empresa", answers.company || "-"],
      ["Interesse", answers.interest || "-"],
      ["Nível", answers.level || "-"],
      ["Comentário", answers.comment || "-"]
    ];

    const html = `
      <div style="font-family: Arial, sans-serif; color: #111827; max-width: 640px; margin: 0 auto;">
        <h2 style="margin-bottom: 16px;">Nova resposta do formulário</h2>
        <p style="margin: 0 0 20px; color: #374151;">Recebemos uma nova submissão com os dados abaixo.</p>

        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          ${rows.map(([label, value]) => `
            <tr>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb; background: #f9fafb; width: 140px; font-weight: bold;">${escapeHtml(label)}</td>
              <td style="padding: 10px 12px; border: 1px solid #e5e7eb;">${escapeHtml(value)}</td>
            </tr>
          `).join("")}
        </table>

        <p style="margin-top: 24px; color: #6b7280; font-size: 12px;">
          Enviado em: ${escapeHtml(String(body.timestamp))} <br />
          ID: ${escapeHtml(safeId)}
        </p>
      </div>
    `;

    const resendResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${env.RESEND_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        from: fromEmail,
        to: [toEmail],
        reply_to: String(answers.email),
        subject,
        html
      })
    });

    if (!resendResponse.ok) {
      const details = await resendResponse.text();
      console.error("Resend error:", details);
      return Response.json({ error: "Could not send email" }, { status: 502, headers });
    }

    return Response.json({ ok: true, id: safeId }, { status: 201, headers });
  }
};
