import React, { useState } from 'react';
import { db, type User } from '../db/db';
import { useGoogleLogin } from '@react-oauth/google';
import { findBackupFile, downloadBackup, DRIVE_SCOPE } from '../utils/googleDrive';
import { CloudDownload } from 'lucide-react';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isSyncing, setIsSyncing] = useState(false);

  const loginWithGoogle = useGoogleLogin({
    scope: DRIVE_SCOPE,
    onSuccess: async (tokenResponse) => {
      setIsSyncing(true);
      setError('Đang tải dữ liệu từ Google Drive...');
      try {
        const token = tokenResponse.access_token;
        const fileId = await findBackupFile(token);

        if (fileId) {
          const backupData = await downloadBackup(token, fileId);
          if (backupData && backupData.data) {
            await db.transaction('rw', db.customers, db.products, db.documents, db.transactions, db.users, async () => {
                await db.customers.clear();
                await db.products.clear();
                await db.documents.clear();
                await db.transactions.clear();
                await db.users.clear(); // Xóa bảng user cũ để nạp bảng user mới từ cloud

                if (backupData.data.customers?.length) await db.customers.bulkAdd(backupData.data.customers);
                if (backupData.data.products?.length) await db.products.bulkAdd(backupData.data.products);
                if (backupData.data.documents?.length) await db.documents.bulkAdd(backupData.data.documents);
                if (backupData.data.transactions?.length) await db.transactions.bulkAdd(backupData.data.transactions);
                if (backupData.data.users?.length) await db.users.bulkAdd(backupData.data.users);
            });
            setError('');
            alert('Tải dữ liệu từ Drive thành công! Bạn có thể đăng nhập ngay bây giờ.');
          }
        } else {
          setError('Không tìm thấy bản sao lưu nào trên Google Drive.');
        }
      } catch (err) {
        console.error(err);
        setError('Có lỗi khi tải dữ liệu từ Google Drive.');
      } finally {
        setIsSyncing(false);
      }
    },
    onError: () => {
      setError('Lỗi kết nối Google Drive!');
      setIsSyncing(false);
    }
  });

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const count = await db.users.count();
    if (count === 0) {
      await db.users.add({
        username: 'admin',
        password: '1',
        role: 'ADMIN',
        createdAt: new Date()
      });
    }

    const user = await db.users.where('username').equals(username.trim()).first();
    if (!user) {
      setError('Tài khoản không tồn tại. Nếu bạn có tài khoản trên Cloud, vui lòng bấm Tải dữ liệu từ Cloud trước.');
      return;
    }

    if (user.password !== password) {
      setError('Mật khẩu không đúng!');
      return;
    }

    onLogin(user);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-8 rounded-xl shadow-lg w-full max-w-md">
        <div className="flex justify-center mb-6">
          <img src="/PLT-Logo-web.png" alt="PLT Logo" className="w-16 h-16 object-contain bg-white rounded" />
        </div>
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Đăng nhập Hệ thống ERP</h2>
        
        {error && (
          <div className={`p-3 rounded mb-4 text-sm text-center ${isSyncing ? 'bg-blue-50 text-blue-600' : 'bg-red-50 text-red-600'}`}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tài khoản</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Nhập tên đăng nhập..."
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-blue-500 focus:border-blue-500 outline-none"
              placeholder="Nhập mật khẩu..."
              required
            />
          </div>
          <button
            type="submit"
            disabled={isSyncing}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors disabled:bg-blue-300"
          >
            Đăng nhập
          </button>
        </form>

        <div className="mt-6 border-t pt-4">
          <button
            type="button"
            onClick={() => loginWithGoogle()}
            disabled={isSyncing}
            className="w-full flex items-center justify-center space-x-2 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <CloudDownload size={20} className="text-blue-600" />
            <span>Tải dữ liệu từ Cloud (Google Drive)</span>
          </button>
          <p className="text-center text-gray-500 text-xs mt-3">
            * Bấm nút này nếu tài khoản của bạn được cấp mới từ Admin nhưng chưa có trên máy này.
          </p>
        </div>
      </div>
    </div>
  );
}
