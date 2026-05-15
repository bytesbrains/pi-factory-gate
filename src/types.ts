/**
 * pi-factory-gate — Types
 *
 * Shared types for factory-gate configuration and API responses.
 */

// ── Factory Config ────────────────────────────────────────────────────────────

export interface FactoryConfig {
  /** Base URL of the wrok.in orchestrator (e.g. http://orchestrator:3002) */
  orchestratorUrl: string;
  /** Default environment name for job dispatch when none specified */
  defaultEnvironment?: string;
  /** Default page limit for list operations */
  defaultLimit: number;
  /** Timeout in ms for API calls */
  requestTimeout: number;
  /** Max lines for job log output */
  maxLogLines: number;
}

export const DEFAULT_CONFIG: FactoryConfig = {
  orchestratorUrl: "http://localhost:3002",
  defaultLimit: 20,
  requestTimeout: 15000,
  maxLogLines: 500,
};

// ── API Response Types ────────────────────────────────────────────────────────

export interface AgentInfo {
  name: string;
  description: string;
  tools: string[];
  model: string;
  systemPrompt?: string;
  enabled: boolean;
  source: "user" | "project" | "env";
  resolvedFrom?: string;
  isOverride?: boolean;
  extends?: string;
}

export interface AgentDetail extends AgentInfo {
  resolvedFrom: string;
  isOverride: boolean;
  extends?: string;
}

export interface JobInfo {
  id: string;
  task: {
    mode: "single" | "parallel" | "chain";
    agent?: string;
    task?: string;
    steps?: Array<{ agent: string; task: string }>;
    tasks?: Array<{ agent: string; task: string }>;
  };
  status: "pending" | "running" | "completed" | "failed" | "partial";
  createdAt: number;
  startedAt?: number;
  completedAt?: number;
  result?: unknown;
  workerId?: string;
  environment?: string;
  workflowName?: string;
  repo?: string;
  branch?: string;
}

export interface EnvironmentInfo {
  name: string;
  repo: string;
  baseBranch: string;
  currentBranch?: string;
  featureBranch?: string;
  status: "empty" | "cloning" | "ready" | "error";
  lastCommit?: string;
  error?: string;
  description?: string;
  createdAt: number;
}

export interface WorkerInfo {
  id: string;
  host: string;
  port: number;
  status: "idle" | "busy" | "offline";
  currentJobId?: string;
  completedJobs: number;
  lastHeartbeat: number;
  environment?: string;
}

export interface WorkflowInfo {
  name: string;
  path: string;
  description?: string;
}

export interface SystemEvent {
  id: string;
  ts: number;
  type: string;
  message: string;
  details?: string;
}

export interface FactoryStatus {
  service: string;
  id: string;
  status: string;
}

// ── Job Streaming ─────────────────────────────────────────────────────────────

export interface StreamEvent {
  job?: JobInfo;
  error?: string;
}
