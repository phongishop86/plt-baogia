import React, { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type Commission } from '../db/db';
import { Plus, Edit2, Trash2, Search,  } from 'lucide-react';

export default function CommissionTracking() {
  const commissions = useLiveQuery(() => db.commissions.toArray());
  const [searchTerm, setSearchTerm] = useState('');
  
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
    notes: ''
  });

  const filteredData = commissions?.filter(c => 
    c.company.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.recipientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.bankAccount.includes(searchTerm)
  ) || [];

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
        notes: ''
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
    if (!formData.company || !formData.recipientName) {
      alert('Vui lòng điền Đơn vị và Người nhận!');
      return;
    }

    try {
      const dataToSave = {
        ...formData,
        invoiceDate: new Date(formData.invoiceDate!),
        updatedAt: new Date()
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
    if (window.confirm('Bạn có chắc muốn xoá mục này?')) {
      await db.commissions.delete(id);
    }
  };

  const totalInvoice = filteredData.reduce((acc, curr) => acc + curr.invoiceAmount, 0);
  const totalCommission = filteredData.reduce((acc, curr) => acc + curr.commissionAmount, 0);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-gray-800">Theo Dõi Hoa Hồng</h1>
        <button 
          onClick={() => handleOpenModal()}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Plus size={20} />
          <span>Thêm Ghi Nhận</span>
        </button>
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
                    <td className="px-4 py-3 text-right text-gray-700">{new Intl.NumberFormat('vi-VN').format(item.invoiceAmount)}</td>
                    <td className="px-4 py-3 text-right">{item.percentage}%</td>
                    <td className="px-4 py-3 text-right font-medium text-green-600">{new Intl.NumberFormat('vi-VN').format(item.commissionAmount)}</td>
                    <td className="px-4 py-3">{item.recipientName}</td>
                    <td className="px-4 py-3">{item.bankAccount}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center justify-center space-x-2">
                        <button onClick={() => handleOpenModal(item)} className="p-1 text-blue-600 hover:bg-blue-50 rounded">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => handleDelete(item.id!)} className="p-1 text-red-600 hover:bg-red-50 rounded">
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
                      value={formData.percentage}
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
                  <label className="block text-sm font-medium text-gray-700 mb-1">Người Nhận *</label>
                  <input
                    type="text"
                    required
                    value={formData.recipientName}
                    onChange={(e) => setFormData({ ...formData, recipientName: e.target.value })}
                    className="w-full p-2 border rounded-md"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Số Tài Khoản</label>
                  <input
                    type="text"
                    value={formData.bankAccount}
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
