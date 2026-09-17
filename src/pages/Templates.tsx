import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Upload, Download, FileText, Trash2, Info } from 'lucide-react';
import { saveAs } from 'file-saver';

const TEMPLATE_TYPES = [
  { id: 'QUOTATION', name: 'Báo giá (Word)' },
  { id: 'CONTRACT_PERSONNEL', name: 'Hợp đồng nhân sự / Giao khoán' },
  { id: 'PAYMENT_REQUEST', name: 'Đề nghị thanh toán' },
  { id: 'HANDOVER', name: 'Biên bản bàn giao' },
  { id: 'MAINTENANCE_RECORD', name: 'Biên bản bảo trì' },
  { id: 'GENERAL_DOCUMENT', name: 'Văn bản chung khác' }
];

export default function Templates() {
  const templates = useLiveQuery(() => db.templates.toArray());
  const [loading, setLoading] = useState(false);
  const [selectedType, setSelectedType] = useState<string>('CONTRACT_PERSONNEL');

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.docx')) {
      alert('Vui lòng chọn file Word (.docx)');
      return;
    }

    setLoading(true);
    try {
      const arrayBuffer = await file.arrayBuffer();
      
      await db.templates.put({
        id: selectedType,
        fileName: file.name,
        fileData: arrayBuffer,
        updatedAt: new Date()
      });
      
      alert('Tải biểu mẫu lên thành công!');
    } catch (err: any) {
      console.error('Error uploading template:', err);
      alert('Lỗi khi tải biểu mẫu: ' + err.message);
    } finally {
      setLoading(false);
      event.target.value = ''; // Reset input
    }
  };

  const handleDownload = (template: any) => {
    const blob = new Blob([template.fileData], { type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    saveAs(blob, template.fileName || `Template_${template.id}.docx`);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bạn có chắc chắn muốn xóa biểu mẫu này không? Hệ thống sẽ không thể xuất Word cho loại tài liệu này cho đến khi bạn tải biểu mẫu mới lên.')) {
      await db.templates.delete(id);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6 mt-8">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-xl font-bold text-gray-900">Quản lý biểu mẫu (Templates)</h2>
          <p className="text-gray-500 mt-1">Tải lên các biểu mẫu Word (.docx) để hệ thống tự động điền dữ liệu khi Xuất file.</p>
        </div>

        <div className="p-6 bg-gray-50 border-b border-gray-200">
          <div className="flex flex-col md:flex-row gap-4 items-end">
            <div className="flex-1 w-full">
              <label className="block text-sm font-medium text-gray-700 mb-1">Loại biểu mẫu</label>
              <select 
                value={selectedType}
                onChange={(e) => setSelectedType(e.target.value)}
                className="w-full px-4 py-2 bg-white border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
              >
                {TEMPLATE_TYPES.map(t => (
                  <option key={t.id} value={t.id}>{t.name} ({t.id})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="cursor-pointer bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-md transition-colors font-medium flex items-center space-x-2 h-[42px]">
                <Upload size={18} />
                <span>{loading ? 'Đang tải...' : 'Tải biểu mẫu lên'}</span>
                <input 
                  type="file" 
                  accept=".docx" 
                  className="hidden" 
                  onChange={handleFileUpload} 
                  disabled={loading} 
                />
              </label>
            </div>
          </div>
          
          <div className="mt-4 flex items-start space-x-2 text-sm text-amber-700 bg-amber-50 p-3 rounded-md border border-amber-200">
            <Info size={18} className="shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold">Hướng dẫn trộn dữ liệu (docxtemplater):</p>
              <p>Trong file Word, sử dụng cú pháp <code>{'{'}ten_truong{'}'}</code> để hệ thống điền dữ liệu. Ví dụ: <code>{'{'}fullName{'}'}</code>, <code>{'{'}date{'}'}</code>.</p>
              <p>Đối với bảng dữ liệu, sử dụng <code>{'{'}#items{'}'}</code> để bắt đầu dòng và <code>{'{'}/items{'}'}</code> để kết thúc dòng lặp.</p>
            </div>
          </div>
        </div>

        <div>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-white">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại biểu mẫu</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên file</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cập nhật lần cuối</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {!templates || templates.filter(t => TEMPLATE_TYPES.some(type => type.id === t.id)).length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-10 text-center text-gray-500">
                    Chưa có biểu mẫu nào được tải lên hệ thống.
                  </td>
                </tr>
              ) : (
                TEMPLATE_TYPES.map(type => {
                  const template = templates.find(t => t.id === type.id);
                  if (!template) return null;
                  
                  return (
                    <tr key={type.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="font-medium text-gray-900">{type.name}</div>
                        <div className="text-xs text-gray-500">{type.id}</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center space-x-2 text-blue-600">
                          <FileText size={16} />
                          <span className="font-medium text-sm">{template.fileName}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {template.updatedAt ? new Date(template.updatedAt).toLocaleString('vi-VN') : 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-3">
                        <button 
                          onClick={() => handleDownload(template)}
                          className="text-indigo-600 hover:text-indigo-900 transition-colors inline-flex items-center space-x-1"
                          title="Tải về máy"
                        >
                          <Download size={16} />
                          <span>Tải về</span>
                        </button>
                        <button 
                          onClick={() => handleDelete(template.id)}
                          className="text-red-600 hover:text-red-900 transition-colors inline-flex items-center space-x-1"
                          title="Xóa biểu mẫu"
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
