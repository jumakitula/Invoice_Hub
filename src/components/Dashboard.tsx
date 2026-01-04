import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { FileText, Clock, CheckCircle, AlertTriangle, XCircle, TrendingUp } from 'lucide-react';

interface DashboardStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  withIssues: number;
  duplicates: number;
  totalAmount: number;
  recentInvoices: Array<{
    id: string;
    invoice_number: string;
    supplier_name: string;
    total_amount: number;
    status: string;
    has_validation_issues: boolean;
    is_duplicate: boolean;
  }>;
}

export function Dashboard({ onNavigate }: { onNavigate: (view: string, data?: any) => void }) {
  const [stats, setStats] = useState<DashboardStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    withIssues: 0,
    duplicates: 0,
    totalAmount: 0,
    recentInvoices: [],
  });
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          suppliers (name)
        `)
        .order('created_at', { ascending: false });

      if (invoices && Array.isArray(invoices)) {
        const total = invoices.length;
        const pending = invoices.filter((i: any) => i.status === 'pending_approval').length;
        const approved = invoices.filter((i: any) => i.status === 'approved').length;
        const rejected = invoices.filter((i: any) => i.status === 'rejected').length;
        const withIssues = invoices.filter((i: any) => i.has_validation_issues).length;
        const duplicates = invoices.filter((i: any) => i.is_duplicate).length;
        const totalAmount = invoices
          .filter((i: any) => i.status === 'approved')
          .reduce((sum, i: any) => sum + Number(i.total_amount), 0);

        const recentInvoices = invoices.slice(0, 5).map((inv: any) => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          supplier_name: (inv.suppliers as any)?.name || 'Unknown',
          total_amount: Number(inv.total_amount),
          status: inv.status,
          has_validation_issues: inv.has_validation_issues,
          is_duplicate: inv.is_duplicate,
        }));

        setStats({
          total,
          pending,
          approved,
          rejected,
          withIssues,
          duplicates,
          totalAmount,
          recentInvoices,
        });
      }
    } catch (error) {
      console.error('Error loading dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const statCards = [
    { label: 'Total Invoices', value: stats.total, icon: FileText, color: 'bg-blue-500' },
    { label: 'Pending Approval', value: stats.pending, icon: Clock, color: 'bg-yellow-500' },
    { label: 'Approved', value: stats.approved, icon: CheckCircle, color: 'bg-green-500' },
    { label: 'With Issues', value: stats.withIssues, icon: AlertTriangle, color: 'bg-orange-500' },
    { label: 'Duplicates', value: stats.duplicates, icon: XCircle, color: 'bg-red-500' },
    {
      label: 'Total Approved Amount',
      value: `$${stats.totalAmount.toLocaleString()}`,
      icon: TrendingUp,
      color: 'bg-teal-500'
    },
  ];

  const getStatusBadge = (status: string) => {
    const styles = {
      draft: 'bg-gray-100 text-gray-700',
      pending_approval: 'bg-yellow-100 text-yellow-700',
      approved: 'bg-green-100 text-green-700',
      rejected: 'bg-red-100 text-red-700',
      archived: 'bg-gray-100 text-gray-500',
    };
    return styles[status as keyof typeof styles] || styles.draft;
  };

  if (loading) {
    return (
      <div className="p-8">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-gray-200 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map(i => (
              <div key={i} className="h-32 bg-gray-200 rounded-lg"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h2 className="text-2xl font-bold text-gray-900">Dashboard</h2>
        <p className="text-gray-600 mt-1">Overview of your invoice management system</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div key={card.label} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">{card.label}</p>
                  <p className="text-2xl font-bold text-gray-900 mt-2">{card.value}</p>
                </div>
                <div className={`${card.color} p-3 rounded-lg`}>
                  <Icon className="text-white" size={24} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Invoices</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Invoice #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Amount</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Alerts</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {stats.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500">
                    No invoices yet. Create your first invoice to get started.
                  </td>
                </tr>
              ) : (
                stats.recentInvoices.map((invoice) => (
                  <tr
                    key={invoice.id}
                    onClick={() => onNavigate('invoice-detail', { id: invoice.id })}
                    className="hover:bg-gray-50 cursor-pointer"
                  >
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">{invoice.invoice_number}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{invoice.supplier_name}</td>
                    <td className="px-6 py-4 text-sm text-gray-900">${invoice.total_amount.toLocaleString()}</td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${getStatusBadge(invoice.status)}`}>
                        {invoice.status.replace('_', ' ')}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {invoice.has_validation_issues && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-orange-100 text-orange-700">
                            <AlertTriangle size={12} />
                            Issues
                          </span>
                        )}
                        {invoice.is_duplicate && (
                          <span className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-700">
                            <XCircle size={12} />
                            Duplicate
                          </span>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
