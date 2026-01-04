-- Sample Data for InvoiceHub
-- Run these SQL statements in your Supabase SQL Editor to populate the database with test data

-- Insert sample suppliers
INSERT INTO suppliers (name, email, phone, address, tax_id) VALUES
  ('Acme Corporation', 'billing@acmecorp.com', '+1-555-0100', '123 Business St, New York, NY 10001', '12-3456789'),
  ('Tech Solutions Inc', 'accounts@techsolutions.com', '+1-555-0101', '456 Innovation Ave, San Francisco, CA 94105', '98-7654321'),
  ('Global Supplies Co', 'invoices@globalsupplies.com', '+1-555-0102', '789 Commerce Blvd, Chicago, IL 60601', '45-6789012'),
  ('Office Essentials LLC', 'billing@officeessentials.com', '+1-555-0103', '321 Supply Lane, Austin, TX 78701', '78-9012345'),
  ('Digital Services Group', 'finance@digitalservices.com', '+1-555-0104', '654 Tech Park, Seattle, WA 98101', '23-4567890');

-- Insert sample purchase orders
INSERT INTO purchase_orders (po_number, supplier_id, total_amount, status, created_date)
SELECT
  'PO-2024-001',
  id,
  5000.00,
  'open',
  '2024-01-01'
FROM suppliers WHERE name = 'Acme Corporation'
UNION ALL
SELECT
  'PO-2024-002',
  id,
  7500.00,
  'open',
  '2024-01-05'
FROM suppliers WHERE name = 'Tech Solutions Inc';

-- Insert sample invoices
INSERT INTO invoices (invoice_number, supplier_id, po_id, invoice_date, due_date, subtotal, tax_amount, total_amount, currency, status, file_type, notes)
SELECT
  'INV-001',
  s.id,
  po.id,
  '2024-01-10',
  '2024-02-10',
  4500.00,
  450.00,
  4950.00,
  'USD',
  'approved',
  'manual',
  'Monthly software licenses and support'
FROM suppliers s
CROSS JOIN purchase_orders po
WHERE s.name = 'Acme Corporation' AND po.po_number = 'PO-2024-001'
UNION ALL
SELECT
  'INV-002',
  s.id,
  NULL,
  '2024-01-15',
  '2024-02-15',
  2300.00,
  230.00,
  2530.00,
  'USD',
  'pending_approval',
  'manual',
  'Office supplies for Q1'
FROM suppliers s
WHERE s.name = 'Office Essentials LLC'
UNION ALL
SELECT
  'INV-003',
  s.id,
  po.id,
  '2024-01-20',
  '2024-02-20',
  6800.00,
  680.00,
  7480.00,
  'USD',
  'draft',
  'manual',
  'Cloud hosting services - January'
FROM suppliers s
CROSS JOIN purchase_orders po
WHERE s.name = 'Tech Solutions Inc' AND po.po_number = 'PO-2024-002'
UNION ALL
SELECT
  'INV-004',
  s.id,
  NULL,
  '2024-01-22',
  '2024-02-22',
  1250.00,
  125.00,
  1375.00,
  'USD',
  'pending_approval',
  'manual',
  'Marketing materials and printing'
FROM suppliers s
WHERE s.name = 'Global Supplies Co'
UNION ALL
SELECT
  'INV-005',
  s.id,
  NULL,
  '2024-01-25',
  '2024-02-25',
  3200.00,
  320.00,
  3520.00,
  'USD',
  'approved',
  'manual',
  'Digital marketing services'
FROM suppliers s
WHERE s.name = 'Digital Services Group';

-- Insert sample line items for invoices
INSERT INTO invoice_line_items (invoice_id, description, quantity, unit_price, line_total, tax_rate)
SELECT
  i.id,
  'Software License - Enterprise Plan',
  5,
  800.00,
  4000.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-001'
UNION ALL
SELECT
  i.id,
  'Technical Support - 20 hours',
  20,
  25.00,
  500.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-001'
UNION ALL
SELECT
  i.id,
  'Office Chairs - Ergonomic',
  10,
  150.00,
  1500.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-002'
UNION ALL
SELECT
  i.id,
  'Desk Accessories Bundle',
  20,
  40.00,
  800.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-002'
UNION ALL
SELECT
  i.id,
  'AWS Cloud Hosting - Production',
  1,
  5000.00,
  5000.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-003'
UNION ALL
SELECT
  i.id,
  'Database Management Service',
  1,
  1800.00,
  1800.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-003'
UNION ALL
SELECT
  i.id,
  'Business Cards - 1000 qty',
  1,
  250.00,
  250.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-004'
UNION ALL
SELECT
  i.id,
  'Brochure Printing - Color',
  500,
  2.00,
  1000.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-004'
UNION ALL
SELECT
  i.id,
  'Social Media Management - Monthly',
  1,
  2000.00,
  2000.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-005'
UNION ALL
SELECT
  i.id,
  'SEO Optimization Service',
  1,
  1200.00,
  1200.00,
  10.00
FROM invoices i WHERE i.invoice_number = 'INV-005';

-- Insert sample approvals for approved invoices
INSERT INTO invoice_approvals (invoice_id, status, approver_email, approved_at, comments)
SELECT
  i.id,
  'approved',
  'manager@company.com',
  '2024-01-12 10:30:00',
  'Approved - Regular monthly expense'
FROM invoices i WHERE i.invoice_number = 'INV-001'
UNION ALL
SELECT
  i.id,
  'approved',
  'cfo@company.com',
  '2024-01-26 14:15:00',
  'Approved - Within budget'
FROM invoices i WHERE i.invoice_number = 'INV-005';

-- Insert sample validations for invoices with issues
INSERT INTO invoice_validations (invoice_id, validation_type, severity, message, field_name, resolved)
SELECT
  i.id,
  'missing_data',
  'warning',
  'Purchase order not linked',
  'po_id',
  false
FROM invoices i WHERE i.invoice_number = 'INV-002'
UNION ALL
SELECT
  i.id,
  'missing_data',
  'warning',
  'Purchase order not linked',
  'po_id',
  false
FROM invoices i WHERE i.invoice_number = 'INV-004';

-- Update invoices with validation issues flag
UPDATE invoices
SET has_validation_issues = true
WHERE invoice_number IN ('INV-002', 'INV-004');

-- Verify the data
SELECT 'Suppliers' as table_name, COUNT(*) as count FROM suppliers
UNION ALL
SELECT 'Purchase Orders', COUNT(*) FROM purchase_orders
UNION ALL
SELECT 'Invoices', COUNT(*) FROM invoices
UNION ALL
SELECT 'Line Items', COUNT(*) FROM invoice_line_items
UNION ALL
SELECT 'Validations', COUNT(*) FROM invoice_validations
UNION ALL
SELECT 'Approvals', COUNT(*) FROM invoice_approvals;
