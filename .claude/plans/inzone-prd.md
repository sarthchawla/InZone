# InZone - Product Requirements Document

## Executive Summary

**InZone** is a **Trello-like** todo board application that allows users to create custom boards with configurable swimlanes (columns). The application supports board templates (e.g., basic Kanban) for quick setup while allowing full customization.

**Future Vision**: InZone will integrate with Jira, Slack, Teams, and Outlook via a **push mechanism** where integrated services actively push updates to create and sync todos automatically.

---

## 1. Product Vision

### Problem Statement
Users need a simple, local-first todo management system that:
- Provides flexible board organization (like Trello)
- Can run locally without complex infrastructure
- Serves as a foundation for future integrations

### Solution
InZone provides:
- Custom boards with configurable swimlanes/columns
- Pre-built templates (Kanban, Scrum, etc.)
- Drag-and-drop task management
- Local-first development (no auth required for POC)

### Target Users (POC)
- Individual developers managing personal tasks
- Users wanting a self-hosted Trello alternative

---

## 2. Scope Definition

### In Scope (MVP/POC)

| Feature | Description | Priority |
|---------|-------------|----------|
| Boards | Create, edit, delete custom boards | P0 |
| Swimlanes/Columns | Customizable columns per board | P0 |
| Board Templates | Use built-in templates (Kanban, Basic, Simple) - **read-only** | P0 |
| Todos/Cards | CRUD operations, drag-and-drop | P0 |
| Labels | Color-coded labels for categorization | P1 |
| Due Dates | Optional due dates on todos | P1 |
| Search | Search todos across boards | P2 |
| Persistence | PostgreSQL storage | P0 |

### Future Scope

| Feature | Status | Design Document |
|---------|--------|-----------------|
| **Theming & Beautification** | Planned | *Design not yet completed* |
| **Custom Templates** | Planned | *Design not yet completed* |
| **Authentication** | Planned | *Design not yet completed* |
| **Jira Integration** | Planned | [Jira Integration PRD](./integrations/jira-integration-prd.md) |
| **Slack Integration** | Planned | [Slack Integration PRD](./integrations/slack-integration-prd.md) |
| **Teams Integration** | Planned | [Teams Integration PRD](./integrations/teams-integration-prd.md) |
| **Outlook Integration** | Planned | [Outlook Integration PRD](./integrations/outlook-integration-prd.md) |
| Real-time Collaboration | Planned | *Design not yet completed* |
| Mobile App | Planned | *Design not yet completed* |

> **Note on Templates**: MVP will ship with 3 built-in templates (Basic Kanban, Development, Simple). Users can create boards from these templates but cannot create/edit/delete templates. Custom template management will be added in a future release.

> **Note on Theming**: MVP will use a default light theme with standard styling. Board colors, backgrounds, dark mode, and custom theming will be added in a future release.

---

## 3. Tech Stack

### Frontend
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Framework | **React 18+** | Industry standard, large ecosystem |
| Build Tool | **Vite** | Fast HMR, modern tooling, excellent DX |
| State Management | **Zustand** or **TanStack Query** | Lightweight, minimal boilerplate |
| UI Components | **Shadcn/ui** + **Tailwind CSS** | Customizable, accessible, modern |
| Drag & Drop | **@dnd-kit** | Modern, accessible DnD library |
| HTTP Client | **Axios** or **ky** | Request/response interceptors |

### Backend
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Runtime | **Node.js 20 LTS** | JavaScript ecosystem, async I/O |
| Framework | **Express.js** or **Fastify** | Mature, well-documented |
| ORM | **Prisma** | Type-safe, excellent migrations, great DX |
| Validation | **Zod** | Runtime type validation, TypeScript integration |

### Database
| Component | Technology | Rationale |
|-----------|------------|-----------|
| Primary DB | **PostgreSQL 16** | ACID compliance, JSON support, reliability |
| Migrations | **Prisma Migrate** | Declarative schema, version controlled |

---

## 4. Core Features Detail

### 4.1 Boards

A board is a container for organizing related tasks.

**Board Properties**:
- `name` - Board title
- `description` - Optional description
- `template` - Template used (if any)
- `columns` - Ordered list of swimlanes
- ~~`color`~~ - *Future: Theme color for visual distinction*
- ~~`background`~~ - *Future: Custom background image/color*

