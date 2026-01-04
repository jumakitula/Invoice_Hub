# Automation Readiness Migration Guide

## Overview
This guide outlines the steps to migrate your existing Invoice Management System to be fully compatible with automation platforms like n8n. The migration enhances the system to be event-driven, API-first, and automation-safe.

## Prerequisites

### System Requirements
- Supabase project with Edge Functions enabled
- Node.js 18+ for development
- Existing invoice data (optional)

### Backup Requirements
- Full database backup before migration
- Export of existing API keys and configurations
- Backup of webhook configurations

## Migration Steps

### Step 1: Database Schema Updates

#### Run Migration Script
Execute the automation readiness migration:

```sql
-- Run this in your Supabase SQL editor
\i supabase/migrations/20260103080100_automation_readiness_upgrade.sql
```

#### Expected Changes
- New columns added to `invoices`, `invoice_validations`, `invoice_approvals`
- New tables: `webhook_events`, `api_keys`, `automation_locks`
- New functions: `emit_webhook_event`, `update_invoice_processing_status`
- Updated constraints and indexes

#### Data Migration
Existing invoices will be assigned:
- `processing_status = 'received'`
- `automation_source = 'ui'` (for UI-created invoices)
- `automation_source = 'api'` (for API-created invoices)

### Step 2: API Updates

#### Deploy Updated Edge Function
```bash
supabase functions deploy invoice-api
```

#### Update API Clients
Modify existing API calls to include new headers:

```javascript
// Before
const response = await fetch('/functions/v1/invoice-api/invoices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify(invoiceData)
});

// After
const response = await fetch('/functions/v1/invoice-api/invoices', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'x-api-key': apiKey,  // New: API key authentication
    'idempotency-key': uniqueId  // New: Idempotency support
  },
  body: JSON.stringify({
    ...invoiceData,
    automation_source: 'api'  // New: Track automation source
  })
});
```

### Step 3: UI Enhancements

#### Update InvoiceDetail Component
Add automation activity panel to show processing history:

```tsx
// Add to InvoiceDetail.tsx
const [automationActivity, setAutomationActivity] = useState([]);

useEffect(() => {
  loadAutomationActivity();
}, [id]);

const loadAutomationActivity = async () => {
  const { data } = await supabase
    .from('webhook_events')
    .select('*')
    .eq('invoice_id', id)
    .order('created_at', { ascending: false })
    .limit(10);

  setAutomationActivity(data || []);
};
```

#### Update Status Displays
Enhance status badges to show processing status:

```tsx
// Add processing status display
{invoice.processing_status && (
  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
    processingStatusColors[invoice.processing_status] || 'bg-gray-100 text-gray-800'
  }`}>
    {invoice.processing_status.replace('_', ' ').toUpperCase()}
  </span>
)}
```

### Step 4: Webhook Configuration

#### Register Webhooks
Set up webhook endpoints for automation:

```bash
# Register webhook for invoice events
curl -X POST https://your-project.supabase.co/functions/v1/invoice-api/webhooks/register \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{
    "url": "https://your-n8n-instance.com/webhook/invoice-events",
    "events": ["invoice.created", "invoice.approved", "invoice.validation_failed"],
    "secret": "your-webhook-secret"
  }'
```

#### Test Webhooks
Verify webhook delivery:

```bash
curl -X POST https://your-project.supabase.co/functions/v1/invoice-api/webhooks/test \
  -H "x-api-key: your-api-key" \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Step 5: API Key Management

#### Create API Keys
Generate API keys for automation services:

```sql
-- Insert API key (hash the actual key)
INSERT INTO api_keys (name, key_hash, permissions, created_by)
VALUES ('n8n-integration', 'hashed-api-key', '["read", "write"]', 'admin');
```

#### Update Application Config
Add API key to environment variables:

```bash
# .env
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_API_KEY=your-automation-api-key
```

### Step 6: Approval Workflow Updates

#### Token-Based Approvals
Update approval workflows to use tokens:

```javascript
// Generate approval token
const { data: approval } = await supabase
  .from('invoice_approvals')
  .insert({
    invoice_id: invoiceId,
    approval_token: generateApprovalToken(),
    expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString()
  })
  .select()
  .single();

// Send approval email with token
await sendEmail({
  to: approverEmail,
  subject: 'Invoice Approval Required',
  html: `
    <a href="${appUrl}/approve/${approval.approval_token}">Approve</a>
    <a href="${appUrl}/reject/${approval.approval_token}">Reject</a>
  `
});
```

