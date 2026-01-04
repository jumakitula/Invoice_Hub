# Invoice Management API Documentation

## Overview
The Invoice Management System provides a comprehensive REST API for managing invoices, suppliers, and automation workflows. The API is designed to be automation-first, supporting n8n integration and other automation platforms.

## Authentication

### API Key Authentication
All automation endpoints require API key authentication via the `x-api-key` header.

```bash
curl -H "x-api-key: your-api-key" https://your-project.supabase.co/functions/v1/invoice-api/invoices
```

### Token-Based Approvals
Approval endpoints use approval tokens via the `approval-token` header.

```bash
curl -H "approval-token: approval-token-here" \
     -X POST https://your-project.supabase.co/functions/v1/invoice-api/invoices/{id}/approve
```

## Endpoints

### Invoices

#### GET /invoices
Retrieve all invoices with optional filtering.

**Response:**
```json
[
  {
    "id": "uuid",
    "invoice_number": "INV-001",
    "supplier_id": "uuid",
    "total_amount": 1000.00,
    "status": "draft",
    "processing_status": "received",
    "automation_source": "api",
    "external_reference_id": "EXT-123",
    "created_at": "2024-01-01T00:00:00Z",
    "suppliers": { "name": "Supplier Name" },
    "invoice_validations": [...],
    "invoice_approvals": [...]
  }
]
```

#### POST /invoices
Create a new invoice. Supports idempotency via `idempotency-key` header.

**Headers:**
- `idempotency-key` (optional): Unique key to prevent duplicate creation
- `x-api-key`: API key for authentication

**Request:**
```json
{
  "invoice_number": "INV-001",
  "supplier_id": "uuid",
  "total_amount": 1000.00,
  "invoice_date": "2024-01-01",
  "due_date": "2024-01-31",
  "processing_status": "received",
  "automation_source": "n8n",
  "external_reference_id": "EXT-123"
}
```

#### GET /invoices/{id}
Retrieve detailed invoice information.

#### PUT /invoices/{id}/status
Update invoice status and emit webhook events.

**Request:**
```json
{
  "status": "approved"
}
```

#### POST /invoices/{id}/automation-lock
Lock invoice for automation processing (prevents concurrent operations).

#### DELETE /invoices/{id}/automation-lock
Unlock invoice for automation processing.

#### GET /invoices/{id}/automation-status
Get automation-specific status information.

**Response:**
```json
{
  "processing_status": "extracting",
  "automation_source": "api",
  "external_reference_id": "EXT-123",
  "locked": false,
  "locked_by": null,
  "locked_until": null
}
```

#### POST /invoices/{id}/approve
Approve invoice using approval token.

**Headers:**
- `approval-token`: Valid approval token

**Request:**
```json
{
  "comments": "Approved via automation"
}
```

#### POST /invoices/{id}/reject
Reject invoice using approval token.

### Suppliers

#### GET /suppliers
Retrieve all suppliers.

### Statistics

#### GET /stats
Get system statistics including processing status breakdown.

**Response:**
```json
{
  "total": 150,
  "by_status": {
    "draft": 20,
    "approved": 100,
    "rejected": 30
  },
  "by_processing_status": {
    "received": 10,
    "extracting": 5,
    "approved": 100
  },
  "total_amount": 150000.00
}
```

### Webhooks

#### POST /webhooks/register
Register a webhook endpoint for event notifications.

**Request:**
```json
{
  "url": "https://your-webhook-url.com/webhook",
  "events": ["invoice.created", "invoice.approved"],
  "secret": "webhook-secret"
}
```

#### POST /webhooks/test
Test webhook endpoint with sample payload.

## Webhook Events

The system emits webhook events for automation integration. Events are sent to registered webhook URLs with retry logic.

### Event Types

#### invoice.created
Emitted when a new invoice is created.

**Payload:**
```json
{
  "event": "invoice.created",
  "invoice_id": "uuid",
  "timestamp": "2024-01-01T00:00:00Z",
  "data": {
    "invoice_number": "INV-001",
    "total_amount": 1000.00,
    "supplier_id": "uuid",
    "automation_source": "api"
  }
}
```

#### invoice.extracted
Emitted when OCR/document extraction is completed.

#### invoice.validation_failed
Emitted when validation fails.

#### invoice.ready_for_approval
Emitted when invoice is ready for approval.

#### invoice.approved
Emitted when invoice is approved.

#### invoice.rejected
Emitted when invoice is rejected.

#### invoice.posted
Emitted when invoice is posted to accounting system.

### Webhook Headers
- `X-Webhook-Signature`: HMAC-SHA256 signature using webhook secret
- `X-Webhook-Event`: Event type
- `X-Webhook-ID`: Unique webhook delivery ID

## Processing Status Flow

Invoices follow this processing status flow:

1. `received` - Initial state
2. `extracting` - OCR/Document processing
3. `extracted` - Data extracted successfully
4. `validating` - Business rule validation
5. `validation_failed` - Validation errors found
6. `awaiting_approval` - Ready for approval
7. `approved` - Approved for payment
8. `rejected` - Rejected
9. `posted` - Posted to accounting system
10. `archived` - Archived

## Error Handling

All endpoints return standard HTTP status codes:

- `200` - Success
- `201` - Created
- `400` - Bad Request
- `401` - Unauthorized
- `404` - Not Found
- `409` - Conflict (idempotency key collision)
- `500` - Internal Server Error

Error responses include:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE"
}
```

## Rate Limiting

- API endpoints are rate limited per API key
- Webhook deliveries include exponential backoff retry logic
- Failed webhooks are retried up to 5 times over 24 hours

## Idempotency

Create operations support idempotency via the `idempotency-key` header to prevent duplicate processing in automation scenarios.

## Migration Guide

### From Legacy API

1. Update authentication to use API keys
2. Replace status update endpoints with new automation-aware endpoints
3. Implement webhook handlers for real-time updates
4. Update approval workflows to use token-based approvals
5. Add processing status monitoring

### n8n Integration Example

```javascript
// n8n HTTP Request node configuration
{
  "method": "POST",
  "url": "https://your-project.supabase.co/functions/v1/invoice-api/invoices",
  "headers": {
    "x-api-key": "your-api-key",
    "idempotency-key": "{{ $node.input.id }}"
  },
  "body": {
    "invoice_number": "{{ $node.input.invoice_number }}",
    "total_amount": "{{ $node.input.amount }}",
    "automation_source": "n8n"
  }
}
```

## Security Considerations

- API keys should be rotated regularly
- Webhook secrets should be unique per endpoint
- Approval tokens expire after 24 hours
- All automation actions are logged for audit trails
- Rate limiting prevents abuse
- CORS is configured for web applications
