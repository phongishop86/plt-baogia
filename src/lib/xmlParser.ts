import { XMLParser } from 'fast-xml-parser';
import { type Customer } from '../db/db';

export function parseInvoiceXML(xmlString: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
    removeNSPrefix: true, // Quan trọng: tự động bỏ các tiền tố như inv:, ns1: trong thẻ XML
  });

  const parsed = parser.parse(xmlString);
  
  try {
    const findNode = (obj: any, targetKey: string): any => {
      if (!obj || typeof obj !== 'object') return null;
      if (obj[targetKey]) return obj[targetKey];
      for (const key of Object.keys(obj)) {
        const found = findNode(obj[key], targetKey);
        if (found) return found;
      }
      return null;
    };

    // Tìm kiếm trực tiếp từ toàn bộ cấu trúc file XML (parsed) 
    // thay vì trông chờ vào HDon hay NDHDon vì mỗi nhà mạng bọc 1 kiểu khác nhau
    const ttChung = findNode(parsed, 'TTChung') || {};
    const nMua = findNode(parsed, 'NMua') || {};
    const nBan = findNode(parsed, 'NBan') || {};
    const tToan = findNode(parsed, 'TToan') || {};
    
    // Đôi khi cấu trúc có thể là DSHHDV -> HHDV, hoặc chỉ có HHDV (dù sai chuẩn nhưng vẫn có thể xảy ra)
    let dshhdv = findNode(parsed, 'DSHHDV');
    if (dshhdv && dshhdv['HHDV']) {
      dshhdv = dshhdv['HHDV'];
    } else {
      dshhdv = findNode(parsed, 'HHDV') || [];
    }

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

    // Hàm lấy giá trị thuộc tính không phân biệt hoa/thường
    const getField = (obj: any, keys: string[]) => {
      if (!obj || typeof obj !== 'object') return '';
      const objKeys = Object.keys(obj).map(k => k.toLowerCase());
      for (const k of keys) {
        const lowerK = k.toLowerCase();
        const index = objKeys.indexOf(lowerK);
        if (index !== -1) {
          return obj[Object.keys(obj)[index]];
        }
      }
      return '';
    };

    // Đảm bảo dshhdv luôn là mảng, nếu trống thì trả về mảng rỗng
    const items = Array.isArray(dshhdv) ? dshhdv : (dshhdv ? [dshhdv] : []);
    const products = items.map((item: any) => {
      const quantityStr = getField(item, ['SLuong', 'SoLuong']) || '1';
      const priceStr = getField(item, ['DGia', 'DonGia']) || '0';
      const taxRateStr = getField(item, ['TSuat', 'ThueSuat']) || '0';
      const amountStr = getField(item, ['ThTien', 'ThanhTien']) || '0';

      return {
        code: getField(item, ['MHHDV', 'MaHang', 'MaSP']),
        name: getField(item, ['THHDV', 'TenHang', 'TenSP', 'TenHHDV']),
        unit: getField(item, ['DVTinh', 'DonViTinh', 'DVT']),
        quantity: parseFloat(quantityStr.toString().replace(',', '.')),
        unitPrice: parseFloat(priceStr.toString().replace(',', '.')),
        taxRate: parseFloat(taxRateStr.toString().replace('%', '')),
        amount: parseFloat(amountStr.toString().replace(',', '.')),
        stock: 0,
      };
    }).filter((p: any) => p.name); // Bỏ qua nếu không có tên sản phẩm

    const invoiceInfo = {
      docNumber: (ttChung['KHHDon'] ? ttChung['KHHDon'] + '-' : '') + (ttChung['SHDon'] || ''),
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
