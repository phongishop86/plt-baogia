import React, { useState } from 'react';
import { Upload, FileSpreadsheet,  } from 'lucide-react';
import ExcelJS from 'exceljs';

export default function BankReconciliation() {
  const [file, setFile] = useState<File | null>(null);
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;
    setFile(uploadedFile);
    setLoading(true);

    try {
      const workbook = new ExcelJS.Workbook();
      await workbook.xlsx.load(await uploadedFile.arrayBuffer());
      const worksheet = workbook.worksheets[0];
      
      const rows: any[] = [];
      worksheet.eachRow((row, rowNumber) => {
        // Skip header rows if needed
        if (rowNumber > 1) {
          rows.push(row.values);
        }
      });
      
      setData(rows);
    } catch (error) {
      console.error('Error reading Excel file', error);
      alert('Không thể đọc file Excel. Vui lòng kiểm tra lại định dạng file!');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
        <h2 className="text-lg font-bold text-gray-800 mb-4">Chấm sao kê tài khoản ngân hàng</h2>
        <p className="text-gray-600 mb-6">Tải lên file Excel sao kê từ VietinBank hoặc Vietcombank để đối soát với các chứng từ (Bán ra / Mua vào).</p>
        
        <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:bg-gray-50 transition-colors cursor-pointer relative">
          <input 
            type="file" 
            accept=".xlsx, .xls" 
            onChange={handleFileUpload}
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          />
          <div className="flex flex-col items-center space-y-3">
            <div className="p-4 bg-blue-50 text-blue-600 rounded-full">
              <Upload size={32} />
            </div>
            <div>
              <p className="font-semibold text-gray-700">Kéo thả hoặc click để chọn file Excel sao kê</p>
              <p className="text-sm text-gray-500 mt-1">Hỗ trợ định dạng .xlsx, .xls từ VietinBank & Vietcombank</p>
            </div>
          </div>
        </div>

        {file && (
          <div className="mt-4 flex items-center space-x-2 text-sm text-green-700 bg-green-50 p-3 rounded-lg border border-green-100">
            <FileSpreadsheet size={18} />
            <span className="font-medium">Đã chọn file: {file.name}</span>
          </div>
        )}
      </div>

      {loading && (
        <div className="text-center p-8 text-gray-500">
          Đang đọc dữ liệu...
        </div>
      )}

      {data.length > 0 && !loading && (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg font-bold text-gray-800">Kết quả nạp dữ liệu ({data.length} dòng)</h3>
            <button className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700">
              Tiến hành tự động đối soát (Sắp ra mắt)
            </button>
          </div>
          
          <div className="overflow-x-auto rounded-lg border border-gray-200">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cột 1</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cột 2</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cột 3</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cột 4</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cột 5</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.slice(0, 10).map((row, idx) => (
                  <tr key={idx} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row[1] || ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row[2] || ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row[3] || ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row[4] || ''}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{row[5] || ''}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="text-sm text-gray-500 mt-4 italic">* Đang hiển thị 10 dòng đầu tiên. Tính năng ghép cặp với chứng từ đang được phát triển.</p>
        </div>
      )}
    </div>
  );
}
