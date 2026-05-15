import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config";
import { factoryApi } from "../helpers";
import type { WorkflowInfo } from "../types";

// ─── List Workflows ────────────────────────────────────────────────────────────

export const listWorkflowsTool = {
  name: "factory_list_workflows" as const,
  label: "List Workflow Templates",
  description:
    "List available workflow templates in the factory. Workflows are predefined chains of agent jobs.",
  parameters: Type.Object({}),
  async execute(_id: string, _p: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);

    // Try the workflow-templates endpoint first (DB-backed), then fall back to discovery
    const r = await factoryApi<{ templates?: Array<{ name: string; title: string; description?: string }> }>(
      config,
      "/workflows/templates",
    );

    if (r.ok && r.data?.templates && r.data.templates.length > 0) {
      const templates = r.data.templates;
      const lines = [
        `📋 Workflow Templates (${templates.length})`,
        "",
      ];
      for (const t of templates) {
        lines.push(`   📝 ${t.title || t.name}`);
        lines.push(`        id: ${t.name}`);
        if (t.description) lines.push(`        ${t.description.slice(0, 120)}`);
      }
      return {
        content: [{ type: "text", text: lines.join("\n") }],
        details: { count: templates.length, source: "templates" },
      };
    }

    // Fall back to workflow discovery (disk-based .md files)
    const r2 = await factoryApi<{ workflows: WorkflowInfo[] }>(config, "/workflows");

    if (!r2.ok || !r2.data) {
      return {
        content: [{ type: "text", text: `❌ Failed to list workflows: ${r2.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const workflows = r2.data.workflows || [];
    if (workflows.length === 0) {
      return {
        content: [{ type: "text", text: "No workflow templates found." }],
        details: { count: 0 },
      };
    }

    const lines = [`📋 Workflow Templates (${workflows.length})`, ""];
    for (const w of workflows) {
      lines.push(`   📝 ${w.name}`);
      lines.push(`        path: ${w.path}`);
      if (w.description) lines.push(`        ${w.description.slice(0, 120)}`);
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: { count: workflows.length, source: "discovery" },
    };
  },
};

// ─── Run Workflow ──────────────────────────────────────────────────────────────

export const runWorkflowTool = {
  name: "factory_run_workflow" as const,
  label: "Run Workflow Template",
  description:
    "Execute a workflow template on the factory. This creates a job that runs the workflow steps.",
  parameters: Type.Object({
    template: Type.String({ description: "Workflow template name or ID to run" }),
    environment: Type.Optional(Type.String({ description: "Named environment to run in" })),
    repo: Type.Optional(Type.String({ description: "Direct repo URL (overrides environment)" })),
    branch: Type.Optional(Type.String({ description: "Branch to run on (default: main)" })),
    confirm: Type.Optional(Type.Boolean({ description: "Must be true to confirm execution" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);

    // Try the new workflow-scheduler endpoint first: POST /workflows/run with template+params
    const body: Record<string, unknown> = { template: params.template };
    if (params.environment) body.environment = params.environment;
    if (params.repo) body.repo = params.repo;
    if (params.branch) body.branch = params.branch;

    const r = await factoryApi<{ jobId: string; workflow?: string; status: string }>(
      config,
      "/workflows/run",
      "POST",
      body,
    );

    if (!r.ok) {
      return {
        content: [{ type: "text", text: `❌ Failed to run workflow: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const { jobId, status: jobStatus } = r.data!;
    return {
      content: [
        {
          type: "text",
          text: [
            `🔄 Workflow "${params.template}" started`,
            `   Job ID: ${jobId}`,
            `   Status: ${jobStatus}`,
            "",
            `Track progress: factory_get_job(id="${jobId}")`,
            `Stream output:   factory_stream_job(id="${jobId}")`,
          ].join("\n"),
        },
      ],
      details: { jobId, workflow: params.template, status: jobStatus },
    };
  },
};
