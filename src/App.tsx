import { useState, useEffect } from 'react';
import { supabase } from './lib/supabase';
import { User } from '@supabase/supabase-js';
import Layout from './components/Layout';
import { Dashboard } from './components/Dashboard';
import { InvoiceList } from './components/InvoiceList';
import { InvoiceCreate } from './components/InvoiceCreate';
import { InvoiceDetail } from './components/InvoiceDetail';
import { Suppliers } from './components/Suppliers';
import { Reports } from './components/Reports';
import Admin from './components/Admin';
import Auth from './components/Auth';
import Payment from './components/Payment';
import BusinessProfile from './components/BusinessProfile';
import CatalogManagement from './components/CatalogManagement';
import CustomerForm from './components/CustomerForm';

function App() {
  const [currentView, setCurrentView] = useState('dashboard');
  const [currentInvoiceId, setCurrentInvoiceId] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
      setLoading(false);
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleNavigate = (view: string, data?: any) => {
    setCurrentView(view);
    if (view === 'invoice-detail' && data?.invoiceId) {
      setCurrentInvoiceId(data.invoiceId);
    }
  };

  const renderView = () => {
    if (!user) {
      return <Auth />;
    }

    switch (currentView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleNavigate} />;
      case 'invoices':
        return <InvoiceList onNavigate={handleNavigate} />;
      case 'invoice-create':
        return <InvoiceCreate onNavigate={handleNavigate} />;
      case 'invoice-detail':
        return <InvoiceDetail onNavigate={handleNavigate} invoiceId={currentInvoiceId || ''} />;
      case 'suppliers':
        return <Suppliers />;
      case 'reports':
        return <Reports />;
      case 'admin':
        return <Admin />;
      case 'payment':
        return <Payment />;
      case 'business-profile':
        return <BusinessProfile userId={user.id} />;
      case 'catalog':
        return <CatalogManagement businessId={user.id} />; // Using user.id as businessId for demo
      case 'customer-form':
        return <CustomerForm businessId={user.id} />; // Using user.id as businessId for demo
      default:
        return <Dashboard onNavigate={handleNavigate} />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  // Show main app
  return (
    <Layout currentView={currentView} onNavigate={handleNavigate} user={user}>
      {renderView()}
    </Layout>
  );
}

export default App;
