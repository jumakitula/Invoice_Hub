interface PaymentProps {
}

export default function Payment({ }: PaymentProps) {
  return (
    <div className="p-8">
      <h2 className="text-2xl font-bold text-gray-900">Payment Management</h2>
      <p className="text-gray-600 mt-1">Manage subscriptions and payments</p>
      <div className="mt-8">
        <p className="text-gray-500">Payment functionality coming soon...</p>
      </div>
    </div>
  );
}
