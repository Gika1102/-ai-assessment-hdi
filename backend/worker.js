/**
 * Cloudflare Worker - recebe o POST do formulário e cria um JSON separado no GitHub.
 *
 * Configuração via Secrets/Variables do Worker:
 *   GITHUB_TOKEN = Fine-grained token com Contents: Read and write no repo escolhido
 *   GITHUB_OWNER = usuário/organização do GitHub
 *   GITHUB_REPO = nome do repositório
 *   GITHUB_BRANCH = branch (ex.: main)
 *   ALLOWED_ORIGIN = origem exata do GitHub Pages, ex.: https://usuario.github.io
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
      return Response.json({ error: "Invalid id" }, { status: 400, headers });
    }

    const record = {
      id: safeId,
      timestamp: String(body.timestamp),
      answers: {
        name: String(answers.name).slice(0, 120),
        email: String(answers.email).slice(0, 180),
        company: String(answers.company || "").slice(0, 180),
        role: String(answers.role || "").slice(0, 80),
        comment: String(answers.comment || "").slice(0, 2000),
        leadershipVision: String(answers.leadershipVision || "").slice(0, 1),
        workKnowledge: String(answers.workKnowledge || "").slice(0, 1),
        portfolioRoadmap: String(answers.portfolioRoadmap || "").slice(0, 1),
        technologySecurity: String(answers.technologySecurity || "").slice(0, 1),
        accountability: String(answers.accountability || "").slice(0, 1),
        changeLearning: String(answers.changeLearning || "").slice(0, 1)
      }
    };

    const path = `responses/${safeId}.json`;
    const apiUrl = `https://api.github.com/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${path}`;

    const githubResponse = await fetch(apiUrl, {
      method: "PUT",
      headers: {
        "Accept": "application/vnd.github+json",
        "Authorization": `Bearer ${env.GITHUB_TOKEN}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "fair-form-worker"
      },
      body: JSON.stringify({
        message: `Add form response ${safeId}`,
        branch: env.GITHUB_BRANCH || "main",
        content: btoa(String.fromCharCode(...new TextEncoder().encode(JSON.stringify(record, null, 2))))
      })
    });

    if (!githubResponse.ok) {
      const details = await githubResponse.text();
      console.error("GitHub API error", details);
      return Response.json({ error: "Could not save response" }, { status: 502, headers });
    }

    return Response.json({ ok: true, id: safeId }, { status: 201, headers });
  }
};
