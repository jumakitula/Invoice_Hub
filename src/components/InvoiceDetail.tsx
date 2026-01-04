import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, AlertTriangle, CheckCircle, XCircle, Clock, ThumbsUp, ThumbsDown } from 'lucide-react';

interface InvoiceDetailProps {
  invoiceId: string;
  onNavigate: (view: string) => void;
}

interface Validation {
  id: string;
  validation_type: string;
  severity: string;
  message: string;
  field_name: string;
  resolved: boolean;
}

export function InvoiceDetail({ invoiceId, onNavigate }: InvoiceDetailProps) {
  const [invoice, setInvoice] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [validations, setValidations] = useState<Validation[]>([]);
  const [approvals, setApprovals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);
  const [approvalAction, setApprovalAction] = useState<'approve' | 'reject'>('approve');
  const [approvalComments, setApprovalComments] = useState('');
  const [approverEmail, setApproverEmail] = useState('');

  useEffect(() => {
    loadInvoiceDetails();
  }, [invoiceId]);

  const loadInvoiceDetails = async () => {
    try {
      const { data: invoiceData } = await supabase
        .from('invoices')
        .select(`
          *,
          suppliers (name, email),
          purchase_orders (po_number, total_amount)
        `)
        .eq('id', invoiceId)
        .single();

      const { data: items } = await supabase
        .from('invoice_line_items')
        .select('*')
        .eq('invoice_id', invoiceId);

      const { data: vals } = await supabase
        .from('invoice_validations')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      const { data: apps } = await supabase
        .from('invoice_approvals')
        .select('*')
        .eq('invoice_id', invoiceId)
        .order('created_at', { ascending: false });

      setInvoice(invoiceData);
      setLineItems(items || []);
      setValidations(vals || []);
      setApprovals(apps || []);
    } catch (error) {
      console.error('Error loading invoice details:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleApproval = async () => {
    if (!approverEmail) {
      alert('Please enter your email');
      return;
    }

    try {
      const newStatus = approvalAction === 'approve' ? 'approved' : 'rejected';

      await supabase
        .from('invoice_approvals')
        .insert({
          invoice_id: invoiceId,
          status: newStatus,
          approver_email: approverEmail,
          approved_at: new Date().toISOString(),
          comments: approvalComments,
        });

      await supabase
        .from('invoices')
        .update({ status: newStatus })
        .eq('id', invoiceId);

      setShowApprovalDialog(false);
      loadInvoiceDetails();
    } catch (error) {
      console.error('Error processing approval:', error);
      alert('Failed to process approval');
    }
  };

  const resolveValidation = async (validationId: string) => {
    await supabase
      .from('invoice_validations')
      .update({ resolved: true })
      .eq('id', validationId);

    const unresolvedCount = validations.filter(v => !v.resolved && v.id !== validationId).length;
    if (unresolvedCount === 0) {
      await supabase
        .from('invoices')
        .update({ has_validation_issues: false })
        .eq('id', invoiceId);
    }

    loadInvoiceDetails();
  };

  const submitForApproval = async () => {
    await supabase
      .from('invoices')
      .update({ status: 'pending_approval' })
      .eq('id', invoiceId);

    loadInvoiceDetails();
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="h-64 bg-gray-200 rounded"></div>
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="p-8">
        <p className="text-gray-600">Invoice not found</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: { bg: 'bg-gray-100', text: 'text-gray-700', icon: Clock },
      pending_approval: { bg: 'bg-yellow-100', text: 'text-yellow-700', icon: Clock },
      approved: { bg: 'bg-green-100', text: 'text-green-700', icon: CheckCircle },
      rejected: { bg: 'bg-red-100', text: 'text-red-700', icon: XCircle },
      archived: { bg: 'bg-gray-100', text: 'text-gray-500', icon: Clock },
    };
    const style = styles[status as keyof typeof styles] || styles.draft;
    const Icon = style.icon;

    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${style.bg} ${style.text}`}>
        <Icon size={16} />
        {status.replace('_', ' ')}
      </span>
    );
  };

  const getSeverityBadge = (severity: string) => {
    const styles = {
      error: 'bg-red-100 text-red-700',
      warning: 'bg-yellow-100 text-yellow-700',
      info: 'bg-blue-100 text-blue-700',
    };
    return styles[severity as keyof typeof styles] || styles.info;
  };

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <button
        onClick={() => onNavigate('invoices')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Invoices
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-2xl font-bold text-gray-900">Invoice {invoice.invoice_number}</h2>
            <p className="text-gray-600 mt-1">Created {new Date(invoice.created_at).toLocaleDateString()}</p>
          </div>
          <div className="flex items-center gap-3">
            {getStatusBadge(invoice.status)}
            {invoice.has_validation_issues && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-orange-100 text-orange-700">
                <AlertTriangle size={16} />
                Has Issues
              </span>
            )}
            {invoice.is_duplicate && (
              <span className="inline-flex items-center gap-1 px-3 py-1 text-sm font-medium rounded-full bg-red-100 text-red-700">
                <XCircle size={16} />
                Duplicate
              </span>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Supplier</h3>
            <p className="text-gray-900">{invoice.suppliers?.name || 'Not specified'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Purchase Order</h3>
            <p className="text-gray-900">{invoice.purchase_orders?.po_number || 'No PO linked'}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Invoice Date</h3>
            <p className="text-gray-900">
              {invoice.invoice_date ? new Date(invoice.invoice_date).toLocaleDateString() : 'Not specified'}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500 mb-1">Due Date</h3>
            <p className="text-gray-900">
              {invoice.due_date ? new Date(invoice.due_date).toLocaleDateString() : 'Not specified'}
            </p>
          </div>
        </div>

        <div className="border-t border-gray-200 pt-6">
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">${Number(invoice.subtotal).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center mb-2">
            <span className="text-gray-600">Tax</span>
            <span className="text-gray-900">${Number(invoice.tax_amount).toLocaleString()}</span>
          </div>
          <div className="flex justify-between items-center pt-2 border-t border-gray-200">
            <span className="text-lg font-semibold text-gray-900">Total</span>
            <span className="text-lg font-bold text-gray-900">${Number(invoice.total_amount).toLocaleString()}</span>
          </div>
        </div>

        {invoice.notes && (
          <div className="mt-6 pt-6 border-t border-gray-200">
            <h3 className="text-sm font-medium text-gray-500 mb-2">Notes</h3>
            <p className="text-gray-700">{invoice.notes}</p>
          </div>
        )}
      </div>

      {lineItems.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Line Items</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Quantity</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Price</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lineItems.map((item) => (
                  <tr key={item.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{item.description}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">{item.quantity}</td>
                    <td className="px-4 py-3 text-sm text-gray-900 text-right">${Number(item.unit_price).toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${Number(item.line_total).toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {validations.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Validation Issues</h3>
          <div className="space-y-3">
            {validations.map((validation) => (
              <div
                key={validation.id}
                className={`flex items-start justify-between p-4 rounded-lg ${
                  validation.resolved ? 'bg-gray-50' : 'bg-orange-50'
                }`}
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle
                    size={20}
                    className={validation.resolved ? 'text-gray-400' : 'text-orange-600'}
                  />
                  <div>
                    <p className={`font-medium ${validation.resolved ? 'text-gray-600' : 'text-gray-900'}`}>
                      {validation.message}
                    </p>
                    <p className="text-sm text-gray-500 mt-1">
                      {validation.validation_type} - {validation.field_name}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityBadge(validation.severity)}`}>
                    {validation.severity}
                  </span>
                  {!validation.resolved && (
                    <button
                      onClick={() => resolveValidation(validation.id)}
                      className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                    >
                      Resolve
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {approvals.length > 0 && (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Approval History</h3>
          <div className="space-y-3">
            {approvals.map((approval) => (
              <div key={approval.id} className="flex items-start gap-3 p-4 bg-gray-50 rounded-lg">
                {approval.status === 'approved' ? (
                  <CheckCircle size={20} className="text-green-600" />
                ) : approval.status === 'rejected' ? (
                  <XCircle size={20} className="text-red-600" />
                ) : (
                  <Clock size={20} className="text-yellow-600" />
                )}
                <div className="flex-1">
                  <p className="font-medium text-gray-900">
                    {approval.status === 'approved' ? 'Approved' : approval.status === 'rejected' ? 'Rejected' : 'Pending'}
                  </p>
                  <p className="text-sm text-gray-600 mt-1">
                    by {approval.approver_email || 'Unknown'} on{' '}
                    {approval.approved_at ? new Date(approval.approved_at).toLocaleString() : 'Pending'}
                  </p>
                  {approval.comments && (
                    <p className="text-sm text-gray-700 mt-2">{approval.comments}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-3">
        {invoice.status === 'draft' && (
          <button
            onClick={submitForApproval}
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
          >
            Submit for Approval
          </button>
        )}

        {invoice.status === 'pending_approval' && (
          <>
            <button
              onClick={() => {
                setApprovalAction('approve');
                setShowApprovalDialog(true);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 font-medium"
            >
              <ThumbsUp size={20} />
              Approve
            </button>
            <button
              onClick={() => {
                setApprovalAction('reject');
                setShowApprovalDialog(true);
              }}
              className="flex items-center gap-2 px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium"
            >
              <ThumbsDown size={20} />
              Reject
            </button>
          </>
        )}
      </div>

      {showApprovalDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">
              {approvalAction === 'approve' ? 'Approve Invoice' : 'Reject Invoice'}
            </h3>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Your Email</label>
              <input
                type="email"
                value={approverEmail}
                onChange={(e) => setApproverEmail(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="approver@company.com"
              />
            </div>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">Comments (Optional)</label>
              <textarea
                value={approvalComments}
                onChange={(e) => setApprovalComments(e.target.value)}
                rows={3}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Add any comments..."
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setShowApprovalDialog(false)}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
              >
                Cancel
              </button>
              <button
                onClick={handleApproval}
                className={`flex-1 px-4 py-2 text-white rounded-lg font-medium ${
                  approvalAction === 'approve'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                Confirm {approvalAction === 'approve' ? 'Approval' : 'Rejection'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
