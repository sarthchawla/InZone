# Slack Integration - Product Requirements Document

> **Status**: Future Scope
> **Parent PRD**: [InZone PRD](../inzone-prd.md)
> **Priority**: P2

---

## Overview

Enable users to create todos from Slack messages via reactions, shortcuts, or bot mentions. Slack pushes events to InZone which processes and creates corresponding todos.

---

## Authentication

### OAuth 2.0 + Bot Token

**Bot Token Scopes**:
- `channels:history` - Read messages in public channels
- `groups:history` - Read messages in private channels
- `im:history` - Read direct messages
- `reactions:read` - Read reactions
- `chat:write` - Post messages (confirmations)
- `commands` - Slash commands
- `users:read` - User information

**User Token Scopes**:
- `identity.basic` - User identity

---

## Event Subscriptions

### Events API

| Event | Trigger | Action |
|-------|---------|--------|
| `reaction_added` | User adds `:todo:` or `:task:` | Create todo from message |
| `app_mention` | User mentions @InZone | Parse command, create todo |
| `message.channels` | Message with trigger word | Optional: auto-create |

### Message Shortcuts

Right-click context menu → "Create Todo in InZone"

### Slash Commands

```
/inzone "Buy groceries" - Create quick todo
/inzone help - Show help
/inzone boards - List boards
```

---

## Data Mapping

### Slack Message → InZone Todo

| Slack Field | InZone Field |
|-------------|--------------|
| `message.text` | `title` (first line or truncated) |
| `message.text` | `description` (full text) |
| `message.ts` | `sourceId` |
| `message.permalink` | `sourceUrl` |
| `channel.name` | Label (optional) |
| - | `priority` = MEDIUM (default) |

---

## Webhook Endpoint

```
POST /api/webhooks/slack
Headers:
  X-Slack-Signature: v0=<signature>
  X-Slack-Request-Timestamp: <timestamp>
```

### Signature Verification

```typescript
function verifySlackRequest(
  timestamp: string,
  body: string,
  signature: string,
  signingSecret: string
): boolean {
  const sigBasestring = `v0:${timestamp}:${body}`;
  const mySignature = 'v0=' + crypto
    .createHmac('sha256', signingSecret)
    .update(sigBasestring)
    .digest('hex');
  return crypto.timingSafeEqual(
    Buffer.from(mySignature),
    Buffer.from(signature)
  );
}
```

---

## User Configuration

```typescript
interface SlackIntegrationConfig {
  // Trigger settings
  todoReactions: string[];        // e.g., ["todo", "task", "white_check_mark"]
  triggerKeywords: string[];      // e.g., ["TODO:", "ACTION:"]

  // Board mapping
  defaultBoardId: string;
  channelBoardMapping: Record<string, string>;  // channel → board

  // Behavior
  confirmInSlack: boolean;        // Post confirmation message
  includeThread: boolean;         // Include thread context
}
```

---

## Implementation Checklist

- [ ] Slack App setup (api.slack.com)
- [ ] OAuth flow
- [ ] Events API subscription
- [ ] Webhook receiver
- [ ] Reaction handler
- [ ] Message shortcut handler
- [ ] Slash command handler
- [ ] Confirmation messages
- [ ] Configuration UI

---

*Document Version: 1.0*
*Last Updated: 2025-01-24*
