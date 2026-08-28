import { useState, useRef } from 'react';
import { db } from '../db/db';
import { Trash2, AlertTriangle, ShieldCheck, Download, Upload, Database, Cloud } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import { findBackupFile, uploadBackup, downloadBackup, DRIVE_SCOPE } from '../utils/googleDrive';

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
      const users = await db.users.toArray();
      
      const backupData = {
        version: 3,
        date: new Date().toISOString(),
        data: { customers, products, documents, transactions, users }
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
                await db.transaction('rw', db.customers, db.products, db.documents, db.transactions, db.users, async () => {
                    await db.customers.clear();
                    await db.products.clear();
                    await db.documents.clear();
                    await db.transactions.clear();
                    await db.users.clear();
                    
                    if (backupData.data.customers?.length) await db.customers.bulkAdd(backupData.data.customers);
                    if (backupData.data.products?.length) await db.products.bulkAdd(backupData.data.products);
                    if (backupData.data.documents?.length) await db.documents.bulkAdd(backupData.data.documents);
                    if (backupData.data.transactions?.length) await db.transactions.bulkAdd(backupData.data.transactions);
                    if (backupData.data.users?.length) await db.users.bulkAdd(backupData.data.users);
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

  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string>('');

  const login = useGoogleLogin({
    scope: DRIVE_SCOPE,
    onSuccess: async (tokenResponse) => {
      setIsSyncing(true);
      setSyncStatus('Đang kiểm tra Google Drive...');
      try {
        const token = tokenResponse.access_token;
        const fileId = await findBackupFile(token);

        if (!fileId) {
          // Lần đầu kết nối -> Tải dữ liệu từ máy lên Drive
          setSyncStatus('Chưa có file trên Drive. Đang tạo file mới...');
          const customers = await db.customers.toArray();
          const products = await db.products.toArray();
          const documents = await db.documents.toArray();
          const transactions = await db.transactions.toArray();
          const users = await db.users.toArray();
          
          const backupData = {
            version: 3,
            date: new Date().toISOString(),
            data: { customers, products, documents, transactions, users }
          };

          await uploadBackup(token, null, backupData);
          setSyncStatus('Lưu dữ liệu lên Google Drive thành công!');
        } else {
          // Đã có file trên Drive -> Hỏi người dùng
          const choice = confirm('Phát hiện dữ liệu cũ trên Google Drive!\n\nNhấn [OK] để TẢI DỮ LIỆU TỪ DRIVE VỀ MÁY (Ghi đè máy).\nNhấn [Cancel] để ĐẨY DỮ LIỆU TỪ MÁY LÊN DRIVE (Ghi đè Drive).');
          
          if (choice) {
            // Tải về
            setSyncStatus('Đang tải dữ liệu từ Drive về máy...');
            const backupData = await downloadBackup(token, fileId);
            if (backupData && backupData.data) {
              await db.transaction('rw', db.customers, db.products, db.documents, db.transactions, db.users, async () => {
                  await db.customers.clear();
                  await db.products.clear();
                  await db.documents.clear();
                  await db.transactions.clear();
                  await db.users.clear();
                  if (backupData.data.customers?.length) await db.customers.bulkAdd(backupData.data.customers);
                  if (backupData.data.products?.length) await db.products.bulkAdd(backupData.data.products);
                  if (backupData.data.documents?.length) await db.documents.bulkAdd(backupData.data.documents);
                  if (backupData.data.transactions?.length) await db.transactions.bulkAdd(backupData.data.transactions);
                  if (backupData.data.users?.length) await db.users.bulkAdd(backupData.data.users);
              });
              setSyncStatus('Phục hồi dữ liệu từ Drive thành công!');
              alert('Đã phục hồi dữ liệu từ Google Drive thành công!');
              window.location.reload();
            }
          } else {
            // Đẩy lên
            setSyncStatus('Đang lưu dữ liệu máy tính lên Drive...');
            const customers = await db.customers.toArray();
            const products = await db.products.toArray();
            const documents = await db.documents.toArray();
            const transactions = await db.transactions.toArray();
            const users = await db.users.toArray();
            
            const backupData = {
              version: 3,
              date: new Date().toISOString(),
              data: { customers, products, documents, transactions, users }
            };
  
            await uploadBackup(token, fileId, backupData);
            setSyncStatus('Lưu dữ liệu lên Google Drive thành công!');
            alert('Đã đồng bộ dữ liệu mới lên Google Drive thành công!');
          }
        }
      } catch (err) {
        console.error(err);
        setSyncStatus('Lỗi đồng bộ Google Drive.');
        alert('Có lỗi xảy ra trong quá trình đồng bộ!');
      } finally {
        setTimeout(() => { setIsSyncing(false); setSyncStatus(''); }, 3000);
      }
    },
    onError: (error) => {
      console.error(error);
      alert('Đăng nhập Google thất bại!');
    }
  });

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="border-b bg-gray-50 p-6 flex items-center space-x-3">
          <ShieldCheck className="text-gray-600" size={24} />
          <h2 className="text-xl font-bold text-gray-800">Quản trị Hệ thống (Admin)</h2>
        </div>
        
        <div className="p-6 space-y-8">

          {/* GOOGLE DRIVE SYNC */}
          <div className="bg-green-50 border border-green-200 rounded-lg p-5">
            <div className="flex items-start space-x-4">
              <Cloud className="text-green-600 flex-shrink-0 mt-1" size={24} />
              <div className="w-full">
                <h3 className="text-lg font-bold text-green-900">Đồng bộ Đám mây (Google Drive)</h3>
                <p className="text-sm text-green-800 mt-1 mb-4">
                  Đồng bộ dữ liệu của bạn an toàn trên Google Drive cá nhân, giúp làm việc liên tục giữa Máy tính và Điện thoại mà không cần tải file thủ công.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button 
                    onClick={() => login()}
                    disabled={isSyncing}
                    className="w-full sm:w-auto bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white px-5 py-2.5 rounded font-medium flex items-center justify-center space-x-2 transition-colors text-sm shadow-sm"
                  >
                    {isSyncing ? <span className="animate-spin text-lg block">↻</span> : <Cloud size={18} />}
                    <span>Kết nối & Đồng bộ Drive</span>
                  </button>
                  {syncStatus && <span className="text-sm font-medium text-green-700">{syncStatus}</span>}
                </div>
              </div>
            </div>
          </div>
          
          {/* SAO LƯU & PHỤC HỒI THỦ CÔNG */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-5">
            <div className="flex items-start space-x-4">
              <Database className="text-blue-600 flex-shrink-0 mt-1" size={24} />
              <div className="w-full">
                <h3 className="text-lg font-bold text-blue-900">Sao lưu & Đồng bộ qua File thủ công</h3>
                <p className="text-sm text-blue-700 mt-1 mb-4">
                  Dành cho trường hợp không dùng Google Drive. Hãy tải file về, gửi qua thiết bị khác (Zalo) rồi chọn Phục hồi từ File.
                </p>
                
                <div className="flex flex-col sm:flex-row items-center gap-3">
                  <button 
                    onClick={handleBackup}
                    className="w-full sm:w-auto bg-white hover:bg-blue-50 text-blue-700 border border-blue-600 px-5 py-2.5 rounded font-medium flex items-center justify-center space-x-2 transition-colors text-sm shadow-sm"
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
