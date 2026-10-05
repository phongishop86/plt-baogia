import { FileCheck, AlertCircle } from 'lucide-react';

export default function InvoiceReconciliation() {
  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 text-center py-16">
        <div className="bg-purple-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-4">
          <FileCheck size={40} className="text-purple-600" />
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">Chấm Hoá Đơn Điện Tử</h2>
        <p className="text-gray-600 max-w-lg mx-auto mb-8">
          Tính năng đối soát hoá đơn (XML/Excel) tải về từ hệ thống Thuế điện tử với dữ liệu chứng từ Mua vào/Bán ra đang được phát triển.
        </p>
        
        <div className="inline-flex items-center space-x-2 text-amber-700 bg-amber-50 px-4 py-2 rounded-lg border border-amber-200">
          <AlertCircle size={20} />
          <span className="font-medium">Coming soon in the next update!</span>
        </div>
      </div>
    </div>
  );
}
