# Slack Integration - Product Requirements Document

> **Status**: In Progress
> **Parent PRD**: [InZone PRD](../inzone-prd.md)
> **Priority**: P1

---

## Overview

Enable users to create todos from Slack messages using **Slack Workflow Builder**. Users trigger a workflow via emoji reaction, which opens a form to capture task details and sends data to InZone webhook.

---

## Architecture: Slack Workflow Approach

### Why Workflows Instead of Full Integration?

| Aspect | Full Slack App | Workflow Builder |
|--------|---------------|------------------|
| Setup complexity | High (OAuth, scopes, app review) | Low (no-code) |
| Maintenance | Ongoing token management | Minimal |
| Customization | Full control | Form-based |
| Time to implement | Weeks | Hours |

### How It Works

1. User reacts to message with designated emoji (e.g., `:inzone:` or `:todo:`)
2. Slack Workflow triggers, opens a form modal
3. User fills in task details (title pre-populated from message)
4. Workflow sends form data via HTTP POST to InZone webhook
5. InZone creates the todo

---

## Phase 1: Webhook Receiver (MVP)

### Endpoint

```
POST /api/webhooks/slack-workflow
Content-Type: application/json
```

### Phase 1 Implementation

Simple endpoint that accepts and logs the payload for analysis:

```typescript
// apps/api/src/routes/webhooks/slack-workflow.ts
import { Router } from 'express';

const router = Router();

router.post('/slack-workflow', (req, res) => {
  console.log('=== Slack Workflow Payload ===');
  console.log(JSON.stringify(req.body, null, 2));
  console.log('=== Headers ===');
  console.log(JSON.stringify(req.headers, null, 2));

  res.status(200).json({
    success: true,
    message: 'Payload received',
    timestamp: new Date().toISOString()
  });
});

export default router;
```

### Security (Phase 2)

- Add webhook secret validation
- Rate limiting
- IP allowlist (Slack IPs)

---

## Recommended Slack Form Fields

### Essential Fields

| Field | Type | Description | Maps To |
|-------|------|-------------|---------|
| **Task Title** | Short text | Pre-filled from message text | `title` |
| **Description** | Long text | Additional context | `description` |
| **Priority** | Select | Low / Medium / High / Urgent | `priority` |
| **Due Date** | Date picker | When task is due | `dueDate` |

### Optional Fields (Consider Adding)

| Field | Type | Description | Maps To |
|-------|------|-------------|---------|
| **Board** | Select | Which board to add to | `boardId` |
| **Column** | Select | Which column (Todo/In Progress/Done) | `columnId` |
| **Labels/Tags** | Multi-select | Categorization | `labels` |
| **Assignee** | User select | Who should do this | `assigneeEmail` |
| **Message Link** | Hidden/Auto | Permalink to original message | `sourceUrl` |
| **Channel Name** | Hidden/Auto | Where it came from | `sourceChannel` |

### Suggested Form Layout

```
┌─────────────────────────────────────────┐
│  📋 Create InZone Task                  │
├─────────────────────────────────────────┤
│  Task Title *                           │
│  ┌─────────────────────────────────────┐│
│  │ [Pre-filled from message]           ││
│  └─────────────────────────────────────┘│
│                                         │
│  Description                            │
│  ┌─────────────────────────────────────┐│
│  │                                     ││
│  │                                     ││
│  └─────────────────────────────────────┘│
│                                         │
│  Priority          Due Date             │
│  ┌──────────┐     ┌──────────────┐     │
│  │ Medium ▼ │     │ 📅 Select    │     │
│  └──────────┘     └──────────────┘     │
│                                         │
│  Board (optional)                       │
│  ┌─────────────────────────────────────┐│
│  │ Default Board ▼                     ││
│  └─────────────────────────────────────┘│
│                                         │
│         [Cancel]  [Create Task]         │
└─────────────────────────────────────────┘
```

---

## Expected Webhook Payload

Based on Slack Workflow webhook step, expect something like:

```json
{
  "task_title": "Review the Q4 budget proposal",
  "description": "Need to check the marketing allocation",
  "priority": "high",
  "due_date": "2026-02-01",
  "board": "Work",
  "message_link": "https://workspace.slack.com/archives/C123/p1234567890",
  "channel_name": "finance-team",
  "submitted_by": "user@company.com"
}
```

---

## Implementation Checklist

### Phase 1: Webhook Receiver (Current)
- [ ] Create `/api/webhooks/slack-workflow` endpoint
- [ ] Log incoming payloads for analysis
- [ ] Return success response
- [ ] Test with Slack Workflow

### Phase 2: Data Processing
- [ ] Parse and validate payload
- [ ] Map fields to Todo schema
- [ ] Create todo in database
- [ ] Return created todo ID

### Phase 3: Enhancements
- [ ] Webhook secret validation
- [ ] Board/column lookup by name
- [ ] User mapping (Slack email → InZone user)
- [ ] Error handling and retry logic
- [ ] Slack confirmation message (optional)

---

## Slack Workflow Setup Guide

### Prerequisites
- Slack workspace with Workflow Builder access
- Custom emoji (`:inzone:`) or use existing (`:white_check_mark:`)

### Steps

1. **Create Workflow**
   - Go to Slack → Tools → Workflow Builder
   - Click "Create Workflow"
   - Select trigger: "When an emoji reaction is added"

2. **Configure Trigger**
   - Choose emoji: `:inzone:` (or your preference)
   - Select channels: All or specific

3. **Add Form Step**
   - Add step: "Send a form"
   - Add fields as described above
   - Pre-fill title with `{{message_text}}`

4. **Add Webhook Step**
   - Add step: "Send a webhook"
   - URL: `https://your-domain.com/api/webhooks/slack-workflow`
   - Method: POST
   - Add form variables to payload

5. **Publish Workflow**

---

---

## Post-Implementation Verification

After implementing Slack integration, use **agent-browser** to verify:

1. **OAuth Flow**: Navigate to integration settings, click "Connect Slack", verify OAuth redirect
2. **Configuration UI**: Verify settings page displays correctly using browser_snapshot
3. **Task Sync**: After Slack reaction, verify task appears in InZone via browser_navigate

**Important**: Always use agent-browser CLI for verification.

---

*Document Version: 1.1*
*Last Updated: 2026-01-26*
