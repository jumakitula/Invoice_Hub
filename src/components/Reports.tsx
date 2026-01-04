import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Download, Calendar, TrendingUp, DollarSign, FileText } from 'lucide-react';

interface MonthlyReport {
  month: string;
  count: number;
  total: number;
}

interface SupplierReport {
  supplier_id: string;
  supplier_name: string;
  count: number;
  total: number;
}

export function Reports() {
  const [monthlyData, setMonthlyData] = useState<MonthlyReport[]>([]);
  const [supplierData, setSupplierData] = useState<SupplierReport[]>([]);
  const [totalStats, setTotalStats] = useState({
    totalInvoices: 0,
    approvedAmount: 0,
    pendingAmount: 0,
    avgInvoiceAmount: 0,
  });
  const [dateRange, setDateRange] = useState({
    start: new Date(new Date().getFullYear(), 0, 1).toISOString().split('T')[0],
    end: new Date().toISOString().split('T')[0],
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, [dateRange]);

  const loadReports = async () => {
    try {
      const { data: invoices } = await supabase
        .from('invoices')
        .select(`
          *,
          suppliers (name)
        `)
        .gte('invoice_date', dateRange.start)
        .lte('invoice_date', dateRange.end);

      if (!invoices) return;

      const monthlyMap = new Map<string, { count: number; total: number }>();
      const supplierMap = new Map<string, { name: string; count: number; total: number }>();

      let totalInvoices = invoices.length;
      let approvedAmount = 0;
      let pendingAmount = 0;

      invoices.forEach((invoice) => {
        const month = invoice.invoice_date
          ? new Date(invoice.invoice_date).toLocaleDateString('en-US', { year: 'numeric', month: 'short' })
          : 'Unknown';

        const existing = monthlyMap.get(month) || { count: 0, total: 0 };
        monthlyMap.set(month, {
          count: existing.count + 1,
          total: existing.total + Number(invoice.total_amount),
        });

        const supplierId = invoice.supplier_id || 'unknown';
        const supplierName = (invoice.suppliers as any)?.name || 'Unknown Supplier';
        const supplierExisting = supplierMap.get(supplierId) || { name: supplierName, count: 0, total: 0 };
        supplierMap.set(supplierId, {
          name: supplierName,
          count: supplierExisting.count + 1,
          total: supplierExisting.total + Number(invoice.total_amount),
        });

        if (invoice.status === 'approved') {
          approvedAmount += Number(invoice.total_amount);
        } else if (invoice.status === 'pending_approval') {
          pendingAmount += Number(invoice.total_amount);
        }
      });

      const monthly = Array.from(monthlyMap.entries()).map(([month, data]) => ({
        month,
        count: data.count,
        total: data.total,
      }));

      const supplier = Array.from(supplierMap.entries())
        .map(([id, data]) => ({
          supplier_id: id,
          supplier_name: data.name,
          count: data.count,
          total: data.total,
        }))
        .sort((a, b) => b.total - a.total);

      setMonthlyData(monthly);
      setSupplierData(supplier);
      setTotalStats({
        totalInvoices,
        approvedAmount,
        pendingAmount,
        avgInvoiceAmount: totalInvoices > 0 ? approvedAmount / totalInvoices : 0,
      });
    } catch (error) {
      console.error('Error loading reports:', error);
    } finally {
      setLoading(false);
    }
  };

  const exportMonthlyCSV = () => {
    const headers = ['Month', 'Invoice Count', 'Total Amount'];
    const rows = monthlyData.map(d => [d.month, d.count.toString(), d.total.toFixed(2)]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `monthly-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const exportSupplierCSV = () => {
    const headers = ['Supplier', 'Invoice Count', 'Total Amount'];
    const rows = supplierData.map(d => [d.supplier_name, d.count.toString(), d.total.toFixed(2)]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `supplier-report-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
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

  return (
    <div className="p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Reports</h2>
        <p className="text-gray-600 mt-1">View invoice analytics and generate reports</p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Date Range</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Date</label>
            <input
              type="date"
              value={dateRange.start}
              onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Date</label>
            <input
              type="date"
              value={dateRange.end}
              onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Invoices</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">{totalStats.totalInvoices}</p>
            </div>
            <div className="bg-blue-500 p-3 rounded-lg">
              <FileText className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Approved Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${totalStats.approvedAmount.toLocaleString()}</p>
            </div>
            <div className="bg-green-500 p-3 rounded-lg">
              <DollarSign className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Pending Amount</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${totalStats.pendingAmount.toLocaleString()}</p>
            </div>
            <div className="bg-yellow-500 p-3 rounded-lg">
              <Calendar className="text-white" size={24} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Avg Invoice</p>
              <p className="text-2xl font-bold text-gray-900 mt-2">${totalStats.avgInvoiceAmount.toLocaleString()}</p>
            </div>
            <div className="bg-teal-500 p-3 rounded-lg">
              <TrendingUp className="text-white" size={24} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Monthly Breakdown</h3>
            <button
              onClick={exportMonthlyCSV}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download size={16} />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Month</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {monthlyData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No data available</td>
                  </tr>
                ) : (
                  monthlyData.map((row, idx) => (
                    <tr key={idx}>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.month}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.count}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${row.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">By Supplier</h3>
            <button
              onClick={exportSupplierCSV}
              className="flex items-center gap-2 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Download size={16} />
              Export
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Supplier</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Count</th>
                  <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {supplierData.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-4 py-8 text-center text-gray-500">No data available</td>
                  </tr>
                ) : (
                  supplierData.map((row) => (
                    <tr key={row.supplier_id}>
                      <td className="px-4 py-3 text-sm text-gray-900">{row.supplier_name}</td>
                      <td className="px-4 py-3 text-sm text-gray-900 text-right">{row.count}</td>
                      <td className="px-4 py-3 text-sm font-medium text-gray-900 text-right">${row.total.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
