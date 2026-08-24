import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Users, FileText, Box, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

export default function Dashboard() {
  const stats = useLiveQuery(async () => {
    const customers = await db.customers.count();
    const products = await db.products.count();
    const documents = await db.documents.toArray();
    
    let revenue = 0;
    let cost = 0;
    let receivables = 0; // Phải thu (Khách hàng nợ mình)
    let payables = 0; // Phải trả (Mình nợ NCC)
    
    documents.forEach(doc => {
      if (doc.type === 'OUTPUT_INVOICE') {
        revenue += doc.subTotal;
        if (!doc.paymentDate) {
          receivables += doc.total; // Công nợ tính trên tổng tiền đã có thuế
        }
      } else if (doc.type === 'INPUT_INVOICE') {
        cost += doc.subTotal;
        if (!doc.paymentDate) {
          payables += doc.total; // Công nợ tính trên tổng tiền đã có thuế
        }
      }
    });

    const profit = revenue - cost;

    return { customers, products, documents: documents.length, revenue, cost, profit, receivables, payables };
  });

  const handleResetData = async () => {
    if (confirm('BẠN CÓ CHẮC CHẮN MUỐN XÓA TOÀN BỘ DỮ LIỆU?\nHành động này không thể hoàn tác!')) {
      await db.customers.clear();
      await db.products.clear();
      await db.documents.clear();
      alert('Đã xóa trắng dữ liệu!');
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (!stats) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h2>
        <button 
          onClick={handleResetData}
          className="bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded-md font-medium text-sm border border-red-300"
        >
          Xóa toàn bộ dữ liệu (Reset)
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard title="Khách hàng / Đối tác" value={stats.customers.toString()} icon={<Users size={24} className="text-blue-500" />} />
        <StatCard title="Sản phẩm" value={stats.products.toString()} icon={<Box size={24} className="text-purple-500" />} />
        <StatCard title="Tổng số Chứng từ" value={stats.documents.toString()} icon={<FileText size={24} className="text-gray-500" />} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-4 border-b pb-2">Tài chính (Tạm tính)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          title="Tổng Doanh thu (Bán ra)" 
          value={formatCurrency(stats.revenue)} 
          icon={<TrendingUp size={24} className="text-green-500" />} 
          bgColor="bg-green-50"
        />
        <StatCard 
          title="Tổng Chi phí (Mua vào)" 
          value={formatCurrency(stats.cost)} 
          icon={<TrendingDown size={24} className="text-red-500" />} 
          bgColor="bg-red-50"
        />
        <StatCard 
          title="Lợi nhuận tạm tính" 
          value={formatCurrency(stats.profit)} 
          icon={<DollarSign size={24} className={stats.profit >= 0 ? "text-blue-600" : "text-red-600"} />} 
          bgColor={stats.profit >= 0 ? "bg-blue-50" : "bg-red-50"}
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-4 border-b pb-2">Công nợ (Dựa trên hóa đơn)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          title="Phải thu của khách (Nợ đọng)" 
          value={formatCurrency(stats.receivables)} 
          icon={<Users size={24} className="text-amber-600" />} 
          bgColor="bg-amber-50"
        />
        <StatCard 
          title="Phải trả nhà cung cấp" 
          value={formatCurrency(stats.payables)} 
          icon={<Box size={24} className="text-orange-600" />} 
          bgColor="bg-orange-50"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor = "bg-gray-50" }: { title: string, value: string, icon: React.ReactNode, bgColor?: string }) {
  return (
    <div className="bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4">
      <div className={`p-4 rounded-xl ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}
