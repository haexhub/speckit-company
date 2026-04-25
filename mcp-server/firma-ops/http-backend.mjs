/**
 * HTTP-backed implementations of the firma-ops handler context.
 *
 * Targets a haex-corp / SpecOps server (Nuxt under `server/api/...`). The
 * server is expected to expose:
 *
 *   POST /api/projects/<projectSlug>/company/dispatch
 *     body: { role, task }
 *     resp: { dispatch_id, status }
 *
 *   GET /api/projects/<projectSlug>/company/agents
 *     resp: { agents: [...] }
 *
 *   POST /api/projects/<projectSlug>/company/ask-user
 *     body: { question, options? }
 *     resp: { answer }
 *
 *   POST /api/projects/<projectSlug>/company/escalate
 *     body: { reason, suggested_action? }
 *     resp: { decision }
 *
 *   GET /api/projects/<projectSlug>/company/artifact?path=...
 *     resp: { content }
 *
 * Configuration via env (read at start time):
 *   FIRMA_OPS_BASE_URL     base URL of the runtime (e.g. http://127.0.0.1:3000)
 *   FIRMA_OPS_PROJECT      project slug
 *   FIRMA_OPS_AUTH_TOKEN   optional bearer token, sent as Authorization header
 *
 * If FIRMA_OPS_BASE_URL is not set, makeHandlers() falls back to stubs.
 */

import { readFile } from "node:fs/promises";

export function httpContextFromEnv() {
  const baseUrl = process.env.FIRMA_OPS_BASE_URL;
  if (!baseUrl) return null;
  const project = process.env.FIRMA_OPS_PROJECT;
  if (!project) {
    throw new Error("FIRMA_OPS_PROJECT must be set when FIRMA_OPS_BASE_URL is set");
  }
  const token = process.env.FIRMA_OPS_AUTH_TOKEN;
  return makeHttpContext({ baseUrl, project, token });
}

export function makeHttpContext({ baseUrl, project, token }) {
  const baseEndpoint = `${baseUrl.replace(/\/$/, "")}/api/projects/${project}/company`;
  const headers = {
    "content-type": "application/json",
    ...(token ? { authorization: `Bearer ${token}` } : {}),
  };

  async function postJson(pathSuffix, body) {
    const res = await fetch(`${baseEndpoint}${pathSuffix}`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`POST ${pathSuffix} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  async function getJson(pathSuffix) {
    const res = await fetch(`${baseEndpoint}${pathSuffix}`, { headers });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`GET ${pathSuffix} failed (${res.status}): ${text}`);
    }
    return res.json();
  }

  return {
    orchestrator: {
      async dispatch({ role, task }) {
        return await postJson("/dispatch", { role, task });
      },
    },
    artifactReader: {
      async read(p) {
        // Prefer reading the file directly when it's local; fall back to HTTP.
        try {
          return await readFile(p, "utf8");
        } catch {
          const result = await getJson(`/artifact?path=${encodeURIComponent(p)}`);
          return result.content;
        }
      },
    },
    userChannel: {
      async ask({ question, options }) {
        return await postJson("/ask-user", { question, options });
      },
      async escalate({ reason, suggested_action }) {
        return await postJson("/escalate", { reason, suggested_action });
      },
    },
    orgReader: {
      async read() {
        return await getJson("/agents");
      },
    },
  };
}
