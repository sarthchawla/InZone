# Architecture

This page summarizes the InZone AI Agent Platform architecture. For the full specification with database schemas, API endpoints, and implementation details, see the [Architecture Document](../../.claude/plans/ai-agent-platform-architecture.md).

## Overview

The agent platform adds four major components to the existing InZone stack:

1. **Agent Config Service** -- Stores and retrieves per-board agent configurations (model, prompt, triggers, MCP servers, outputs)
2. **Execution Engine** -- Orchestrates agent runs: picks up todos, calls LLM with tools, manages the execution lifecycle
3. **MCP Hub** -- Manages MCP server connections per board, provides tool discovery and namespacing
4. **Output Router** -- Dispatches execution results to configured destinations (todo card, Telegram, Slack, files, webhooks)

## System Architecture

```
React Frontend (apps/web)
        |
   REST API + SSE
        |
Express API (apps/api)
        |
   +----+----+--------+
   |         |        |
Agent     Execution  Output
Config    Engine     Router
Service   (Worker)
   |         |        |
   |    +----+----+   |
   |    |         |   |
   |  MCP Hub   LLM   |
   |    |      Client  |
   |    |              |
   | MCP Servers       |
   |                   |
   +----+----+---------+
        |    |
   PostgreSQL  Output Channels
   (Neon)      (TG, Slack, Files)
```

## Key Design Decisions

### Board = Agent Workspace

Each board has at most one agent configuration. This keeps the model simple: one board, one agent, one set of tools and outputs. Multi-agent orchestration comes in Phase 8.

### MCP for Tool Access

Agents access external services exclusively through MCP servers. This provides:
- A standard protocol for tool integration
- Easy addition of new capabilities (just add an MCP server)
- Tool namespacing to avoid conflicts (`github:create_issue`, `brave-search:web_search`)
- Connection pooling and lifecycle management

### Database-backed Execution Queue

Phase 1 uses an in-process queue backed by `AgentExecution` rows with status `PENDING`. This is simple and works for single-instance deployments. Phase 7 migrates to BullMQ + Redis for production-grade queuing.

### Credential Encryption

API keys and tokens are encrypted with AES-256-GCM before storage. The encryption key is managed as an environment variable (upgradeable to cloud KMS). The frontend never receives decrypted credential values.

### Progressive Enhancement

All agent features are opt-in. Boards without agent configuration work exactly as they do today. The database schema changes are purely additive -- no existing tables or columns are modified.

## Database Schema

New models added to the Prisma schema:

| Model | Purpose |
|-------|---------|
| `BoardAgent` | Per-board agent configuration (model, prompt, triggers, limits) |
| `BoardMcpConfig` | MCP server configuration per agent (command, URL, credentials) |
| `AgentOutputConfig` | Output destination configuration per agent |
| `AgentExecution` | Execution log entry (status, input, output, cost) |
| `AgentExecutionStep` | Individual step within an execution (LLM call, tool use, output delivery) |
| `AgentCredential` | Encrypted credential storage per agent |

Existing models receive new optional relations:
- `Board` gets an optional `BoardAgent` relation
- `Todo` gets an optional `AgentExecution[]` relation and a `TodoAgentStatus` enum

## API Endpoints

The agent platform adds endpoints for:

- **Agent Configuration** -- CRUD for board agent config (`/api/boards/:boardId/agent`)
- **MCP Server Configuration** -- CRUD for MCP servers (`/api/boards/:boardId/agent/mcp`)
- **Output Configuration** -- CRUD for output destinations (`/api/boards/:boardId/agent/outputs`)
- **Credentials** -- Manage encrypted credentials (`/api/boards/:boardId/agent/credentials`)
- **Execution Management** -- List, trigger, cancel, retry executions (`/api/agent/executions`)
- **Real-time Streaming** -- SSE endpoint for live execution updates (`/api/boards/:boardId/agent/stream`)

## Execution Lifecycle

1. **Trigger Evaluation** -- Is the agent enabled? Does the column match? Rate limit check.
2. **Prompt Composition** -- System prompt + todo title/description + board context + available tools.
3. **Execution Loop** -- Send to LLM, process tool calls via MCP Hub, accumulate output, check limits.
4. **Output Delivery** -- Route results to all enabled output destinations.
5. **Card Movement** -- Move todo to the configured completion or failure column.

## Security

- Credentials encrypted at rest (AES-256-GCM)
- MCP filesystem access sandboxed per board
- Execution limits: max iterations (20), max tokens, timeout (5 min)
- Per-board rate limiting and concurrency control
- Cost budgets with alerts and hard stops
- All endpoints require authentication and board ownership verification