**Operations**:
- Create board (from scratch or template)
- Edit board properties (name, description)
- Delete board (with confirmation)
- Reorder boards

### 4.2 Swimlanes (Columns)

Columns represent workflow stages within a board.

**Column Properties**:
- `name` - Column title
- `position` - Order within board
- `wipLimit` - Optional work-in-progress limit
- ~~`color`~~ - *Future: Optional color coding*

**Operations**:
- Add column
- Rename column
- Reorder columns (drag-and-drop)
- Delete column (move todos to another or delete)

### 4.3 Board Templates

Pre-configured board structures for common workflows.

**Built-in Templates**:

| Template | Columns | Use Case |
|----------|---------|----------|
| **Basic Kanban** | Todo, In Progress, Done | General task management |
| **Development** | Backlog, Todo, In Progress, Review, Done | Software development |
| **Simple** | Todo, Done | Minimal setup |
| **Custom** | (empty) | Build from scratch |

**Template Schema**:
```typescript
interface BoardTemplate {
  id: string;
  name: string;
  description: string;
  columns: {
    name: string;
    color?: string;
    wipLimit?: number;
  }[];
  isBuiltIn: boolean;
}
```

### 4.4 Todos (Cards)

Individual task items within columns.

**Todo Properties**:
- `title` - Task title (required)
- `description` - Detailed description (markdown support)
- `priority` - LOW, MEDIUM, HIGH, URGENT
- `dueDate` - Optional due date
- `labels` - Associated labels
- `position` - Order within column

**Operations**:
- Create todo
- Edit todo (inline or modal)
- Move todo (drag-and-drop between columns)
- Reorder within column
- Delete todo
- Archive todo

### 4.5 Labels

Color-coded tags for categorization.

**Label Properties**:
- `name` - Label text
- `color` - Hex color code

**Operations**:
- Create label
- Edit label
- Delete label
- Assign/remove from todos

---

## 5. Database Schema (Prisma)

```prisma
// schema.prisma

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model Board {
  id          String   @id @default(cuid())
  name        String
  description String?
  position    Int      @default(0)
  templateId  String?  // Reference to template used
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  // Future: theming
  // color       String?
  // background  String?

  columns     Column[]

  @@map("boards")
}

model Column {
  id        String   @id @default(cuid())
  name      String
  position  Int      @default(0)
  wipLimit  Int?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  // Future: theming
  // color     String?

  boardId   String
  board     Board    @relation(fields: [boardId], references: [id], onDelete: Cascade)

  todos     Todo[]

  @@map("columns")
}

model Todo {
  id          String     @id @default(cuid())
  title       String
  description String?
  priority    Priority   @default(MEDIUM)
  dueDate     DateTime?
  position    Int        @default(0)
  archived    Boolean    @default(false)
  createdAt   DateTime   @default(now())
  updatedAt   DateTime   @updatedAt

  // Future: source tracking for integrations
  sourceType  SourceType?
  sourceId    String?
  sourceUrl   String?
  sourceMeta  Json?

  columnId    String
  column      Column     @relation(fields: [columnId], references: [id], onDelete: Cascade)

  labels      Label[]

  @@unique([sourceType, sourceId])
  @@map("todos")
}

model Label {
  id        String   @id @default(cuid())
  name      String
  color     String

  todos     Todo[]

  @@map("labels")
}

model BoardTemplate {
  id          String   @id @default(cuid())
  name        String
  description String?
  columns     Json     // Array of column definitions
  isBuiltIn   Boolean  @default(false)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  @@map("board_templates")
}

enum Priority {
  LOW
  MEDIUM
  HIGH
  URGENT
}

// Future: for integrations
enum SourceType {
  JIRA
  SLACK
  TEAMS
  OUTLOOK
  MANUAL
}
```

---

## 6. Database Migrations Strategy

### Why Prisma Migrate?

