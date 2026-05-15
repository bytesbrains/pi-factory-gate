import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config";
import { factoryApi } from "../helpers";
import type { AgentInfo, AgentDetail } from "../types";

// ─── List Agents ───────────────────────────────────────────────────────────────

export const listAgentsTool = {
  name: "factory_list_agents" as const,
  label: "List Factory Agents",
  description:
    "List all available AI agents in the wrok.in factory. Optionally filter by environment.",
  parameters: Type.Object({
    environment: Type.Optional(
      Type.String({ description: "Filter agents by environment name" }),
    ),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const qs = params.environment ? `?environment=${encodeURIComponent(params.environment)}` : "";
    const r = await factoryApi<{ agents: AgentInfo[]; environment: string }>(
      config,
      `/agents${qs}`,
    );

    if (!r.ok || !r.data) {
      return {
        content: [{ type: "text", text: `❌ Failed to list agents: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const { agents } = r.data;
    if (agents.length === 0) {
      return {
        content: [{ type: "text", text: "No agents registered." }],
        details: { count: 0 },
      };
    }

    const lines = [`🤖 Factory Agents (${agents.length})` + (params.environment ? ` in "${params.environment}"` : ""), ""];
    for (const a of agents) {
      const badge = a.enabled === false ? "🔴" : "🟢";
      const tools = a.tools?.length ? ` [${a.tools.slice(0, 6).join(", ")}${a.tools.length > 6 ? ", ..." : ""}]` : "";
      lines.push(`   ${badge} ${a.name}  source=${a.source}`);
      lines.push(`        ${a.description || "(no description)"}${tools}`);
      if (a.model && a.model !== "auto") {
        lines.push(`        model: ${a.model}`);
      }
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: { count: agents.length, environment: params.environment || "default" },
    };
  },
};

// ─── Get Agent ─────────────────────────────────────────────────────────────────

export const getAgentTool = {
  name: "factory_get_agent" as const,
  label: "Get Agent Detail",
  description:
    "Get detailed information about a specific factory agent, including its resolved configuration (inheritance, overrides).",
  parameters: Type.Object({
    name: Type.String({ description: "Agent name (e.g., 'code-reviewer', 'build-runner')" }),
    environment: Type.Optional(
      Type.String({ description: "Environment context for agent resolution" }),
    ),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const qs = params.environment ? `?environment=${encodeURIComponent(params.environment)}` : "";
    const r = await factoryApi<AgentDetail>(
      config,
      `/agents/${encodeURIComponent(params.name)}${qs}`,
    );

    if (!r.ok) {
      return {
        content: [{ type: "text", text: `❌ Agent "${params.name}" not found: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const a = r.data!;
    const lines = [
      `🤖 ${a.name}`,
      `   Description: ${a.description || "(none)"}`,
      `   Source:      ${a.source}`,
      `   Resolved:    ${a.resolvedFrom || "(direct)"}`,
      `   Override:    ${a.isOverride ? "yes" : "no"}`,
      `   Enabled:     ${a.enabled !== false ? "yes" : "no"}`,
    ];

    if (a.extends) lines.push(`   Extends:     ${a.extends}`);
    if (a.model && a.model !== "auto") lines.push(`   Model:       ${a.model}`);
    if (a.tools?.length) {
      lines.push(`   Tools (${a.tools.length}):`);
      for (const t of a.tools) lines.push(`      - ${t}`);
    }
    if (a.systemPrompt) {
      const preview = a.systemPrompt.length > 300
        ? a.systemPrompt.slice(0, 300) + "..."
        : a.systemPrompt;
      lines.push(`   System Prompt:`);
      lines.push(`      ${preview}`);
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: { name: a.name, source: a.source, resolvedFrom: a.resolvedFrom },
    };
  },
};
