# Microsoft Teams Integration - Product Requirements Document

> **Status**: Future Scope
> **Parent PRD**: [InZone PRD](../inzone-prd.md)
> **Priority**: P3

---

## Overview

Enable users to create todos from Microsoft Teams messages via bot interactions, message extensions, and actionable message cards.

---

## Authentication

### Microsoft Identity Platform (Azure AD)

**Permissions Required**:
- `User.Read` - User profile
- `ChannelMessage.Read.All` - Read channel messages
- `Chat.Read` - Read chat messages

**Bot Registration**:
- Azure Bot Service registration
- Teams app manifest

---

## Integration Methods

### 1. Bot Mentions

```
@InZone create "Review PR #123"
@InZone help
```

### 2. Message Extensions

- Action-based: Select message → "Create Todo"
- Search-based: Search existing todos

### 3. Actionable Cards

Bot posts adaptive cards with action buttons.

---

## Data Mapping

### Teams Message → InZone Todo

| Teams Field | InZone Field |
|-------------|--------------|
| `body.content` | `title` / `description` |
| `id` | `sourceId` |
| `webUrl` | `sourceUrl` |
| `from.user.displayName` | metadata |

---

## Webhook Endpoint

```
POST /api/webhooks/teams
```

Uses Bot Framework SDK for message handling.

---

## User Configuration

```typescript
interface TeamsIntegrationConfig {
  defaultBoardId: string;
  teamChannelMapping: Record<string, string>;
  notifyOnCreate: boolean;
}
```

---

## Implementation Checklist

- [ ] Azure Bot registration
- [ ] Teams app manifest
- [ ] Bot Framework SDK integration
- [ ] Message extension handlers
- [ ] Adaptive card templates
- [ ] OAuth flow
- [ ] Configuration UI

---

*Document Version: 1.0*
*Last Updated: 2025-01-24*
