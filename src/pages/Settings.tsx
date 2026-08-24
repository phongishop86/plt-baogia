import { useState } from 'react';
import { db } from '../db/db';
import { Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';

export default function Settings() {
  const [pin, setPin] = useState('');
  
  const handleResetData = async () => {
    if (pin !== '6868') {
      alert('Mã PIN không chính xác! Tính năng này chỉ dành cho Admin.');
      return;
    }

    if (confirm('CẢNH BÁO NGUY HIỂM: \nBạn có chắc chắn muốn XÓA TOÀN BỘ dữ liệu (Khách hàng, Sản phẩm, Hóa đơn)?\nHành động này KHÔNG THỂ HOÀN TÁC!')) {
      const confirmText = prompt('Vui lòng gõ chữ "XOA" để xác nhận:');
      if (confirmText === 'XOA') {
        await db.customers.clear();
        await db.products.clear();
        await db.documents.clear();
        alert('Hệ thống đã được dọn sạch! Bạn có thể bắt đầu Import lại từ đầu.');
        setPin(''); // Reset PIN
      } else {
        alert('Hủy thao tác xóa.');
      }
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b bg-gray-50 p-6 flex items-center space-x-3">
          <ShieldCheck className="text-gray-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Quản trị Hệ thống (Admin)</h2>
        </div>
        
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-bold text-red-800">Xóa trắng toàn bộ dữ liệu (Hard Reset)</h3>
                <p className="text-sm text-red-600 mt-1 mb-4">
                  Tính năng này sẽ xóa toàn bộ danh sách Khách hàng, Sản phẩm, Tồn kho và Hóa đơn. 
                  Sử dụng khi bạn muốn dọn sạch hệ thống để test hoặc cấu hình lại từ đầu.
                </p>
                
                <div className="flex items-center space-x-3">
                  <input 
                    type="password" 
                    placeholder="Nhập mã PIN Admin..." 
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="border border-red-300 rounded px-3 py-2 w-48 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button 
                    onClick={handleResetData}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium flex items-center space-x-2 transition-colors text-sm"
                  >
                    <Trash2 size={16} />
                    <span>Thực thi Xóa Dữ Liệu</span>
                  </button>
                </div>
                <p className="text-xs text-gray-500 mt-3 italic">* Mã PIN mặc định: 6868</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
