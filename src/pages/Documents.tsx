import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
// formatCurrency is removed to avoid unused error

export default function Documents() {
  const documents = useLiveQuery(async () => {
    const docs = await db.documents.toArray();
    // join customers manually
    return Promise.all(docs.map(async (doc) => {
      const customer = await db.customers.get(doc.customerId);
      return { ...doc, customer };
    }));
  });

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const exportDocx = (doc: any) => {
    // Generate doc using template
    console.log("Exporting doc:", doc);
    alert('Tính năng xuất Word đang được hoàn thiện. Vui lòng thêm template vào public/templates/baogia.docx');
  }

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số HĐ/CT</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ngày</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Khách hàng</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tổng tiền</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Hành động</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {documents?.map((doc) => (
            <tr key={doc.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{doc.docNumber}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{doc.type}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{new Date(doc.date).toLocaleDateString('vi-VN')}</td>
              <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{doc.customer?.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{formatNumber(doc.total)}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                <button 
                  className="text-blue-600 hover:text-blue-900"
                  onClick={() => exportDocx(doc)}
                >
                  Xuất Word
                </button>
              </td>
            </tr>
          ))}
          {documents?.length === 0 && (
            <tr>
              <td colSpan={6} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có chứng từ nào</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
