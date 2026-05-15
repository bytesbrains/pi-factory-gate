import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config";
import { factoryApi, statusIcon, formatTimestamp } from "../helpers";
import type { EnvironmentInfo } from "../types";

// ─── List Environments ─────────────────────────────────────────────────────────

export const listEnvironmentsTool = {
  name: "factory_list_environments" as const,
  label: "List Environments",
  description:
    "List all registered environments (workspaces) in the wrok.in factory. Each environment maps a git repo to a named workspace.",
  parameters: Type.Object({}),
  async execute(_id: string, _p: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const r = await factoryApi<{ environments: EnvironmentInfo[] }>(config, "/environments");

    if (!r.ok || !r.data) {
      return {
        content: [{ type: "text", text: `❌ Failed to list environments: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const envs = r.data.environments || [];
    if (envs.length === 0) {
      return {
        content: [{ type: "text", text: "No environments registered." }],
        details: { count: 0 },
      };
    }

    const lines = [`📁 Factory Environments (${envs.length})`, ""];
    for (const env of envs) {
      const icon = statusIcon(env.status);
      const created = formatTimestamp(env.createdAt);
      lines.push(`   ${icon} ${env.name}`);
      lines.push(`        repo: ${env.repo}`);
      lines.push(`        branch: ${env.baseBranch}  |  status: ${env.status}`);
      lines.push(`        created: ${created}`);
      if (env.description) {
        lines.push(`        desc: ${env.description.slice(0, 100)}`);
      }
      if (env.lastCommit) {
        lines.push(`        commit: ${env.lastCommit.slice(0, 8)}`);
      }
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: { count: envs.length },
    };
  },
};

// ─── Get Environment ───────────────────────────────────────────────────────────

export const getEnvironmentTool = {
  name: "factory_get_environment" as const,
  label: "Get Environment Detail",
  description:
    "Get detailed information about a specific factory environment, including repo, branch, status, and last commit.",
  parameters: Type.Object({
    name: Type.String({ description: "Environment name" }),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const r = await factoryApi<EnvironmentInfo>(
      config,
      `/environments/${encodeURIComponent(params.name)}`,
    );

    if (!r.ok || !r.data) {
      return {
        content: [{ type: "text", text: `❌ Environment "${params.name}" not found: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const env = r.data;
    const icon = statusIcon(env.status);
    const created = formatTimestamp(env.createdAt);

    const lines = [
      `${icon} Environment: ${env.name}`,
      `   Repo:        ${env.repo}`,
      `   Base Branch: ${env.baseBranch}`,
      `   Status:      ${env.status}`,
      `   Created:     ${created}`,
    ];

    if (env.currentBranch) lines.push(`   Current Branch: ${env.currentBranch}`);
    if (env.featureBranch) lines.push(`   Feature Branch: ${env.featureBranch}`);
    if (env.lastCommit) lines.push(`   Last Commit:    ${env.lastCommit.slice(0, 8)}`);
    if (env.description) lines.push(`   Description:    ${env.description}`);
    if (env.error) lines.push(`   Error:          ${env.error}`);

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: env,
    };
  },
};

// ─── Create Environment ────────────────────────────────────────────────────────

export const createEnvironmentTool = {
  name: "factory_create_environment" as const,
  label: "Create Environment",
  description:
    "Register a new environment (workspace) in the factory, cloning a git repo into a named workspace.",
  parameters: Type.Object({
    name: Type.String({ description: "Unique environment name" }),
    repo: Type.String({ description: "GitHub repo URL (e.g., https://github.com/user/repo.git)" }),
    branch: Type.Optional(Type.String({ description: "Base branch (default: main)" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);

    const body: Record<string, string> = {
      name: params.name,
      repo: params.repo,
    };
    if (params.branch) body.branch = params.branch;

    const r = await factoryApi<{ name: string; status: string }>(
      config,
      "/environments",
      "POST",
      body,
    );

    if (!r.ok) {
      return {
        content: [{ type: "text", text: `❌ Failed to create environment: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const { name, status: envStatus } = r.data!;
    return {
      content: [
        {
          type: "text",
          text: [
            `📁 Environment "${name}" created`,
            `   Status: ${envStatus}`,
            `   Repo:   ${params.repo}`,
            "",
            `Check progress: factory_get_environment(name="${name}")`,
          ].join("\n"),
        },
      ],
      details: r.data,
    };
  },
};
