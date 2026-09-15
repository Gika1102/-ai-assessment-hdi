/**
 * Cloudflare Worker - grava respostas em texto claro no GitHub Contents API.
 *
 * Secrets/Variables obrigatórias:
 *   GITHUB_TOKEN = token fine-grained com Contents: Read and write no repositório de respostas
 *   RESPONSES_GITHUB_OWNER = proprietário do repositório de respostas
 *   RESPONSES_GITHUB_REPO = nome do repositório de respostas
 *   RESPONSES_GITHUB_BRANCH = branch de gravação, ex.: main
 *   ALLOWED_ORIGIN = origem exata do frontend
 */

function corsHeaders(origin, allowedOrigin) {
  const allowed = allowedOrigin === "*" || origin === allowedOrigin;
  return {
    "Access-Control-Allow-Origin": allowed ? origin || allowedOrigin : allowedOrigin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Vary": "Origin"
  };
}

function base64EncodeUtf8(value) {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => { binary += String.fromCharCode(byte); });
  return btoa(binary);
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

    if (!safeId || !String(body.answers.name || "").trim() || !String(body.answers.email || "").trim()) {
      return Response.json({ error: "Invalid payload" }, { status: 400, headers });
    }

    if (!env.GITHUB_TOKEN || !env.RESPONSES_GITHUB_OWNER || !env.RESPONSES_GITHUB_REPO || !env.RESPONSES_GITHUB_BRANCH) {
      return Response.json({ error: "Missing GitHub configuration" }, { status: 500, headers });
    }

    const path = `${env.GITHUB_DATA_PATH || "data/responses"}/${safeId}.json`;
    const githubResponse = await fetch(`https://api.github.com/repos/${encodeURIComponent(env.RESPONSES_GITHUB_OWNER)}/${encodeURIComponent(env.RESPONSES_GITHUB_REPO)}/contents/${path}`, {
      method: "PUT",
      headers: {
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "Accept": "application/vnd.github+json",
        "Content-Type": "application/json",
        "User-Agent": "hdi-feedback-worker"
      },
      body: JSON.stringify({
        message: `Assessment response ${safeId}`,
        content: base64EncodeUtf8(JSON.stringify(body, null, 2)),
        branch: env.RESPONSES_GITHUB_BRANCH
      })
    });

    if (!githubResponse.ok) {
      const details = await githubResponse.text();
      console.error("GitHub error:", details);
      return Response.json({ error: "Could not save response" }, { status: 502, headers });
    }

    return Response.json({ ok: true, id: safeId }, { status: 201, headers });
  }
};