| Feature | Prisma Migrate | Knex | TypeORM | Drizzle |
|---------|---------------|------|---------|---------|
| Type Safety | Excellent | Manual | Good | Excellent |
| Schema-first | Yes | No | No | Yes |
| Migration History | Yes | Yes | Yes | Yes |
| Rollback Support | Yes | Yes | Yes | Limited |
| Shadow DB | Yes | No | No | No |
| Learning Curve | Low | Medium | High | Medium |

### Migration Commands

```bash
# Development: Create and apply migrations
npx prisma migrate dev --name <migration_name>

# Production: Apply pending migrations
npx prisma migrate deploy

# Reset database (dev only)
npx prisma migrate reset

# Generate Prisma Client
npx prisma generate

# View database in browser
npx prisma studio
```

### Automated Migration Scripts

```json
// package.json
{
  "scripts": {
    "db:migrate:dev": "prisma migrate dev",
    "db:migrate:deploy": "prisma migrate deploy",
    "db:migrate:reset": "prisma migrate reset --force",
    "db:seed": "prisma db seed",
    "db:studio": "prisma studio",
    "db:generate": "prisma generate"
  }
}
```

### Seed Data

```typescript
// prisma/seed.ts
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  // Seed built-in templates
  await prisma.boardTemplate.upsert({
    where: { id: 'kanban-basic' },
    update: {},
    create: {
      id: 'kanban-basic',
      name: 'Basic Kanban',
      description: 'Simple three-column Kanban board',
      isBuiltIn: true,
      columns: [
        { name: 'Todo' },
        { name: 'In Progress' },
        { name: 'Done' }
      ]
    }
  });

  await prisma.boardTemplate.upsert({
    where: { id: 'dev-workflow' },
    update: {},
    create: {
      id: 'dev-workflow',
      name: 'Development',
      description: 'Software development workflow',
      isBuiltIn: true,
      columns: [
        { name: 'Backlog' },
        { name: 'Todo' },
        { name: 'In Progress' },
        { name: 'Review' },
        { name: 'Done' }
      ]
    }
  });

  await prisma.boardTemplate.upsert({
    where: { id: 'simple' },
    update: {},
    create: {
      id: 'simple',
      name: 'Simple',
      description: 'Minimal two-column setup',
      isBuiltIn: true,
      columns: [
        { name: 'Todo' },
        { name: 'Done' }
      ]
    }
  });

  console.log('Seed data created');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
```

---

## 7. API Endpoints

### Boards
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/boards` | List all boards |
| POST | `/api/boards` | Create board |
| GET | `/api/boards/:id` | Get board with columns/todos |
| PUT | `/api/boards/:id` | Update board |
| DELETE | `/api/boards/:id` | Delete board |
| POST | `/api/boards/:id/duplicate` | Duplicate board |

### Columns
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/boards/:boardId/columns` | Add column |
| PUT | `/api/columns/:id` | Update column |
| DELETE | `/api/columns/:id` | Delete column |
| PATCH | `/api/columns/reorder` | Reorder columns |

### Todos
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/todos` | List todos (with filters) |
| POST | `/api/todos` | Create todo |
| GET | `/api/todos/:id` | Get todo details |
| PUT | `/api/todos/:id` | Update todo |
| DELETE | `/api/todos/:id` | Delete todo |
| PATCH | `/api/todos/:id/move` | Move todo to column |
| PATCH | `/api/todos/reorder` | Reorder todos |
| PATCH | `/api/todos/:id/archive` | Archive todo |

### Templates
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/templates` | List built-in templates |

> **Future**: `POST /api/templates` (create), `PUT /api/templates/:id` (update), `DELETE /api/templates/:id` (delete) will be added when custom template support is implemented.

### Labels
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/labels` | List labels |
| POST | `/api/labels` | Create label |
| PUT | `/api/labels/:id` | Update label |
| DELETE | `/api/labels/:id` | Delete label |

### Search
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/search?q=<query>` | Search todos |

---

## 8. Project Structure

