# Outlook Integration - Product Requirements Document

> **Status**: Future Scope
> **Parent PRD**: [InZone PRD](../inzone-prd.md)
> **Priority**: P3

---

## Overview

Sync tasks from Microsoft Outlook/To Do and flagged emails into InZone boards via Microsoft Graph API change notifications.

---

## Authentication

### Microsoft Graph API (OAuth 2.0)

**Permissions Required**:
- `Tasks.Read` - Read user's tasks
- `Tasks.ReadWrite` - Read/write tasks (for bidirectional sync)
- `Mail.Read` - Read flagged emails
- `User.Read` - User profile

---

## Data Sources

### 1. Microsoft To Do Tasks

Subscribe to changes on `/me/todo/lists/{listId}/tasks`

### 2. Flagged Emails

Subscribe to changes on `/me/messages?$filter=flag/flagStatus eq 'flagged'`

### 3. Calendar Events (Optional)

Subscribe to `/me/events` for meeting action items.

---

## Change Notifications (Webhooks)

### Subscription Setup

```typescript
const subscription = {
  changeType: 'created,updated,deleted',
  notificationUrl: 'https://inzone.app/api/webhooks/outlook',
  resource: '/me/todo/lists/{listId}/tasks',
  expirationDateTime: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000), // 3 days
  clientState: 'secretClientState'
};
```

### Webhook Validation

Graph API sends validation request on subscription:
```
POST /api/webhooks/outlook?validationToken=<token>
Response: 200 OK with validationToken as body
```

---

## Data Mapping

### Outlook Task → InZone Todo

| Outlook Field | InZone Field |
|---------------|--------------|
| `title` | `title` |
| `body.content` | `description` |
| `id` | `sourceId` |
| `importance` | `priority` |
| `status` | `status` |
| `dueDateTime` | `dueDate` |

### Flagged Email → InZone Todo

| Email Field | InZone Field |
|-------------|--------------|
| `subject` | `title` |
| `bodyPreview` | `description` |
| `id` | `sourceId` |
| `webLink` | `sourceUrl` |
| `flag.dueDateTime` | `dueDate` |

---

## User Configuration

```typescript
interface OutlookIntegrationConfig {
  syncTodoLists: string[];        // List IDs to sync
  syncFlaggedEmails: boolean;
  defaultBoardId: string;
  listBoardMapping: Record<string, string>;
  bidirectionalSync: boolean;
}
```

---

## Implementation Checklist

- [ ] Azure AD app registration
- [ ] OAuth flow with Graph API
- [ ] Subscription management
- [ ] Webhook receiver
- [ ] Validation endpoint
- [ ] Change notification processing
- [ ] Task sync logic
- [ ] Flagged email sync logic
- [ ] Configuration UI
- [ ] Subscription renewal job

---

---

## Post-Implementation Verification

After implementing Outlook integration, use **agent-browser** to verify:

1. **OAuth Flow**: Navigate to integration settings, click "Connect Outlook", verify OAuth redirect
2. **Configuration UI**: Verify settings page displays correctly using browser_snapshot
3. **Task Sync**: After email flag action, verify task appears in InZone via browser_navigate

**Important**: Always use agent-browser CLI for verification.

---

*Document Version: 1.1*
*Last Updated: 2026-01-26*
