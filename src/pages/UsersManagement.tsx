import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User } from '../db/db';
import { Plus, X, Pencil, Trash2 } from 'lucide-react';

export default function UsersManagement() {
  const users = useLiveQuery(() => db.users.toArray());
  const [showModal, setShowModal] = useState(false);
  
  // Form state
  const [editingId, setEditingId] = useState<number | null>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'ADMIN' | 'KETOAN' | 'VIEWER'>('VIEWER');

  const openAddModal = () => {
    setEditingId(null);
    setUsername('');
    setPassword('');
    setRole('VIEWER');
    setShowModal(true);
  };

  const openEditModal = (user: User) => {
    setEditingId(user.id!);
    setUsername(user.username);
    setPassword(user.password || '');
    setRole(user.role);
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username.trim() || !password.trim()) {
      alert("Tên tài khoản và Mật khẩu là bắt buộc!");
      return;
    }

    const userData = { username, password, role };

    if (editingId) {
      // Check if trying to remove last admin
      if (role !== 'ADMIN') {
        const adminCount = users?.filter(u => u.role === 'ADMIN').length || 0;
        const currentUser = users?.find(u => u.id === editingId);
        if (currentUser?.role === 'ADMIN' && adminCount <= 1) {
          alert("Không thể đổi quyền Admin duy nhất của hệ thống!");
          return;
        }
      }
      await db.users.update(editingId, userData);
    } else {
      // Check duplicate username
      const existing = await db.users.where('username').equals(username).first();
      if (existing) {
        alert("Tên tài khoản đã tồn tại!");
        return;
      }
      await db.users.add({ ...userData, createdAt: new Date() });
    }
    
    setShowModal(false);
  };

  const handleDelete = async (id: number) => {
    const userToDelete = users?.find(u => u.id === id);
    if (userToDelete?.role === 'ADMIN') {
      const adminCount = users?.filter(u => u.role === 'ADMIN').length || 0;
      if (adminCount <= 1) {
        alert("Không thể xóa Admin duy nhất của hệ thống!");
        return;
      }
    }

    if (confirm(`Bạn có chắc chắn muốn xóa tài khoản ${userToDelete?.username}?`)) {
      await db.users.delete(id);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-200">
        <div>
          <h2 className="text-xl font-bold text-gray-800">Quản lý Tài khoản (Users)</h2>
          <p className="text-sm text-gray-500">Thêm, sửa, xóa và phân quyền người dùng</p>
        </div>
        <button 
          onClick={openAddModal}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium flex items-center space-x-2 transition-colors"
        >
          <Plus size={18} />
          <span>Tạo tài khoản</span>
        </button>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tài khoản</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mật khẩu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quyền hạn (Role)</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">#{user.id}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">••••••••</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`px-2 py-1 inline-flex text-xs leading-5 font-semibold rounded-full 
                      ${user.role === 'ADMIN' ? 'bg-red-100 text-red-800' : 
                        user.role === 'KETOAN' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                    <button onClick={() => openEditModal(user)} className="text-blue-600 hover:text-blue-900">
                      <Pencil size={18} />
                    </button>
                    <button onClick={() => handleDelete(user.id!)} className="text-red-600 hover:text-red-900">
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Thêm/Sửa */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-gray-200">
              <h3 className="text-lg font-bold text-gray-800">{editingId ? 'Sửa Tài khoản' : 'Tạo Tài khoản mới'}</h3>
              <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                <X size={24} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-4 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên Đăng nhập</label>
                <input 
                  type="text" 
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  placeholder="Ví dụ: ketoan1"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
                <input 
                  type="text" 
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500" 
                  placeholder="Nhập mật khẩu"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phân quyền (Role)</label>
                <select 
                  value={role}
                  onChange={e => setRole(e.target.value as any)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ADMIN">Quản trị viên / Giám đốc (Toàn quyền)</option>
                  <option value="KETOAN">Kế toán (Lập Báo giá, Quỹ, Tồn kho)</option>
                  <option value="VIEWER">Nhân viên (Chỉ xem và lập Báo giá)</option>
                </select>
              </div>

              <div className="pt-4 flex justify-end space-x-3">
                <button 
                  type="button" 
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 font-medium"
                >
                  Hủy
                </button>
                <button 
                  type="submit" 
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 font-medium"
                >
                  Lưu Tài Khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
