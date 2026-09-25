const fs = require('fs');

const tfootReplacement = `
            <tfoot className="hidden print:table-footer-group bg-gray-50 print:bg-gray-100 border-t-2 border-gray-400 print:border-black font-bold">
              {isBalanceSheet ? (
                <>
                  {(() => {
                    const totalMuaVao = filteredDocs.filter(d => d.type === 'INPUT_INVOICE' && d.status !== 'CANCELLED').reduce((s, d) => s + (d.total || 0), 0);
                    const totalBanRa = filteredDocs.filter(d => d.type === 'OUTPUT_INVOICE' && d.status !== 'CANCELLED').reduce((s, d) => s + (d.total || 0), 0);
                    const balance = totalBanRa - totalMuaVao;
                    return (
                      <>
                        <tr>
                          <td colSpan={5} className="px-6 py-2 text-right uppercase tracking-wider text-sm border-r border-gray-200 print:border-black">
                            TỔNG CỘNG TRONG KỲ:
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right text-blue-700 print:text-black border-r border-gray-200 print:border-black">
                            {formatNumber(totalMuaVao)}
                          </td>
                          <td className="px-6 py-2 whitespace-nowrap text-right text-green-700 print:text-black border-r border-gray-200 print:border-black">
                            {formatNumber(totalBanRa)}
                          </td>
                          <td className="print:hidden"></td>
                          <td className="print:hidden"></td>
                        </tr>
                        <tr>
                          <td colSpan={5} className="px-6 py-2 text-right uppercase tracking-wider text-sm border-r border-gray-200 print:border-black">
                            SỐ DƯ CUỐI KỲ (Bán ra - Mua vào):
                          </td>
                          <td colSpan={2} className={\`px-6 py-2 whitespace-nowrap text-center border-r border-gray-200 print:border-black \${balance >= 0 ? 'text-green-700' : 'text-red-700'} print:text-black\`}>
                            {formatNumber(balance)}
                          </td>
                          <td className="print:hidden"></td>
                          <td className="print:hidden"></td>
                        </tr>
                      </>
                    );
                  })()}
                </>
              ) : (
                <tr>
                  <td colSpan={5} className="px-6 py-3 text-right uppercase tracking-wider text-sm border-r border-gray-200 print:border-black">
                    TỔNG CỘNG:
                  </td>
                  <td className="px-6 py-3 whitespace-nowrap text-right border-r border-gray-200 print:border-black">
                    {formatNumber(filteredDocs.filter(d => d.status !== 'CANCELLED').reduce((sum, doc) => sum + (doc.total || 0), 0))}
                  </td>
                  <td className="print:hidden"></td>
                  <td className="print:hidden"></td>
                </tr>
              )}
            </tfoot>`;

let c = fs.readFileSync('src/pages/Documents.tsx', 'utf-8');
const lines = c.split('\n');

let start = lines.findIndex(l => l.includes('<tfoot className="hidden print:table-footer-group bg-gray-50 border-t-2 border-gray-400 font-bold">'));
let end = -1;
for (let i = start; i < lines.length; i++) {
  if (lines[i].includes('</tfoot>')) {
    end = i;
    break;
  }
}

lines.splice(start, end - start + 1, tfootReplacement);
fs.writeFileSync('src/pages/Documents.tsx', lines.join('\n'));
console.log('done');
