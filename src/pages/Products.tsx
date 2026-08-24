import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { useMemo, useState } from 'react';
import { CheckSquare, FileText, Search, Edit2, Save, X } from 'lucide-react';

interface ProductsProps {
  onNavigate?: (tab: string) => void;
  setPrefilledProducts?: (ids: number[]) => void;
}

export default function Products({ onNavigate, setPrefilledProducts }: ProductsProps) {
  const products = useLiveQuery(() => db.products.toArray());
  const documents = useLiveQuery(() => db.documents.toArray());
  
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT'); // Tab phân chia
  
  // Trạng thái đang chỉnh sửa
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState('');
  const [editType, setEditType] = useState<'PRODUCT' | 'SERVICE'>('PRODUCT');

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
      type: p.type || 'PRODUCT', // Mặc định là PRODUCT nếu chưa phân loại
      totalIn: statsMap[p.id!].totalIn,
      totalOut: statsMap[p.id!].totalOut
    })).filter(p => {
      // Lọc theo Search Query
      const matchSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          (p.code && p.code.toLowerCase().includes(searchQuery.toLowerCase()));
      // Lọc theo Tab đang chọn
      const matchType = p.type === activeTab;
      
      return matchSearch && matchType;
    });
  }, [products, documents, searchQuery, activeTab]);

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

  const startEdit = (product: any) => {
    setEditingId(product.id!);
    setEditName(product.name);
    setEditType(product.type);
  };

  const saveEdit = async (productId: number, oldName: string) => {
    try {
      // 1. Cập nhật trong bảng Product
      await db.products.update(productId, { name: editName, type: editType });
      
      // 2. Nếu tên thay đổi, TỰ ĐỘNG CẬP NHẬT (Cascade) sang toàn bộ Hóa đơn/Báo giá cũ
      // Để đảm bảo lịch sử thống kê (MUA VÀO/BÁN RA) không bị mất khi sửa tên
      if (oldName.trim().toLowerCase() !== editName.trim().toLowerCase()) {
        const allDocs = await db.documents.toArray();
        for (const doc of allDocs) {
          let hasChanged = false;
          if (doc.items && Array.isArray(doc.items)) {
            doc.items.forEach(item => {
              if (item.productName.trim().toLowerCase() === oldName.trim().toLowerCase()) {
                item.productName = editName;
                hasChanged = true;
              }
            });
            if (hasChanged) {
              await db.documents.update(doc.id!, { items: doc.items });
            }
          }
        }
      }
      setEditingId(null);
    } catch (err) {
      console.error("Lỗi khi cập nhật sản phẩm:", err);
      alert("Có lỗi xảy ra khi lưu thay đổi.");
    }
  };

  const handleBulkChangeType = async () => {
    const newType = activeTab === 'PRODUCT' ? 'SERVICE' : 'PRODUCT';
    const message = activeTab === 'PRODUCT' 
      ? `Chuyển ${selectedIds.length} mặt hàng đã chọn sang nhóm Chi phí/Dịch vụ?\n(Sẽ không hiển thị trong tồn kho và không xuất báo giá được)`
      : `Chuyển ${selectedIds.length} mặt hàng đã chọn sang nhóm Hàng hóa?\n(Sẽ ghi nhận tồn kho và có thể xuất báo giá)`;
      
    if (confirm(message)) {
      for (const id of selectedIds) {
        await db.products.update(id, { type: newType });
      }
      setSelectedIds([]);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden mt-6">
      <div className="p-4 border-b border-gray-200 bg-gray-50 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h3 className="font-semibold text-gray-800 flex items-center gap-2">
            <CheckSquare className="w-5 h-5 text-blue-600" />
            Danh sách Hàng hóa & Dịch vụ
          </h3>
          <p className="text-sm text-gray-500 mt-1">Dữ liệu được trích xuất tự động từ Hóa đơn điện tử</p>
        </div>
        
        <div className="flex flex-col sm:flex-row items-center gap-3 w-full sm:w-auto">
          {/* Thanh tìm kiếm */}
          <div className="relative w-full sm:w-64">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-gray-400" />
            </div>
            <input
              type="text"
              placeholder="Tìm tên hoặc mã SP..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 w-full rounded-md border border-gray-300 shadow-sm px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500 text-sm"
            />
          </div>

          {/* Tabs chuyển đổi */}
          <div className="flex bg-gray-100 p-1 rounded-lg w-full sm:w-auto overflow-hidden">
            <button
              onClick={() => { setActiveTab('PRODUCT'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'PRODUCT' ? 'bg-white text-blue-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              📦 Hàng hóa (Tồn kho)
            </button>
            <button
              onClick={() => { setActiveTab('SERVICE'); setSelectedIds([]); }}
              className={`flex-1 sm:flex-none px-4 py-1.5 text-sm font-medium rounded-md transition-colors ${
                activeTab === 'SERVICE' ? 'bg-white text-purple-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ⚙️ Dịch vụ / Chi phí
            </button>
          </div>

          {/* Nút Báo giá & Chuyển đổi */}
          {selectedIds.length > 0 && (
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              {activeTab === 'PRODUCT' && (
                <button 
                  onClick={handleCreateQuotation}
                  className="flex-1 sm:flex-none items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap justify-center flex"
                >
                  <FileText className="w-4 h-4" />
                  Báo Giá ({selectedIds.length})
                </button>
              )}
              <button 
                onClick={handleBulkChangeType}
                className={`flex-1 sm:flex-none items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-sm whitespace-nowrap justify-center flex ${
                  activeTab === 'PRODUCT' ? 'bg-purple-600 hover:bg-purple-700 text-white' : 'bg-gray-600 hover:bg-gray-700 text-white'
                }`}
              >
                {activeTab === 'PRODUCT' ? 'Chuyển thành Chi Phí' : 'Chuyển thành Hàng Hóa'}
              </button>
            </div>
          )}
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left w-10"></th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã SP</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên sản phẩm / Dịch vụ</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Phân loại</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">ĐVT</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Đơn giá</th>
              <th className="px-6 py-3 text-center text-xs font-medium text-blue-600 uppercase tracking-wider">Tổng Mua</th>
              {activeTab === 'PRODUCT' && <th className="px-6 py-3 text-center text-xs font-medium text-green-600 uppercase tracking-wider">Tổng Bán</th>}
              {activeTab === 'PRODUCT' && <th className="px-6 py-3 text-center text-xs font-bold text-gray-700 uppercase tracking-wider">Tồn kho</th>}
              <th className="px-4 py-3 text-center w-16"></th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {productStats.map((product) => {
              const isEditing = editingId === product.id;
              
              return (
                <tr key={product.id} className={`hover:bg-blue-50 transition-colors ${selectedIds.includes(product.id!) ? 'bg-blue-50' : ''}`}>
                  <td className="px-4 py-4 text-center">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                      disabled={activeTab === 'PRODUCT' && product.stock <= 0}
                      checked={selectedIds.includes(product.id!)}
                      onChange={() => handleToggleSelect(product.id!)}
                      title={activeTab === 'PRODUCT' && product.stock <= 0 ? "Hết hàng không thể chọn" : "Chọn để thao tác"}
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{product.code || '-'}</td>
                  
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 max-w-md">
                    {isEditing ? (
                      <textarea
                        value={editName}
                        onChange={(e) => {
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                          setEditName(e.target.value);
                        }}
                        className="w-full min-w-[250px] border border-blue-400 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:outline-none resize-none overflow-hidden"
                        rows={1}
                        autoFocus
                      />
                    ) : (
                      <span className="whitespace-pre-wrap break-words">{product.name}</span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center">
                    {isEditing ? (
                      <select 
                        value={editType} 
                        onChange={e => setEditType(e.target.value as any)}
                        className="border border-blue-400 rounded-md p-1.5 focus:outline-none focus:ring-1 focus:ring-blue-500 text-sm w-28"
                      >
                        <option value="PRODUCT">Hàng hóa</option>
                        <option value="SERVICE">Chi phí / Dịch vụ</option>
                      </select>
                    ) : (
                      <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full ${product.type === 'SERVICE' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                        {product.type === 'SERVICE' ? 'Dịch vụ nội bộ' : 'Hàng hóa'}
                      </span>
                    )}
                  </td>
                  
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center text-gray-500">{product.unit}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right text-gray-900">{formatNumber(product.unitPrice)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-blue-600">{product.totalIn}</td>
                  
                  {activeTab === 'PRODUCT' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-medium text-green-600">{product.totalOut}</td>
                  )}
                  
                  {activeTab === 'PRODUCT' && (
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-center font-bold text-gray-900">
                      <span className={`px-2 py-1 rounded-full ${product.stock > 0 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                        {product.stock}
                      </span>
                    </td>
                  )}
                  
                  <td className="px-4 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {isEditing ? (
                      <div className="flex items-center space-x-2">
                        <button onClick={() => saveEdit(product.id!, product.name)} className="text-green-600 hover:text-green-900" title="Lưu">
                          <Save className="h-5 w-5" />
                        </button>
                        <button onClick={() => setEditingId(null)} className="text-red-600 hover:text-red-900" title="Hủy">
                          <X className="h-5 w-5" />
                        </button>
                      </div>
                    ) : (
                      <button onClick={() => startEdit(product)} className="text-gray-400 hover:text-blue-600 transition-colors" title="Chỉnh sửa tên / loại">
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            
            {productStats.length === 0 && (
              <tr>
                <td colSpan={9} className="px-6 py-12 text-center text-sm text-gray-500">
                  <div className="flex flex-col items-center">
                    <FileText className="h-10 w-10 text-gray-300 mb-3" />
                    <p>Chưa có sản phẩm hoặc không tìm thấy kết quả phù hợp.</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
