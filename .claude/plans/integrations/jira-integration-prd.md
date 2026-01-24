# Jira Integration - Product Requirements Document

> **Status**: Future Scope
> **Parent PRD**: [InZone PRD](../inzone-prd.md)
> **Priority**: P1 (First Integration)

---

## Overview

Enable InZone to receive tasks from Jira Cloud/Server via webhooks, automatically creating and syncing todos on user-defined boards.

---

## Authentication

### OAuth 2.0 (3-Legged OAuth)

```
User → InZone → Jira Authorization → Callback → Store Tokens
```

**Scopes Required**:
- `read:jira-work` - Read project and issue data
- `read:jira-user` - Read user information
- `manage:jira-webhook` - Manage webhooks

**Token Storage**:
- Access tokens: Encrypted (AES-256) in `integrations` table
- Refresh tokens: Encrypted, auto-refresh on expiry

---

## Webhook Configuration

### Events to Subscribe

| Event | Action |
|-------|--------|
| `jira:issue_created` | Create new todo |
| `jira:issue_updated` | Update existing todo |
| `jira:issue_deleted` | Archive/delete todo |
| `sprint_started` | Optional: Create sprint board |
| `sprint_closed` | Optional: Archive sprint todos |

### Webhook Endpoint

```
POST /api/webhooks/jira
Headers:
  X-Atlassian-Webhook-Identifier: <webhook-id>
  X-Hub-Signature: sha256=<signature>
```

### Signature Verification

```typescript
function verifyJiraWebhook(payload: string, signature: string, secret: string): boolean {
  const expected = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(`sha256=${expected}`)
  );
}
```

---

## Data Mapping

### Jira Issue → InZone Todo

| Jira Field | InZone Field | Transformation |
|------------|--------------|----------------|
| `key` | `sourceId` | Direct |
| `fields.summary` | `title` | Direct |
| `fields.description` | `description` | ADF → Markdown |
| `fields.priority.name` | `priority` | Map to enum |
| `fields.status.statusCategory.name` | `status` | Map to column |
| `fields.duedate` | `dueDate` | ISO parse |
| `self` | `sourceUrl` | Direct |
| `fields.labels` | `labels` | Create/link |
| `fields.assignee` | - | Future: assignee |

### Priority Mapping

| Jira Priority | InZone Priority |
|---------------|-----------------|
| Highest, Blocker | URGENT |
| High, Critical | HIGH |
| Medium, Normal | MEDIUM |
| Low, Minor, Trivial | LOW |

### Status Mapping (Default)

| Jira Status Category | InZone Column |
|---------------------|---------------|
| To Do | Todo |
| In Progress | In Progress |
| Done | Done |

*User can customize mapping in integration settings.*

---

## User Configuration

### Settings UI

```typescript
interface JiraIntegrationConfig {
  // Project filtering
  projectKeys: string[];           // e.g., ["PROJ", "DEV"]

  // Issue type filtering
  issueTypes: string[];            // e.g., ["Task", "Bug", "Story"]

  // Board mapping
  defaultBoardId: string;          // Where to create todos

  // Column mapping (optional override)
  statusMapping: Record<string, string>;  // Jira status → InZone column

  // Sync options
  syncAssignedOnly: boolean;       // Only sync issues assigned to user
  syncLabels: boolean;             // Sync Jira labels
  bidirectionalSync: boolean;      // Future: push changes back
}
```

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/integrations/jira/connect` | Initiate OAuth flow |
| GET | `/api/integrations/jira/callback` | OAuth callback |
| GET | `/api/integrations/jira/projects` | List accessible projects |
| PUT | `/api/integrations/jira/config` | Update configuration |
| POST | `/api/integrations/jira/sync` | Manual full sync |
| DELETE | `/api/integrations/jira` | Disconnect |

---

## Webhook Processing Flow

```
1. Receive webhook POST
2. Verify signature
3. Parse event type
4. Queue job (BullMQ)
5. Process job:
   a. Find user by webhook registration
   b. Check if issue matches filters
   c. Find/create todo by sourceId
   d. Apply field mappings
   e. Save to database
   f. Emit WebSocket event for real-time UI update
6. Log result
```

---

## Error Handling

| Scenario | Handling |
|----------|----------|
| Invalid signature | 401, log attempt |
| Token expired | Auto-refresh, retry |
| Rate limited | Exponential backoff |
| Project not found | Skip, log warning |
| Mapping failure | Create with defaults, flag for review |

---

## Database Changes

No schema changes required - uses existing `Integration` and `Todo` models.

---

## Implementation Checklist

- [ ] OAuth flow implementation
- [ ] Webhook receiver endpoint
- [ ] Signature verification
- [ ] Event processing jobs
- [ ] Field mapping service
- [ ] Configuration UI
- [ ] Manual sync endpoint
- [ ] Webhook management (register/unregister)
- [ ] Error handling & retry logic
- [ ] Integration tests

---

*Document Version: 1.0*
*Last Updated: 2025-01-24*
