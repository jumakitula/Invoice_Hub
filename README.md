# InvoiceHub - Invoice Management System

A modern, full-featured invoice management application designed for small to medium businesses. InvoiceHub streamlines invoice processing, validation, approval workflows, and reporting.

## Features

### Core Functionality

- **Invoice Management**
  - Create invoices manually or via file upload (PDF, Excel)
  - Automatic data validation and duplicate detection
  - Line item tracking with automatic calculations
  - Purchase order matching capabilities
  - Multi-status workflow (draft, pending, approved, rejected, archived)

- **Supplier Management**
  - Complete supplier database with contact information
  - Tax ID and address tracking
  - Quick search and filtering
  - Easy CRUD operations

- **Approval Workflow**
  - Simple approve/reject interface
  - Email tracking for approvers
  - Approval history and audit trail
  - Comments and notes support
  - Visual status indicators

- **Validation System**
  - Automatic duplicate detection
  - Missing data identification
  - Amount mismatch checking
  - Severity levels (error, warning, info)
  - Issue resolution tracking

- **Reporting & Analytics**
  - Real-time dashboard with key metrics
  - Monthly breakdown reports
  - Supplier-specific analysis
  - Total amounts and averages
  - Date range filtering
  - CSV export for all reports

- **n8n Automation API**
  - Complete REST API for automation
  - List, create, update invoices programmatically
  - Status management endpoints
  - Statistics and reporting endpoints
  - Webhook-ready architecture

### User Interface

- Clean, modern design with intuitive navigation
- Responsive layout for mobile and desktop
- Visual indicators for issues, duplicates, and status
- Quick filters and search functionality
- Minimal clicks to complete common tasks
- Real-time data updates

## Technology Stack

- **Frontend:** React 18 + TypeScript + Vite
- **Styling:** Tailwind CSS
- **Icons:** Lucide React
- **Database:** Supabase (PostgreSQL)
- **Storage:** Supabase Storage
- **API:** Supabase Edge Functions (Deno)
- **Automation:** n8n-ready REST API

## Project Structure

```
invoicehub/
├── src/
│   ├── components/
│   │   ├── Layout.tsx           # Main layout with sidebar
│   │   ├── Dashboard.tsx        # Dashboard with statistics
│   │   ├── InvoiceList.tsx      # Invoice list with filters
│   │   ├── InvoiceCreate.tsx    # Invoice creation form
│   │   ├── InvoiceDetail.tsx    # Invoice detail with approval
│   │   ├── Reports.tsx          # Reporting module
│   │   └── Suppliers.tsx        # Supplier management
│   ├── lib/
│   │   ├── supabase.ts          # Supabase client
│   │   └── database.types.ts    # TypeScript types
│   ├── App.tsx                  # Main app with routing
│   └── main.tsx                 # Entry point
├── supabase/
│   └── functions/
│       └── invoice-api/         # API for n8n integration
├── API_DOCUMENTATION.md         # Complete API reference
├── GETTING_STARTED.md          # User guide
└── README.md                   # This file
```

## Database Schema

### Tables

1. **suppliers** - Vendor/supplier information
2. **purchase_orders** - Purchase orders for matching
3. **invoices** - Main invoice records
4. **invoice_line_items** - Individual line items
5. **invoice_validations** - Validation issues tracking
6. **invoice_approvals** - Approval workflow history

### Key Relationships

- Invoices → Suppliers (many-to-one)
- Invoices → Purchase Orders (many-to-one, optional)
- Invoice Line Items → Invoices (many-to-one)
- Invoice Validations → Invoices (many-to-one)
- Invoice Approvals → Invoices (many-to-one)

## Getting Started

1. **Review Documentation**
   - Read `GETTING_STARTED.md` for user guide
   - Check `API_DOCUMENTATION.md` for automation

2. **Add Suppliers**
   - Navigate to Suppliers
   - Add your vendor information

3. **Create Invoices**
   - Go to Invoices → New Invoice
   - Choose manual entry or file upload
   - Fill in details and add line items

4. **Manage Approvals**
   - Submit invoices for approval
   - Approvers can review and approve/reject
   - Track approval history