```
inzone/
├── .devcontainer/
│   ├── devcontainer.json
│   └── docker-compose.yml
├── .vscode/
│   ├── launch.json          # F5 debug configurations
│   ├── tasks.json           # Build tasks
│   └── settings.json
├── apps/
│   ├── web/                  # React + Vite frontend
│   │   ├── src/
│   │   │   ├── components/
│   │   │   │   ├── board/
│   │   │   │   ├── todo/
│   │   │   │   ├── column/
│   │   │   │   └── ui/
│   │   │   ├── hooks/
│   │   │   ├── stores/
│   │   │   ├── api/
│   │   │   ├── types/
│   │   │   └── App.tsx
│   │   ├── public/
│   │   ├── index.html
│   │   ├── vite.config.ts
│   │   ├── tsconfig.json
│   │   └── package.json
│   └── api/                  # Node.js backend
│       ├── src/
│       │   ├── routes/
│       │   │   ├── boards.ts
│       │   │   ├── columns.ts
│       │   │   ├── todos.ts
│       │   │   ├── templates.ts
│       │   │   └── labels.ts
│       │   ├── services/
│       │   ├── middleware/
│       │   └── index.ts
│       ├── prisma/
│       │   ├── schema.prisma
│       │   ├── migrations/
│       │   └── seed.ts
│       ├── tsconfig.json
│       └── package.json
├── packages/
│   └── shared/               # Shared types/utilities
│       ├── src/
│       └── package.json
├── docker/
│   ├── postgres/
│   │   └── init.sql
│   └── docker-compose.db.yml # Standalone DB container
├── docker-compose.yml        # Full stack (optional)
├── package.json              # Workspace root
├── pnpm-workspace.yaml
└── turbo.json                # Turborepo config
```

---

## 9. Development Environment Setup

### 9.1 Running Without DevContainer (Recommended for POC)

```bash
# 1. Start PostgreSQL via Docker
docker compose -f docker/docker-compose.db.yml up -d

# 2. Install dependencies
pnpm install

# 3. Setup environment
cp apps/api/.env.example apps/api/.env
# Edit DATABASE_URL if needed

# 4. Run migrations and seed
pnpm --filter api db:migrate:dev
pnpm --filter api db:seed

# 5. Start development servers
pnpm dev
```

### 9.2 Docker Compose for Database Only

```yaml
# docker/docker-compose.db.yml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    container_name: inzone-postgres
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: inzone
      POSTGRES_PASSWORD: inzone_dev
      POSTGRES_DB: inzone
    volumes:
      - postgres_data:/var/lib/postgresql/data
      - ./postgres/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U inzone"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

### 9.3 VS Code F5 Debug Experience

```json
// .vscode/launch.json
{
  "version": "0.2.0",
  "configurations": [
    {
      "name": "API: Debug",
      "type": "node",
      "request": "launch",
      "runtimeExecutable": "pnpm",
      "runtimeArgs": ["--filter", "api", "dev"],
      "cwd": "${workspaceFolder}",
      "console": "integratedTerminal",
      "env": {
        "NODE_ENV": "development"
      }
    },
    {
      "name": "Web: Debug (Chrome)",
      "type": "chrome",
      "request": "launch",
      "url": "http://localhost:5173",
      "webRoot": "${workspaceFolder}/apps/web/src",
      "preLaunchTask": "Start Web Dev Server"
    }
  ],
  "compounds": [
    {
      "name": "Full Stack",
      "configurations": ["API: Debug", "Web: Debug (Chrome)"],
      "preLaunchTask": "Start Database",
      "stopAll": true
    }
  ]
}
```

```json
// .vscode/tasks.json
{
  "version": "2.0.0",
  "tasks": [
    {
      "label": "Start Database",
      "type": "shell",
      "command": "docker compose -f docker/docker-compose.db.yml up -d",
      "problemMatcher": [],
      "presentation": { "reveal": "silent" }
    },
    {
      "label": "Stop Database",
      "type": "shell",
      "command": "docker compose -f docker/docker-compose.db.yml down",
      "problemMatcher": []
    },
    {
      "label": "Start Web Dev Server",
      "type": "shell",
      "command": "pnpm --filter web dev",
      "isBackground": true,
      "problemMatcher": {
        "pattern": { "regexp": "." },
        "background": {
          "activeOnStart": true,
          "beginsPattern": ".",
          "endsPattern": "Local:.*http"
        }
      }
    },
    {
      "label": "Run Migrations",
      "type": "shell",
      "command": "pnpm --filter api db:migrate:dev",
      "problemMatcher": []
    },
    {
      "label": "Seed Database",
      "type": "shell",
      "command": "pnpm --filter api db:seed",
      "problemMatcher": []
    }
  ]
}
```

### 9.4 DevContainer Configuration (Optional)

```json
// .devcontainer/devcontainer.json
{
  "name": "InZone Development",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "features": {
    "ghcr.io/devcontainers/features/node:1": { "version": "20" },
    "ghcr.io/devcontainers/features/docker-in-docker:2": {}
  },
  "customizations": {
    "vscode": {
      "extensions": [
        "dbaeumer.vscode-eslint",
        "esbenp.prettier-vscode",
        "prisma.prisma",
        "bradlc.vscode-tailwindcss"
      ]
    }
  },
  "forwardPorts": [3000, 5173, 5432],
  "postCreateCommand": "pnpm install && pnpm db:migrate:dev && pnpm db:seed"
}
```

---

## 10. UI Wireframes (Conceptual)

```
┌────────────────────────────────────────────────────────────────────┐
│  InZone                                    [Search...] [+ New Board]│
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌─────────────┐ ┌─────────────┐ ┌─────────────┐                   │
│  │  Personal   │ │   Work      │ │  Project X  │                   │
│  │  ━━━━━━━━━  │ │  ━━━━━━━━━  │ │  ━━━━━━━━━  │                   │
│  │  12 tasks   │ │  8 tasks    │ │  24 tasks   │                   │
│  └─────────────┘ └─────────────┘ └─────────────┘                   │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘

