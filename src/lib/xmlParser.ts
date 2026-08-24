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
      
      const lowerTarget = targetKey.toLowerCase();
      // Thử tìm ở cấp hiện tại trước
      for (const key of Object.keys(obj)) {
        if (key.toLowerCase() === lowerTarget) return obj[key];
      }
      // Nếu không có, đào sâu xuống
      for (const key of Object.keys(obj)) {
        const found = findNode(obj[key], targetKey);
        if (found) return found;
      }
      return null;
    };

    // Tìm kiếm trực tiếp từ toàn bộ cấu trúc file XML (parsed) 
    // thay vì trông chờ vào HDon hay NDHDon vì mỗi nhà mạng bọc 1 kiểu khác nhau
    const ttChung = findNode(parsed, 'TTChung') || findNode(parsed, 'ThongTinChung') || {};
    const nMua = findNode(parsed, 'NMua') || findNode(parsed, 'NguoiMua') || {};
    const nBan = findNode(parsed, 'NBan') || findNode(parsed, 'NguoiBan') || {};
    const tToan = findNode(parsed, 'TToan') || findNode(parsed, 'ThanhToan') || {};
    
    // Hàm lấy giá trị thuộc tính không phân biệt hoa/thường (Chuyển lên trên để dùng sớm)
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

    // Hàm quét sâu đệ quy toàn bộ file XML để tìm tất cả các Object chứa thông tin Hàng hóa
    const findAllProducts = (obj: any): any[] => {
      let results: any[] = [];
      if (!obj || typeof obj !== 'object') return results;
      
      if (Array.isArray(obj)) {
        for (const item of obj) {
          results = results.concat(findAllProducts(item));
        }
        return results;
      }

      const name = getField(obj, ['THHDV', 'TenHang', 'TenSP', 'TenHHDV', 'TenDichVu', 'TenHangHoa', 'HangHoa', 'Ten']);
      const hasQuantityOrPrice = getField(obj, ['SLuong', 'SoLuong', 'DGia', 'DonGia', 'ThTien', 'ThanhTien']) !== '';
      
      // Nếu object có tên VÀ có ít nhất số lượng hoặc đơn giá -> Chắc chắn là 1 dòng hàng hóa
      if (name && hasQuantityOrPrice) {
        results.push(obj);
      } else {
        for (const key of Object.keys(obj)) {
          results = results.concat(findAllProducts(obj[key]));
        }
      }
      return results;
    };

    // Tìm tất cả các mặt hàng bất kể chúng bị giấu ở đâu trong cấu trúc XML
    const items = findAllProducts(parsed);

    const products = items.map((item: any) => {
      const quantityStr = getField(item, ['SLuong', 'SoLuong']) || '1';
      const priceStr = getField(item, ['DGia', 'DonGia']) || '0';
      const taxRateStr = getField(item, ['TSuat', 'ThueSuat']) || '0';
      const amountStr = getField(item, ['ThTien', 'ThanhTien']) || '0';

      return {
        code: getField(item, ['MHHDV', 'MaHang', 'MaSP']),
        name: getField(item, ['THHDV', 'TenHang', 'TenSP', 'TenHHDV', 'TenDichVu', 'TenHangHoa', 'Ten']),
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
