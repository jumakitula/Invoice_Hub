# Getting Started with InvoiceHub

Welcome to InvoiceHub, your complete invoice management solution! This guide will help you get started quickly.

## Quick Start

### 1. Initial Setup

The application is ready to use out of the box. Simply navigate through the sidebar to explore the different sections.

### 2. Add Your First Supplier

Before creating invoices, it's helpful to set up your suppliers:

1. Click **Suppliers** in the sidebar
2. Click **Add Supplier**
3. Fill in the supplier information:
   - Name (required)
   - Email
   - Phone
   - Tax ID
   - Address
4. Click **Create**

### 3. Create Your First Invoice

There are two ways to create invoices:

#### Option A: Manual Entry

1. Click **Invoices** in the sidebar
2. Click **New Invoice**
3. Choose **Manual Entry**
4. Fill in the invoice details:
   - Invoice Number (required)
   - Select Supplier
   - Invoice Date
   - Due Date
5. Add line items:
   - Click **Add Item** to add more lines
   - Enter description, quantity, and unit price
   - Line totals calculate automatically
6. Add tax amount if applicable
7. Click **Create Invoice**

#### Option B: Upload File

1. Click **Invoices** in the sidebar
2. Click **New Invoice**
3. Choose **Upload File**
4. Upload a PDF or Excel file
5. Fill in any remaining details
6. Click **Create Invoice**

### 4. Review and Validate

After creating an invoice, the system automatically:
- Checks for missing required data
- Detects duplicate invoice numbers
- Flags potential issues

View these on the invoice detail page.

### 5. Approval Workflow

1. Navigate to **Dashboard** to see pending approvals
2. Click on an invoice to view details
3. If the invoice is in draft status, click **Submit for Approval**
4. Approvers can then click **Approve** or **Reject**
5. Enter approver email and optional comments
6. The invoice status updates automatically

### 6. Generate Reports

1. Click **Reports** in the sidebar
2. Select a date range
3. View statistics:
   - Total invoices processed
   - Approved amounts
   - Pending amounts
   - Average invoice value
4. Export reports:
   - Click **Export** on Monthly Breakdown
   - Click **Export** on Supplier Report
   - Reports download as CSV files

### 7. Export Data

From the Invoices page:
1. Use filters to narrow down invoices
2. Click **Export CSV**
3. The file downloads with all filtered invoices

## Key Features

### Dashboard
- Real-time statistics
- Visual status indicators
- Recent invoice activity
- Quick access to pending approvals

### Invoice Management
- Create invoices manually or via upload
- Automatic validation and duplicate detection
- Line item tracking
- Purchase order matching
- Status workflow (draft → pending → approved/rejected → archived)

### Supplier Management
- Complete supplier database
- Contact information tracking
- Tax ID management
- Easy search and filtering

### Approval Workflow
- Multi-step approval process
- Email notifications (via n8n integration)
- Approval history tracking
- Comments and audit trail

### Reporting
- Monthly breakdown analysis
- Supplier-specific reports
- Total amounts and statistics
- Date range filtering
- CSV export for all reports

## n8n Automation Integration

InvoiceHub includes a complete REST API for automation. See `API_DOCUMENTATION.md` for details.

### Common Automation Scenarios:

1. **Email Invoice Processing**
   - Forward invoices to a monitored email
   - n8n extracts data and creates invoice via API
   - Automatic validation runs
   - Notifications sent to approvers

2. **Approval Notifications**
   - n8n polls for pending approvals
   - Sends email/Slack notifications
   - Approvers respond via link
   - Status updates automatically

3. **Daily Reporting**
   - n8n fetches statistics daily
   - Generates formatted report
   - Emails to management
   - Tracks trends over time

4. **Duplicate Prevention**
   - n8n monitors for new invoices
   - Checks for duplicates
   - Alerts team immediately
   - Prevents payment errors

## Best Practices

### Invoice Management
1. Always fill in invoice numbers accurately
2. Select the correct supplier from the dropdown
3. Add detailed line items for better tracking
4. Review validation issues before approval
5. Resolve duplicate warnings promptly

### Supplier Management
1. Keep supplier information up to date
2. Include tax IDs for compliance
3. Add contact emails for automated notifications
4. Use consistent naming conventions

### Approval Workflow
1. Review validation issues before approving
2. Add comments explaining approval decisions
3. Check for duplicates in the system
4. Verify amounts match source documents
5. Archive old invoices regularly

### Reporting
1. Set appropriate date ranges
2. Export data regularly for backup
3. Review monthly trends
4. Track supplier spending patterns
5. Monitor validation issues

## Troubleshooting

### Validation Issues

**Missing Data Warnings:**
- Fill in all required fields (invoice number, date, supplier)
- Add line items for manual entries
- Verify totals match source documents

**Duplicate Invoice Detected:**
- Check if invoice already exists in system
- Verify invoice number is correct
- Update the duplicate if needed
- Contact supplier if truly duplicate

### Approval Issues

**Cannot Submit for Approval:**
- Resolve all validation errors first
- Ensure invoice status is "draft"
- Add required invoice details

**Approval Button Not Showing:**
- Only "pending_approval" status shows buttons
- Submit invoice for approval first
- Check that you have permission

## Tips for Success

1. **Start Small** - Add a few test invoices to learn the system
2. **Clean Data** - Keep supplier information accurate
3. **Regular Reviews** - Check dashboard daily for pending items
4. **Use Filters** - Narrow down invoices quickly with search and filters
5. **Export Often** - Keep backup exports of your data
6. **Automate** - Use n8n to reduce manual data entry
7. **Monitor** - Watch for validation issues and duplicates
8. **Document** - Add notes to invoices for future reference

## Next Steps

1. Explore the **Dashboard** for an overview
2. Add your **Suppliers**
3. Create test **Invoices**
4. Review **Reports** to see analytics
5. Set up **n8n automation** (see API docs)
6. Configure **approval workflows**
7. Train your team on the system

## Support

For technical questions:
- Review the API documentation
- Check Supabase project logs
- Verify environment variables
- Test with sample data first

## Feature Roadmap

Future enhancements planned:
- OCR integration for automatic data extraction
- Payment tracking integration
- Multi-currency support
- Advanced reporting dashboards
- Mobile app
- Batch import/export
- Custom approval rules
- Purchase order management

---

**Ready to get started?** Click on Dashboard to begin managing your invoices!
