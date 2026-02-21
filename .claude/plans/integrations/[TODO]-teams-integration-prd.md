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

---

## Post-Implementation Verification

After implementing Teams integration, use **agent-browser** to verify:

1. **OAuth Flow**: Navigate to integration settings, click "Connect Teams", verify OAuth redirect
2. **Configuration UI**: Verify settings page displays correctly using browser_snapshot
3. **Task Sync**: After Teams message action, verify task appears in InZone via browser_navigate

**Important**: Always use agent-browser CLI for verification.

---

*Document Version: 1.1*
*Last Updated: 2026-01-26*