Board View:
┌────────────────────────────────────────────────────────────────────┐
│  ← Back    Work Board                          [⚙ Settings] [...]  │
├────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐              │
│  │ Todo (3)     │  │ In Progress  │  │ Done (5)     │              │
│  │ + Add card   │  │ + Add card   │  │ + Add card   │              │
│  ├──────────────┤  ├──────────────┤  ├──────────────┤              │
│  │┌────────────┐│  │┌────────────┐│  │┌────────────┐│              │
│  ││ Review PR  ││  ││ Fix bug    ││  ││ Deploy v1  ││              │
│  ││ [HIGH]     ││  ││ [MEDIUM]   ││  ││ ✓ Done     ││              │
│  ││ Due: Today ││  │└────────────┘│  │└────────────┘│              │
│  │└────────────┘│  │              │  │              │              │
│  │┌────────────┐│  │              │  │              │              │
│  ││ Write docs ││  │              │  │              │              │
│  │└────────────┘│  │              │  │              │              │
│  └──────────────┘  └──────────────┘  └──────────────┘              │
│                                                                     │
└────────────────────────────────────────────────────────────────────┘
```

---

## 11. Feature Roadmap

### Phase 1: MVP (Complete)
- [x] PRD and architecture design
- [x] Project scaffolding (monorepo setup)
- [x] Database schema and migrations
- [x] Backend API (boards, columns, todos)
- [x] Frontend board view with drag-and-drop
- [x] Built-in board templates (read-only)
- [x] Labels support
- [x] Local development setup

### Phase 2: Automated Testing (Current Focus)

Comprehensive test coverage for MVP features. See detailed PRDs:
- **[BDD Testing PRD](./testing/bdd-testing-prd.md)** - End-to-end behavior tests
- **[Unit Testing PRD](./testing/unit-testing-prd.md)** - Component and service tests

#### BDD Tests Setup
- [x] Install Playwright and Cucumber.js dependencies (frontend)
- [x] Install Supertest and Cucumber.js dependencies (backend)
- [x] Configure Cucumber for both frontend and backend
- [x] Set up test database for backend tests
- [x] Create Page Objects for frontend tests
- [x] Create API helpers for backend tests

#### Frontend BDD Tests
- [x] Board feature tests (create, delete, view) - happy & unhappy paths
- [x] Column feature tests (add, reorder, delete) - happy & unhappy paths
- [x] Todo feature tests (create, edit, move, delete) - happy & unhappy paths
- [x] Label feature tests (manage labels) - happy & unhappy paths
- [x] Search feature tests - happy & unhappy paths

#### Backend BDD Tests
- [x] Boards API tests - happy & unhappy paths
- [x] Columns API tests - happy & unhappy paths
- [x] Todos API tests - happy & unhappy paths
- [x] Labels API tests - happy & unhappy paths
- [x] Templates API tests - happy & unhappy paths

#### Frontend Unit Tests
- [x] Install Vitest, React Testing Library, MSW
- [ ] Component tests (BoardCard, TodoCard, Column, etc.) - happy & unhappy paths
- [ ] Hook tests (useBoards, useTodos, useDragAndDrop) - happy & unhappy paths
- [ ] Store tests (Zustand stores) - happy & unhappy paths
- [ ] Utility function tests - happy & unhappy paths
- [ ] API client tests - happy & unhappy paths

#### Backend Unit Tests
- [ ] Install Vitest, Supertest, Prisma Mock
- [ ] Service tests (BoardService, TodoService, etc.) - happy & unhappy paths
- [ ] Route tests (all API endpoints) - happy & unhappy paths
- [ ] Middleware tests (errorHandler, validation) - happy & unhappy paths
- [ ] Validator tests - happy & unhappy paths

#### CI Pipeline Updates
- [ ] Add BDD test job to CI pipeline (`.github/workflows/bdd-tests.yml`)
- [ ] Add unit test job to CI pipeline (`.github/workflows/unit-tests.yml`)
- [ ] Configure test database in CI
- [ ] Add test coverage reporting (codecov integration)
- [ ] Configure parallel test execution
- [ ] Add coverage thresholds (80% minimum)
- [ ] Add test result artifacts

### Phase 3: Polish
- [ ] Search functionality
- [ ] Due date display and filtering
- [ ] Keyboard shortcuts
- [ ] Board settings (rename, delete)
- [ ] Archive/restore todos
- [ ] **Update all tests** (BDD & unit) for new features
- [ ] **Maintain test coverage** above 80% threshold

### Phase 4: Future Scope

| Feature | Design Status | PRD Link |
|---------|--------------|----------|
| Theming & Beautification | *Not yet designed* | - |
| Custom Templates | *Not yet designed* | - |
| Authentication | *Not yet designed* | - |
| Jira Integration | Designed | [Link](./integrations/jira-integration-prd.md) |
| Slack Integration | Designed | [Link](./integrations/slack-integration-prd.md) |
| Teams Integration | Designed | [Link](./integrations/teams-integration-prd.md) |
| Outlook Integration | Designed | [Link](./integrations/outlook-integration-prd.md) |
| Real-time Sync | *Not yet designed* | - |
| Mobile App | *Not yet designed* | - |

> **Theming & Beautification** includes: board colors, board backgrounds, column colors, dark mode, app themes, and custom styling.

> **Testing Requirement**: All future features must include:
> - BDD tests (happy & unhappy paths) per [BDD Testing PRD](./testing/bdd-testing-prd.md)
> - Unit tests (happy & unhappy paths) per [Unit Testing PRD](./testing/unit-testing-prd.md)
> - CI pipeline updates for new test suites
> - Maintained coverage above 80% threshold

---

## 12. Success Metrics (MVP)

| Metric | Target |
|--------|--------|
| Initial page load | < 2s |
| API response time | < 100ms |
| Drag-and-drop latency | < 50ms |
| Database query time | < 20ms |

---

## 13. Open Questions

1. ~~Should we support team/workspace sharing in MVP?~~ → No, single user for POC
2. ~~Authentication needed for POC?~~ → No, local-only for now
3. Should we support markdown in todo descriptions?
4. ~~Custom templates - save from existing board?~~ → No, templates are read-only in MVP (future scope)
5. Data export (JSON/CSV) in MVP?

---

## Quick Start (After Implementation)

```bash
# Clone and setup
git clone <repo>
cd inzone
pnpm install

# Start database
docker compose -f docker/docker-compose.db.yml up -d

# Run migrations and seed templates
pnpm --filter api db:migrate:dev
pnpm --filter api db:seed

# Start development
pnpm dev

# Open browser
# Frontend: http://localhost:5173
# API: http://localhost:3000
# Prisma Studio: pnpm --filter api db:studio
```

---

*Document Version: 3.0*
*Last Updated: 2025-01-25*
