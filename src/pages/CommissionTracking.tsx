import React, { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Commission } from '../db/db';
import { Plus, Edit2, Trash2, Search, RefreshCw } from 'lucide-react';

export default function CommissionTracking() {
  const commissions = useLiveQuery(() => db.commissions.toArray());
  const documents = useLiveQuery(() => db.documents.where('type').equals('QUOTATION').toArray());
  const customers = useLiveQuery(() => db.customers.toArray());

  const [searchTerm, setSearchTerm] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [formData, setFormData] = useState<Partial<Commission>>({
    invoiceDate: new Date(),
    company: '',
    invoiceAmount: 0,
    commissionAmount: 0,
    recipientName: '',
    bankAccount: '',
    percentage: 0,
    notes: '',
    paymentMethod: ''
  });

  const syncOrders = async () => {
    if (!documents || !customers || !commissions) return;
    setIsSyncing(true);
    try {
      const existingDocIds = new Set(commissions.filter(c => c.documentId).map(c => c.documentId));
      
      const newCommissions: Commission[] = [];
      for (const doc of documents) {
        if (!existingDocIds.has(doc.id!)) {
          const customer = customers.find(c => c.id === doc.customerId);
          // Bỏ qua các chứng từ Mua vào (isSupplier === true)
          if (customer?.isSupplier) continue;
          
          newCommissions.push({
            documentId: doc.id,
            invoiceDate: doc.date,
            company: customer ? customer.name : 'Khách hàng lẻ',
            invoiceAmount: doc.total || 0,
            commissionAmount: 0,
            recipientName: '',
            bankAccount: '',
            percentage: 0,
            isHidden: false,
            paymentMethod: '',
            createdAt: new Date()
          });
        }
      }
      
      if (newCommissions.length > 0) {
        await db.commissions.bulkAdd(newCommissions);
      }
      
      // Dọn dẹp các khoản hoa hồng đã lỡ đồng bộ từ chứng từ mua vào trước đó
      const supplierDocIds = new Set(
        documents
          .filter(doc => {
            const customer = customers.find(c => c.id === doc.customerId);
            return customer?.isSupplier;
          })
          .map(doc => doc.id)
      );
      
      const toDelete = commissions.filter(c => c.documentId && supplierDocIds.has(c.documentId)).map(c => c.id!);
      if (toDelete.length > 0) {
        await db.commissions.bulkDelete(toDelete);
      }
    } catch (error) {
      console.error("Lỗi khi đồng bộ đơn hàng:", error);
    } finally {
      setIsSyncing(false);
    }
  };

  // Auto sync on mount
  useEffect(() => {
    if (documents && customers && commissions) {
      // Small timeout to prevent blocking render
      const timer = setTimeout(() => {
        syncOrders();
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [documents?.length, customers?.length]); // Run when these are first loaded

  // Filter out hidden (deleted) commissions and apply search
  const visibleCommissions = commissions?.filter(c => !c.isHidden) || [];
  
  const filteredData = visibleCommissions.filter(c => 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (c.recipientName && c.recipientName.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (c.bankAccount && c.bankAccount.includes(searchTerm))
  );

  // Sort by date descending
  filteredData.sort((a, b) => new Date(b.invoiceDate).getTime() - new Date(a.invoiceDate).getTime());

  const handleOpenModal = (item?: Commission) => {
    if (item) {
      setEditingId(item.id!);
      setFormData({
        ...item
      });
    } else {
      setEditingId(null);
      setFormData({
        invoiceDate: new Date(),
        company: '',
        invoiceAmount: 0,
        commissionAmount: 0,
        recipientName: '',
        bankAccount: '',
        percentage: 0,
        notes: '',
        paymentMethod: ''
      });
    }
    setIsModalOpen(true);
  };

  const calculateCommission = (amount: number, percentage: number) => {
    return Math.round(amount * (percentage / 100));
  };

  const handleInvoiceAmountChange = (val: string) => {
    const num = Number(val.replace(/[^0-9]/g, ''));
    const comm = calculateCommission(num, formData.percentage || 0);
    setFormData({ ...formData, invoiceAmount: num, commissionAmount: comm });
  };

  const handlePercentageChange = (val: string) => {
    const num = Number(val);
    const comm = calculateCommission(formData.invoiceAmount || 0, num);
    setFormData({ ...formData, percentage: num, commissionAmount: comm });
  };

  const handleCommissionAmountChange = (val: string) => {
    const num = Number(val.replace(/[^0-9]/g, ''));
    let perc = 0;
    if (formData.invoiceAmount && formData.invoiceAmount > 0) {
      perc = Number(((num / formData.invoiceAmount) * 100).toFixed(2));
    }
    setFormData({ ...formData, commissionAmount: num, percentage: perc });
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.company) {
      alert('Vui lòng điền Đơn vị!');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        invoiceDate: new Date(formData.invoiceDate!),
        updatedAt: new Date(),
        isHidden: false
      } as Commission;

      if (editingId) {
        await db.commissions.update(editingId, dataToSave);
      } else {
        await db.commissions.add({ ...dataToSave, createdAt: new Date() });
      }
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error saving commission:', error);
      alert('Có lỗi xảy ra khi lưu dữ liệu!');
    }
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc muốn xoá mục này khỏi danh sách theo dõi?')) {
      // Instead of hard delete, we hide it so it doesn't get synced again
      await db.commissions.update(id, { isHidden: true });
    }
  };

  
  const formatPayment = (method?: string) => {
    switch (method) {
      case 'TIEN_MAT': return 'Tiền mặt';
      case 'CHUYEN_KHOAN': return 'Chuyển khoản';
      case 'CAN_TRU': return 'Cấn trừ công nợ';
      default: return <span className="text-gray-400 italic">Chưa chọn</span>;
    }
  };

  const totalInvoice = filteredData.reduce((acc, curr) => acc + (curr.invoiceAmount || 0), 0);
  const totalCommission = filteredData.reduce((acc, curr) => acc + (curr.commissionAmount || 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Theo Dõi Hoa Hồng</h1>
        <div className="flex items-center space-x-3">
          <button 
            onClick={syncOrders}
            disabled={isSyncing}
            className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg flex items-center gap-2 border"
          >
            <RefreshCw size={20} className={isSyncing ? "animate-spin" : ""} />
            <span className="hidden sm:inline">Làm mới Đơn Hàng</span>
          </button>
          <button 
            onClick={() => handleOpenModal()}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Plus size={20} />
            <span className="hidden sm:inline">Thêm thủ công</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Tổng tiền hoá đơn</p>
          <p className="text-xl font-bold text-gray-800">{new Intl.NumberFormat('vi-VN').format(totalInvoice)} đ</p>
        </div>
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
          <p className="text-sm text-gray-500 mb-1">Tổng tiền hoa hồng đã chi</p>
          <p className="text-xl font-bold text-green-600">{new Intl.NumberFormat('vi-VN').format(totalCommission)} đ</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 border-b border-gray-200">
          <div className="relative w-full md:w-96">
            <input
              type="text"
              placeholder="Tìm theo đơn vị, người nhận, số tài khoản..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            <Search className="absolute left-3 top-2.5 text-gray-400" size={20} />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50 text-gray-700 font-medium border-b">
              <tr>
                <th className="px-4 py-3 text-center w-12">STT</th>
                <th className="px-4 py-3 whitespace-nowrap">Ngày HĐ</th>
                <th className="px-4 py-3 min-w-[150px]">Đơn Vị</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Tiền HĐ</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Tỉ lệ (%)</th>
                <th className="px-4 py-3 text-right whitespace-nowrap">Tiền Hoa Hồng</th>
                <th className="px-4 py-3 min-w-[150px]">Người Nhận</th>
                <th className="px-4 py-3 min-w-[120px]">Số TK</th>
                <th className="px-4 py-3 whitespace-nowrap">Hình thức TT</th>
                <th className="px-4 py-3 text-center w-20">Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredData.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    Không tìm thấy dữ liệu nào.
                  </td>
                </tr>
              ) : (
                filteredData.map((item, index) => (
                  <tr key={item.id} className="border-b hover:bg-gray-50">
                    <td className="px-4 py-3 text-center">{index + 1}</td>
                    <td className="px-4 py-3 whitespace-nowrap">{new Date(item.invoiceDate).toLocaleDateString('vi-VN')}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{item.company}</td>
                    <td className="px-4 py-3 text-right text-gray-700">{new Intl.NumberFormat('vi-VN').format(item.invoiceAmount || 0)}</td>
                    <td className="px-4 py-3 text-right">{item.percentage || 0}%</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{new Intl.NumberFormat('vi-VN').format(item.commissionAmount || 0)}</td>
                    <td className="px-4 py-3">{item.recipientName || <span className="text-gray-400 italic">Chưa cập nhật</span>}</td>
                    <td className="px-4 py-3">{item.bankAccount || <span className="text-gray-400 italic">Chưa cập nhật</span>}</td>
                    <td className="px-4 py-3 text-gray-700">{formatPayment(item.paymentMethod)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => handleOpenModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1 text-red-600 hover:bg-red-50 rounded" title="Xoá (Ẩn khỏi danh sách)">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <h2 className="text-xl font-bold text-gray-800">
                {editingId ? 'Cập Nhật Ghi Nhận' : 'Thêm Ghi Nhận Mới'}
              </h2>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ngày Hoá Đơn *</label>
                  <input
                    type="date"
                    required
                    value={formData.invoiceDate ? new Date(formData.invoiceDate).toISOString().split('T')[0] : ''}
                    onChange={(e) => setFormData({ ...formData, invoiceDate: new Date(e.target.value) })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Đơn Vị *</label>
                  <input
                    type="text"
                    required
                    value={formData.company}
                    onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder="Tên công ty/Đơn vị..."
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tiền Hoá Đơn (VNĐ)</label>
                  <input
                    type="text"
                    value={new Intl.NumberFormat('vi-VN').format(formData.invoiceAmount || 0)}
                    onChange={(e) => handleInvoiceAmountChange(e.target.value)}
                    className="w-full p-2 border rounded-md text-right font-medium"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tỉ lệ (%)</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      value={formData.percentage || 0}
                      onChange={(e) => handlePercentageChange(e.target.value)}
                      className="w-full p-2 border rounded-md text-right"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tiền Hoa Hồng</label>
                    <input
                      type="text"
                      value={new Intl.NumberFormat('vi-VN').format(formData.commissionAmount || 0)}
                      onChange={(e) => handleCommissionAmountChange(e.target.value)}
                      className="w-full p-2 border rounded-md text-right font-medium text-green-600"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người Nhận</label>
                  <input
                    type="text"
                    value={formData.recipientName || ''}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hình Thức Thanh Toán</label>
                  <select
                    value={formData.paymentMethod || ''}
                    onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value })}
                    className="w-full p-2 border rounded-md bg-white"
                  >
                    <option value="">-- Chọn hình thức --</option>
                    <option value="TIEN_MAT">Tiền mặt</option>
                    <option value="CHUYEN_KHOAN">Chuyển khoản</option>
                    <option value="CAN_TRU">Cấn trừ công nợ</option>
                  </select>
                </div>
<div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số Tài Khoản</label>
                  <input
                    type="text"
                    value={formData.bankAccount || ''}
                    onChange={(e) => setFormData({ ...formData, bankAccount: e.target.value })}
                    className="w-full p-2 border rounded-md"
                    placeholder="VD: 1903123456789 - Techcombank"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ghi Chú</label>
                <textarea
                  value={formData.notes || ''}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full p-2 border rounded-md"
                  rows={2}
                />
              </div>

              <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border rounded-md text-gray-600 hover:bg-gray-50"
                >
                  Huỷ
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Lưu Thông Tin
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
