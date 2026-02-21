# InZone AI Agent Platform -- Architecture Document

**Date**: 2026-02-22
**Branch**: future-roadmap
**Status**: Draft Architecture
**Vision**: Transform InZone from a kanban board into an AI-powered autonomous task execution platform

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Architecture Overview](#2-architecture-overview)
3. [Database Schema Changes](#3-database-schema-changes)
4. [Board Agent Configuration](#4-board-agent-configuration)
5. [Agent Execution Engine](#5-agent-execution-engine)
6. [MCP Integration Layer](#6-mcp-integration-layer)
7. [Output System](#7-output-system)
8. [API Changes](#8-api-changes)
9. [Frontend Changes](#9-frontend-changes)
10. [Security Considerations](#10-security-considerations)
11. [Implementation Phases](#11-implementation-phases)
12. [Open Questions](#12-open-questions)

---

## 1. Executive Summary

InZone currently operates as a standard kanban board with boards, columns, todos, labels, and drag-drop. The goal is to augment each board with an AI agent that can:

- **Automatically pick up todos** when they are created or moved to a trigger column
- **Execute work** using configurable LLM models and MCP-connected tools
- **Deliver output** to multiple destinations: the todo itself, Telegram, Slack, saved files, logs
- **Be configured per-board** with different models, tools, and execution behaviors

### Key Design Principles

1. **Board = Agent workspace** -- each board has at most one agent configuration
2. **Todos = Tasks for the agent** -- creating a todo in a trigger column starts agent execution
3. **MCP = Tool layer** -- agents access external capabilities through MCP server configs
4. **Output = Multi-destination** -- results can go to the todo, messaging apps, files, or logs
5. **Progressive complexity** -- simple boards work exactly as before; agent features are opt-in

---

## 2. Architecture Overview

```
                    +------------------+
                    |   React Frontend |
                    |   (apps/web)     |
                    +--------+---------+
                             |
                    REST API + SSE/WebSocket
                             |
                    +--------+---------+
                    |   Express API    |
                    |   (apps/api)     |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
     +--------+---+  +------+------+  +----+-------+
     | Agent      |  | Execution   |  | Output     |
     | Config     |  | Engine      |  | Router     |
     | Service    |  | (Worker)    |  |            |
     +--------+---+  +------+------+  +----+-------+
              |              |              |
              |     +--------+--------+     |
              |     |                 |     |
              |  +--+--+       +-----+--+  |
              |  | MCP |       | LLM    |  |
              |  | Hub |       | Client |  |
              |  +--+--+       +--------+  |
              |     |                      |
              |  +--+------------------+   |
              |  | MCP Servers         |   |
              |  | (web search, GitHub,|   |
              |  |  filesystem, DB,    |   |
              |  |  messaging, etc.)   |   |
              |  +---------------------+   |
              |                            |
              +----------+---------+-------+
                         |         |
                  +------+---+ +---+------+
                  | PostgreSQL| | Output   |
                  | (Neon)   | | Channels |
                  +----------+ | (TG,     |
                               | Slack,   |
                               | Files)   |
                               +----------+
```

### Component Responsibilities

| Component | Role |
|-----------|------|
| **Agent Config Service** | Stores and retrieves per-board agent configurations |
| **Execution Engine** | Orchestrates agent runs: picks up todos, calls LLM + tools, manages lifecycle |
| **MCP Hub** | Manages MCP server connections per-board, provides tool discovery |
| **LLM Client** | Abstraction over model providers (Anthropic, OpenAI, local) |
| **Output Router** | Dispatches execution results to configured destinations |

---

## 3. Database Schema Changes

### New Models

```prisma
// =========================================
// AGENT CONFIGURATION (per-board)
// =========================================

model BoardAgent {
  id        String   @id @default(cuid())
  boardId   String   @unique
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)

  // Agent identity
  name        String    @default("Agent")
  description String?
  enabled     Boolean   @default(false)

  // LLM Configuration
  modelProvider  ModelProvider  @default(ANTHROPIC)
  modelId        String         @default("claude-sonnet-4-20250514")
  temperature    Float          @default(0.7)
  maxTokens      Int            @default(4096)
  systemPrompt   String?        // Custom system prompt for this board's agent

  // Execution Configuration
  triggerMode    TriggerMode    @default(ON_CREATE)
  triggerColumnId String?       // If set, only todos in this column trigger the agent
  outputColumnId  String?       // Column to move todo to after completion (e.g., "Done")
  failureColumnId String?       // Column to move todo to on failure

  // Rate limiting
  maxConcurrent  Int      @default(1)
  cooldownMs     Int      @default(5000)  // Min time between executions

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Relations
  mcpConfigs    BoardMcpConfig[]
  outputConfigs AgentOutputConfig[]
  executions    AgentExecution[]
  credentials   AgentCredential[]

  @@index([boardId])
  @@map("board_agents")
}

// =========================================
// MCP SERVER CONFIGURATION (per-board)
// =========================================

model BoardMcpConfig {
  id           String  @id @default(cuid())
  boardAgentId String
  boardAgent   BoardAgent @relation(fields: [boardAgentId], references: [id], onDelete: Cascade)

  // MCP Server details
  name        String              // Display name (e.g., "Web Search", "GitHub")
  serverType  McpServerType       // STDIO, SSE, STREAMABLE_HTTP
  command     String?             // For STDIO: the command to run
  args        Json?               // For STDIO: command arguments array
  url         String?             // For SSE/HTTP: server URL
  env         Json?               // Environment variables (encrypted at rest)
  headers     Json?               // HTTP headers for SSE/HTTP servers

  enabled     Boolean   @default(true)
  position    Int       @default(0)

  createdAt   DateTime  @default(now())
  updatedAt   DateTime  @updatedAt

  @@index([boardAgentId])
  @@map("board_mcp_configs")
}

// =========================================
// OUTPUT CONFIGURATION (per-board)
// =========================================

model AgentOutputConfig {
  id           String  @id @default(cuid())
  boardAgentId String
  boardAgent   BoardAgent @relation(fields: [boardAgentId], references: [id], onDelete: Cascade)

  // Output destination
  destination   OutputDestination
  enabled       Boolean   @default(true)

  // Destination-specific config (stored as JSON)
  // Telegram: { chatId, botToken (ref to credential) }
  // Slack: { channelId, webhookUrl (ref to credential) }
  // File: { directory, filenameTemplate }
  // Todo: { appendMode: true/false }
  // Log: { level: "info" }
  config        Json      @default("{}")

  // Formatting
  formatTemplate String?  // Optional Handlebars/Mustache template for output formatting

  position      Int       @default(0)

  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([boardAgentId])
  @@map("agent_output_configs")
}

// =========================================
// AGENT EXECUTION LOG
// =========================================

model AgentExecution {
  id           String  @id @default(cuid())
  boardAgentId String
  boardAgent   BoardAgent @relation(fields: [boardAgentId], references: [id], onDelete: Cascade)

  todoId       String
  todo         Todo    @relation(fields: [todoId], references: [id], onDelete: Cascade)

  // Execution state
  status       ExecutionStatus  @default(PENDING)
  startedAt    DateTime?
  completedAt  DateTime?

  // Input/Output
  inputPrompt  String           // The composed prompt sent to the LLM
  output       String?          // Raw output from the agent
  outputMeta   Json?            // Structured metadata (tokens used, tools called, etc.)

  // Error tracking
  error        String?
  retryCount   Int       @default(0)
  maxRetries   Int       @default(3)

  // Cost tracking
  inputTokens  Int?
  outputTokens Int?
  totalCost    Float?           // Estimated cost in USD

  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  // Execution steps for detailed tracking
  steps        AgentExecutionStep[]

  @@index([boardAgentId])
  @@index([todoId])
  @@index([status])
  @@map("agent_executions")
}

model AgentExecutionStep {
  id           String  @id @default(cuid())
  executionId  String
  execution    AgentExecution @relation(fields: [executionId], references: [id], onDelete: Cascade)

  // Step details
  stepNumber   Int
  type         StepType         // LLM_CALL, TOOL_USE, TOOL_RESULT, OUTPUT_DELIVERY, ERROR
  toolName     String?          // Name of the MCP tool called
  input        Json?            // Input to the step
  output       Json?            // Output from the step
  durationMs   Int?

  createdAt    DateTime  @default(now())

  @@index([executionId])
  @@map("agent_execution_steps")
}

// =========================================
// CREDENTIAL STORAGE (encrypted)
// =========================================

model AgentCredential {
  id           String  @id @default(cuid())
  boardAgentId String
  boardAgent   BoardAgent @relation(fields: [boardAgentId], references: [id], onDelete: Cascade)

  name         String     // e.g., "telegram_bot_token", "github_pat"
  value        String     // Encrypted value (AES-256-GCM)
  iv           String     // Initialization vector for decryption

  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt

  @@unique([boardAgentId, name])
  @@index([boardAgentId])
  @@map("agent_credentials")
}

// =========================================
// ENUMS
// =========================================

enum ModelProvider {
  ANTHROPIC
  OPENAI
  GOOGLE
  LOCAL        // For local models (Ollama, etc.)
}

enum TriggerMode {
  ON_CREATE       // Trigger when todo is created in trigger column
  ON_MOVE         // Trigger when todo is moved to trigger column
  ON_CREATE_OR_MOVE  // Both
  MANUAL          // Only trigger via explicit "Run Agent" button
}

enum McpServerType {
  STDIO
  SSE
  STREAMABLE_HTTP
}

enum OutputDestination {
  TODO_DESCRIPTION   // Write output back to the todo's description
  TODO_COMMENT       // Add as a comment on the todo (future: when comments exist)
  TELEGRAM
  SLACK
  FILE
  LOG
  WEBHOOK           // Generic webhook POST
}

enum ExecutionStatus {
  PENDING
  RUNNING
  COMPLETED
  FAILED
  CANCELLED
  TIMEOUT
}

enum StepType {
  LLM_CALL
  TOOL_USE
  TOOL_RESULT
  OUTPUT_DELIVERY
  ERROR
}
```

### Changes to Existing Models

```prisma
// Add to existing Board model:
model Board {
  // ... existing fields ...
  agent  BoardAgent?  // One-to-one: each board has at most one agent
}

// Add to existing Todo model:
model Todo {
  // ... existing fields ...
  executions  AgentExecution[]  // History of agent executions for this todo
  agentStatus TodoAgentStatus?  @default(NONE)
}

enum TodoAgentStatus {
  NONE          // No agent involvement
  QUEUED        // Waiting for agent to pick up
  PROCESSING    // Agent is currently working on it
  COMPLETED     // Agent finished successfully
  FAILED        // Agent failed
}
```

### Migration Strategy

The schema changes are purely additive -- no existing tables or columns are modified (only new relation fields added to Board and Todo). This means:

1. Create migration: `pnpm --filter api prisma migrate dev --name add_agent_platform`
2. No data migration needed -- existing boards simply have `agent: null`
3. The `TodoAgentStatus` defaults to `NONE`, so existing todos are unaffected

---

## 4. Board Agent Configuration

### Configuration UI Flow

When a user opens a board's settings, they see a new "Agent" tab:

```
+--------------------------------------------------+
|  Board Settings                              [X]  |
+--------------------------------------------------+
|  [General]  [Columns]  [Agent]  [Outputs]         |
+--------------------------------------------------+
|                                                    |
|  Agent Configuration                               |
|  +-----------+                                     |
|  | [Toggle] Enable Agent                           |
|  +-----------+                                     |
|                                                    |
|  Agent Name: [Research Assistant        ]          |
|  System Prompt:                                    |
|  +--------------------------------------------+   |
|  | You are a research assistant. When given a  |   |
|  | topic, search the web, compare options, and |   |
|  | produce a structured analysis with prices,  |   |
|  | pros/cons, and recommendations.             |   |
|  +--------------------------------------------+   |
|                                                    |
|  Model: [Anthropic Claude Sonnet 4] [v]           |
|  Temperature: [0.7] Max Tokens: [4096]            |
|                                                    |
|  Trigger:                                          |
|  (*) When todo created in column: [Todo  ] [v]    |
|  ( ) When todo moved to column:   [      ] [v]    |
|  ( ) Manual only (click "Run" on each todo)       |
|                                                    |
|  After completion, move to: [Done    ] [v]        |
|  On failure, move to:       [Backlog ] [v]        |
|                                                    |
|  +----------------------------------------------+ |
|  | MCP Servers                        [+ Add]    | |
|  |----------------------------------------------| |
|  | [x] Web Search (Brave Search)                 | |
|  | [x] GitHub (via PAT)                          | |
|  | [ ] Filesystem (local files)                  | |
|  | [x] PostgreSQL (DB queries)                   | |
|  +----------------------------------------------+ |
|                                                    |
|               [Save Configuration]                 |
+--------------------------------------------------+
```

### Pre-configured Board Templates

Extend `BoardTemplate` to include optional agent configuration:

```typescript
// Example: Research Board Template
{
  name: "Research Board",
  description: "AI-powered research with web search and structured output",
  columns: [
    { name: "Research Queue" },
    { name: "In Progress" },
    { name: "Done" }
  ],
  agentConfig: {
    name: "Research Agent",
    modelProvider: "ANTHROPIC",
    modelId: "claude-sonnet-4-20250514",
    systemPrompt: "You are a research assistant. For each task, search the web for relevant information, compare options, and produce a structured report with sources, pricing (convert to requested currencies), pros/cons, and a recommendation.",
    triggerMode: "ON_CREATE",
    triggerColumnIndex: 0,   // "Research Queue"
    outputColumnIndex: 2,    // "Done"
    mcpServers: [
      { name: "Web Search", serverType: "STDIO", command: "brave-search-mcp" }
    ],
    outputs: [
      { destination: "TODO_DESCRIPTION" }
    ]
  }
}
```

### Suggested Board Templates with Agents

| Template | Agent Name | MCP Servers | Output | Use Case |
|----------|-----------|-------------|--------|----------|
| **Research** | Research Agent | Web Search, Calculator | Todo + optional Telegram | Product comparisons, price research |
| **Dev Project** | Dev Agent | GitHub, Claude Code CLI, Filesystem | Todo + GitHub PR | Feature implementation, bug fixes |
| **Finance** | Finance Agent | Web Search, Calculator, Google Sheets | Todo + File export | Expense tracking, investment research |
| **Health** | Health Agent | Web Search, Calendar | Todo + Telegram | Workout plans, nutrition research |
| **Office** | Office Agent | Slack, Email, Calendar, Jira | Todo + Slack | Meeting prep, status reports |
| **Content** | Content Agent | Web Search, Filesystem | Todo + File export | Blog posts, documentation |

---

## 5. Agent Execution Engine

### Execution Lifecycle

```
Todo Created/Moved to Trigger Column
              |
              v
+-------------------------+
| 1. TRIGGER EVALUATION   |
| - Is agent enabled?     |
| - Does column match?    |
| - Rate limit check      |
| - Concurrency check     |
+--------+----------------+
         |
         v
+-------------------------+
| 2. PROMPT COMPOSITION   |
| - System prompt          |
| - Todo title + desc      |
| - Board context          |
| - Available tools list   |
+--------+----------------+
         |
         v
+-------------------------+
| 3. EXECUTION LOOP       |
| - Send to LLM           |
| - Process tool calls    |
| - Accumulate output     |
| - Check token/time limits|
+--------+----------------+
         |
    +----+----+
    |         |
 Success   Failure
    |         |
    v         v
+--------+ +--------+
| 4a.    | | 4b.    |
| OUTPUT | | ERROR  |
| ROUTER | | HANDLE |
+--------+ +--------+
    |         |
    v         v
+--------+ +--------+
| 5a.    | | 5b.    |
| Move   | | Move   |
| to Out | | to Fail|
| Column | | Column |
+--------+ +--------+
```

### Engine Implementation Architecture

```
apps/api/src/
  agent/
    engine/
      AgentEngine.ts          -- Main orchestrator
      PromptComposer.ts       -- Builds prompts from todo + config
      ExecutionRunner.ts       -- Runs the LLM loop with tool calling
      TriggerEvaluator.ts     -- Decides whether to trigger an execution
    mcp/
      McpHub.ts               -- Manages MCP server connections per-board
      McpServerPool.ts        -- Connection pooling for MCP servers
      McpToolAdapter.ts       -- Adapts MCP tools to LLM tool format
    llm/
      LlmClient.ts            -- Abstract LLM client interface
      AnthropicClient.ts      -- Anthropic API implementation
      OpenAiClient.ts         -- OpenAI API implementation
      LocalClient.ts          -- Ollama/local model implementation
    output/
      OutputRouter.ts         -- Routes output to configured destinations
      destinations/
        TodoOutputHandler.ts   -- Writes to todo description
        TelegramHandler.ts     -- Sends to Telegram
        SlackHandler.ts        -- Sends to Slack
        FileHandler.ts         -- Saves to file
        WebhookHandler.ts      -- POSTs to webhook
        LogHandler.ts          -- Writes to execution log
    queue/
      ExecutionQueue.ts        -- In-process job queue (upgradeable to BullMQ)
      RateLimiter.ts           -- Per-board rate limiting
    credentials/
      CredentialService.ts     -- Encrypt/decrypt credentials (AES-256-GCM)
```

### Trigger Flow (in TodoService)

When a todo is created or moved, the existing service calls into the trigger evaluator:

```typescript
// In todo.service.ts (modified)
async createTodo(input: CreateTodoInput): Promise<TodoWithLabels | null> {
  const todo = await this.prisma.todo.create({ ... });

  // After creation, check if board has an agent configured for this column
  await this.agentTriggerService.evaluateAndEnqueue(todo);

  return todo;
}
```

### Execution Runner (Core Loop)

The execution runner implements the standard LLM agent loop:

```typescript
class ExecutionRunner {
  async run(execution: AgentExecution, config: BoardAgent): Promise<ExecutionResult> {
    const mcpTools = await this.mcpHub.getToolsForBoard(config.id);
    const prompt = this.promptComposer.compose(execution.todo, config, mcpTools);

    let messages = [{ role: 'user', content: prompt }];
    let iteration = 0;
    const maxIterations = 20; // Safety limit

    while (iteration < maxIterations) {
      const response = await this.llmClient.chat({
        model: config.modelId,
        systemPrompt: config.systemPrompt,
        messages,
        tools: mcpTools,
        maxTokens: config.maxTokens,
        temperature: config.temperature,
      });

      // Log step
      await this.logStep(execution.id, iteration, 'LLM_CALL', response);

      if (response.stopReason === 'end_turn') {
        return { status: 'COMPLETED', output: response.content };
      }

      if (response.stopReason === 'tool_use') {
        for (const toolCall of response.toolCalls) {
          const result = await this.mcpHub.callTool(
            config.id, toolCall.name, toolCall.input
          );
          await this.logStep(execution.id, iteration, 'TOOL_RESULT', result);
          messages.push({ role: 'tool', content: result });
        }
      }

      iteration++;
    }

    return { status: 'TIMEOUT', error: 'Max iterations exceeded' };
  }
}
```

### Queue Architecture

For the initial implementation, use an in-process queue backed by the database:

```
Phase 1 (MVP): In-process queue
  - AgentExecution rows with status PENDING are polled
  - Single-process execution with concurrency limit
  - Suitable for Vercel serverless with background functions

Phase 2 (Scale): BullMQ + Redis
  - Dedicated worker process
  - Proper job scheduling, retries, priorities
  - Dashboard for monitoring

Phase 3 (Enterprise): Temporal.io
  - Durable execution workflows
  - Long-running agents with checkpoints
  - Cross-service orchestration
```

---

## 6. MCP Integration Layer

### MCP Hub Architecture

Each board's agent has its own set of MCP server configurations. The MCP Hub manages server lifecycle:

```
+-------------------+
| MCP Hub           |
|                   |
|  boardId -> Pool  |
|  +--------------+ |
|  | Server Pool  | |
|  |              | |
|  | web-search --+-+-> Brave Search MCP (STDIO)
|  | github ------+-+-> GitHub MCP (STDIO)
|  | postgres ----+-+-> PostgreSQL MCP (STDIO)
|  |              | |
|  +--------------+ |
+-------------------+
```

### Server Lifecycle

```
1. Board agent is enabled
   -> McpHub.initializeBoard(boardAgentId)
   -> For each BoardMcpConfig: spawn/connect MCP server
   -> Cache active connections

2. Todo triggers execution
   -> McpHub.getToolsForBoard(boardAgentId)
   -> Returns aggregated tool list from all active servers
   -> McpHub.callTool(boardAgentId, toolName, input)
   -> Routes to correct server, returns result

3. Board agent is disabled or board is deleted
   -> McpHub.teardownBoard(boardAgentId)
   -> Gracefully disconnect all MCP servers
   -> Clear cached connections
```

### MCP Server Presets

Provide a library of pre-configured MCP server definitions users can add with one click:

```typescript
const MCP_PRESETS = {
  'brave-search': {
    name: 'Web Search (Brave)',
    serverType: 'STDIO',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-brave-search'],
    requiredCredentials: ['BRAVE_API_KEY'],
    description: 'Search the web using Brave Search API',
  },
  'github': {
    name: 'GitHub',
    serverType: 'STDIO',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-github'],
    requiredCredentials: ['GITHUB_TOKEN'],
    description: 'Access GitHub repos, issues, PRs',
  },
  'filesystem': {
    name: 'Filesystem',
    serverType: 'STDIO',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-filesystem', '/tmp/inzone-agent'],
    requiredCredentials: [],
    description: 'Read/write files in a sandboxed directory',
  },
  'postgres': {
    name: 'PostgreSQL',
    serverType: 'STDIO',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-postgres'],
    requiredCredentials: ['DATABASE_URL'],
    description: 'Query PostgreSQL databases',
  },
  'slack': {
    name: 'Slack',
    serverType: 'STDIO',
    command: 'npx',
    args: ['-y', '@anthropic/mcp-server-slack'],
    requiredCredentials: ['SLACK_BOT_TOKEN'],
    description: 'Send messages and manage Slack channels',
  },
};
```

### Tool Namespacing

Since multiple MCP servers may expose tools with the same name, the Hub namespaces them:

```
brave-search:web_search
github:create_issue
github:list_repos
postgres:query
slack:send_message
```

The LLM sees the namespaced names, and the Hub routes calls to the correct server.

---

## 7. Output System

### Output Router

After execution completes, the Output Router delivers results to all enabled destinations:

```typescript
class OutputRouter {
  private handlers: Map<OutputDestination, OutputHandler>;

  async deliver(
    execution: AgentExecution,
    config: AgentOutputConfig[],
    result: ExecutionResult
  ): Promise<DeliveryReport[]> {
    const reports: DeliveryReport[] = [];

    for (const outputConfig of config.filter(c => c.enabled)) {
      const handler = this.handlers.get(outputConfig.destination);
      if (!handler) continue;

      try {
        const formatted = this.formatOutput(result.output, outputConfig.formatTemplate);
        await handler.deliver(formatted, outputConfig.config, execution);
        reports.push({ destination: outputConfig.destination, status: 'delivered' });
      } catch (error) {
        reports.push({ destination: outputConfig.destination, status: 'failed', error });
      }
    }

    return reports;
  }
}
```

### Output Destination Details

#### TODO_DESCRIPTION
- Appends or replaces the todo's description with the agent output
- Supports markdown formatting
- Optionally wraps in a collapsible section: `<details><summary>Agent Output</summary>...</details>`

#### TELEGRAM
- Uses Telegram Bot API to send messages
- Config: `{ botToken: "credential:telegram_bot_token", chatId: "123456" }`
- Supports markdown formatting via `parse_mode: "MarkdownV2"`
- Long outputs are chunked into multiple messages (4096 char limit)

#### SLACK
- Uses Slack Incoming Webhooks or Bot API
- Config: `{ webhookUrl: "credential:slack_webhook", channelId: "C123" }`
- Converts output to Slack Block Kit format

#### FILE
- Saves output to a file
- Config: `{ directory: "/outputs", filenameTemplate: "{{boardName}}/{{todoTitle}}-{{date}}.md" }`
- Useful for reports, research documents

#### WEBHOOK
- POSTs the execution result as JSON to a URL
- Config: `{ url: "https://...", headers: {...}, method: "POST" }`
- Useful for custom integrations

#### LOG
- Always active implicitly -- stored in `AgentExecution.output`
- Viewable in the execution history UI

### Output Format Templates

Users can customize output formatting per destination using Handlebars templates:

```handlebars
## {{todoTitle}}

**Status**: {{status}}
**Completed**: {{completedAt}}
**Tokens Used**: {{inputTokens}} in / {{outputTokens}} out

---

{{output}}

---
*Generated by InZone Agent ({{agentName}}) on {{date}}*
```

---

## 8. API Changes

### New Endpoints

#### Agent Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/agent` | Get board agent config |
| PUT | `/api/boards/:boardId/agent` | Create or update agent config |
| DELETE | `/api/boards/:boardId/agent` | Delete agent config |
| POST | `/api/boards/:boardId/agent/toggle` | Enable/disable agent |

#### MCP Server Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/agent/mcp` | List MCP server configs |
| POST | `/api/boards/:boardId/agent/mcp` | Add MCP server config |
| PUT | `/api/boards/:boardId/agent/mcp/:id` | Update MCP server config |
| DELETE | `/api/boards/:boardId/agent/mcp/:id` | Remove MCP server config |
| GET | `/api/agent/mcp-presets` | List available MCP server presets |
| POST | `/api/boards/:boardId/agent/mcp/:id/test` | Test MCP server connection |

#### Output Configuration

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/agent/outputs` | List output configs |
| POST | `/api/boards/:boardId/agent/outputs` | Add output config |
| PUT | `/api/boards/:boardId/agent/outputs/:id` | Update output config |
| DELETE | `/api/boards/:boardId/agent/outputs/:id` | Remove output config |

#### Execution Management

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/agent/executions` | List executions (paginated) |
| GET | `/api/agent/executions/:id` | Get execution details with steps |
| POST | `/api/todos/:todoId/execute` | Manually trigger agent execution |
| POST | `/api/agent/executions/:id/cancel` | Cancel running execution |
| POST | `/api/agent/executions/:id/retry` | Retry failed execution |

#### Credentials

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/agent/credentials` | List credential names (no values) |
| POST | `/api/boards/:boardId/agent/credentials` | Add/update credential |
| DELETE | `/api/boards/:boardId/agent/credentials/:name` | Delete credential |

#### Real-time Updates (SSE)

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards/:boardId/agent/stream` | SSE stream for execution updates |

### Example: Agent Configuration Payload

```json
PUT /api/boards/abc123/agent
{
  "name": "Research Agent",
  "enabled": true,
  "modelProvider": "ANTHROPIC",
  "modelId": "claude-sonnet-4-20250514",
  "temperature": 0.7,
  "maxTokens": 4096,
  "systemPrompt": "You are a research assistant...",
  "triggerMode": "ON_CREATE",
  "triggerColumnId": "col_todo",
  "outputColumnId": "col_done",
  "failureColumnId": "col_backlog",
  "maxConcurrent": 1,
  "cooldownMs": 5000
}
```

### Example: Execution SSE Events

```
event: execution_started
data: {"executionId":"exec_1","todoId":"todo_1","status":"RUNNING"}

event: execution_step
data: {"executionId":"exec_1","step":1,"type":"LLM_CALL","preview":"Searching for projector prices..."}

event: tool_call
data: {"executionId":"exec_1","step":2,"type":"TOOL_USE","toolName":"brave-search:web_search","input":{"query":"best projectors 2026 price comparison"}}

event: tool_result
data: {"executionId":"exec_1","step":3,"type":"TOOL_RESULT","toolName":"brave-search:web_search","resultPreview":"Found 10 results..."}

event: execution_completed
data: {"executionId":"exec_1","status":"COMPLETED","outputPreview":"## Projector Comparison...","tokenUsage":{"input":1234,"output":5678}}
```

---

## 9. Frontend Changes

### New Components

```
apps/web/src/
  components/
    agent/
      AgentConfigPanel.tsx        -- Main agent config UI (tabbed panel)
      AgentToggle.tsx             -- Enable/disable toggle with status indicator
      AgentModelSelector.tsx      -- Model provider + model picker
      AgentPromptEditor.tsx       -- System prompt textarea with templates
      AgentTriggerConfig.tsx      -- Trigger mode + column selectors
      McpServerList.tsx           -- List of configured MCP servers
      McpServerForm.tsx           -- Add/edit MCP server config
      McpPresetPicker.tsx         -- Pick from preset MCP server library
      OutputConfigList.tsx        -- List of output destinations
      OutputConfigForm.tsx        -- Add/edit output config
      CredentialManager.tsx       -- Manage encrypted credentials
      ExecutionHistory.tsx        -- List of past executions with status
      ExecutionDetail.tsx         -- Detailed view of execution steps
      ExecutionStream.tsx         -- Real-time execution progress (SSE)
      TodoAgentStatus.tsx         -- Status badge on todo card
      AgentRunButton.tsx          -- Manual "Run Agent" button on todo
```

### UI Integration Points

#### 1. Board Header -- Agent Status Indicator

```
+----------------------------------------------------------+
| <- Back    Research Board    [Agent: Active] [Settings]   |
+----------------------------------------------------------+
```

A small indicator in the board header shows whether the agent is enabled and its current state (idle, running N tasks, error).

#### 2. Todo Card -- Agent Status Badge

```
+---------------------------+
| Research projectors       |
| [HIGH] [Agent: Running]   |
| Due: Feb 25               |
+---------------------------+
```

Each todo card shows its agent status: None, Queued, Processing (with spinner), Completed, Failed.

#### 3. Detail Panel -- Execution Tab

When viewing a todo in the side panel, add an "Agent" tab:

```
+--------------------------------------------------+
|  Todo Details                                [X]  |
+--------------------------------------------------+
|  [Details]  [Labels]  [Agent]                     |
+--------------------------------------------------+
|                                                    |
|  Agent Execution History                           |
|                                                    |
|  [Run #3] Completed - Feb 22, 14:30              |
|  Duration: 12s | Tokens: 1.2k/5.6k | $0.02      |
|  +--------------------------------------------+   |
|  | Step 1: Searching web for "projectors..."   |   |
|  | Step 2: Tool: brave-search:web_search       |   |
|  | Step 3: Analyzing 10 results...             |   |
|  | Step 4: Writing comparison report...        |   |
|  | Step 5: Output delivered to todo            |   |
|  +--------------------------------------------+   |
|                                                    |
|  [Run Again]  [View Full Output]                   |
|                                                    |
+--------------------------------------------------+
```

#### 4. Board Settings -- Agent Config Tab

Full agent configuration panel as described in Section 4.

### State Management

Add new TanStack Query hooks:

```typescript
// hooks/useAgent.ts
export function useBoardAgent(boardId: string) { ... }
export function useUpdateBoardAgent(boardId: string) { ... }
export function useBoardMcpConfigs(boardId: string) { ... }
export function useBoardOutputConfigs(boardId: string) { ... }
export function useAgentExecutions(boardId: string) { ... }
export function useExecutionDetail(executionId: string) { ... }
export function useExecutionStream(boardId: string) { ... }  // SSE hook
export function useTriggerExecution(todoId: string) { ... }
```

---

## 10. Security Considerations

### Credential Management

| Concern | Mitigation |
|---------|-----------|
| API keys stored in DB | AES-256-GCM encryption with per-deployment encryption key |
| Credential exposure in logs | Never log decrypted values; mask in execution step logs |
| MCP server env vars | Decrypt only at execution time, pass to spawned process |
| Frontend never sees secrets | API returns credential names only, never values |

### Execution Sandboxing

| Concern | Mitigation |
|---------|-----------|
| MCP filesystem access | Sandbox to `/tmp/inzone-agent/{boardId}/` per board |
| Runaway execution | Max iterations (20), max tokens, execution timeout (5 min) |
| Resource exhaustion | Per-board concurrency limit, global rate limiting |
| Cost control | Per-board daily token budget; alert at 80%, hard stop at 100% |
| Malicious prompts | System prompt is set by board owner, not end users; input sanitization |

### Rate Limiting

```typescript
// Per-board limits (configurable)
{
  maxConcurrent: 1,           // Max simultaneous executions
  cooldownMs: 5000,           // Min time between executions
  maxExecutionsPerHour: 20,   // Hourly execution cap
  maxTokensPerDay: 500000,    // Daily token budget
}
```

### Authentication & Authorization

- All agent API endpoints require authentication (existing `requireAuth` middleware)
- Board ownership check on all agent operations (existing pattern in boards.ts)
- Credential operations require additional confirmation (re-auth or password)
- Agent execution respects board ownership -- only the board owner's agent can execute

### MCP Server Security

- STDIO servers run as child processes with restricted permissions
- SSE/HTTP servers must use HTTPS in production
- Environment variables for MCP servers are scoped per-execution
- Server connection timeout: 30 seconds
- Tool call timeout: 60 seconds per call

---

## 11. Implementation Phases

### Phase 1: Foundation (Agent Config + Storage)

**Goal**: Users can configure an agent for a board, but it does not execute yet.

**Deliverables**:
- Database schema migration (all new models)
- `BoardAgent` CRUD API endpoints
- `BoardMcpConfig` CRUD API endpoints
- `AgentOutputConfig` CRUD API endpoints
- `AgentCredential` CRUD API endpoints (with encryption)
- Frontend: Agent config panel in board settings
- Frontend: MCP server configuration UI
- Frontend: Output configuration UI
- Frontend: Credential management UI

**Dependencies**: None (purely additive to existing codebase)

### Phase 2: Execution Engine (Core Agent Loop)

**Goal**: Agents can execute todos and produce output.

**Deliverables**:
- `AgentEngine` orchestrator
- `PromptComposer` (todo -> prompt conversion)
- `LlmClient` abstraction + Anthropic implementation
- `ExecutionRunner` (LLM loop with tool calling)
- `ExecutionQueue` (in-process, DB-backed)
- `TriggerEvaluator` (todo create/move hooks)
- Execution logging (`AgentExecution` + `AgentExecutionStep`)
- API: Manual trigger endpoint (`POST /api/todos/:todoId/execute`)
- Frontend: "Run Agent" button on todo cards
- Frontend: Execution history in detail panel

**Dependencies**: Phase 1

### Phase 3: MCP Integration

**Goal**: Agents can use MCP tools during execution.

**Deliverables**:
- `McpHub` (server connection management)
- `McpServerPool` (lifecycle management)
- `McpToolAdapter` (MCP tools -> LLM tool format)
- Tool namespacing and routing
- MCP preset library (Brave Search, GitHub, Filesystem, PostgreSQL, Slack)
- API: MCP server test endpoint
- Frontend: MCP preset picker
- Frontend: Tool call display in execution steps

**Dependencies**: Phase 2

### Phase 4: Output System

**Goal**: Execution results are delivered to configured destinations.

**Deliverables**:
- `OutputRouter` framework
- `TodoOutputHandler` (write to todo description)
- `TelegramHandler` (Telegram Bot API)
- `SlackHandler` (Slack webhooks/API)
- `FileHandler` (file output)
- `WebhookHandler` (generic HTTP POST)
- Output format templates (Handlebars)
- Frontend: Output preview in execution detail

**Dependencies**: Phase 2

### Phase 5: Real-time Updates

**Goal**: Users see live execution progress.

**Deliverables**:
- SSE endpoint for execution streaming
- Frontend: `useExecutionStream` hook
- Frontend: `ExecutionStream` component (live step display)
- Todo card real-time status updates
- Board header agent status indicator

**Dependencies**: Phase 2

### Phase 6: Board Templates with Agents

**Goal**: Pre-configured board templates with agents for common use cases.

**Deliverables**:
- Extend `BoardTemplate` schema for agent config
- Seed templates: Research, Dev Project, Finance, Health, Office, Content
- Template preview in board creation flow showing agent capabilities
- One-click board creation with pre-configured agent

**Dependencies**: Phases 1-4

### Phase 7: Advanced Features

**Goal**: Production-grade agent platform.

**Deliverables**:
- Cost tracking and budgets per board
- Execution analytics dashboard
- Agent performance metrics (avg duration, success rate, cost)
- Multi-step workflows (agent chains)
- Scheduled/recurring executions (cron-based)
- BullMQ migration for production queue
- OpenAI + local model (Ollama) LLM client implementations

**Dependencies**: Phases 1-5

### Dependency Graph

```
Phase 1 (Foundation)
    |
    v
Phase 2 (Execution Engine)
    |
    +--------+--------+--------+
    |        |        |        |
    v        v        v        v
Phase 3  Phase 4  Phase 5  Phase 6
(MCP)    (Output) (RT)     (Templates)
    |        |        |        |
    +--------+--------+--------+
             |
             v
         Phase 7
      (Advanced)
```

---

## 12. Open Questions

1. **Vercel serverless compatibility**: The execution engine needs long-running processes for agent loops. Vercel serverless functions have a 10s (hobby) or 60s (pro) timeout. Options:
   - Use Vercel's `waitUntil()` for background execution
   - Deploy a separate worker service (e.g., on Railway, Fly.io, or a VPS)
   - Use Vercel Cron + edge functions for polling
   - **Recommendation**: Start with a separate worker service for the execution engine, keep the API on Vercel

2. **MCP server hosting**: STDIO-based MCP servers need a process to spawn into. This does not work on Vercel serverless.
   - Same solution as above: worker service handles MCP server lifecycle
   - Alternative: Use only SSE/HTTP MCP servers that run as external services

3. **Credential encryption key management**: Where to store the AES-256 encryption key?
   - Environment variable (simplest)
   - Vercel project secret
   - Cloud KMS (AWS KMS, GCP KMS) for production

4. **Cost allocation**: How to handle API key costs?
   - Users provide their own API keys (stored as credentials)
   - Platform provides shared keys with usage limits (requires billing)
   - **Recommendation**: User-provided keys for MVP

5. **Real-time transport**: SSE vs WebSocket?
   - SSE: Simpler, works with Vercel, unidirectional
   - WebSocket: Bidirectional, but needs persistent connections
   - **Recommendation**: SSE for MVP (sufficient for execution streaming)

6. **Agent-to-agent communication**: Should agents on different boards be able to interact?
   - Defer to Phase 7+; keep boards isolated initially

---

*Document Version: 1.0*
*Author: Architecture Agent*
*Last Updated: 2026-02-22*
