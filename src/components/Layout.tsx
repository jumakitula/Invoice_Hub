
import React from 'react';
import { FileText, Users, BarChart3, Settings, LogOut, Menu, X, Crown, Building, Package, FileCheck, AlertTriangle, TrendingUp } from 'lucide-react';
import { User } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  currentView: string;
  onNavigate: (view: string) => void;
  user: User | null;
  children: React.ReactNode;
}

export default function Layout({ currentView, onNavigate, user, children }: LayoutProps) {
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const [subscription, setSubscription] = React.useState<any>(null);
  const [plan, setPlan] = React.useState<any>(null);
  const [usage, setUsage] = React.useState<any>(null);

  const navigation = [
    { name: 'Dashboard', href: 'dashboard', icon: BarChart3 },
    { name: 'Invoices', href: 'invoices', icon: FileText },
    { name: 'Suppliers', href: 'suppliers', icon: Users },
    { name: 'Reports', href: 'reports', icon: BarChart3 },
    { name: 'Business Profile', href: 'business-profile', icon: Building },
    { name: 'Catalog', href: 'catalog', icon: Package },
    { name: 'Customer Form', href: 'customer-form', icon: FileCheck },
    { name: 'Admin', href: 'admin', icon: Settings },
    { name: 'Payment', href: 'payment', icon: Crown },
  ];

  // Fetch subscription data
  React.useEffect(() => {
    if (user) {
      fetchSubscriptionData();
    } else {
      setSubscription(null);
      setPlan(null);
      setUsage(null);
    }
  }, [user]);

  const fetchSubscriptionData = async () => {
    if (!user?.id) return;

    try {
      // Get subscription
      const { data: subData, error: subError } = await supabase
        .from('subscriptions')
        .select('*, subscription_plans(*)')
        .eq('user_id', user.id as string)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (subError && subError.code !== 'PGRST116') throw subError;

      if (subData) {
        setSubscription(subData as any);
        setPlan((subData as any).subscription_plans);
      }

      // Get usage metrics for current month
      const currentPeriodStart = new Date();
      currentPeriodStart.setDate(1);
      currentPeriodStart.setHours(0, 0, 0, 0);

      const { data: usageData, error: usageError } = await supabase
        .from('usage_metrics')
        .select('*')
        .eq('user_id', user.id as string)
        .eq('billing_period_start', currentPeriodStart.toISOString().split('T')[0])
        .single();

      if (usageError && usageError.code !== 'PGRST116') throw usageError;

      if (usageData) {
        setUsage(usageData as any);
      } else {
        // No usage data yet, set defaults
        setUsage({ invoices_created: 0 });
      }
    } catch (error) {
      console.error('Error fetching subscription data:', error);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Mobile sidebar */}
      <div className={`fixed inset-0 z-50 lg:hidden ${sidebarOpen ? 'block' : 'hidden'}`}>
        <div className="fixed inset-0 bg-black bg-opacity-25" onClick={() => setSidebarOpen(false)} />
        <div className="fixed left-0 top-0 bottom-0 w-64 bg-white shadow-lg">
          <div className="flex items-center justify-between p-4 border-b">
            <h2 className="text-lg font-semibold">Invoice Hub</h2>
            <button onClick={() => setSidebarOpen(false)}>
              <X className="h-6 w-6" />
            </button>
          </div>
          <nav className="mt-4">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => {
                    onNavigate(item.href);
                    setSidebarOpen(false);
                  }}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium ${
                    currentView === item.href
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Desktop sidebar */}
      <div className="hidden lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 lg:block">
        <div className="flex flex-col h-full bg-white shadow-lg">
          <div className="flex items-center p-4 border-b">
            <h2 className="text-lg font-semibold">Invoice Hub</h2>
          </div>
          <nav className="mt-4 flex-1">
            {navigation.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.name}
                  onClick={() => onNavigate(item.href)}
                  className={`w-full flex items-center px-4 py-2 text-sm font-medium ${
                    currentView === item.href
                      ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
                >
                  <Icon className="mr-3 h-5 w-5" />
                  {item.name}
                </button>
              );
            })}
          </nav>

          {/* Subscription Status */}
          {user && (
            <div className="border-t p-4">
              <div className="mb-3">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Plan</span>
                  <Crown className="h-4 w-4 text-yellow-500" />
                </div>
                <div className="text-sm">
                  <p className="font-medium text-gray-900">
                    {plan?.display_name || 'Free Trial'}
                  </p>
                  {subscription?.status === 'trial' && (
                    <p className="text-xs text-orange-600">
                      Trial ends: {new Date(subscription.trial_end).toLocaleDateString()}
                    </p>
                  )}
                </div>
              </div>

              {/* Usage Display */}
              {usage && plan && (
                <div className="mb-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Usage</span>
                    <TrendingUp className="h-4 w-4 text-blue-500" />
                  </div>
                  <div className="space-y-1">
                    <div className="flex justify-between text-xs">
                      <span>Invoices</span>
                      <span className={`${(usage.invoices_created || 0) >= (plan.features?.max_invoices_per_month || 5) ? 'text-red-600 font-medium' : 'text-gray-600'}`}>
                        {usage.invoices_created || 0} / {plan.features?.max_invoices_per_month || 5}
                      </span>
                    </div>
                    {(usage.invoices_created || 0) >= (plan.features?.max_invoices_per_month || 5) * 0.8 && (
                      <div className="flex items-center text-xs text-orange-600">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Near limit - upgrade to continue
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Upgrade Button */}
              {(subscription?.status === 'trial' || !subscription) && (
                <button
                  onClick={() => onNavigate('payment')}
                  className="w-full mb-3 flex items-center justify-center px-3 py-2 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md"
                >
                  <Crown className="h-3 w-3 mr-1" />
                  Upgrade Plan
                </button>
              )}
            </div>
          )}

          <div className="border-t p-4">
            {user ? (
              <div className="flex items-center">
                <div className="flex-1">
                  <p className="text-sm font-medium text-gray-900">{user.email}</p>
                </div>
                <button
                  onClick={() => {/* handle logout */}}
                  className="p-1 text-gray-400 hover:text-gray-600"
                >
                  <LogOut className="h-5 w-5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => onNavigate('auth')}
                className="w-full flex items-center px-3 py-2 text-sm font-medium text-gray-600 hover:bg-gray-50 hover:text-gray-900"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="lg:pl-64">
        <div className="lg:hidden flex items-center justify-between p-4 bg-white border-b">
          <button onClick={() => setSidebarOpen(true)}>
            <Menu className="h-6 w-6" />
          </button>
          <h1 className="text-lg font-semibold">Invoice Hub</h1>
          <div />
        </div>
        <main className="p-4">
          {children}
        </main>
      </div>
    </div>
  );
}
