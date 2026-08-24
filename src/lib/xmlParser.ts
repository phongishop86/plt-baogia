import { XMLParser } from 'fast-xml-parser';
import { type Customer } from '../db/db';

export function parseInvoiceXML(xmlString: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
  });

  const parsed = parser.parse(xmlString);
  
  try {
    // Find HDon regardless of root (TDiep or direct HDon)
    let hdon = parsed['HDon'] || (parsed['TDiep'] && parsed['TDiep']['DLieu'] && parsed['TDiep']['DLieu']['HDon']);
    
    let ndHDonNode: any = null;
    
    if (!hdon) {
      // Sometimes it's wrapped in other tags or namespaces. Let's do a loose search for NDHDon
      const findNDHDon = (obj: any): any => {
        if (!obj || typeof obj !== 'object') return null;
        if (obj['NDHDon']) return obj['NDHDon'];
        for (const key of Object.keys(obj)) {
          const found = findNDHDon(obj[key]);
          if (found) return found;
        }
        return null;
      };
      const ndHDon = findNDHDon(parsed);
      if (!ndHDon) throw new Error("Không tìm thấy NDHDon trong XML. Đây có thể không phải Hóa đơn TT78.");
      
      ndHDonNode = ndHDon;
    } else {
      ndHDonNode = hdon['DLHDon']['NDHDon'];
    }

    const ttChung = ndHDonNode['TTChung'] || {};
    const nMua = ndHDonNode['NMua'] || {};
    const nBan = ndHDonNode['NBan'] || {};
    const dshhdv = (ndHDonNode['DSHHDV'] && ndHDonNode['DSHHDV']['HHDV']) || [];
    const tToan = ndHDonNode['TToan'] || {};

    const buyer: Partial<Customer> = {
      name: nMua['Ten'] || '',
      taxCode: nMua['MST'] || '',
      address: nMua['DChi'] || '',
      phone: nMua['SDThoai'] || '',
      email: nMua['DCTDTu'] || '',
    };

    const seller: Partial<Customer> = {
      name: nBan['Ten'] || '',
      taxCode: nBan['MST'] || '',
      address: nBan['DChi'] || '',
      phone: nBan['SDThoai'] || '',
      email: nBan['DCTDTu'] || '',
      isSupplier: true,
    };

    const items = Array.isArray(dshhdv) ? dshhdv : [dshhdv];
    const products = items.map((item: any) => ({
      code: item['MHHDV'] || '',
      name: item['THHDV'] || '',
      unit: item['DVTinh'] || '',
      quantity: parseFloat(item['SLuong'] || '1'),
      unitPrice: parseFloat(item['DGia'] || '0'),
      taxRate: parseFloat(item['TSuat']?.toString().replace('%', '') || '0'),
      amount: parseFloat(item['ThTien'] || '0'),
      stock: 0,
    }));

    const invoiceInfo = {
      docNumber: ttChung['SHDon'] || '',
      date: new Date(ttChung['NLap'] || Date.now()),
      subTotal: parseFloat(tToan['TgTCThue'] || '0'),
      taxAmount: parseFloat(tToan['TgTThue'] || '0'),
      total: parseFloat(tToan['TgTTTBSo'] || '0'),
    };

    return { buyer, seller, products, invoiceInfo };
  } catch (error) {
    console.error("Error parsing e-invoice XML:", error);
    throw new Error("Lỗi khi đọc file XML Hóa đơn (Chỉ hỗ trợ Hóa đơn điện tử TT78).");
  }
}
