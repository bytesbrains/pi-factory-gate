import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config";
import { factoryApi, statusIcon, formatTimestamp, formatDuration } from "../helpers";
import type { JobInfo } from "../types";

// ─── Create Job ────────────────────────────────────────────────────────────────

export const createJobTool = {
  name: "factory_create_job" as const,
  label: "Create Factory Job",
  description:
    "Dispatch a new job to the wrok.in AI factory. Supports single-agent, chain (sequential), and parallel modes. Jobs run in a named environment or against a direct repo.",
  parameters: Type.Object({
    mode: Type.String({ description: "Job mode: 'single', 'chain', or 'parallel'" }),
    agent: Type.Optional(Type.String({ description: "Agent name for single mode" })),
    task: Type.Optional(Type.String({ description: "Task prompt/instruction for single mode" })),
    steps: Type.Optional(
      Type.String({
        description:
          "Chain steps as JSON array: [{\"agent\":\"name\",\"task\":\"prompt\"}, ...]",
      }),
    ),
    tasks: Type.Optional(
      Type.String({
        description:
          "Parallel tasks as JSON array: [{\"agent\":\"name\",\"task\":\"prompt\"}, ...]",
      }),
    ),
    environment: Type.Optional(Type.String({ description: "Named environment to run in" })),
    repo: Type.Optional(Type.String({ description: "Direct GitHub repo URL to clone" })),
    branch: Type.Optional(Type.String({ description: "Base branch (default: main)" })),
    force: Type.Optional(Type.Boolean({ description: "Bypass exclusive-agent deduplication" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);

    // Build the task payload
    let taskPayload: Record<string, unknown>;
    if (params.mode === "single") {
      if (!params.agent || !params.task) {
        return {
          content: [{ type: "text", text: "❌ Single mode requires 'agent' and 'task' parameters." }],
          isError: true,
          details: {},
        };
      }
      taskPayload = { mode: "single", agent: params.agent, task: params.task };
    } else if (params.mode === "chain") {
      let steps: unknown[];
      try {
        steps = typeof params.steps === "string" ? JSON.parse(params.steps) : params.steps;
      } catch {
        return {
          content: [{ type: "text", text: "❌ Invalid 'steps' JSON. Must be an array of {agent, task} objects." }],
          isError: true,
          details: {},
        };
      }
      if (!Array.isArray(steps) || steps.length === 0) {
        return {
          content: [{ type: "text", text: "❌ Chain mode requires 'steps' — an array of {agent, task} objects." }],
          isError: true,
          details: {},
        };
      }
      taskPayload = { mode: "chain", steps };
    } else if (params.mode === "parallel") {
      let tasks: unknown[];
      try {
        tasks = typeof params.tasks === "string" ? JSON.parse(params.tasks) : params.tasks;
      } catch {
        return {
          content: [{ type: "text", text: "❌ Invalid 'tasks' JSON. Must be an array of {agent, task} objects." }],
          isError: true,
          details: {},
        };
      }
      if (!Array.isArray(tasks) || tasks.length === 0) {
        return {
          content: [{ type: "text", text: "❌ Parallel mode requires 'tasks' — an array of {agent, task} objects." }],
          isError: true,
          details: {},
        };
      }
      taskPayload = { mode: "parallel", tasks };
    } else {
      return {
        content: [{ type: "text", text: `❌ Invalid mode: "${params.mode}". Use: single, chain, or parallel.` }],
        isError: true,
        details: {},
      };
    }

    const body: Record<string, unknown> = { task: taskPayload };
    if (params.environment) body.environment = params.environment;
    else if (config.defaultEnvironment) body.environment = config.defaultEnvironment;
    if (params.repo) body.repo = params.repo;
    if (params.branch) body.baseBranch = params.branch;
    if (params.force) body.force = true;

    const r = await factoryApi<{ jobId: string; status: string; environment?: string }>(
      config,
      "/jobs",
      "POST",
      body,
    );

    if (!r.ok) {
      return {
        content: [{ type: "text", text: `❌ Failed to create job: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const { jobId, status: jobStatus, environment } = r.data!;
    return {
      content: [
        {
          type: "text",
          text: [
            `🚀 Job created!`,
            `   ID:          ${jobId}`,
            `   Status:      ${jobStatus}`,
            `   Environment: ${environment || "(none)"}`,
            "",
            `Track it: factory_get_job(id="${jobId}")`,
          ].join("\n"),
        },
      ],
      details: { jobId, status: jobStatus, environment },
    };
  },
};

// ─── Get Job ───────────────────────────────────────────────────────────────────

export const getJobTool = {
  name: "factory_get_job" as const,
  label: "Get Job Status",
  description:
    "Get the current status and details of a factory job by its ID. Includes results for completed jobs.",
  parameters: Type.Object({
    id: Type.String({ description: "Job ID (returned from factory_create_job)" }),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const r = await factoryApi<{ job: JobInfo }>(config, `/jobs/${encodeURIComponent(params.id)}`);

    if (!r.ok || !r.data) {
      return {
        content: [{ type: "text", text: `❌ Job "${params.id}" not found: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const job = r.data.job;
    const icon = statusIcon(job.status);
    const created = formatTimestamp(job.createdAt);
    const started = job.startedAt ? formatTimestamp(job.startedAt) : "—";
    const completed = job.completedAt ? formatTimestamp(job.completedAt) : "—";
    const duration = job.startedAt && job.completedAt
      ? formatDuration(job.completedAt - job.startedAt)
      : job.startedAt
        ? "running..."
        : "—";

    const lines = [
      `${icon} Job ${job.id.slice(0, 8)}`,
      `   Status:      ${job.status}`,
      `   Mode:        ${job.task.mode}`,
      `   Environment: ${job.environment || "(none)"}`,
      `   Repo:        ${job.repo || "(none)"}`,
      `   Branch:      ${job.branch || "(none)"}`,
      `   Created:     ${created}`,
      `   Started:     ${started}`,
      `   Completed:   ${completed}`,
      `   Duration:    ${duration}`,
    ];

    // Task details
    if (job.task.mode === "single" && "agent" in job.task) {
      lines.push(`   Agent:       ${job.task.agent}`);
      lines.push(`   Task:        ${(job.task as any).task?.slice(0, 120) || "—"}`);
    } else if (job.task.mode === "chain" && "steps" in job.task) {
      lines.push(`   Steps:       ${(job.task as any).steps?.length || 0}`);
    } else if (job.task.mode === "parallel" && "tasks" in job.task) {
      lines.push(`   Tasks:       ${(job.task as any).tasks?.length || 0}`);
    }

    if (job.workerId) lines.push(`   Worker:      ${job.workerId.slice(0, 8)}`);

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: job,
    };
  },
};

// ─── List Jobs ─────────────────────────────────────────────────────────────────

export const listJobsTool = {
  name: "factory_list_jobs" as const,
  label: "List Factory Jobs",
  description:
    "List all jobs in the factory, including pending, running, completed, and failed jobs.",
  parameters: Type.Object({
    limit: Type.Optional(Type.Number({ description: "Max jobs to return (default: 20)" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const r = await factoryApi<{ jobs: JobInfo[] }>(config, "/jobs");

    if (!r.ok || !r.data) {
      return {
        content: [{ type: "text", text: `❌ Failed to list jobs: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const jobs = r.data.jobs;
    const limit = params.limit || config.defaultLimit;
    const shown = jobs.slice(-limit);

    if (shown.length === 0) {
      return {
        content: [{ type: "text", text: "No jobs in the factory." }],
        details: { count: 0 },
      };
    }

    const lines = [`📋 Factory Jobs (${jobs.length} total, showing last ${shown.length})`, ""];
    for (const job of shown) {
      const icon = statusIcon(job.status);
      const shortId = job.id.slice(0, 8);
      const mode = job.task.mode;
      const agent = mode === "single" ? (job.task as any).agent : `${mode}:${mode === "chain" ? (job.task as any).steps?.length : (job.task as any).tasks?.length}`;
      const env = job.environment || "—";
      lines.push(`   ${icon} ${shortId}  ${job.status.padEnd(9)}  ${mode.padEnd(8)}  ${String(agent).slice(0, 20)}  env=${env}`);
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: { count: jobs.length, shown: shown.length },
    };
  },
};

// ─── Stream Job ────────────────────────────────────────────────────────────────

export const streamJobTool = {
  name: "factory_stream_job" as const,
  label: "Stream Job Output",
  description:
    "Stream live updates from a running job via SSE. Returns the final state when the job completes. Useful for watching long-running chain/parallel jobs.",
  parameters: Type.Object({
    id: Type.String({ description: "Job ID to stream" }),
    timeout: Type.Optional(Type.Number({ description: "Max seconds to wait (default: 120)" })),
  }),
  async execute(_id: string, params: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const jobId = params.id;
    const timeout = (params.timeout || 120) * 1000;
    const pollInterval = 2000;

    const start = Date.now();
    let lastStatus = "";

    while (Date.now() - start < timeout) {
      const r = await factoryApi<{ job: JobInfo }>(config, `/jobs/${encodeURIComponent(jobId)}`);

      if (!r.ok || !r.data) {
        return {
          content: [{ type: "text", text: `❌ Job "${jobId}" not found: ${r.error || "unknown"}` }],
          isError: true,
          details: {},
        };
      }

      const job = r.data.job;
      const status = job.status;

      if (status === "completed" || status === "failed" || status === "partial") {
        const icon = statusIcon(status);
        const duration = job.completedAt && job.startedAt
          ? formatDuration(job.completedAt - job.startedAt)
          : "unknown";

        const lines = [
          `${icon} Job ${jobId.slice(0, 8)} finished: ${status}`,
          `   Duration: ${duration}`,
        ];

        if (job.result) {
          const resultPreview = JSON.stringify(job.result).slice(0, 500);
          lines.push(`   Result: ${resultPreview}`);
        }

        return {
          content: [{ type: "text", text: lines.join("\n") }],
          details: job,
        };
      }

      // Show progress updates when status changes
      if (status !== lastStatus) {
        lastStatus = status;
        // Don't output intermediate states — just wait for completion
      }

      await new Promise(resolve => setTimeout(resolve, pollInterval));
    }

    return {
      content: [
        {
          type: "text",
          text: [
            `⏰ Timed out waiting for job ${jobId.slice(0, 8)} after ${timeout / 1000}s.`,
            `   The job may still be running. Check back with factory_get_job(id="${jobId}").`,
          ].join("\n"),
        },
      ],
      details: { jobId, timeout: timeout / 1000, status: lastStatus },
    };
  },
};
