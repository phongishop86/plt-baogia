import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export default function Products() {
  const products = useLiveQuery(() => db.products.toArray());

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const handleUpdateStock = async (id: number, currentStock: number) => {
    const newStockStr = prompt('Nhập số lượng tồn kho mới:', currentStock.toString());
    if (newStockStr !== null) {
      const newStock = parseInt(newStockStr, 10);
      if (!isNaN(newStock)) {
        await db.products.update(id, { stock: newStock });
      } else {
        alert('Số lượng không hợp lệ');
      }
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-700">Danh sách Hàng hóa & Tồn kho</h3>
      </div>
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã HH</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Hàng Hóa</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn Giá</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {products?.map((product) => (
            <tr key={product.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{product.code}</td>
              <td className="px-6 py-4 text-sm text-gray-500">{product.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.unit}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatCurrency(product.unitPrice)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-blue-600">{product.stock || 0}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button 
                  onClick={() => handleUpdateStock(product.id!, product.stock || 0)}
                  className="text-blue-600 hover:text-blue-900"
                >
                  Cập nhật kho
                </button>
              </td>
            </tr>
          ))}
          {products?.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có sản phẩm nào</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
