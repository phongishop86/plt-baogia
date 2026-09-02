import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Customer } from '../db/db';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';

export default function Customers() {
  const customers = useLiveQuery(() => db.customers.toArray());
  const [showModal, setShowModal] = useState(false);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);
  
  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [name, setName] = useState('');
  const [taxCode, setTaxCode] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [isSupplier, setIsSupplier] = useState(false);
  const [detailModal, setDetailModal] = useState<{
    isOpen: boolean;
    customer: Customer | null;
    transactions: any[];
    totalAmount: number;
    rating: string;
  }>({ isOpen: false, customer: null, transactions: [], totalAmount: 0, rating: '' });

  const openAddModal = () => {
    setEditingId(null);
    setName('');
    setTaxCode('');
    setAddress('');
    setPhone('');
    setEmail('');
    setIsSupplier(false);
    setShowModal(true);
  };

  const openEditModal = (customer: Customer) => {
    setEditingId(customer.id!);
    setName(customer.name);
    setTaxCode(customer.taxCode || '');
    setAddress(customer.address || '');
    setPhone(customer.phone || '');
    setEmail(customer.email || '');
    setIsSupplier(customer.isSupplier || false);
    setShowModal(true);
  };

  const openDetailModal = async (customer: Customer) => {
    // Lấy lịch sử giao dịch
    const docs = await db.documents.where('customerId').equals(customer.id!).toArray();
    docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    
    // Tính tổng tiền các giao dịch hợp lệ (không phải báo giá)
    const validDocs = docs.filter(d => d.type !== 'QUOTATION' && d.status !== 'CANCELLED');
    const totalAmount = validDocs.reduce((sum, d) => sum + (d.total || 0), 0);
    const count = validDocs.length;
    
    let rating = 'Khách hàng mới';
    if (count > 10 || totalAmount > 100000000) rating = 'VIP ⭐⭐⭐';
    else if (count > 5 || totalAmount > 50000000) rating = 'Thân thiết ⭐⭐';
    else if (count >= 1) rating = 'Đã giao dịch ⭐';

    setDetailModal({
      isOpen: true,
      customer,
      transactions: docs,
      totalAmount,
      rating
    });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      alert("Tên Khách hàng/Đối tác là bắt buộc!");
      return;
    }

    const customerData = { name, taxCode, address, phone, email, isSupplier };

    if (editingId) {
      await db.customers.update(editingId, customerData);
    } else {
      await db.customers.add(customerData as Customer);
    }
    
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa khách hàng này? Các hóa đơn liên quan vẫn sẽ giữ ID cũ nhưng không hiển thị tên.")) {
      await db.customers.delete(id);
    }
  };

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  let sortedCustomers = [...(customers || [])];
  if (sortConfig) {
    sortedCustomers.sort((a: any, b: any) => {
      let valA = a[sortConfig.key] || '';
      let valB = b[sortConfig.key] || '';
      
      if (typeof valA === 'string') valA = valA.toLowerCase();
      if (typeof valB === 'string') valB = valB.toLowerCase();

      if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
      if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Danh sách Khách hàng & Đối tác</h2>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus size={18} />
          <span>Tạo mới</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden min-w-[200px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('name')}>
                    <div className="flex items-center space-x-1"><span>Tên Đơn Vị</span> <span className="text-gray-400">{sortConfig?.key === 'name' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span></div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('taxCode')}>
                    <div className="flex items-center space-x-1"><span>Mã Số Thuế</span> <span className="text-gray-400">{sortConfig?.key === 'taxCode' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span></div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden min-w-[200px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('address')}>
                    <div className="flex items-center space-x-1"><span>Địa chỉ</span> <span className="text-gray-400">{sortConfig?.key === 'address' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span></div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-200 transition-colors overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('phone')}>
                    <div className="flex items-center space-x-1"><span>Điện thoại</span> <span className="text-gray-400">{sortConfig?.key === 'phone' ? (sortConfig.direction === 'asc' ? '↑' : '↓') : '↕'}</span></div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sortedCustomers.map((customer) => (
                <tr key={customer.id} className="hover:bg-blue-50 cursor-pointer" onClick={() => openDetailModal(customer)}>
                  <td className="px-6 py-4 text-sm font-medium text-gray-900 whitespace-normal break-words border-r border-gray-100">
                    {customer.name}
                    {customer.isSupplier && <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-purple-100 text-purple-800 whitespace-nowrap">Nhà cung cấp</span>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">{customer.taxCode || '-'}</td>
                  <td className="px-6 py-4 text-sm text-gray-500 whitespace-normal break-words border-r border-gray-100">{customer.address || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">{customer.phone || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3" onClick={(e) => e.stopPropagation()}>
                    <button onClick={(e) => { e.stopPropagation(); openEditModal(customer); }} className="text-blue-600 hover:text-blue-900" title="Chỉnh sửa">
                      <Pencil size={18} />
                    </button>
                    <button onClick={(e) => { e.stopPropagation(); handleDelete(customer.id!); }} className="text-red-500 hover:text-red-700" title="Xóa">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
              {customers?.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-sm text-gray-500">
                    Chưa có dữ liệu. Hãy thêm mới hoặc import từ file XML.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL THÊM / SỬA */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-lg overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Cập nhật thông tin' : 'Tạo mới Khách hàng / Đối tác'}
              </h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đơn vị / Công ty *</label>
                <input 
                  type="text" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                  placeholder="VD: CÔNG TY TNHH ABC"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Mã Số Thuế</label>
                  <input 
                    type="text" 
                    value={taxCode} 
                    onChange={(e) => setTaxCode(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Điện thoại</label>
                  <input 
                    type="text" 
                    value={phone} 
                    onChange={(e) => setPhone(e.target.value)} 
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
                <input 
                  type="text" 
                  value={address} 
                  onChange={(e) => setAddress(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email liên hệ</label>
                <input 
                  type="email" 
                  value={email} 
                  onChange={(e) => setEmail(e.target.value)} 
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="flex items-center space-x-2 pt-2">
                <input 
                  type="checkbox" 
                  id="isSupplier"
                  checked={isSupplier}
                  onChange={(e) => setIsSupplier(e.target.checked)}
                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 h-4 w-4"
                />
                <label htmlFor="isSupplier" className="text-sm text-gray-700 font-medium cursor-pointer">
                  Đây là Nhà cung cấp (Chuyên xuất hóa đơn đầu vào cho PLT)
                </label>
              </div>

              <div className="pt-4 border-t mt-6 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700"
                >
                  {editingId ? 'Lưu cập nhật' : 'Thêm Khách hàng'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL CHI TIẾT KHÁCH HÀNG */}
      {detailModal.isOpen && detailModal.customer && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b bg-blue-50">
              <h3 className="text-lg font-bold text-gray-900">Chi tiết Khách hàng / Đối tác</h3>
              <button onClick={() => setDetailModal({ ...detailModal, isOpen: false })} className="text-gray-500 hover:text-gray-700">
                <X size={20} />
              </button>
            </div>
            <div className="p-6 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Tên Đơn vị</p>
                  <p className="text-sm font-bold text-gray-900">{detailModal.customer.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Đánh giá độ thân thiết</p>
                  <p className="text-sm font-bold text-blue-700 bg-blue-50 inline-block px-2 py-0.5 rounded border border-blue-200 mt-1">{detailModal.rating}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Tổng giá trị giao dịch</p>
                  <p className="text-sm font-bold text-green-700">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(detailModal.totalAmount)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-500 uppercase font-medium">Số lượng giao dịch</p>
                  <p className="text-sm font-bold text-gray-900">{detailModal.transactions.filter(d => d.type !== 'QUOTATION').length} chứng từ</p>
                </div>
              </div>

              <h4 className="font-bold text-gray-700 mb-3 border-b pb-2">Lịch sử giao dịch gần đây</h4>
              {detailModal.transactions.length === 0 ? (
                <p className="text-sm text-gray-500">Khách hàng chưa có giao dịch nào.</p>
              ) : (
                <div className="space-y-3">
                  {detailModal.transactions.map(d => (
                    <div key={d.id} className="border border-gray-100 rounded-lg p-3 flex justify-between items-center hover:bg-gray-50">
                      <div>
                        <p className="text-sm font-bold text-gray-900">{d.docNumber}</p>
                        <p className="text-xs text-gray-500">{new Date(d.date).toLocaleDateString('vi-VN')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-bold text-gray-900">{new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(d.total || 0)}</p>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                          d.type === 'QUOTATION' ? 'bg-purple-100 text-purple-800' :
                          d.type === 'INPUT_INVOICE' ? 'bg-blue-100 text-blue-800' :
                          'bg-green-100 text-green-800'
                        }`}>
                          {d.type === 'QUOTATION' ? 'Báo giá' : d.type === 'INPUT_INVOICE' ? 'Mua vào' : 'Bán ra'}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button 
                onClick={() => setDetailModal({ ...detailModal, isOpen: false })}
                className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-100"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
