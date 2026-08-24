import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Plus, X, Trash2, ArrowDownCircle, ArrowUpCircle } from 'lucide-react';

export default function Fund() {
  const transactions = useLiveQuery(() => db.transactions.orderBy('date').reverse().toArray());
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [amount, setAmount] = useState('');
  const [type, setType] = useState<'ADVANCE' | 'REPAYMENT' | 'OTHER_IN' | 'OTHER_OUT'>('ADVANCE');
  const [description, setDescription] = useState('');

  const openAddModal = () => {
    setDate(new Date().toISOString().split('T')[0]);
    setAmount('');
    setType('ADVANCE');
    setDescription('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || isNaN(Number(amount))) {
      alert("Số tiền không hợp lệ!");
      return;
    }

    await db.transactions.add({
      date: new Date(date),
      amount: Number(amount),
      type,
      description,
      createdAt: new Date()
    });
    
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    if (confirm("Bạn có chắc chắn muốn xóa giao dịch này?")) {
      await db.transactions.delete(id);
    }
  };

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  // Thống kê Quỹ tiền mặt
  const stats = useMemo(() => {
    let totalAdvance = 0;
    let totalRepayment = 0;
    let otherIn = 0;
    let otherOut = 0;

    transactions?.forEach(tx => {
      if (tx.type === 'ADVANCE') totalAdvance += tx.amount;
      if (tx.type === 'REPAYMENT') totalRepayment += tx.amount;
      if (tx.type === 'OTHER_IN') otherIn += tx.amount;
      if (tx.type === 'OTHER_OUT') otherOut += tx.amount;
    });

    const fundBalance = (totalAdvance + otherIn) - (totalRepayment + otherOut);
    const debtToDirector = totalAdvance - totalRepayment; // Số tiền công ty còn nợ Giám đốc

    return { totalAdvance, totalRepayment, debtToDirector, fundBalance, otherIn, otherOut };
  }, [transactions]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-xl font-bold text-gray-800">Quản lý Quỹ & Tạm ứng</h2>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus size={18} />
          <span>Thêm Giao dịch</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Card: Số dư quỹ hiện tại */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
          <div className="bg-green-100 p-4 rounded-full text-green-600">
            <ArrowDownCircle size={32} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase">Số dư Quỹ Tiền Mặt</p>
            <p className="text-2xl font-bold text-gray-900">{formatCurrency(stats.fundBalance)}</p>
          </div>
        </div>
        
        {/* Card: Công ty đang nợ Giám đốc */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 flex items-center space-x-4">
          <div className="bg-red-100 p-4 rounded-full text-red-600">
            <ArrowUpCircle size={32} />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-500 uppercase">Công ty nợ Giám đốc (Cần hoàn ứng)</p>
            <p className="text-2xl font-bold text-red-600">{formatCurrency(stats.debtToDirector)}</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-4 border-b border-gray-200 bg-gray-50">
          <h3 className="font-semibold text-gray-800">Lịch sử Giao dịch Quỹ</h3>
        </div>
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại Giao Dịch</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Diễn giải</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thu (Tăng Quỹ)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Chi (Giảm Quỹ)</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {transactions?.map((tx) => (
              <tr key={tx.id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(tx.date).toLocaleDateString('vi-VN')}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {tx.type === 'ADVANCE' && <span className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full font-medium">GĐ Nộp Quỹ (Tạm ứng)</span>}
                  {tx.type === 'REPAYMENT' && <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">Hoàn ứng GĐ</span>}
                  {tx.type === 'OTHER_IN' && <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">Thu khác</span>}
                  {tx.type === 'OTHER_OUT' && <span className="px-2 py-1 bg-red-100 text-red-800 text-xs rounded-full font-medium">Chi khác</span>}
                </td>
                <td className="px-6 py-4 text-sm text-gray-900">{tx.description}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-green-600">
                  {(tx.type === 'ADVANCE' || tx.type === 'OTHER_IN') ? `+${formatCurrency(tx.amount)}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-medium text-red-600">
                  {(tx.type === 'REPAYMENT' || tx.type === 'OTHER_OUT') ? `-${formatCurrency(tx.amount)}` : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                  <button onClick={() => handleDelete(tx.id!)} className="text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </td>
              </tr>
            ))}
            {transactions?.length === 0 && (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-sm text-gray-500">
                  Chưa có giao dịch quỹ nào.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* MODAL THÊM GIAO DỊCH */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="flex justify-between items-center p-4 border-b bg-gray-50">
              <h3 className="text-lg font-bold text-gray-900">Thêm Giao Dịch Mới</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Loại Giao Dịch</label>
                <select 
                  value={type} 
                  onChange={(e) => setType(e.target.value as any)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                >
                  <optgroup label="Liên quan Giám Đốc">
                    <option value="ADVANCE">Giám Đốc Nộp Quỹ (Công ty vay)</option>
                    <option value="REPAYMENT">Hoàn Ứng Giám Đốc (Trả lại GĐ)</option>
                  </optgroup>
                  <optgroup label="Khác">
                    <option value="OTHER_IN">Thu Khác (Tăng quỹ)</option>
                    <option value="OTHER_OUT">Chi Khác (Giảm quỹ)</option>
                  </optgroup>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Ngày giao dịch</label>
                <input 
                  type="date" 
                  value={date} 
                  onChange={(e) => setDate(e.target.value)} 
                  required
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số tiền (VNĐ)</label>
                <input 
                  type="number" 
                  value={amount} 
                  onChange={(e) => setAmount(e.target.value)} 
                  required
                  min="0"
                  placeholder="VD: 5000000"
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Diễn giải</label>
                <input 
                  type="text" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  required
                  placeholder="Nhập lý do thu/chi..."
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
                />
              </div>
              
              <div className="pt-4 flex justify-end space-x-3 border-t mt-6">
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
                  Lưu giao dịch
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
