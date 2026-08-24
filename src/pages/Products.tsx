import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useMemo, useState } from 'react';
import { CheckSquare, FileText } from 'lucide-react';

interface ProductsProps {
  onNavigate?: (tab: string) => void;
  setPrefilledProducts?: (ids: number[]) => void;
}

export default function Products({ onNavigate, setPrefilledProducts }: ProductsProps) {
  const products = useLiveQuery(() => db.products.toArray());
  const documents = useLiveQuery(() => db.documents.toArray());
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Tính toán Tổng Mua Vào và Tổng Bán Ra cho từng sản phẩm
  const productStats = useMemo(() => {
    if (!products || !documents) return [];

    const statsMap: Record<number, { totalIn: number, totalOut: number }> = {};
    products.forEach(p => {
      statsMap[p.id!] = { totalIn: 0, totalOut: 0 };
    });

    documents.forEach(doc => {
      if (!doc.items || !Array.isArray(doc.items)) return;
      doc.items.forEach(item => {
        // Tìm product bằng tên (cắt khoảng trắng, chuyển chữ thường) để đảm bảo không bị miss
        const normalize = (str?: string) => (str || '').toString().trim().toLowerCase();
        const product = products.find(p => 
          normalize(p.name) === normalize(item.productName) || 
          (p.code && p.code === item.productId?.toString())
        );
        
        if (product && product.id) {
          const qty = Number(item.quantity) || 0;
          if (doc.type === 'INPUT_INVOICE') {
            statsMap[product.id].totalIn += qty;
          } else if (doc.type === 'OUTPUT_INVOICE' || doc.type === 'DELIVERY_NOTE') {
            statsMap[product.id].totalOut += qty;
          }
        }
      });
    });

    return products.map(p => ({
      ...p,
      totalIn: statsMap[p.id!].totalIn,
      totalOut: statsMap[p.id!].totalOut
    }));
  }, [products, documents]);

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const handleToggleSelect = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  const handleCreateQuotation = () => {
    if (setPrefilledProducts) setPrefilledProducts(selectedIds);
    if (onNavigate) onNavigate('create-quote');
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Danh sách Hàng hóa & Tồn kho
          </h3>
          <p className="text-sm text-gray-500 mt-1">Dữ liệu được trích xuất tự động từ Hóa đơn điện tử</p>
        </div>
        {selectedIds.length > 0 && (
          <button 
            onClick={handleCreateQuotation}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md font-medium transition-colors shadow-sm"
          >
            <FileText className="w-4 h-4" />
            Tạo Báo Giá ({selectedIds.length} SP)
          </button>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left w-10"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã SP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá (Gần nhất)</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider">Tổng Mua Vào</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-green-600 uppercase tracking-wider">Tổng Bán Ra</th>
              <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Tồn kho hiện tại</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productStats.map((product) => (
              <tr key={product.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.includes(product.id!) ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-4 text-center">
                  <input 
                    type="checkbox" 
                    className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    disabled={product.stock <= 0}
                    checked={selectedIds.includes(product.id!)}
                    onChange={() => handleToggleSelect(product.id!)}
                    title={product.stock <= 0 ? "Hết hàng không thể chọn" : "Chọn để báo giá"}
                  />
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.code || '-'}</td>
                <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-xs">{product.name}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{product.unit}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatNumber(product.unitPrice)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600">{product.totalIn}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600">{product.totalOut}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                  <span className={`px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                    {product.stock}
                  </span>
                </td>
              </tr>
            ))}
            {productStats.length === 0 && (
              <tr>
                <td colSpan={8} className="px-6 py-8 text-center text-sm text-gray-500">
                  Chưa có sản phẩm nào. Hãy import hóa đơn đầu vào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
