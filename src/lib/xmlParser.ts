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

    // =====================================================================
    // SỬ DỤNG NATIVE DOM PARSER CỦA TRÌNH DUYỆT ĐỂ BÓC TÁCH HÀNG HÓA
    // Đảm bảo chính xác 100% không bị ảnh hưởng bởi lỗi parser JSON
    // =====================================================================
    const domParser = new DOMParser();
    const xmlDoc = domParser.parseFromString(xmlString, "text/xml");

    // Helper: Lấy text content của node con bỏ qua Namespace và quét sâu không phân biệt hoa thường
    const getNodeText = (parent: Element, tagNames: string[]): string => {
      const allChildren = Array.from(parent.getElementsByTagName("*"));
      for (const tag of tagNames) {
        const lowerTag = tag.toLowerCase();
        const match = allChildren.find(child => {
          const localName = (child.localName || child.tagName).toLowerCase();
          return localName === lowerTag || localName.endsWith(':' + lowerTag);
        });
        
        if (match && match.textContent) {
           return match.textContent.trim();
        }
      }
      return '';
    };

    // Tìm tất cả các node HHDV trong toàn bộ file XML
    // Tìm tất cả các node đóng vai trò là "Dòng hàng hóa" (bất kể chữ hoa hay chữ thường)
    const allNodes = Array.from(xmlDoc.getElementsByTagName("*"));
    let itemNodes = allNodes.filter(node => {
      const name = (node.localName || node.tagName).toLowerCase();
      return ['hhdv', 'hanghoa', 'chitiet', 'row', 'item'].includes(name);
    });

    const products = itemNodes.map(node => {
      const quantityStr = getNodeText(node, ['SLuong', 'SoLuong', 'Quantity', 'Qty']);
      const priceStr = getNodeText(node, ['DGia', 'DonGia', 'Price', 'UnitPrice']);
      const taxRateStr = getNodeText(node, ['TSuat', 'ThueSuat', 'VATRate', 'TaxRate']);
      const amountStr = getNodeText(node, ['ThTien', 'ThanhTien', 'TTien', 'Amount', 'TotalAmount']);

      return {
        code: getNodeText(node, ['MHHDV', 'MaHang', 'MaSP', 'ItemCode', 'ProdCode']),
        name: getNodeText(node, ['THHDV', 'TenHang', 'TenSP', 'TenHHDV', 'TenDichVu', 'TenHangHoa', 'ItemName', 'ProductName', 'ProdName']),
        unit: getNodeText(node, ['DVTinh', 'DonViTinh', 'DVT', 'DonVi', 'UnitName', 'Unit']),
        quantity: parseFloat(quantityStr.replace(',', '.') || '1'),
        unitPrice: parseFloat(priceStr.replace(',', '.') || '0'),
        taxRate: parseFloat(taxRateStr.replace('%', '') || '0'),
        amount: parseFloat(amountStr.replace(',', '.') || '0'),
        stock: 0,
      };
    }).filter(p => p.name); // Bỏ qua nếu không có tên sản phẩm

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
