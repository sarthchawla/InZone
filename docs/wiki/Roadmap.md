# Roadmap

This page summarizes the InZone AI Agent Platform development roadmap. For the full roadmap with Mermaid diagrams and detailed use case examples, see [ROADMAP.md](../../ROADMAP.md).

## Vision

InZone is evolving from a kanban board into a platform where AI agents autonomously execute your todos. Create a task, and the board's agent picks it up, executes it using connected tools, and delivers results -- automatically.

## Development Phases

### Phase 1: Agent Framework Foundation

Establish the database schema, API endpoints, and configuration UI for setting up agents per board. Users can configure an agent (model, prompt, triggers, MCP servers, output destinations) but no execution happens yet.

### Phase 2: Execution Engine

Build the core agent loop: trigger evaluation, prompt composition, LLM execution with tool calling, step logging, and manual/automatic triggers. This is where agents start actually doing work.

### Phase 3: MCP Integration Layer

Connect agents to external services through the Model Context Protocol. Includes a server connection pool, tool namespacing, a preset library (Brave Search, GitHub, Filesystem, PostgreSQL, Slack), and connection testing.

### Phase 4: Output and Notification System

Deliver execution results to multiple destinations simultaneously: todo cards, Telegram, Slack, files, and webhooks. Includes customizable output formatting via Handlebars templates.

### Phase 5: Real-time Updates and Streaming

Server-Sent Events for live execution progress. Todo cards update status in real time, and a board-level indicator shows agent activity.

### Phase 6: Board Templates with Agents

Pre-configured board templates (Research, Dev Project, Finance, Health, Office, Content) that come with a fully set up agent, MCP servers, and output destinations. One-click setup for new users.

### Phase 7: Smart Workflows and Advanced Features

Cost tracking, execution analytics, scheduled/recurring executions, multi-LLM provider support (OpenAI, Ollama), and production-grade job queuing with BullMQ.

### Phase 8: Multi-Agent Orchestration and Marketplace

Agent-to-agent communication, workflow orchestration across boards, community MCP server marketplace, and shared agent templates.

## Current Status

The kanban board foundation is complete:
- Multiple boards with customizable columns
- Drag-and-drop cards
- Rich text editing (Tiptap)
- Labels, tags, and board templates
- Detail side panel
- Mobile responsive design
- Authentication
- PostgreSQL with Prisma ORM
- Deployed on Vercel with Neon

Phase 1 development is next.
