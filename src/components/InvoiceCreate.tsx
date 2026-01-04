import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { ArrowLeft, Upload, Plus, Trash2, Loader } from 'lucide-react';

interface Supplier {
  id: string;
  name: string;
}

interface LineItem {
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
}

export function InvoiceCreate({ onNavigate }: { onNavigate: (view: string) => void }) {
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploadMode, setUploadMode] = useState<'manual' | 'upload'>('manual');

  const [formData, setFormData] = useState({
    invoice_number: '',
    supplier_id: '',
    invoice_date: '',
    due_date: '',
    subtotal: 0,
    tax_amount: 0,
    total_amount: 0,
    currency: 'USD',
    notes: '',
  });

  const [lineItems, setLineItems] = useState<LineItem[]>([
    { description: '', quantity: 1, unit_price: 0, line_total: 0 }
  ]);

  const [file, setFile] = useState<File | null>(null);

  useEffect(() => {
    loadSuppliers();
  }, []);

  useEffect(() => {
    calculateTotals();
  }, [lineItems]);

  const loadSuppliers = async () => {
    const { data } = await supabase
      .from('suppliers')
      .select('id, name')
      .order('name');

    if (data) setSuppliers(data);
  };

  const calculateTotals = () => {
    const subtotal = lineItems.reduce((sum, item) => sum + item.line_total, 0);
    setFormData(prev => ({
      ...prev,
      subtotal,
      total_amount: subtotal + prev.tax_amount
    }));
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    updated[index] = { ...updated[index], [field]: value };

    if (field === 'quantity' || field === 'unit_price') {
      updated[index].line_total = updated[index].quantity * updated[index].unit_price;
    }

    setLineItems(updated);
  };

  const addLineItem = () => {
    setLineItems([...lineItems, { description: '', quantity: 1, unit_price: 0, line_total: 0 }]);
  };

  const removeLineItem = (index: number) => {
    if (lineItems.length > 1) {
      setLineItems(lineItems.filter((_, i) => i !== index));
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { data: invoice, error: invoiceError } = await supabase
        .from('invoices')
        .insert({
          invoice_number: formData.invoice_number,
          supplier_id: formData.supplier_id || null,
          invoice_date: formData.invoice_date || null,
          due_date: formData.due_date || null,
          subtotal: formData.subtotal,
          tax_amount: formData.tax_amount,
          total_amount: formData.total_amount,
          currency: formData.currency,
          status: 'draft',
          file_type: uploadMode,
          notes: formData.notes,
        })
        .select()
        .single();

      if (invoiceError) throw invoiceError;

      if (uploadMode === 'manual' && invoice) {
        const lineItemsData = lineItems
          .filter(item => item.description)
          .map(item => ({
            invoice_id: invoice.id,
            description: item.description,
            quantity: item.quantity,
            unit_price: item.unit_price,
            line_total: item.line_total,
          }));

        if (lineItemsData.length > 0) {
          await supabase.from('invoice_line_items').insert(lineItemsData);
        }
      }

      await validateInvoice(invoice.id);

      onNavigate('invoices');
    } catch (error) {
      console.error('Error creating invoice:', error);
      alert('Failed to create invoice. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const validateInvoice = async (invoiceId: string) => {
    const validations = [];

    if (!formData.invoice_number) {
      validations.push({
        invoice_id: invoiceId,
        validation_type: 'missing_data',
        severity: 'error',
        message: 'Invoice number is required',
        field_name: 'invoice_number',
      });
    }

    if (!formData.supplier_id) {
      validations.push({
        invoice_id: invoiceId,
        validation_type: 'missing_data',
        severity: 'warning',
        message: 'Supplier not specified',
        field_name: 'supplier_id',
      });
    }

    if (!formData.invoice_date) {
      validations.push({
        invoice_id: invoiceId,
        validation_type: 'missing_data',
        severity: 'warning',
        message: 'Invoice date not specified',
        field_name: 'invoice_date',
      });
    }

    const { data: duplicates } = await supabase
      .from('invoices')
      .select('id')
      .eq('invoice_number', formData.invoice_number)
      .neq('id', invoiceId);

    if (duplicates && duplicates.length > 0) {
      validations.push({
        invoice_id: invoiceId,
        validation_type: 'duplicate',
        severity: 'error',
        message: 'Duplicate invoice number detected',
        field_name: 'invoice_number',
      });

      await supabase
        .from('invoices')
        .update({ is_duplicate: true })
        .eq('id', invoiceId);
    }

    if (validations.length > 0) {
      await supabase.from('invoice_validations').insert(validations);

      await supabase
        .from('invoices')
        .update({ has_validation_issues: true })
        .eq('id', invoiceId);
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <button
        onClick={() => onNavigate('invoices')}
        className="flex items-center gap-2 text-gray-600 hover:text-gray-900 mb-6"
      >
        <ArrowLeft size={20} />
        Back to Invoices
      </button>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-2xl font-bold text-gray-900 mb-6">Create New Invoice</h2>

        <div className="flex gap-4 mb-6">
          <button
            onClick={() => setUploadMode('manual')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium ${
              uploadMode === 'manual'
                ? 'bg-blue-50 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-50 text-gray-700 border border-gray-300'
            }`}
          >
            Manual Entry
          </button>
          <button
            onClick={() => setUploadMode('upload')}
            className={`flex-1 px-4 py-3 rounded-lg font-medium ${
              uploadMode === 'upload'
                ? 'bg-blue-50 text-blue-700 border-2 border-blue-500'
                : 'bg-gray-50 text-gray-700 border border-gray-300'
            }`}
          >
            Upload File
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          {uploadMode === 'upload' && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Upload Invoice File
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                <Upload className="mx-auto text-gray-400 mb-2" size={48} />
                <input
                  type="file"
                  onChange={handleFileChange}
                  accept=".pdf,.xlsx,.xls"
                  className="hidden"
                  id="file-upload"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer text-blue-600 hover:text-blue-700 font-medium"
                >
                  Choose a file
                </label>
                <p className="text-sm text-gray-500 mt-1">PDF, Excel files supported</p>
                {file && (
                  <p className="text-sm text-gray-700 mt-2 font-medium">{file.name}</p>
                )}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Number *
              </label>
              <input
                type="text"
                required
                value={formData.invoice_number}
                onChange={(e) => setFormData({ ...formData, invoice_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Supplier
              </label>
              <select
                value={formData.supplier_id}
                onChange={(e) => setFormData({ ...formData, supplier_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="">Select Supplier</option>
                {suppliers.map(supplier => (
                  <option key={supplier.id} value={supplier.id}>{supplier.name}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Date
              </label>
              <input
                type="date"
                value={formData.invoice_date}
                onChange={(e) => setFormData({ ...formData, invoice_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Due Date
              </label>
              <input
                type="date"
                value={formData.due_date}
                onChange={(e) => setFormData({ ...formData, due_date: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          {uploadMode === 'manual' && (
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">Line Items</label>
                <button
                  type="button"
                  onClick={addLineItem}
                  className="flex items-center gap-1 text-blue-600 hover:text-blue-700 text-sm font-medium"
                >
                  <Plus size={16} />
                  Add Item
                </button>
              </div>

              <div className="space-y-3">
                {lineItems.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-3">
                    <input
                      type="text"
                      placeholder="Description"
                      value={item.description}
                      onChange={(e) => updateLineItem(index, 'description', e.target.value)}
                      className="col-span-5 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Qty"
                      value={item.quantity}
                      onChange={(e) => updateLineItem(index, 'quantity', parseFloat(e.target.value) || 0)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      placeholder="Unit Price"
                      value={item.unit_price}
                      onChange={(e) => updateLineItem(index, 'unit_price', parseFloat(e.target.value) || 0)}
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                    <input
                      type="number"
                      value={item.line_total.toFixed(2)}
                      readOnly
                      className="col-span-2 px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
                    />
                    <button
                      type="button"
                      onClick={() => removeLineItem(index)}
                      className="col-span-1 flex items-center justify-center text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Subtotal
              </label>
              <input
                type="number"
                value={formData.subtotal.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Amount
              </label>
              <input
                type="number"
                step="0.01"
                value={formData.tax_amount}
                onChange={(e) => {
                  const tax = parseFloat(e.target.value) || 0;
                  setFormData({
                    ...formData,
                    tax_amount: tax,
                    total_amount: formData.subtotal + tax
                  });
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Total Amount *
              </label>
              <input
                type="number"
                value={formData.total_amount.toFixed(2)}
                readOnly
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 font-bold"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Notes
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => onNavigate('invoices')}
              className="px-6 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 font-medium"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading && <Loader className="animate-spin" size={20} />}
              Create Invoice
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
