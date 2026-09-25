const fs = require('fs');

const tbodyReplacement = `
            <tbody className="bg-white divide-y divide-gray-200 print:divide-black">
              {filteredDocs.map((doc, idx) => (
                <tr 
                  key={doc.id} 
                  className={\`hover:bg-gray-50 cursor-pointer print:hover:bg-transparent \${doc.status === 'CANCELLED' ? 'print:hidden' : ''}\`}
                  onClick={() => {
                    if (doc.type === 'QUOTATION' && setEditingQuotationId) {
                      setEditingQuotationId(doc.id!);
                    } else if (setPreviewDoc) {
                      setPreviewDoc(doc);
                    }
                  }}
                >
                  <td className="px-2 py-4 whitespace-nowrap text-sm text-center text-gray-500 print:text-black border-r border-gray-200 print:border-black">
                    {idx + 1}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-bold text-gray-900 print:text-black border-r border-gray-200 print:border-black">{doc.docNumber}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black border-r border-gray-200 print:border-black">
                    <span className={\`px-2 py-1 text-xs rounded-full print:bg-transparent print:p-0 \${doc.type === 'INPUT_INVOICE' ? 'bg-blue-100 text-blue-800' : doc.type === 'OUTPUT_INVOICE' ? 'bg-green-100 text-green-800' : 'bg-purple-100 text-purple-800'}\`}>
                      {doc.type === 'INPUT_INVOICE' ? 'Mua vào' : doc.type === 'OUTPUT_INVOICE' ? 'Bán ra' : 'Báo giá'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 print:text-black border-r border-gray-200 print:border-black">{new Date(doc.date).toLocaleDateString('vi-VN')}</td>
                  <td className="px-6 py-4 text-sm text-gray-900 print:text-black whitespace-normal break-words border-r border-gray-200 print:border-black">{doc.customer?.name}</td>
                  {isBalanceSheet ? (
                    <>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-700 print:text-black text-right border-r border-gray-200 print:border-black">
                        {doc.type === 'INPUT_INVOICE' ? formatNumber(doc.total) : ''}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-green-700 print:text-black text-right border-r border-gray-200 print:border-black">
                        {doc.type === 'OUTPUT_INVOICE' ? formatNumber(doc.total) : ''}
                      </td>
                    </>
                  ) : (
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 print:text-black text-right border-r border-gray-200 print:border-black">{formatNumber(doc.total)}</td>
                  )}
                  <td className="px-6 py-4 whitespace-nowrap text-center print:hidden" onClick={(e) => e.stopPropagation()}>
                    {doc.type === 'QUOTATION' ? (
                      <select 
                        value={doc.status || 'DRAFT'}
                        onChange={async (e) => await db.documents.update(doc.id!, { status: e.target.value as any })}
                        className={\`text-xs font-medium rounded-full px-2 py-1 outline-none cursor-pointer border \${
                          doc.status === 'DRAFT' ? 'bg-gray-50 text-gray-700 border-gray-200' : 
                          doc.status === 'PENDING' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                          doc.status === 'SENT' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                          doc.status === 'COMPLETED' ? 'bg-green-50 text-green-700 border-green-200' :
                          'bg-red-50 text-red-700 border-red-200'
                        }\`}
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
                          className={\`text-[10px] font-medium rounded px-1 outline-none cursor-pointer border \${doc.status === 'CANCELLED' ? 'bg-red-50 text-red-700 border-red-200' : 'bg-gray-50 text-gray-600 border-gray-200'}\`}
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
                  <td colSpan={10} className="px-6 py-10 text-center text-sm text-gray-500">Không tìm thấy chứng từ nào khớp với bộ lọc</td>
                </tr>
              )}
            </tbody>`;

let c = fs.readFileSync('src/pages/Documents.tsx', 'utf-8');
const lines = c.split('\n');

let tbodyStart = lines.findIndex(l => l.includes('<tbody className="bg-white divide-y divide-gray-200">'));
let tbodyEnd = -1;
for (let i = tbodyStart; i < lines.length; i++) {
  if (lines[i].includes('</tbody>')) {
    tbodyEnd = i;
    break;
  }
}

lines.splice(tbodyStart, tbodyEnd - tbodyStart + 1, tbodyReplacement);
fs.writeFileSync('src/pages/Documents.tsx', lines.join('\n'));
console.log('done');
