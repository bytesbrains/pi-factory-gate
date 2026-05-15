import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config";
import { factoryApi, formatTimestamp } from "../helpers";
import type { SystemEvent, FactoryStatus } from "../types";

// ─── Get Events ────────────────────────────────────────────────────────────────

export const getEventsTool = {
  name: "factory_get_events" as const,
  label: "Get Factory Events",
  description:
    "Get recent system events from the factory, such as job creation, completion, worker state changes, and errors. Useful for monitoring factory activity.",
  parameters: Type.Object({
    since: Type.Optional(Type.Number({ description: "Return events since this Unix timestamp (ms)" })),
    limit: Type.Optional(Type.Number({ description: "Max events to return (default: 50)" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const qs = params.since ? `?since=${params.since}` : "";
    const r = await factoryApi<{ events: SystemEvent[] }>(config, `/events${qs}`);

    if (!r.ok || !r.data) {
      return {
        content: [{ type: "text", text: `❌ Failed to fetch events: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const events = r.data.events || [];
    const limit = params.limit || 50;
    const shown = events.slice(-limit);

    if (shown.length === 0) {
      return {
        content: [{ type: "text", text: "No recent events." }],
        details: { count: 0 },
      };
    }

    const lines = [`📡 Factory Events (last ${shown.length})`, ""];
    for (const ev of shown) {
      const ts = formatTimestamp(ev.ts);
      const id = ev.id.slice(0, 8);
      lines.push(`   [${ts}] ${ev.type}: ${ev.message}${ev.details ? ` — ${ev.details.slice(0, 60)}` : ""}`);
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: { count: events.length, shown: shown.length },
    };
  },
};

// ─── Factory Status ────────────────────────────────────────────────────────────

export const statusTool = {
  name: "factory_status" as const,
  label: "Factory Status",
  description:
    "Check if the wrok.in orchestrator is reachable and healthy. Returns the orchestrator ID and status.",
  parameters: Type.Object({}),
  async execute(_id: string, _p: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const r = await factoryApi<FactoryStatus>(config, "/");

    if (!r.ok) {
      return {
        content: [
          {
            type: "text",
            text: [
              `🔴 Factory is unreachable`,
              `   URL:     ${config.orchestratorUrl}`,
              `   Error:   ${r.error || "connection failed"}`,
              "",
              `Check: Is the orchestrator running? Is .factoryrc.yml configured correctly?`,
            ].join("\n"),
          },
        ],
        isError: true,
        details: { reachable: false },
      };
    }

    const status = r.data!;
    if (!status?.id || !status?.status) {
      return {
        content: [
          {
            type: "text",
            text: [
              `🔴 URL is reachable but does not appear to be a wrok.in factory orchestrator`,
              `   URL:          ${config.orchestratorUrl}`,
              `   Received:     ${JSON.stringify(status).slice(0, 120)}`,
              "",
              `Check: Is .factoryrc.yml pointing to a running wrok.in orchestrator?`,
            ].join("\n"),
          },
        ],
        isError: true,
        details: { reachable: true, valid: false, raw: status },
      };
    }

    return {
      content: [
        {
          type: "text",
          text: [
            `🟢 Factory is healthy`,
            `   Orchestrator: ${status.id}`,
            `   Service:      ${status.service}`,
            `   Status:       ${status.status}`,
            `   URL:          ${config.orchestratorUrl}`,
          ].join("\n"),
        },
      ],
      details: { ...status, reachable: true },
    };
  },
};
