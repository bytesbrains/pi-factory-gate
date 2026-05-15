# Factory Gate — Agent Usage Guide

> You are an AI agent. Use factory-gate tools to interact with the wrok.in AI Factory orchestrator.

## Quickstart

```bash
factory_status()                         # Check factory health
factory_list_agents()                    # See available agents
factory_create_job(mode="single", agent="code-reviewer", task="Review the diff")
factory_stream_job(id="<job-id>")        # Wait for completion
```

## Job Modes

- **single** — one agent, one task: `factory_create_job(mode="single", agent="analyzer", task="Analyze the codebase")`
- **chain** — sequential agents: `factory_create_job(mode="chain", steps='[{"agent":"planner","task":"Plan"},{"agent":"builder","task":"Build"}]')`
- **parallel** — concurrent agents: `factory_create_job(mode="parallel", tasks='[{"agent":"linter","task":"Lint"},{"agent":"tester","task":"Test"}]')`

## Environments

```bash
factory_list_environments()                  # List registered environments
factory_create_environment(name="app", repo="https://github.com/user/app.git")
factory_create_job(mode="single", agent="builder", task="Build", environment="app")
```

Skip environments with direct repo dispatch:
```bash
factory_create_job(mode="single", agent="analyzer", task="Analyze", repo="https://github.com/user/repo.git", branch="main")
```

## Workflows & Monitoring

```bash
factory_list_workflows()                     # List workflow templates
factory_run_workflow(template="ci-review")   # Execute a workflow
factory_list_workers()                       # Worker health
factory_get_events()                         # Recent system events
```

## Job Lifecycle

```
factory_create_job(...)
  │
  ▼
factory_get_job(id="...")     ← check status anytime
  │
  ▼
factory_stream_job(id="...")  ← wait for completion
  │
  ▼
[result]                       ← final state: completed | failed | partial
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `factory_status()` fails | Check that the orchestrator is running. Verify `.factoryrc.yml` has the correct `orchestratorUrl`. |
| Job stays "pending" | All workers are busy or offline. Check `factory_list_workers()`. |
| "Environment not found" | Run `factory_list_environments()` to see what's available, or create one with `factory_create_environment()`. |
| 409 Conflict on job create | An exclusive agent is already working on the same branch. Wait for it to complete or use `force: true`. |
| 503 "Job creation disabled" | Jobs are toggled off in the factory dashboard. Toggle "Jobs On" to re-enable. |
| "Agent not found" | Run `factory_list_agents()` to see available agents. Check the environment context. |

## Config Reference

`.factoryrc.yml`:

| Key | Default | Description |
|-----|---------|-------------|
| `orchestratorUrl` | `http://localhost:3002` | Factory orchestrator URL |
| `defaultEnvironment` | (none) | Default environment for jobs |
| `defaultLimit` | `20` | Items per list operation |
| `requestTimeout` | `15000` | API timeout in ms |
| `maxLogLines` | `500` | Max output lines for streaming |