5. **Generate Reports**
   - View dashboard for real-time stats
   - Access Reports for detailed analysis
   - Export data as CSV

6. **Automate with n8n**
   - Set up n8n workflows
   - Use API endpoints for integration
   - Automate notifications and data entry

## API Endpoints

The application includes a complete REST API for automation:

### Invoice Operations
- `GET /invoices` - List invoices with filters
- `GET /invoices/{id}` - Get invoice details
- `POST /invoices` - Create new invoice
- `PUT /invoices/{id}/status` - Update status

### Statistics
- `GET /stats` - Get system statistics

### Suppliers
- `GET /suppliers` - List all suppliers

See `API_DOCUMENTATION.md` for complete details, examples, and n8n workflow templates.

## Key Features in Detail

### Automatic Validation

The system automatically validates invoices for:
- Missing required fields (invoice number, dates, amounts)
- Duplicate invoice numbers
- Amount mismatches between line items and totals
- Missing supplier information

Issues are flagged with severity levels and can be resolved individually.

### Approval Workflow

Simple yet powerful workflow:
1. Draft → Create and edit invoice
2. Submit for Approval → Move to pending state
3. Approve/Reject → Final decision with comments
4. Archive → Long-term storage

Each step is tracked with timestamps and approver information.

### Reporting & Analytics

- **Dashboard:** Real-time metrics and recent activity
- **Monthly Reports:** Breakdown by month with totals
- **Supplier Reports:** Analyze spending by vendor
- **Export:** All data exportable to CSV
- **Date Filtering:** Flexible date range selection

### Mobile Responsive

- Fully responsive design
- Touch-friendly interface
- Optimized for tablets and phones
- Consistent experience across devices

## n8n Integration Examples

### Monitor Pending Approvals
```
[Schedule] → [HTTP: GET /invoices?status=pending_approval]
→ [IF: Has invoices] → [Email: Send notification]
```

### Auto-create from Email
```
[Email Trigger] → [Extract Data] → [HTTP: POST /invoices]
→ [Slack: Notify team]
```

### Daily Statistics Report
```
[Schedule: 9 AM] → [HTTP: GET /stats] → [Format Data]
→ [Email: Send report]
```

See `API_DOCUMENTATION.md` for more examples and complete endpoint details.

## Best Practices

1. **Data Entry**
   - Always use unique invoice numbers
   - Select suppliers from dropdown for consistency
   - Add detailed line items
   - Include notes for context

2. **Validation**
   - Review validation issues before approval
   - Resolve duplicates promptly
   - Verify totals match source documents

3. **Workflow**
   - Submit for approval when ready
   - Add approval comments for audit trail
   - Archive old invoices regularly

4. **Reporting**
   - Export data regularly for backup
   - Review monthly trends
   - Monitor supplier spending

5. **Automation**
   - Use n8n for repetitive tasks
   - Set up approval notifications
   - Automate duplicate alerts
   - Generate scheduled reports

## Security Notes

- Row Level Security (RLS) enabled on all tables
- Currently configured with public access for demo
- For production, implement proper authentication
- Restrict RLS policies to authenticated users
- Never expose service role keys in client code

## Customization

The application can be customized for your needs:

- **Statuses:** Modify invoice status options
- **Validation Rules:** Add custom validation logic
- **Approval Workflow:** Extend to multi-level approvals
- **Fields:** Add custom fields to invoices
- **Reports:** Create custom report views
- **Branding:** Update colors, logo, and styling

## Future Enhancements

Potential additions:
- OCR for automatic data extraction from PDFs
- Payment processing integration
- Multi-currency support
- Advanced analytics dashboard
- Mobile app (iOS/Android)
- Batch import/export
- Custom approval rules engine
- Purchase order management
- Email integration for notifications
- Document versioning

## Support

For questions or issues:
1. Check `GETTING_STARTED.md` for usage help
2. Review `API_DOCUMENTATION.md` for integration
3. Check Supabase project logs for errors
4. Verify environment variables are set correctly

## License

This is a demo/template project. Customize and use as needed for your business.

---

**Ready to streamline your invoice management?** Get started today!
