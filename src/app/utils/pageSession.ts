/**
 * Client helper — fetch signed page session (observe-only).
 * Retries with backoff and records a CRM-facing fetch status so
 * "missing nonce" can be explained (infra vs fraud).
 * Never throws.
 */

export type PageSessionFields = {
  page_nonce: string;
  page_session_id: string;
  page_serve_ts: number;
  page_session_ip: string;
  page_session_fetch_status: string;
  page_session_fetch_note: string;
};

const EMPTY_CORE = {
  page_nonce: "",
  page_session_id: "",
  page_serve_ts: 0,
  page_session_ip: "",
};

const MAX_ATTEMPTS = 3;
const BACKOFF_MS = [0, 400, 1000];
const TIMEOUT_MS = 8000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function pack(
  core: typeof EMPTY_CORE,
  status: string,
  note: string
): PageSessionFields {
  return {
    page_nonce: core.page_nonce || "",
    page_session_id: core.page_session_id || "",
    page_serve_ts: Number(core.page_serve_ts) || 0,
    page_session_ip: core.page_session_ip || "",
    page_session_fetch_status: status,
    page_session_fetch_note: note || "",
  };
}

type AttemptOutcome = {
  ok: boolean;
  core?: typeof EMPTY_CORE;
  kind: string;
  http?: number;
  detail?: string;
};

async function attemptOnce(base: string): Promise<AttemptOutcome> {
  const opts: RequestInit = { method: "GET", credentials: "omit" };
  if (typeof AbortSignal !== "undefined" && "timeout" in AbortSignal) {
    opts.signal = (AbortSignal as unknown as { timeout(ms: number): AbortSignal }).timeout(TIMEOUT_MS);
  }
  let res: Response;
  try {
    res = await fetch(base + "/server/page-session", opts);
  } catch (e: unknown) {
    const msg = e && typeof e === "object" && "name" in e ? String((e as { name?: string }).name) : "";
    const text = e instanceof Error ? e.message : String(e || "");
    if (msg === "TimeoutError" || /timeout|aborted/i.test(text)) {
      return { ok: false, kind: "fail_timeout", detail: text.slice(0, 80) };
    }
    return { ok: false, kind: "fail_network", detail: text.slice(0, 80) };
  }

  if (!res.ok) {
    const kind = res.status >= 500 ? "fail_http_5xx" : "fail_http_4xx";
    return { ok: false, kind, http: res.status };
  }

  const data = await res.json().catch(() => null);
  if (!data || !data.ok || !data.page_nonce) {
    return { ok: false, kind: "fail_empty_body", http: res.status };
  }

  return {
    ok: true,
    kind: "ok",
    http: res.status,
    core: {
      page_nonce: String(data.page_nonce || ""),
      page_session_id: String(data.page_session_id || ""),
      page_serve_ts: Number(data.page_serve_ts) || 0,
      page_session_ip: String(data.page_session_ip || ""),
    },
  };
}

/**
 * @param apiBase backend origin
 * @param options.phase 'load' (default) or 'submit' (last-chance)
 */
export async function fetchPageSession(
  apiBase: string,
  options?: { phase?: "load" | "submit" }
): Promise<PageSessionFields> {
  const phase = (options && options.phase) || "load";
  try {
    const base = String(apiBase || "").replace(/\/$/, "");
    if (!base) {
      return pack(EMPTY_CORE, "fail_no_base", "apiBase empty");
    }

    let lastKind = "fail_network";
    let lastHttp = 0;
    let lastDetail = "";
    let attempts = 0;

    for (let i = 0; i < MAX_ATTEMPTS; i++) {
      if (BACKOFF_MS[i]) await sleep(BACKOFF_MS[i]);
      attempts++;
      const outcome = await attemptOnce(base);
      if (outcome.ok && outcome.core && outcome.core.page_nonce) {
        let status = "ok";
        if (phase === "submit") status = "ok_submit";
        else if (attempts > 1) status = "ok_retry";
        const noteParts = [`attempts=${attempts}`, `phase=${phase}`];
        if (outcome.http) noteParts.push(`http=${outcome.http}`);
        return pack(outcome.core, status, noteParts.join(" "));
      }
      lastKind = outcome.kind || lastKind;
      lastHttp = outcome.http || lastHttp;
      lastDetail = outcome.detail || lastDetail;
    }

    const noteParts = [`attempts=${attempts}`, `phase=${phase}`, `last=${lastKind}`];
    if (lastHttp) noteParts.push(`http=${lastHttp}`);
    if (lastDetail) noteParts.push(lastDetail);
    return pack(EMPTY_CORE, lastKind, noteParts.join(" ").slice(0, 200));
  } catch (e: unknown) {
    const text = e instanceof Error ? e.message : String(e || "");
    return pack(EMPTY_CORE, "fail_network", `phase=${phase} ${text}`.slice(0, 200));
  }
}
