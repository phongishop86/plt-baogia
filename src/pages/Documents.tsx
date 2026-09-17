import { useState, useMemo } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, type User } from '../db/db';
import { Filter, Search, TrendingUp, TrendingDown, ChevronUp, ChevronDown, Printer } from 'lucide-react';
import PizZip from 'pizzip';
import Docxtemplater from 'docxtemplater';
import { saveAs } from 'file-saver';
import { formatCurrency } from '../utils/formatCurrency';

interface DocumentsProps {
  setEditingQuotationId?: (id: number) => void;
  currentUser?: User | null;
  mode?: 'DOCUMENTS' | 'QUOTATIONS';
  onNavigate?: (tab: string) => void;
}

export default function Documents({ setEditingQuotationId, currentUser, mode = 'DOCUMENTS', onNavigate }: DocumentsProps) {
  const [previewDoc, setPreviewDoc] = useState<any>(null);
  const [delayedPaymentModal, setDelayedPaymentModal] = useState<{isOpen: boolean, docId: number, days: number}>({isOpen: false, docId: -1, days: 0});
  
  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState(mode === 'QUOTATIONS' ? 'QUOTATION' : 'ALL');
  const [filterPayment, setFilterPayment] = useState('ALL');
  const [filterStatus, setFilterStatus] = useState('ALL');

  const documents = useLiveQuery(async () => {
    const docs = await db.documents.toArray();
    docs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    return Promise.all(docs.map(async (doc) => {
      let customer = null;
      if (doc.customerId) {
        try {
          customer = await db.customers.get(doc.customerId);
        } catch (err) {
          console.warn("Lỗi khi tải thông tin khách hàng:", err);
        }
      }
      return { ...doc, customer };
    }));
  });

  const formatNumber = (val: number) => {
    return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND' }).format(val);
  }

  const exportDocx = () => {
    alert('Tính năng xuất Word đang được hoàn thiện. Tạm thời bạn có thể dùng tính năng Xem chi tiết (Preview).');
  }
  
  const saveDelayedPayment = async () => {
    if (delayedPaymentModal.docId !== -1) {
      await db.documents.update(delayedPaymentModal.docId, {
        delayedPaymentDays: delayedPaymentModal.days
      });
      // Cập nhật previewDoc nếu đang mở
      if (previewDoc && previewDoc.id === delayedPaymentModal.docId) {
        setPreviewDoc({ ...previewDoc, delayedPaymentDays: delayedPaymentModal.days });
      }
      setDelayedPaymentModal({isOpen: false, docId: -1, days: 0});
    }
  }
  const exportDelayedPayment = async () => {
    try {
      const template = await db.templates.get('DELAYED_PAYMENT_REQUEST');
      if (!template) {
        alert("Chưa có biểu mẫu 'Đề nghị thanh toán chậm'! Vui lòng tải biểu mẫu lên ở phần Quản lý biểu mẫu.");
        return;
      }
      
      const customer = await db.customers.get(previewDoc.customerId);
      if (!customer) return;

      const zip = new PizZip(template.fileData);
      const doc = new Docxtemplater(zip, { paragraphLoop: true, linebreaks: true });

      const today = new Date();
      doc.render({
        docNumber: previewDoc.docNumber,
        customerName: customer.name,
        customerAddress: customer.address || '',
        customerTaxCode: customer.taxCode || '',
        delayedPaymentDays: delayedPaymentModal.days,
        subTotal: new Intl.NumberFormat('vi-VN').format(previewDoc.subTotal),
        taxAmount: new Intl.NumberFormat('vi-VN').format(previewDoc.taxAmount),
        total: new Intl.NumberFormat('vi-VN').format(previewDoc.total),
        totalWord: formatCurrency(previewDoc.total).charAt(0).toUpperCase() + formatCurrency(previewDoc.total).slice(1),
        paymentValue: new Intl.NumberFormat('vi-VN').format(previewDoc.total),
        paymentValueWord: formatCurrency(previewDoc.total).charAt(0).toUpperCase() + formatCurrency(previewDoc.total).slice(1),
        notes: previewDoc.notes || '',
        day: today.getDate().toString().padStart(2, '0'),
        month: (today.getMonth() + 1).toString().padStart(2, '0'),
        year: today.getFullYear(),
        items: previewDoc.items.map((item: any, idx: number) => ({
          stt: idx + 1,
          productName: item.productName,
          unit: item.unit,
          quantity: item.quantity,
          unitPrice: new Intl.NumberFormat('vi-VN').format(item.unitPrice),
          amount: new Intl.NumberFormat('vi-VN').format(item.amount)
        }))
      });

      const out = doc.getZip().generate({
        type: 'blob',
        mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      });

      saveAs(out, `DeNghiThanhToanCham_${previewDoc.docNumber}.docx`);
    } catch (err: any) {
      console.error('Export error:', err);
      alert('Lỗi xuất file Word: ' + err.message);
    }
  }


  const handleDelete = async (doc: any) => {
    if (!confirm(`Bạn có chắc muốn xóa chứng từ số ${doc.docNumber}?\n(Hệ thống sẽ tự động tính toán lại tồn kho)`)) {
      return;
    }
    
    // Hoàn lại tồn kho
    for (const item of doc.items) {
      const product = await db.products.where('name').equals(item.productName).first();
      if (product && product.id) {
        let newStock = product.stock || 0;
        if (doc.type === 'INPUT_INVOICE') {
          newStock -= item.quantity;
        } else if (doc.type === 'OUTPUT_INVOICE') {
          newStock += item.quantity;
        }
        await db.products.update(product.id, { stock: newStock });
      }
    }

    await db.documents.delete(doc.id);
  }

  const handleUpdatePaymentStatus = async (id: number, date: Date | null) => {
    await db.documents.update(id, { paymentDate: date || undefined });
    const updatedDoc = await db.documents.get(id);
    if (updatedDoc) {
      const customer = await db.customers.get(updatedDoc.customerId);
      setPreviewDoc({ ...updatedDoc, customer });
    }
  }

  const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>(null);

  const handleSort = (key: string) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  // Lọc dữ liệu
  const filteredDocs = useMemo(() => {
    if (!documents) return [];
    const result = documents.filter(doc => {
      // 1. Search term (by customer name or docNumber)
      const matchesSearch = searchTerm === '' || 
        doc.docNumber?.toLowerCase().includes(searchTerm.toLowerCase()) || 
        doc.customer?.name?.toLowerCase().includes(searchTerm.toLowerCase());
        
      // 2. Filter Type & Mode
      let matchesType = true;
      if (mode === 'QUOTATIONS') {
        matchesType = doc.type === 'QUOTATION';
      } else {
        // mode === DOCUMENTS
        matchesType = doc.type !== 'QUOTATION' && (filterType === 'ALL' || doc.type === filterType);
      }
      
      // 3. Filter Payment / Status
      let matchesPayment = true;
      let matchesStatus = true;
      
      if (mode === 'DOCUMENTS') {
        if (filterPayment === 'PAID') matchesPayment = !!doc.paymentDate;
        if (filterPayment === 'UNPAID') matchesPayment = !doc.paymentDate;
      } else {
        if (filterStatus !== 'ALL') matchesStatus = doc.status === filterStatus;
      }

      return matchesSearch && matchesType && matchesPayment && matchesStatus;
    });

    if (sortConfig !== null) {
      result.sort((a: any, b: any) => {
        let aVal = a[sortConfig.key];
        let bVal = b[sortConfig.key];
        
        if (sortConfig.key === 'customer') {
           aVal = a.customer?.name || '';
           bVal = b.customer?.name || '';
        } else if (sortConfig.key === 'status') {
           aVal = a.paymentDate ? 'PAID' : (a.status || '');
           bVal = b.paymentDate ? 'PAID' : (b.status || '');
        } else if (sortConfig.key === 'date') {
           aVal = new Date(a.date).getTime();
           bVal = new Date(b.date).getTime();
        }

        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    
    return result;
  }, [documents, searchTerm, filterType, filterPayment, sortConfig]);

  // Tính tổng
  const totals = useMemo(() => {
    let receivables = 0; // Phải thu (OUTPUT chưa thanh toán)
    let payables = 0; // Phải trả (INPUT chưa thanh toán)
    
    filteredDocs.forEach(doc => {
      if (doc.status === 'CANCELLED') return;
      if (!doc.paymentDate) {
        if (doc.type === 'OUTPUT_INVOICE') receivables += doc.total;
        if (doc.type === 'INPUT_INVOICE') payables += doc.total;
      }
    });
    return { receivables, payables };
  }, [filteredDocs]);

  return (
    <div className="space-y-6">
      
      {/* Filters and Stats */}
      <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-200">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 print:hidden">
          <div className="flex flex-1 items-center space-x-2 bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
            <Search size={18} className="text-gray-400" />
            <input 
              type="text" 
              placeholder="Tìm theo số HĐ hoặc tên đơn vị..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-transparent border-none outline-none w-full text-sm"
            />
          </div>
          <div className="flex items-center space-x-3">
            {mode === 'DOCUMENTS' ? (
              <>
                <Filter size={18} className="text-gray-500" />
                <select 
                  value={filterType} 
                  onChange={(e) => setFilterType(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả Hóa đơn</option>
                  <option value="INPUT_INVOICE">Mua vào (Chi phí)</option>
                  <option value="OUTPUT_INVOICE">Bán ra (Doanh thu)</option>
                </select>
                <select 
                  value={filterPayment} 
                  onChange={(e) => setFilterPayment(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả trạng thái</option>
                  <option value="PAID">Đã thanh toán</option>
                  <option value="UNPAID">Chưa thanh toán (Công nợ)</option>
                </select>
                <button
                  onClick={() => window.print()}
                  className="bg-emerald-600 text-white px-3 py-2 rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center print:hidden"
                  title="In danh sách chứng từ hiện tại để đối chiếu"
                >
                  <Printer size={16} className="mr-1" /> In Bảng Kê
                </button>
              </>
            ) : (
              <>
                <Filter size={18} className="text-gray-500" />
                <select 
                  value={filterStatus} 
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-2 outline-none focus:ring-1 focus:ring-blue-500"
                >
                  <option value="ALL">Tất cả Trạng thái</option>
                  <option value="DRAFT">Nháp</option>
                  <option value="PENDING">Lưu chờ gửi</option>
                  <option value="SENT">Đã chào giá</option>
                  <option value="COMPLETED">Đã chốt - Đã gửi hàng</option>
                  <option value="CANCELLED">Đã hủy</option>
                </select>
                <button
                  onClick={() => {
                    // Truyền -1 để App.tsx biết là cần clear editing ID
                    if (setEditingQuotationId) setEditingQuotationId(-1);
                    if (onNavigate) onNavigate('create-quote');
                  }}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                >
                  + Lập báo giá
                </button>
              </>
            )}
          </div>
        </div>

        {/* Tổng hợp công nợ hiện tại theo bộ lọc */}
        {mode === 'DOCUMENTS' && (
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="bg-amber-50 rounded-lg p-3 flex items-center space-x-3 border border-amber-100">
              <div className="bg-amber-200 p-2 rounded-full"><TrendingUp size={20} className="text-amber-700"/></div>
              <div>
                <p className="text-xs text-amber-800 font-medium uppercase tracking-wide">Tổng Phải Thu (Chưa thanh toán)</p>
                <p className="text-lg font-bold text-amber-900">{formatNumber(totals.receivables)}</p>
              </div>
            </div>
            <div className="bg-orange-50 rounded-lg p-3 flex items-center space-x-3 border border-orange-100">
              <div className="bg-orange-200 p-2 rounded-full"><TrendingDown size={20} className="text-orange-700"/></div>
              <div>
                <p className="text-xs text-orange-800 font-medium uppercase tracking-wide">Tổng Phải Trả (Chưa thanh toán)</p>
                <p className="text-lg font-bold text-orange-900">{formatNumber(totals.payables)}</p>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="hidden print:block mb-6 text-center font-[Times_New_Roman]">
        <h1 className="text-2xl font-bold uppercase tracking-wider">BẢNG KÊ CHỨNG TỪ</h1>
        <p className="mt-1 italic">{(filterType === 'ALL' ? 'Tất cả hóa đơn' : filterType === 'INPUT_INVOICE' ? 'Mua vào (Chi phí)' : 'Bán ra (Doanh thu)')} - {(filterPayment === 'ALL' ? 'Tất cả trạng thái' : filterPayment === 'PAID' ? 'Đã thanh toán' : 'Chưa thanh toán')}</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-gray-200 print:border-none print:shadow-none overflow-hidden relative">
        <div className="overflow-x-auto print:overflow-visible">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('docNumber')}>
                    <div className="flex items-center space-x-1">
                      <span>Số HĐ/CT</span>
                      {sortConfig?.key === 'docNumber' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('type')}>
                    <div className="flex items-center space-x-1">
                      <span>Loại</span>
                      {sortConfig?.key === 'type' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 overflow-hidden min-w-[120px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('date')}>
                    <div className="flex items-center space-x-1">
                      <span>Ngày</span>
                      {sortConfig?.key === 'date' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 overflow-hidden min-w-[200px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('customer')}>
                    <div className="flex items-center space-x-1">
                      <span>Đối tác</span>
                      {sortConfig?.key === 'customer' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 overflow-hidden min-w-[140px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('total')}>
                    <div className="flex items-center justify-end space-x-1">
                      <span>Tổng tiền</span>
                      {sortConfig?.key === 'total' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}
                    </div>
                  </div>
                </th>
                <th className="p-0 border-r border-gray-200">
                  <div className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 overflow-hidden min-w-[140px]" style={{ resize: 'horizontal' }} onClick={() => handleSort('status')}>
                    <div className="flex items-center justify-center space-x-1">
                      <span>Trạng thái</span>
                      {sortConfig?.key === 'status' ? (sortConfig.direction === 'asc' ? <ChevronUp size={14}/> : <ChevronDown size={14}/>) : null}
                    </div>
                  </div>
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px] print:hidden">Hành động</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredDocs.map((doc) => (
                <tr 
                  key={doc.id} 
                  className={`hover:bg-gray-50 cursor-pointer ${doc.status === 'CANCELLED' ? 'print:hidden' : ''}`}
                  onClick={() => {
                    if (doc.type === 'QUOTATION' && setEditingQuotationId) {
                      setEditingQuotationId(doc.id!);
                    } else if (setPreviewDoc) {
                      setPreviewDoc(doc);
                    }
                  }}
                >
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 border-r border-gray-100">{doc.docNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">
                    <span className={`px-2 py-1 text-xs rounded-full ${doc.type === 'INPUT_INVOICE' ? 'bg-blue-100 text-blue-800' : doc.type === 'OUTPUT_INVOICE' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}`}>
                      {doc.type === 'INPUT_INVOICE' ? 'Mua vào' : doc.type === 'OUTPUT_INVOICE' ? 'Bán ra' : 'Báo giá'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 border-r border-gray-100">{new Date(doc.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 whitespace-normal break-words border-r border-gray-100">{doc.customer?.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right border-r border-gray-100">{formatNumber(doc.total)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-center" onClick={(e) => e.stopPropagation()}>
                    {doc.type === 'QUOTATION' ? (
                      <select 
                        value={doc.status || 'DRAFT'}
                        onChange={async (e) => await db.documents.update(doc.id!, { status: e.target.value as any })}
                        className={`text-xs font-medium rounded-full px-2 py-1 outline-none cursor-pointer border ${
                          doc.status === 'DRAFT' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
                          doc.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          doc.status === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          doc.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }`}
                      >
                        <option value="DRAFT">Nháp</option>
                        <option value="PENDING">Lưu chờ gửi</option>
                        <option value="SENT">Đã chào giá</option>
                        <option value="COMPLETED">Đã chốt - Đã gửi hàng</option>
                        <option value="CANCELLED">Đã hủy</option>
                      </select>
                    ) : (
                      <div className="flex flex-col items-center gap-1">
                        {doc.status === 'CANCELLED' ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                            Đã hủy (Không tính doanh thu)
                          </span>
                        ) : (
                          doc.paymentDate ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                              Đã TT ({new Date(doc.paymentDate).toLocaleDateString('vi-VN')})
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-amber-100 text-amber-800">
                              Chưa TT
                            </span>
                          )
                        )}
                        <select
                          value={doc.status || 'COMPLETED'}
                          onChange={async (e) => {
                            if (e.target.value === 'CANCELLED' && !confirm('Việc hủy chứng từ này sẽ loại bỏ nó khỏi báo cáo doanh thu/chi phí. Bạn có chắc chắn?')) return;
                            await db.documents.update(doc.id!, { status: e.target.value as any });
                          }}
                          className={`text-[10px] font-medium rounded px-1 outline-none cursor-pointer border ${doc.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                          title="Điều chỉnh trạng thái chứng từ (Hợp lệ / Hủy bỏ)"
                        >
                          <option value="COMPLETED">Hợp lệ</option>
                          <option value="CANCELLED">Hủy bỏ (Trùng lặp)</option>
                        </select>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-right space-x-3 print:hidden" onClick={(e) => e.stopPropagation()}>
                    {doc.type === 'QUOTATION' && setEditingQuotationId && (
                      <>
                        {doc.status !== 'COMPLETED' && (
                          <button 
                            className="text-amber-600 hover:text-amber-900 font-medium mr-3"
                            onClick={() => setEditingQuotationId(doc.id!)}
                          >
                            Xem/Sửa
                          </button>
                        )}
                        {doc.status === 'COMPLETED' && (
                          <button 
                            className="text-green-700 hover:text-green-900 font-bold bg-green-100 hover:bg-green-200 px-3 py-1 rounded-md text-xs mr-3 transition-colors"
                            onClick={() => setEditingQuotationId(doc.id!)}
                            title="Mở ra để in các biểu mẫu Bàn giao, Đề nghị thanh toán..."
                          >
                            Hoàn thiện Hồ sơ
                          </button>
                        )}
                      </>
                    )}
                    <button 
                      className="text-indigo-600 hover:text-indigo-900 font-medium"
                      onClick={() => setPreviewDoc(doc)}
                    >
                      Chi tiết
                    </button>
                    {(currentUser?.role === 'ADMIN' || (currentUser?.role === 'KETOAN' && doc.type === 'QUOTATION')) && (
                      <button 
                        className="text-red-500 hover:text-red-700 font-medium"
                        onClick={() => handleDelete(doc)}
                      >
                        Xóa
                      </button>
                    )}
                  </td>
                </tr>
              ))}
              {filteredDocs.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-sm text-gray-500">Không tìm thấy chứng từ nào khớp với bộ lọc</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Preview Modal */}
        {previewDoc && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                <h2 className="text-xl font-bold text-gray-800">Chi tiết Hóa đơn: {previewDoc.docNumber}</h2>
                <div className="space-x-3">
                  {previewDoc.type === 'QUOTATION' && (
                    <button 
                      onClick={() => setDelayedPaymentModal({isOpen: true, docId: previewDoc.id, days: previewDoc.delayedPaymentDays || 0})}
                      className="bg-amber-100 text-amber-700 px-4 py-2 rounded text-sm font-medium hover:bg-amber-200 border border-amber-300"
                    >
                      Yêu cầu thanh toán chậm
                    </button>
                  )}
                  <button 
                    onClick={() => exportDocx()}
                    className="bg-blue-600 text-white px-4 py-2 rounded text-sm font-medium hover:bg-blue-700"
                  >
                    Xuất Word
                  </button>
                  <button 
                    onClick={() => setPreviewDoc(null)}
                    className="bg-gray-200 text-gray-800 px-4 py-2 rounded text-sm font-medium hover:bg-gray-300"
                  >
                    Đóng
                  </button>
                </div>
              </div>
              
              <div className="p-6 space-y-6">
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <p className="text-gray-500">Loại chứng từ:</p>
                    <p className="font-bold">{previewDoc.type === 'INPUT_INVOICE' ? 'Hóa đơn Mua vào' : 'Hóa đơn Bán ra'}</p>
                  </div>
                  <div>
                    <p className="text-gray-500">Ngày lập:</p>
                    <p className="font-bold">{new Date(previewDoc.date).toLocaleDateString('vi-VN')}</p>
                  </div>
                  <div className="col-span-2">
                    <p className="text-gray-500">Khách hàng / Đối tác:</p>
                    <p className="font-bold text-base text-blue-900">{previewDoc.customer?.name}</p>
                    <p>MST: {previewDoc.customer?.taxCode} - Đ/c: {previewDoc.customer?.address}</p>
                  </div>
                </div>

                <div className="border rounded-lg overflow-hidden mt-6">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50 text-xs text-gray-500 uppercase">
                      <tr>
                        <th className="px-4 py-2 text-left">STT</th>
                        <th className="px-4 py-2 text-left">Tên hàng hóa</th>
                        <th className="px-4 py-2 text-center">ĐVT</th>
                        <th className="px-4 py-2 text-center">Số lượng</th>
                        <th className="px-4 py-2 text-right">Đơn giá</th>
                        <th className="px-4 py-2 text-center">Thuế</th>
                        <th className="px-4 py-2 text-right">Thành tiền</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {previewDoc.items.map((item: any, idx: number) => (
                        <tr key={idx}>
                          <td className="px-4 py-2 text-center">{idx + 1}</td>
                          <td className="px-4 py-2 font-medium">{item.productName}</td>
                          <td className="px-4 py-2 text-center">{item.unit}</td>
                          <td className="px-4 py-2 text-center">{item.quantity}</td>
                          <td className="px-4 py-2 text-right">{formatNumber(item.unitPrice)}</td>
                          <td className="px-4 py-2 text-center">{item.taxRate}%</td>
                          <td className="px-4 py-2 text-right font-bold">{formatNumber(item.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="flex justify-end text-sm space-y-1">
                  <div className="text-right w-64">
                    <p className="flex justify-between text-gray-600"><span>Cộng tiền hàng:</span> <span className="font-medium">{formatNumber(previewDoc.subTotal)}</span></p>
                    <p className="flex justify-between text-gray-600"><span>Tiền thuế:</span> <span className="font-medium">{formatNumber(previewDoc.taxAmount)}</span></p>
                    <p className="flex justify-between text-lg font-bold text-blue-800 mt-2 border-t pt-2"><span>Tổng cộng:</span> <span>{formatNumber(previewDoc.total)}</span></p>
                    {previewDoc.delayedPaymentDays ? (
                      <p className="flex justify-between text-amber-600 mt-2 font-medium"><span>Thanh toán chậm:</span> <span>{previewDoc.delayedPaymentDays} ngày</span></p>
                    ) : null}
                  </div>
                </div>
                
                {/* PHẦN THANH TOÁN (CÔNG NỢ) */}
                {(previewDoc.type === 'INPUT_INVOICE' || previewDoc.type === 'OUTPUT_INVOICE') && (
                  <div className="mt-8 border-t pt-6">
                    <h3 className="text-lg font-bold text-gray-800 mb-4">Tình trạng thanh toán (Công nợ)</h3>
                    {previewDoc.paymentDate ? (
                      <div className="bg-green-50 border border-green-200 text-green-800 p-4 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-green-900">Đã thanh toán</p>
                          <p className="text-sm">Ngày thanh toán: {new Date(previewDoc.paymentDate).toLocaleDateString('vi-VN')}</p>
                        </div>
                        <button 
                          onClick={() => handleUpdatePaymentStatus(previewDoc.id, null)}
                          className="bg-white text-gray-600 px-3 py-1.5 border rounded hover:bg-gray-50 text-sm font-medium"
                        >
                          Hủy thanh toán
                        </button>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-lg flex justify-between items-center">
                        <div>
                          <p className="font-semibold text-amber-900">
                            {previewDoc.type === 'INPUT_INVOICE' ? 'Chưa thanh toán (Phải trả)' : 'Chưa thanh toán (Phải thu)'}
                          </p>
                          <p className="text-sm">Vui lòng cập nhật khi có giao dịch.</p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <input 
                            type="date" 
                            id="payment-date-input"
                            defaultValue={new Date().toISOString().split('T')[0]} 
                            className="border border-gray-300 rounded px-2 py-1.5 text-sm"
                          />
                          <button 
                            onClick={() => {
                              const dateVal = (document.getElementById('payment-date-input') as HTMLInputElement).value;
                              handleUpdatePaymentStatus(previewDoc.id, new Date(dateVal));
                            }}
                            className="bg-green-600 text-white px-3 py-1.5 rounded hover:bg-green-700 text-sm font-medium shadow-sm"
                          >
                            Xác nhận Đã TT
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                )}

              </div>
            </div>
          </div>
        )}
        
        {/* Delayed Payment Modal */}
        {delayedPaymentModal.isOpen && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-sm p-6">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Yêu cầu thanh toán chậm</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Số ngày thanh toán chậm tối đa
                  </label>
                  <input
                    type="number"
                    min="0"
                    value={delayedPaymentModal.days}
                    onChange={(e) => setDelayedPaymentModal({...delayedPaymentModal, days: parseInt(e.target.value) || 0})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                    placeholder="VD: 15, 30, 45..."
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Thời hạn này sẽ được lưu để đối soát công nợ trong tương lai.
                  </p>
                </div>
                
                <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                  <button
                    onClick={exportDelayedPayment}
                    className="flex items-center space-x-1 px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
                    title="Xuất file Word Đề nghị thanh toán chậm"
                  >
                    <Printer size={16} />
                    <span>In</span>
                  </button>
                  <div className="space-x-3">
                    <button
                      onClick={() => setDelayedPaymentModal({isOpen: false, docId: -1, days: 0})}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
                    >
                      Hủy
                    </button>
                    <button
                      onClick={saveDelayedPayment}
                      className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
                    >
                      Lưu lại
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
