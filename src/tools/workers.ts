import { Type } from "typebox";
import type { ExtensionContext } from "@earendil-works/pi-coding-agent";
import { loadConfig } from "../config";
import { factoryApi, statusIcon } from "../helpers";
import type { WorkerInfo } from "../types";

// ─── List Workers ──────────────────────────────────────────────────────────────

export const listWorkersTool = {
  name: "factory_list_workers" as const,
  label: "List Factory Workers",
  description:
    "List all registered workers in the factory, including their status, current jobs, and health.",
  parameters: Type.Object({}),
  async execute(_id: string, _p: any, _s: any, _u: any, ctx: ExtensionContext) {
    const config = loadConfig(ctx.cwd);
    const r = await factoryApi<{ workers: WorkerInfo[] }>(config, "/workers");

    if (!r.ok || !r.data) {
      return {
        content: [{ type: "text", text: `❌ Failed to list workers: ${r.error || "unknown"}` }],
        isError: true,
        details: {},
      };
    }

    const workers = r.data.workers || [];
    if (workers.length === 0) {
      return {
        content: [{ type: "text", text: "No workers registered." }],
        details: { count: 0 },
      };
    }

    // Summary stats
    const idle = workers.filter(w => w.status === "idle").length;
    const busy = workers.filter(w => w.status === "busy").length;
    const offline = workers.filter(w => w.status === "offline").length;
    const totalCompleted = workers.reduce((s, w) => s + w.completedJobs, 0);

    const lines = [
      `🖥️  Factory Workers (${workers.length})`,
      `   🟢 idle: ${idle}  |  🔵 busy: ${busy}  |  🔴 offline: ${offline}  |  ✅ completed: ${totalCompleted}`,
      "",
    ];

    for (const w of workers) {
      const icon = statusIcon(w.status);
      const heartbeat = w.lastHeartbeat ? `${Math.round((Date.now() - w.lastHeartbeat) / 1000)}s ago` : "never";
      lines.push(`   ${icon} ${w.id.slice(0, 8)}  ${w.host}:${w.port}  status=${w.status}  jobs=${w.completedJobs}`);
      lines.push(`        heartbeat: ${heartbeat}${w.environment ? `  env=${w.environment}` : ""}`);
      if (w.currentJobId) {
        lines.push(`        current job: ${w.currentJobId.slice(0, 8)}`);
      }
    }

    return {
      content: [{ type: "text", text: lines.join("\n") }],
      details: { count: workers.length, idle, busy, offline, totalCompleted },
    };
  },
};
