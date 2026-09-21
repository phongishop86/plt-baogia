import { useState, useRef } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User, type LegalDoc } from '../db/db';
import { Folder, Upload, Trash2, FileText, Download } from 'lucide-react';

interface LegalDocsProps {
  currentUser: User | null;
}

export default function LegalDocs({ currentUser }: LegalDocsProps) {
  const isAdmin = currentUser?.role === 'ADMIN';
  const docs = useLiveQuery(() => db.legalDocs.toArray());

  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Đăng ký kinh doanh');
  const [newCategory, setNewCategory] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const categories = Array.from(new Set(docs?.map(d => d.category) || []));
  if (!categories.includes('Đăng ký kinh doanh')) categories.push('Đăng ký kinh doanh');
  if (!categories.includes('Hồ sơ năng lực')) categories.push('Hồ sơ năng lực');
  if (!categories.includes('Thuế')) categories.push('Thuế');
  if (!categories.includes('Khác')) categories.push('Khác');

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!title) {
      alert("Vui lòng nhập tên tài liệu trước khi chọn file!");
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async (event) => {
      if (event.target?.result) {
        const fileData = event.target.result as ArrayBuffer;
        
        await db.legalDocs.add({
          title,
          category: category === 'NEW' ? newCategory : category,
          fileName: file.name,
          fileType: file.type || 'application/octet-stream',
          fileData,
          updatedAt: new Date()
        });

        setIsUploadModalOpen(false);
        setTitle('');
        setNewCategory('');
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const handleDelete = async (id: number) => {
    if (window.confirm('Bạn có chắc chắn muốn xóa tài liệu này?')) {
      await db.legalDocs.delete(id);
    }
  };

  const handleDownload = (doc: LegalDoc) => {
    const blob = new Blob([doc.fileData], { type: doc.fileType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = doc.fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Group docs by category
  const groupedDocs = docs?.reduce((acc, doc) => {
    if (!acc[doc.category]) acc[doc.category] = [];
    acc[doc.category].push(doc);
    return acc;
  }, {} as Record<string, LegalDoc[]>) || {};

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center space-x-3">
          <div className="bg-indigo-100 p-2 rounded-lg">
            <Folder className="text-indigo-600" size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-800">Hồ sơ pháp lý</h1>
            <p className="text-sm text-gray-500">Lưu trữ các giấy tờ quan trọng của công ty</p>
          </div>
        </div>
        
        {isAdmin && (
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="flex items-center space-x-2 bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-md font-medium transition-colors"
          >
            <Upload size={18} />
            <span>Tải tài liệu lên</span>
          </button>
        )}
      </div>

      {Object.keys(groupedDocs).length === 0 ? (
        <div className="text-center py-12 bg-white rounded-xl shadow-sm border border-gray-200">
          <Folder className="mx-auto text-gray-300 mb-3" size={48} />
          <p className="text-gray-500">Chưa có tài liệu pháp lý nào được tải lên.</p>
        </div>
      ) : (
        <div className="space-y-8">
          {Object.entries(groupedDocs).map(([cat, items]) => (
            <div key={cat} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
                <h2 className="text-lg font-bold text-gray-800 flex items-center">
                  <Folder className="mr-2 text-indigo-500" size={20} /> {cat}
                </h2>
              </div>
              <ul className="divide-y divide-gray-200">
                {items.map(doc => (
                  <li key={doc.id} className="p-6 hover:bg-gray-50 transition-colors flex items-center justify-between">
                    <div className="flex items-start space-x-4">
                      <div className="bg-blue-50 p-3 rounded-lg text-blue-500">
                        <FileText size={24} />
                      </div>
                      <div>
                        <h3 className="text-base font-semibold text-gray-800">{doc.title}</h3>
                        <p className="text-sm text-gray-500 mt-1">
                          File: {doc.fileName} • Cập nhật: {doc.updatedAt.toLocaleDateString('vi-VN')}
                        </p>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-3">
                      <button
                        onClick={() => handleDownload(doc)}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-md font-medium transition-colors"
                      >
                        <Download size={16} />
                        <span>Tải về</span>
                      </button>
                      
                      {isAdmin && (
                        <button
                          onClick={() => handleDelete(doc.id!)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-md transition-colors"
                          title="Xóa tài liệu"
                        >
                          <Trash2 size={18} />
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
              <h2 className="text-lg font-bold text-gray-800">Tải lên tài liệu pháp lý</h2>
              <button onClick={() => setIsUploadModalOpen(false)} className="text-gray-500 hover:text-gray-700">
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Tên tài liệu / Mô tả ngắn</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-indigo-500 focus:border-indigo-500"
                  placeholder="VD: Giấy phép ĐKKD 2024"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-indigo-500 focus:border-indigo-500"
                >
                  {categories.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                  <option value="NEW">+ Thêm danh mục mới</option>
                </select>
              </div>

              {category === 'NEW' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Tên danh mục mới</label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    className="w-full border-gray-300 rounded-md shadow-sm border p-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Nhập danh mục..."
                  />
                </div>
              )}

              <div className="pt-2">
                <label className="block text-sm font-medium text-gray-700 mb-2">Chọn File (PDF, Hình ảnh, Word...)</label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
            </div>
            <div className="p-4 border-t bg-gray-50 flex justify-end">
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="px-4 py-2 text-gray-600 hover:bg-gray-100 rounded-md font-medium"
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
