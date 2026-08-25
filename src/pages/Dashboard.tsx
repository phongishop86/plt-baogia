import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Users, FileText, Box, TrendingUp, TrendingDown, DollarSign, ArrowLeft } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, ComposedChart } from 'recharts';

type DetailView = 'CUSTOMERS' | 'PRODUCTS' | 'DOCUMENTS' | 'REVENUE' | 'COST' | 'RECEIVABLES' | 'PAYABLES' | 'PROFIT' | null;

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d', '#ffc658'];

export default function Dashboard() {
  const [detailView, setDetailView] = useState<DetailView>(null);
  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const stats = useLiveQuery(async () => {
    const customers = await db.customers.toArray();
    const products = await db.products.toArray();
    const documents = await db.documents.toArray();
    
    // Đính kèm thông tin khách hàng vào document để hiển thị chi tiết
    for (const doc of documents) {
      const customer = customers.find(c => c.id === doc.customerId);
      (doc as any).customerName = customer ? customer.name : 'Unknown';
    }
    
    let revenue = 0;
    let cost = 0;
    let receivables = 0; 
    let payables = 0; 

    const monthlyStats: Record<string, { month: string, revenue: number, cost: number }> = {};
    
    documents.forEach(doc => {
      const m = new Date(doc.date).toISOString().slice(0, 7);
      if (!monthlyStats[m]) monthlyStats[m] = { month: m, revenue: 0, cost: 0 };

      if (doc.type === 'OUTPUT_INVOICE') {
        revenue += doc.subTotal;
        monthlyStats[m].revenue += doc.subTotal;
        if (!doc.paymentDate) {
          receivables += doc.total; 
        }
      } else if (doc.type === 'INPUT_INVOICE') {
        cost += doc.subTotal;
        monthlyStats[m].cost += doc.subTotal;
        if (!doc.paymentDate) {
          payables += doc.total; 
        }
      }
    });

    const profitChartData = Object.values(monthlyStats)
      .map(m => ({ ...m, profit: m.revenue - m.cost }))
      .sort((a,b) => a.month.localeCompare(b.month));

    const profit = revenue - cost;

    return { 
      customers, 
      products, 
      documents, 
      revenue, 
      cost, 
      profit, 
      receivables, 
      payables,
      unpaidOutputs: documents.filter(d => d.type === 'OUTPUT_INVOICE' && !d.paymentDate),
      unpaidInputs: documents.filter(d => d.type === 'INPUT_INVOICE' && !d.paymentDate),
      outputs: documents.filter(d => d.type === 'OUTPUT_INVOICE'),
      inputs: documents.filter(d => d.type === 'INPUT_INVOICE'),
      profitChartData
    };
  });

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);

  if (!stats) return <div className="p-8 text-center text-gray-500">Đang tải dữ liệu...</div>;

  if (detailView) {
    let title = '';
    let data: any[] = [];
    let columns: { header: string, render: (item: any) => React.ReactNode, sortValue?: (item: any) => any }[] = [];
    let chartElement: React.ReactNode = null;

    switch (detailView) {
      case 'CUSTOMERS':
        title = 'Chi tiết Khách hàng / Đối tác';
        
        // Tính toán Tổng tiền khách mua (Doanh thu của PLT) và Tổng tiền khách bán (Chi phí của PLT)
        const customerStats: Record<number, { totalBought: number, totalSold: number }> = {};
        stats.customers.forEach(c => {
          if (c.id) customerStats[c.id] = { totalBought: 0, totalSold: 0 };
        });

        stats.documents.forEach(doc => {
          if (doc.customerId && customerStats[doc.customerId]) {
            if (doc.type === 'OUTPUT_INVOICE') {
              customerStats[doc.customerId].totalBought += doc.total;
            } else if (doc.type === 'INPUT_INVOICE') {
              customerStats[doc.customerId].totalSold += doc.total;
            }
          }
        });

        const enhancedCustomerData = stats.customers.map(c => ({
          ...c,
          totalBought: c.id ? customerStats[c.id].totalBought : 0, // Tiền khách mua từ PLT
          totalSold: c.id ? customerStats[c.id].totalSold : 0,     // Tiền PLT mua từ khách (NCC)
          totalTransaction: c.id ? (customerStats[c.id].totalBought + customerStats[c.id].totalSold) : 0
        }));

        data = enhancedCustomerData;

        const supplierCount = data.filter(c => c.isSupplier).length;
        const buyerCount = data.length - supplierCount;
        const pieData = [
          { name: 'Khách mua hàng', value: buyerCount },
          { name: 'Nhà cung cấp', value: supplierCount }
        ];

        const topCustomers = [...enhancedCustomerData]
          .sort((a,b) => b.totalTransaction - a.totalTransaction)
          .slice(0, 10);

        chartElement = (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="h-72">
              <h4 className="text-center font-medium text-gray-600 mb-2">Phân bổ Nhóm đối tác</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" labelLine={false} label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`} outerRadius={80} fill="#8884d8" dataKey="value">
                    {pieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <h4 className="text-center font-medium text-blue-700 mb-2">Top 10 Đối tác Giao dịch nhiều nhất (VNĐ)</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topCustomers} layout="vertical" margin={{ left: 50, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(val) => `${val/1000000}tr`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="totalTransaction" name="Tổng giao dịch" fill="#3b82f6" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

        columns = [
          { header: 'Tên KH / Đối tác', render: (i) => i.name, sortValue: (i) => i.name },
          { header: 'Loại', render: (i) => <span className={`px-2 py-1 text-xs rounded-full ${i.isSupplier ? 'bg-orange-100 text-orange-800' : 'bg-blue-100 text-blue-800'}`}>{i.isSupplier ? 'Nhà cung cấp' : 'Khách mua hàng'}</span>, sortValue: (i) => i.isSupplier ? 1 : 0 },
          { header: 'Khách mua của PLT', render: (i) => <span className="text-green-700 font-medium">{formatCurrency(i.totalBought)}</span>, sortValue: (i) => i.totalBought },
          { header: 'PLT nhập từ khách', render: (i) => <span className="text-red-600 font-medium">{formatCurrency(i.totalSold)}</span>, sortValue: (i) => i.totalSold },
        ];
        break;
      case 'PRODUCTS':
        title = 'Phân tích Tồn kho & Sản phẩm';
        data = stats.products;
        
        // Nhóm theo Danh mục (category)
        const categoryMap: Record<string, { name: string, totalValue: number, count: number }> = {};
        data.forEach(p => {
          const cat = p.category || (p.type === 'SERVICE' ? 'Dịch vụ' : 'Chưa phân loại');
          if (!categoryMap[cat]) categoryMap[cat] = { name: cat, totalValue: 0, count: 0 };
          categoryMap[cat].totalValue += (p.stock || 0) * p.unitPrice;
          categoryMap[cat].count += 1;
        });
        const categoryPieData = Object.values(categoryMap).sort((a,b) => b.totalValue - a.totalValue);

        const topByValue = [...data]
          .filter(p => p.type !== 'SERVICE')
          .map(p => ({ ...p, totalValue: (p.stock||0) * p.unitPrice }))
          .sort((a,b) => b.totalValue - a.totalValue)
          .slice(0, 10);

        chartElement = (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
            <div className="h-72">
              <h4 className="text-center font-medium text-gray-600 mb-2">Tỷ trọng Giá trị Tồn kho theo Nhóm hàng</h4>
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie 
                    data={categoryPieData} 
                    cx="50%" cy="50%" 
                    label={({ name, percent }) => percent > 0.05 ? `${name} (${(percent * 100).toFixed(0)}%)` : ''} 
                    outerRadius={90} 
                    fill="#8884d8" 
                    dataKey="totalValue"
                  >
                    {categoryPieData.map((entry, index) => <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />)}
                  </Pie>
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="h-72">
              <h4 className="text-center font-medium text-gray-600 mb-2">Top 10 Mã hàng có Giá trị Tồn kho lớn nhất</h4>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={topByValue} layout="vertical" margin={{ left: 50, right: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" tickFormatter={(val) => `${val/1000000}tr`} />
                  <YAxis dataKey="name" type="category" width={100} tick={{fontSize: 10}} />
                  <Tooltip formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="totalValue" name="Giá trị" fill="#82ca9d" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        );

        columns = [
          { header: 'Tên Sản phẩm', render: (i) => i.name, sortValue: (i) => i.name },
          { header: 'Nhóm hàng', render: (i) => <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded-md text-xs">{i.category || (i.type === 'SERVICE' ? 'Dịch vụ' : 'Chưa phân loại')}</span>, sortValue: (i) => i.category || '' },
          { header: 'Tồn kho', render: (i) => i.stock, sortValue: (i) => i.stock || 0 },
          { header: 'Giá bán', render: (i) => formatCurrency(i.unitPrice), sortValue: (i) => i.unitPrice },
          { header: 'Giá trị ước tính', render: (i) => formatCurrency((i.stock||0) * i.unitPrice), sortValue: (i) => (i.stock||0) * i.unitPrice },
        ];
        break;
      case 'RECEIVABLES':
        title = 'Phân tích Công nợ Phải thu (Khách nợ)';
        data = stats.unpaidOutputs;
        
        const debtMap: Record<string, number> = {};
        data.forEach(doc => {
          debtMap[doc.customerName] = (debtMap[doc.customerName] || 0) + doc.total;
        });
        const debtChartData = Object.entries(debtMap).map(([name, debt]) => ({ name, debt })).sort((a,b) => b.debt - a.debt).slice(0, 10);

        chartElement = (
          <div className="h-80 mb-8">
            <h4 className="text-center font-medium text-red-600 mb-2">Top 10 Khách hàng nợ đọng cao nhất CẦN LÀM VIỆC</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={debtChartData} margin={{ bottom: 50 }}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} tick={{fontSize: 11}} />
                <YAxis tickFormatter={(val) => `${val/1000000}tr`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="debt" name="Số tiền nợ" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber, sortValue: (i) => i.docNumber },
          { header: 'Khách nợ', render: (i) => <span className="font-medium">{i.customerName}</span>, sortValue: (i) => i.customerName },
          { header: 'Ngày xuất HĐ', render: (i) => new Date(i.date).toLocaleDateString('vi-VN'), sortValue: (i) => new Date(i.date).getTime() },
          { header: 'Số tiền nợ', render: (i) => <span className="font-bold text-red-600">{formatCurrency(i.total)}</span>, sortValue: (i) => i.total },
        ];
        break;
      case 'PROFIT':
        title = 'Phân tích Dòng tiền & Lợi nhuận theo tháng';
        data = stats.documents; // Table will show all docs, but chart groups them

        chartElement = (
          <div className="h-80 mb-8">
            <h4 className="text-center font-medium text-blue-800 mb-2">Biểu đồ Lợi nhuận (Doanh thu trừ Chi phí Hóa đơn)</h4>
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={stats.profitChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `${val/1000000}tr`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" name="Doanh thu" fill="#3b82f6" opacity={0.8} />
                <Bar dataKey="cost" name="Chi phí" fill="#ef4444" opacity={0.8} />
                <Line type="monotone" dataKey="profit" name="Lợi nhuận" stroke="#10b981" strokeWidth={3} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        );

        columns = [
          { header: 'Số CT', render: (i) => i.docNumber, sortValue: (i) => i.docNumber },
          { header: 'Loại', render: (i) => i.type === 'OUTPUT_INVOICE' ? 'Bán ra' : (i.type === 'INPUT_INVOICE' ? 'Mua vào' : i.type), sortValue: (i) => i.type },
          { header: 'Ngày', render: (i) => new Date(i.date).toLocaleDateString('vi-VN'), sortValue: (i) => new Date(i.date).getTime() },
          { header: 'Tiền hàng', render: (i) => formatCurrency(i.subTotal), sortValue: (i) => i.subTotal },
        ];
        break;
      case 'DOCUMENTS':
        title = 'Danh sách toàn bộ Chứng từ';
        data = stats.documents;
        columns = [
          { header: 'Số CT', render: (i) => i.docNumber, sortValue: (i) => i.docNumber },
          { header: 'Khách hàng', render: (i) => i.customerName, sortValue: (i) => i.customerName },
          { header: 'Loại', render: (i) => i.type === 'OUTPUT_INVOICE' ? 'Bán ra' : (i.type === 'INPUT_INVOICE' ? 'Mua vào' : 'Báo giá'), sortValue: (i) => i.type },
          { header: 'Tổng tiền', render: (i) => formatCurrency(i.total), sortValue: (i) => i.total },
        ];
        break;
      case 'REVENUE':
        title = 'Phân tích Doanh thu bán ra theo tháng';
        data = stats.outputs;
        
        chartElement = (
          <div className="h-72 mb-8">
            <h4 className="text-center font-medium text-green-700 mb-2">Biểu đồ Tổng doanh thu Hóa đơn bán ra</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.profitChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `${val/1000000}tr`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="revenue" name="Doanh thu" fill="#10b981" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber, sortValue: (i) => i.docNumber },
          { header: 'Khách hàng', render: (i) => i.customerName, sortValue: (i) => i.customerName },
          { header: 'Ngày', render: (i) => new Date(i.date).toLocaleDateString('vi-VN'), sortValue: (i) => new Date(i.date).getTime() },
          { header: 'Tiền hàng', render: (i) => formatCurrency(i.subTotal), sortValue: (i) => i.subTotal },
        ];
        break;
      case 'COST':
        title = 'Phân tích Chi phí mua vào theo tháng';
        data = stats.inputs;

        chartElement = (
          <div className="h-72 mb-8">
            <h4 className="text-center font-medium text-red-600 mb-2">Biểu đồ Tổng chi phí Hóa đơn mua vào</h4>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={stats.profitChartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis tickFormatter={(val) => `${val/1000000}tr`} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
                <Bar dataKey="cost" name="Chi phí" fill="#ef4444" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        );

        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber, sortValue: (i) => i.docNumber },
          { header: 'Nhà cung cấp', render: (i) => i.customerName, sortValue: (i) => i.customerName },
          { header: 'Ngày', render: (i) => new Date(i.date).toLocaleDateString('vi-VN'), sortValue: (i) => new Date(i.date).getTime() },
          { header: 'Tiền hàng', render: (i) => formatCurrency(i.subTotal), sortValue: (i) => i.subTotal },
        ];
        break;
      case 'PAYABLES':
        title = 'Chi tiết Phải trả (Nợ NCC)';
        data = stats.unpaidInputs;
        columns = [
          { header: 'Số Hóa đơn', render: (i) => i.docNumber, sortValue: (i) => i.docNumber },
          { header: 'Nhà cung cấp', render: (i) => i.customerName, sortValue: (i) => i.customerName },
          { header: 'Ngày nhận HĐ', render: (i) => new Date(i.date).toLocaleDateString('vi-VN'), sortValue: (i) => new Date(i.date).getTime() },
          { header: 'Số tiền nợ', render: (i) => <span className="font-bold text-orange-600">{formatCurrency(i.total)}</span>, sortValue: (i) => i.total },
        ];
        break;
    }

    // Logic Sort Data
    let sortedData = [...data];
    if (sortConfig) {
      const column = columns.find(c => c.header === sortConfig.key);
      if (column && column.sortValue) {
        sortedData.sort((a, b) => {
          const valA = column.sortValue!(a);
          const valB = column.sortValue!(b);
          if (valA < valB) return sortConfig.direction === 'asc' ? -1 : 1;
          if (valA > valB) return sortConfig.direction === 'asc' ? 1 : -1;
          return 0;
        });
      }
    }

    const handleSort = (key: string) => {
      let direction: 'asc' | 'desc' = 'asc';
      if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
        direction = 'desc';
      }
      setSortConfig({ key, direction });
    };

    return (
      <div className="bg-white rounded-xl shadow-sm border p-6">
        <button 
          onClick={() => { setDetailView(null); setSortConfig(null); }}
          className="flex items-center space-x-2 text-gray-600 hover:text-blue-600 mb-6 bg-gray-50 hover:bg-blue-50 px-4 py-2 rounded-lg transition-colors w-max"
        >
          <ArrowLeft size={20} />
          <span className="font-medium">Quay lại Tổng quan</span>
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{title}</h2>
        
        {chartElement}

        <div className="overflow-x-auto border-t pt-4">
          <h4 className="text-md font-medium text-gray-700 mb-4">Bảng dữ liệu chi tiết</h4>
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                {columns.map((col, idx) => (
                  <th 
                    key={idx} 
                    className={`px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase ${col.sortValue ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}
                    onClick={() => col.sortValue && handleSort(col.header)}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{col.header}</span>
                      {col.sortValue && (
                        <span className="text-gray-400">
                          {sortConfig?.key === col.header 
                            ? (sortConfig.direction === 'asc' ? '↑' : '↓') 
                            : '↕'}
                        </span>
                      )}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {sortedData.map((item, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-gray-50">
                  {columns.map((col, colIdx) => (
                    <td key={colIdx} className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {col.render(item)}
                    </td>
                  ))}
                </tr>
              ))}
              {sortedData.length === 0 && (
                <tr>
                  <td colSpan={columns.length} className="px-6 py-8 text-center text-gray-500">
                    Không có dữ liệu
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-800">Tổng quan hệ thống</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard onClick={() => setDetailView('CUSTOMERS')} title="Khách hàng / Đối tác" value={stats.customers.length.toString()} icon={<Users size={24} className="text-blue-500" />} />
        <StatCard onClick={() => setDetailView('PRODUCTS')} title="Sản phẩm" value={stats.products.length.toString()} icon={<Box size={24} className="text-purple-500" />} />
        <StatCard onClick={() => setDetailView('DOCUMENTS')} title="Tổng số Chứng từ" value={stats.documents.length.toString()} icon={<FileText size={24} className="text-gray-500" />} />
      </div>
      
      <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-4 border-b pb-2">Tài chính (Tạm tính)</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatCard 
          onClick={() => setDetailView('REVENUE')}
          title="Tổng Doanh thu (Bán ra)" 
          value={formatCurrency(stats.revenue)} 
          icon={<TrendingUp size={24} className="text-green-500" />} 
          bgColor="bg-green-50"
        />
        <StatCard 
          onClick={() => setDetailView('COST')}
          title="Tổng Chi phí (Mua vào)" 
          value={formatCurrency(stats.cost)} 
          icon={<TrendingDown size={24} className="text-red-500" />} 
          bgColor="bg-red-50"
        />
        <StatCard 
          onClick={() => setDetailView('PROFIT')}
          title="Lợi nhuận tạm tính" 
          value={formatCurrency(stats.profit)} 
          icon={<DollarSign size={24} className={stats.profit >= 0 ? "text-blue-600" : "text-red-600"} />} 
          bgColor={stats.profit >= 0 ? "bg-blue-50" : "bg-red-50"}
        />
      </div>

      <h3 className="text-lg font-semibold text-gray-800 mt-8 mb-4 border-b pb-2">Công nợ (Dựa trên hóa đơn)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <StatCard 
          onClick={() => setDetailView('RECEIVABLES')}
          title="Phải thu của khách (Nợ đọng)" 
          value={formatCurrency(stats.receivables)} 
          icon={<Users size={24} className="text-amber-600" />} 
          bgColor="bg-amber-50"
        />
        <StatCard 
          onClick={() => setDetailView('PAYABLES')}
          title="Phải trả nhà cung cấp" 
          value={formatCurrency(stats.payables)} 
          icon={<Box size={24} className="text-orange-600" />} 
          bgColor="bg-orange-50"
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, bgColor = "bg-gray-50", onClick }: { title: string, value: string, icon: React.ReactNode, bgColor?: string, onClick?: () => void }) {
  return (
    <div 
      onClick={onClick}
      className={`bg-white p-6 rounded-xl border border-gray-200 shadow-sm flex items-center space-x-4 ${onClick ? 'cursor-pointer hover:shadow-md hover:border-blue-300 transition-all' : ''}`}
    >
      <div className={`p-4 rounded-xl ${bgColor}`}>
        {icon}
      </div>
      <div>
        <p className="text-sm text-gray-500 font-medium">{title}</p>
        <p className="text-xl font-bold text-gray-900 mt-1">{value}</p>
      </div>
    </div>
  );
}
