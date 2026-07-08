# pi-factory-gate

AI Factory orchestration gateway for pi agents — dispatch jobs, manage environments, list agents/workers/workflows, and stream results from a [wrok.in](https://github.com/nandal/wrok.in) orchestrator.

## Install

```bash
pi install npm:@bytesbrains/pi-factory-gate
```

## Configuration

Add a `.factoryrc.yml` to your repo root:

```yaml
orchestratorUrl: http://localhost:3002
defaultEnvironment: default
defaultLimit: 20
requestTimeout: 15000
maxLogLines: 500
```

| Key | Default | Description |
|-----|---------|-------------|
| `orchestratorUrl` | `http://localhost:3002` | Base URL of the wrok.in orchestrator |
| `defaultEnvironment` | (none) | Default environment for job dispatch |
| `defaultLimit` | `20` | Default page size for list operations |
| `requestTimeout` | `15000` | API call timeout in ms |
| `maxLogLines` | `500` | Max lines for streamed job output |

## Tools

### Agents

| Tool | Description |
|------|-------------|
| `factory_list_agents` | List all agents, optionally filtered by environment |
| `factory_get_agent` | Get agent detail including inheritance and resolved config |

### Jobs

| Tool | Description |
|------|-------------|
| `factory_create_job` | Dispatch a job (single, chain, or parallel mode) |
| `factory_get_job` | Get job status and results |
| `factory_list_jobs` | List all jobs in the factory |
| `factory_stream_job` | Poll for completion, returns final state |

### Environments

| Tool | Description |
|------|-------------|
| `factory_list_environments` | List all registered environments |
| `factory_get_environment` | Get environment detail |
| `factory_create_environment` | Register a new environment (clone a repo) |

### Workers

| Tool | Description |
|------|-------------|
| `factory_list_workers` | List all workers with health/status |

### Workflows

| Tool | Description |
|------|-------------|
| `factory_list_workflows` | List workflow templates (DB + disk discovery) |
| `factory_run_workflow` | Execute a workflow template |

### Events & Status

| Tool | Description |
|------|-------------|
| `factory_get_events` | Get recent system events |
| `factory_status` | Health check — is the orchestrator reachable? |

## About wrok.in

This gate works with the [wrok.in](https://github.com/nandal/wrok.in) AI Factory — a personal AI workflow orchestrator that manages pi workers across Docker containers with multi-repo environments, agent inheritance, DB-backed agents, and workflow scheduling.

## License

MIT

---

Built and maintained by [BytesBrains](https://bytesbrains.com) — AI automation & agents, engineered to production standards.
*The model proposes, code guarantees.*
