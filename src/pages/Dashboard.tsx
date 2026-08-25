import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Users, FileText, Box, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react';

type DetailView = 'CUSTOMERS' | 'PRODUCTS' | 'DOCUMENTS' | 'REVENUE' | 'COST' | 'RECEIVABLES' | 'PAYABLES' | null;

export default function Dashboard() {
  const [detailView, setDetailView] = useState<DetailView>(null);

  const stats = useLiveQuery(async () => {
    const customers = await db.customers.toArray();
    const products = await db.products.toArray();
    const documents = await db.documents.toArray();
    
    // Đính kèm thông tin khách hàng vào document để hiển thị chi tiết
    for (const doc of documents) {
      const customer = customers.find(c => c.id === doc.customerId);
      (doc as any).customerName = customer ? customer.name : 'Unknown';
    }
    
    let revenue = 0;
    let cost = 0;
    let receivables = 0; 
    let payables = 0; 
    
    documents.forEach(doc => {
      if (doc.type === 'OUTPUT_INVOICE') {
        revenue += doc.subTotal;
        if (!doc.paymentDate) {
          receivables += doc.total; 
        }
      } else if (doc.type === 'INPUT_INVOICE') {
        cost += doc.subTotal;
        if (!doc.paymentDate) {
          payables += doc.total; 
        }
      }
    });

    const profit = revenue - cost;

    return { 
      customers, 
      products, 
      documents, 
      revenue, 
      cost, 
      profit, 
      receivables, 
      payables,
      unpaidOutputs: documents.filter(d => d.type === 'OUTPUT_INVOICE' && !d.paymentDate),
      unpaidInputs: documents.filter(d => d.type === 'INPUT_INVOICE' && !d.paymentDate),
      outputs: documents.filter(d => d.type === 'OUTPUT_INVOICE'),
      inputs: documents.filter(d => d.type === 'INPUT_INVOICE')
    };
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (!stats) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;

  if (detailView) {
    let title = '';
    let data: any[] = [];
    let columns: { header: string, render: (item: any) => React.ReactNode }[] = [];

    switch (detailView) {
      case 'CUSTOMERS':
        title = 'Chi tiết Khách hàng / Đối tác';
        data = stats.customers;
        columns = [
          { header: 'Tên KH', render: (i) => i.name },
          { header: 'Mã số thuế', render: (i) => i.taxCode },
          { header: 'Số điện thoại', render: (i) => i.phone },
        ];
        break;
      case 'PRODUCTS':
        title = 'Chi tiết Sản phẩm / Dịch vụ';
        data = stats.products;
        columns = [
          { header: 'Tên Sản phẩm', render: (i) => i.name },
          { header: 'Mã', render: (i) => i.code },
          { header: 'Tồn kho', render: (i) => i.stock },
          { header: 'Giá bán', render: (i) => formatCurrency(i.unitPrice) },
        ];
        break;
      case 'DOCUMENTS':
        title = 'Danh sách toàn bộ Chứng từ';
        data = stats.documents;
        columns = [
          { header: 'Số CT', render: (i) => i.docNumber },
          { header: 'Khách hàng', render: (i) => i.customerName },
          { header: 'Loại', render: (i) => i.type },
          { header: 'Tổng tiền', render: (i) => formatCurrency(i.total) },
        ];
        break;
      case 'REVENUE':
        title = 'Chi tiết Doanh thu (Hóa đơn bán ra)';
        data = stats.outputs;
        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber },
          { header: 'Khách hàng', render: (i) => i.customerName },
          { header: 'Ngày', render: (i) => new Date(i.date).toLocaleDateString('vi-VN') },
          { header: 'Tiền hàng', render: (i) => formatCurrency(i.subTotal) },
        ];
        break;
      case 'COST':
        title = 'Chi tiết Chi phí (Hóa đơn mua vào)';
        data = stats.inputs;
        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber },
          { header: 'Nhà cung cấp', render: (i) => i.customerName },
          { header: 'Ngày', render: (i) => new Date(i.date).toLocaleDateString('vi-VN') },
          { header: 'Tiền hàng', render: (i) => formatCurrency(i.subTotal) },
        ];
        break;
      case 'RECEIVABLES':
        title = 'Chi tiết Phải thu (Khách nợ)';
        data = stats.unpaidOutputs;
        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber },
          { header: 'Khách nợ', render: (i) => i.customerName },
          { header: 'Ngày xuất HĐ', render: (i) => new Date(i.date).toLocaleDateString('vi-VN') },
          { header: 'Số tiền nợ', render: (i) => <span className="font-bold text-amber-600">{formatCurrency(i.total)}</span> },
        ];
        break;
      case 'PAYABLES':
        title = 'Chi tiết Phải trả (Nợ NCC)';
        data = stats.unpaidInputs;
        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber },
          { header: 'Nhà cung cấp', render: (i) => i.customerName },
          { header: 'Ngày nhận HĐ', render: (i) => new Date(i.date).toLocaleDateString('vi-VN') },
          { header: 'Số tiền nợ', render: (i) => <span className="font-bold text-orange-600">{formatCurrency(i.total)}</span> },
        ];
        break;
    }

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <button 
          onClick={() => setDetailView(null)}
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 mb-6 bg-gray-50 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors w-max"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Quay lại Tổng quan</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, idx) => (
                  <th key={idx} className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">{col.header}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.map((item, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
              {data.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard onClick={() => setDetailView('CUSTOMERS')} title="Khách hàng / Đối tác" value={stats.customers.length.toString()} icon={<Users size={24} className="text-blue-500" />} />
        <StatCard onClick={() => setDetailView('PRODUCTS')} title="Sản phẩm" value={stats.products.length.toString()} icon={<Box size={24} className="text-purple-500" />} />
        <StatCard onClick={() => setDetailView('DOCUMENTS')} title="Tổng số Chứng từ" value={stats.documents.length.toString()} icon={<FileText size={24} className="text-gray-500" />} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-4 border-b pb-2">Tài chính (Tạm tính)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          onClick={() => setDetailView('REVENUE')}
          title="Tổng Doanh thu (Bán ra)" 
          value={formatCurrency(stats.revenue)} 
          icon={<TrendingUp size={24} className="text-green-500" />} 
          bgColor="bg-green-50"
        />
        <StatCard 
          onClick={() => setDetailView('COST')}
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
          onClick={() => setDetailView('RECEIVABLES')}
          title="Phải thu của khách (Nợ đọng)" 
          value={formatCurrency(stats.receivables)} 
          icon={<Users size={24} className="text-amber-600" />} 
          bgColor="bg-amber-50"
        />
        <StatCard 
          onClick={() => setDetailView('PAYABLES')}
          title="Phải trả nhà cung cấp" 
          value={formatCurrency(stats.payables)} 
          icon={<Box size={24} className="text-orange-600" />} 
          bgColor="bg-orange-50"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor = "bg-gray-50", onClick }: { title: string, value: string, icon: React.ReactNode, bgColor?: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''}`}
    >
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