#### API-Based Approvals
Implement token-based approval endpoints:

```javascript
// Approve via API
await fetch(`/functions/v1/invoice-api/invoices/${invoiceId}/approve`, {
  method: 'POST',
  headers: {
    'approval-token': token,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ comments: 'Approved via automation' })
});
```

## n8n Integration Setup

### Basic Workflow Template

1. **Webhook Trigger**: Listen for invoice events
2. **Data Processing**: Extract and validate invoice data
3. **Decision Logic**: Route based on validation results
4. **External Actions**: Call APIs, send notifications
5. **Status Updates**: Update invoice processing status

### Sample n8n Workflow

```json
{
  "nodes": [
    {
      "name": "Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "invoice-events",
        "responseMode": "lastNode"
      }
    },
    {
      "name": "Process Invoice",
      "type": "n8n-nodes-base.function",
      "parameters": {
        "functionCode": `
          const event = items[0].json;
          if (event.event === 'invoice.created') {
            // Process new invoice
            return [{ json: event.data }];
          }
          return [];
        `
      }
    },
    {
      "name": "Update Status",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "method": "PUT",
        "url": "={{ $node[\"Process Invoice\"].json.invoice_id }}/status",
        "headers": {
          "x-api-key": "your-api-key"
        },
        "body": {
          "status": "processing"
        }
      }
    }
  ],
  "connections": {
    "Webhook": { "main": [[{ "node": "Process Invoice", "type": "main", "index": 0 }]] },
    "Process Invoice": { "main": [[{ "node": "Update Status", "type": "main", "index": 0 }]] }
  }
}
```

## Testing Migration

### Unit Tests
```bash
# Test API endpoints
npm test -- --testPathPattern=api

# Test webhook delivery
npm test -- --testPathPattern=webhooks
```

### Integration Tests
```bash
# Test full workflow
npm test -- --testPathPattern=integration

# Test n8n integration
npm test -- --testPathPattern=n8n
```

### Manual Testing Checklist
- [ ] Create invoice via API
- [ ] Verify webhook events are emitted
- [ ] Test approval token generation
- [ ] Validate automation locks work
- [ ] Check idempotency handling
- [ ] Test error scenarios

## Rollback Plan

### Database Rollback
```sql
-- Remove new columns (be careful with data loss)
ALTER TABLE invoices DROP COLUMN IF EXISTS processing_status;
ALTER TABLE invoices DROP COLUMN IF EXISTS automation_source;
-- ... continue for all new columns

-- Drop new tables
DROP TABLE IF EXISTS webhook_events;
DROP TABLE IF EXISTS api_keys;
DROP TABLE IF EXISTS automation_locks;
```

### Code Rollback
```bash
# Revert to previous commit
git revert HEAD~1

# Redeploy previous version
supabase functions deploy invoice-api --no-verify-jwt
```

## Monitoring & Maintenance

### Key Metrics to Monitor
- Webhook delivery success rate
- API response times
- Automation lock conflicts
- Processing status distribution
- Error rates by event type

### Alerting
Set up alerts for:
- Webhook delivery failures
- High error rates
- Processing bottlenecks
- API key abuse

### Regular Maintenance
- Rotate API keys quarterly
- Clean up expired approval tokens weekly
- Archive old webhook events monthly
- Review automation performance metrics

## Troubleshooting

### Common Issues

#### Webhook Not Delivering
- Check webhook URL is accessible
- Verify webhook secret matches
- Check Supabase Edge Function logs
- Confirm event is being emitted

#### API Authentication Failing
- Verify API key is correct and active
- Check key permissions include required operations
- Confirm key hasn't expired

#### Approval Tokens Invalid
- Check token hasn't expired (24hr limit)
- Verify token matches invoice and approval record
- Confirm approval hasn't already been processed

#### Automation Locks Blocking
- Check for expired locks and clean them up
- Review concurrent automation processes
- Implement retry logic with backoff

### Debug Commands
```bash
# Check webhook events
supabase db inspect webhook_events

# View API key usage
supabase db inspect api_keys

# Monitor automation locks
supabase db inspect automation_locks
```

## Support

For migration issues:
1. Check this guide for common solutions
2. Review Supabase function logs
3. Test with minimal payload first
4. Contact support with specific error messages

## Next Steps

After successful migration:
1. Set up production monitoring
2. Create comprehensive n8n workflows
3. Implement advanced automation scenarios
4. Train team on new capabilities
5. Plan for future enhancements
