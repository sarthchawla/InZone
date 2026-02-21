# InZone Wiki

Welcome to the InZone wiki. InZone is a kanban board application evolving into an AI-powered autonomous task execution platform.

## Pages

- **[Roadmap](Roadmap.md)** -- Development phases, timelines, and feature plans for the AI agent platform
- **[Architecture](Architecture.md)** -- Technical architecture of the agent execution engine, MCP integration, and output system

## Quick Links

- [README](../../README.md) -- Project overview, setup, and usage
- [Product Requirements Document](../../.claude/plans/inzone-prd.md) -- Original PRD
- [Full Roadmap](../../ROADMAP.md) -- Detailed roadmap with Mermaid diagrams
- [Architecture Document](../../.claude/plans/ai-agent-platform-architecture.md) -- Full architecture specification

## Project Overview

InZone started as a Trello-like kanban board with drag-and-drop cards, rich text descriptions, labels, and board templates. It is now being transformed into a platform where each board has an AI agent that autonomously executes todos using configurable LLM models and MCP-connected tools.

### Key Concepts

- **Board = Agent Workspace** -- Each board can have one AI agent configured with a model, system prompt, and tools
- **Todo = Agent Task** -- Creating a todo in a trigger column starts automatic agent execution
- **MCP = Tool Layer** -- Agents access external services (web search, GitHub, databases, messaging) through Model Context Protocol servers
- **Output = Multi-destination** -- Results are delivered to the todo card, Telegram, Slack, files, or webhooks simultaneously
- **Progressive Complexity** -- Simple boards work exactly as before; agent features are opt-in

### Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 + TypeScript, Vite, TailwindCSS, TanStack Query |
| Backend | Express 4 + TypeScript, Prisma ORM |
| Database | PostgreSQL (Neon in production) |
| Auth | Better Auth |
| Deployment | Vercel + Neon Serverless Postgres |
