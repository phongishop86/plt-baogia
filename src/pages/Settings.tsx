import { useState, useRef } from 'react';
import { db } from '../db/db';
import { Trash2, AlertTriangle, ShieldCheck, Download, Upload, Database } from 'lucide-react';

export default function Settings() {
  const [pin, setPin] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
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
        await db.transactions.clear();
        alert('Hệ thống đã được dọn sạch! Bạn có thể bắt đầu Import lại từ đầu.');
        setPin(''); // Reset PIN
      } else {
        alert('Hủy thao tác xóa.');
      }
    }
  };

  const handleBackup = async () => {
    try {
      const customers = await db.customers.toArray();
      const products = await db.products.toArray();
      const documents = await db.documents.toArray();
      const transactions = await db.transactions.toArray();
      
      const backupData = {
        version: 2,
        date: new Date().toISOString(),
        data: { customers, products, documents, transactions }
      };
      
      const blob = new Blob([JSON.stringify(backupData)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `PLT_Backup_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Đã xảy ra lỗi khi sao lưu dữ liệu!');
    }
  };

  const handleRestore = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = async (e) => {
        try {
            const backupData = JSON.parse(e.target?.result as string);
            if (!backupData.data) throw new Error('File không hợp lệ');
            
            if (confirm('CẢNH BÁO: Phục hồi dữ liệu sẽ GHI ĐÈ và XÓA TOÀN BỘ dữ liệu hiện tại trên máy này. \n\nBạn có chắc chắn muốn tải dữ liệu từ file này lên?')) {
                await db.transaction('rw', db.customers, db.products, db.documents, db.transactions, async () => {
                    await db.customers.clear();
                    await db.products.clear();
                    await db.documents.clear();
                    await db.transactions.clear();
                    
                    if (backupData.data.customers?.length) await db.customers.bulkAdd(backupData.data.customers);
                    if (backupData.data.products?.length) await db.products.bulkAdd(backupData.data.products);
                    if (backupData.data.documents?.length) await db.documents.bulkAdd(backupData.data.documents);
                    if (backupData.data.transactions?.length) await db.transactions.bulkAdd(backupData.data.transactions);
                });
                alert('Phục hồi dữ liệu thành công!');
                window.location.reload();
            }
        } catch (err) {
            alert('Lỗi: File sao lưu không hợp lệ hoặc bị hỏng.');
            console.error(err);
        }
        
        // Reset input để có thể chọn lại cùng 1 file
        if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b bg-gray-50 p-6 flex items-center space-x-3">
          <ShieldCheck className="text-gray-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Quản trị Hệ thống (Admin)</h2>
        </div>
        
        <div className="p-6 space-y-8">
          
          {/* SAO LƯU & PHỤC HỒI */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start space-x-4">
              <Database className="text-blue-600 flex-shrink-0 mt-1" size={24} />
              <div className="w-full">
                <h3 className="text-lg font-bold text-blue-900">Sao lưu & Đồng bộ thiết bị (Backup/Restore)</h3>
                <p className="text-sm text-blue-700 mt-1 mb-4">
                  Dữ liệu hiện tại được lưu độc lập trên trình duyệt của máy tính này. Để làm việc trên Điện thoại hoặc Máy tính khác, hãy <b>Sao lưu</b> (tải file về) sau đó gửi qua Zalo/Drive sang máy kia, rồi chọn <b>Phục hồi</b>.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button 
                    onClick={handleBackup}
                    className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white px-5 py-2.5 rounded font-medium flex items-center justify-center space-x-2 transition-colors text-sm shadow-sm"
                  >
                    <Download size={18} />
                    <span>Tải file Sao lưu (.json)</span>
                  </button>
                  
                  <div className="hidden sm:block text-blue-300">|</div>

                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full sm:w-auto bg-white border border-blue-300 hover:bg-blue-100 text-blue-700 px-5 py-2.5 rounded font-medium flex items-center justify-center space-x-2 transition-colors text-sm shadow-sm"
                  >
                    <Upload size={18} />
                    <span>Phục hồi từ File</span>
                  </button>
                  <input 
                    type="file" 
                    accept=".json" 
                    ref={fileInputRef} 
                    onChange={handleRestore} 
                    className="hidden" 
                  />
                </div>
              </div>
            </div>
          </div>

          <hr className="border-gray-200" />

          {/* XÓA TOÀN BỘ DỮ LIỆU */}
          <div className="bg-red-50 border border-red-200 rounded-lg p-5">
            <div className="flex items-start space-x-4">
              <AlertTriangle className="text-red-600 flex-shrink-0 mt-1" size={24} />
              <div>
                <h3 className="text-lg font-bold text-red-800">Xóa trắng toàn bộ dữ liệu (Hard Reset)</h3>
                <p className="text-sm text-red-600 mt-1 mb-4">
                  Tính năng này sẽ xóa toàn bộ danh sách Khách hàng, Sản phẩm, Tồn kho và Hóa đơn. 
                  Sử dụng khi bạn muốn dọn sạch hệ thống để test hoặc cấu hình lại từ đầu.
                </p>
                
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <input 
                    type="password" 
                    placeholder="Nhập mã PIN Admin..." 
                    value={pin}
                    onChange={(e) => setPin(e.target.value)}
                    className="border border-red-300 rounded px-3 py-2 w-full sm:w-48 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                  <button 
                    onClick={handleResetData}
                    className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded font-medium flex items-center justify-center space-x-2 transition-colors text-sm w-full sm:w-auto"
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
