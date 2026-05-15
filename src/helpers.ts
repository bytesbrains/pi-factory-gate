import type { FactoryConfig } from "./types";

/**
 * Call the wrok.in orchestrator API.
 * Handles JSON parsing, error extraction, and timeouts.
 */
export async function factoryApi<T = unknown>(
  config: FactoryConfig,
  endpoint: string,
  method: "GET" | "POST" | "DELETE" = "GET",
  body?: unknown,
): Promise<{ ok: boolean; data?: T; error?: string; status: number }> {
  const url = `${config.orchestratorUrl.replace(/\/$/, "")}${endpoint}`;
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.requestTimeout);

  try {
    const opts: RequestInit = {
      method,
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      signal: controller.signal,
    };
    if (body !== undefined && method !== "GET") {
      opts.body = JSON.stringify(body);
    }

    const res = await fetch(url, opts);
    clearTimeout(timeout);

    const contentType = res.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");

    if (!res.ok) {
      const errBody = isJson ? await res.json().catch(() => null) : await res.text().catch(() => null);
      const msg = errBody && typeof errBody === "object" && "error" in errBody
        ? String((errBody as Record<string, unknown>).error)
        : String(errBody || res.statusText);
      return { ok: false, error: msg, status: res.status };
    }

    if (!isJson) {
      const text = await res.text();
      const preview = text.slice(0, 240).replace(/\s+/g, " ").trim();
      return {
        ok: false,
        error: `Expected JSON response but got ${contentType || "unknown content type"}. The URL may not point to a wrok.in orchestrator. Response preview: ${preview}${text.length > 240 ? "..." : ""}`,
        status: res.status,
      };
    }

    const data = await res.json() as T;
    return { ok: true, data, status: res.status };
  } catch (err: unknown) {
    clearTimeout(timeout);
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("abort") || msg.includes("timeout")) {
      return { ok: false, error: `Request timed out after ${config.requestTimeout}ms`, status: 0 };
    }
    return { ok: false, error: msg, status: 0 };
  }
}

/**
 * Format a Unix timestamp into a human-readable string.
 */
export function formatTimestamp(ts: number): string {
  return new Date(ts).toISOString().slice(0, 19).replace("T", " ");
}

/**
 * Format duration in ms to a human-readable string.
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ${s % 60}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

/**
 * Truncate a long string, keeping head and tail for readability.
 */
export function truncateOutput(text: string, maxLines: number): { text: string; truncated: boolean; totalLines: number } {
  const lines = text.split("\n");
  const totalLines = lines.length;
  if (totalLines <= maxLines) return { text, truncated: false, totalLines };

  const head = Math.ceil(maxLines * 0.6);
  const tail = maxLines - head;
  const truncated =
    lines.slice(0, head).join("\n") +
    `\n\n... [${totalLines - maxLines} lines truncated] ...\n\n` +
    lines.slice(-tail).join("\n");

  return { text: truncated, truncated: true, totalLines };
}

/**
 * Status icon helper for job/worker display.
 */
export function statusIcon(status: string): string {
  const s = status.toLowerCase();
  if (s === "running" || s === "in_progress") return "🔄";
  if (s === "pending" || s === "queued") return "⏳";
  if (s === "completed" || s === "success") return "✅";
  if (s === "failed" || s === "failure") return "❌";
  if (s === "partial") return "⚠️";
  if (s === "busy") return "🔵";
  if (s === "idle") return "🟢";
  if (s === "offline") return "🔴";
  if (s === "ready") return "✅";
  if (s === "cloning") return "⏳";
  if (s === "empty") return "⚪";
  if (s === "error") return "❌";
  return "⚪";
}
