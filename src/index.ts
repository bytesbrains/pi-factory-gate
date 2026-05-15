/**
 * pi-factory-gate — AI Factory Orchestration Gate
 *
 * Tools: factory_list_agents, factory_get_agent, factory_create_job,
 *        factory_get_job, factory_list_jobs, factory_stream_job,
 *        factory_list_environments, factory_get_environment, factory_create_environment,
 *        factory_list_workers, factory_list_workflows, factory_run_workflow,
 *        factory_get_events, factory_status
 * Config: .factoryrc.yml
 */
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { listAgentsTool, getAgentTool } from "./tools/agents";
import { createJobTool, getJobTool, listJobsTool, streamJobTool } from "./tools/jobs";
import { listEnvironmentsTool, getEnvironmentTool, createEnvironmentTool } from "./tools/environments";
import { listWorkersTool } from "./tools/workers";
import { listWorkflowsTool, runWorkflowTool } from "./tools/workflows";
import { getEventsTool, statusTool } from "./tools/events";

export default function (pi: ExtensionAPI) {
  // Agents
  pi.registerTool(listAgentsTool);
  pi.registerTool(getAgentTool);

  // Jobs
  pi.registerTool(createJobTool);
  pi.registerTool(getJobTool);
  pi.registerTool(listJobsTool);
  pi.registerTool(streamJobTool);

  // Environments
  pi.registerTool(listEnvironmentsTool);
  pi.registerTool(getEnvironmentTool);
  pi.registerTool(createEnvironmentTool);

  // Workers
  pi.registerTool(listWorkersTool);

  // Workflows
  pi.registerTool(listWorkflowsTool);
  pi.registerTool(runWorkflowTool);

  // Events & Status
  pi.registerTool(getEventsTool);
  pi.registerTool(statusTool);
}
