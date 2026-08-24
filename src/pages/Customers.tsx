import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';

export default function Customers() {
  const customers = useLiveQuery(() => db.customers.toArray());

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tên Khách Hàng</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Mã Số Thuế</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Địa chỉ</th>
            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Số ĐT</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {customers?.map((customer) => (
            <tr key={customer.id}>
              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{customer.name}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.taxCode}</td>
              <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-xs">{customer.address}</td>
              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{customer.phone}</td>
            </tr>
          ))}
          {customers?.length === 0 && (
            <tr>
              <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">Chưa có khách hàng nào</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
