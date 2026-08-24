import { useEffect, useState } from 'react';
import { db } from '../db/db';
import { Users, FileText, Box } from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({ customers: 0, products: 0, documents: 0 });

  useEffect(() => {
    async function loadStats() {
      const customers = await db.customers.count();
      const products = await db.products.count();
      const documents = await db.documents.count();
      setStats({ customers, products, documents });
    }
    loadStats();
  }, []);

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-6">
        <StatCard title="Khách hàng" value={stats.customers} icon={<Users size={24} className="text-blue-500" />} />
        <StatCard title="Sản phẩm" value={stats.products} icon={<Box size={24} className="text-green-500" />} />
        <StatCard title="Chứng từ" value={stats.documents} icon={<FileText size={24} className="text-purple-500" />} />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon }: { title: string, value: number, icon: React.ReactNode }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
      <div className="p-3 bg-gray-50 rounded-lg">
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-2xl font-bold text-gray-900">{value}</p>
      </div>
    </div>
  );
}
