import React, { useState } from 'react';
import { db, type User } from '../db/db';

interface LoginProps {
  onLogin: (user: User) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Kiểm tra xem db.users có trống không, nếu trống thì tạo tài khoản Admin mặc định
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
      setError('Tài khoản không tồn tại. Nếu đây là lần đầu chạy, hãy dùng admin / 1');
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
          <div className="bg-red-50 text-red-600 p-3 rounded mb-4 text-sm text-center">
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
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-2.5 px-4 rounded-lg transition-colors"
          >
            Đăng nhập
          </button>
        </form>
        <p className="text-center text-gray-500 text-xs mt-6">
          Hệ thống chạy hoàn toàn trên máy khách (Offline-first). <br/> Lần đầu khởi động, tài khoản mặc định là <b>admin</b> / mật khẩu: <b>1</b>
        </p>
      </div>
    </div>
  );
}
