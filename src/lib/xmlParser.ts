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
    // THUẬT TOÁN BOTTOM-UP: QUÉT TỪ TÊN HÀNG HÓA SUY NGƯỢC LÊN NODE CHA
    // Vô hiệu hóa mọi giới hạn về Tên Thẻ Bọc Ngoài (Wrapper Tag)
    // =====================================================================
    const domParser = new DOMParser();
    const xmlDoc = domParser.parseFromString(xmlString, "text/xml");

    // Lấy tất cả các node trong file XML
    const allNodes = Array.from(xmlDoc.getElementsByTagName("*"));
    
    // Danh sách các thẻ có khả năng là Tên Hàng Hóa (bao phủ 99% các chuẩn cũ/mới)
    const nameTags = ['thhdvu', 'thhdv', 'tenhang', 'tensp', 'tenhhdv', 'tendichvu', 'tenhanghoa', 'itemname', 'productname', 'prodname', 'tendv', 'hanghoa', 'dichvu'];
    
    const products: any[] = [];
    
    // Quét từng node để tìm node chứa Tên Hàng Hóa
    for (const node of allNodes) {
      const localName = (node.localName || node.tagName).toLowerCase();
      
      // Nếu node này là Tên Hàng Hóa VÀ không chứa node con (là thẻ lá chứa text)
      if (nameTags.includes(localName) && node.children.length === 0 && node.textContent && node.textContent.trim() !== '') {
        
        const nameText = node.textContent.trim();
        const parent = node.parentNode as Element;
        
        // Hàm lùng sục thông số (SL, Đơn giá...) bên trong cùng cấp với Tên Hàng Hóa
        const getSiblingValue = (tags: string[]) => {
          if (!parent) return '';
          const siblings = Array.from(parent.children);
          for (const sibling of siblings) {
            const siblingName = (sibling.localName || sibling.tagName).toLowerCase();
            if (tags.includes(siblingName)) {
              return sibling.textContent?.trim() || '';
            }
          }
          return '';
        };

        const quantityStr = getSiblingValue(['sluong', 'soluong', 'quantity', 'qty']);
        const priceStr = getSiblingValue(['dgia', 'dongia', 'price', 'unitprice']);
        const taxRateStr = getSiblingValue(['tsuat', 'thuesuat', 'vatrate', 'taxrate']);
        const amountStr = getSiblingValue(['thtien', 'thanhtien', 'ttien', 'amount', 'totalamount']);
        const codeStr = getSiblingValue(['mhhdvu', 'mhhdv', 'mahang', 'masp', 'itemcode', 'prodcode']);
        const unitStr = getSiblingValue(['dvtinh', 'donvitinh', 'dvt', 'donvi', 'unitname', 'unit']);

        // Nếu là thẻ 'hanghoa' hoặc 'dichvu', bắt buộc phải có Thành tiền hoặc Số lượng mới coi là sản phẩm
        // (để tránh nhầm với các thẻ tóm tắt)
        if (['hanghoa', 'dichvu'].includes(localName) && !quantityStr && !amountStr && !priceStr) {
          continue;
        }

        // Đảm bảo không bị trùng lặp (nếu XML bị lặp thẻ)
        const isDuplicate = products.some(p => p.name === nameText && p.amount === parseFloat(amountStr.replace(',', '.') || '0'));
        
        if (!isDuplicate) {
          products.push({
            code: codeStr,
            name: nameText,
            unit: unitStr,
            quantity: parseFloat(quantityStr.replace(',', '.') || '1'),
            unitPrice: parseFloat(priceStr.replace(',', '.') || '0'),
            taxRate: parseFloat(taxRateStr.replace('%', '') || '0'),
            amount: parseFloat(amountStr.replace(',', '.') || '0'),
            stock: 0,
          });
        }
      }
    }
    // =====================================================================
    // REGEX FALLBACK: VŨ KHÍ TỐI THƯỢNG NẾU DOMPARSER THẤT BẠI
    // =====================================================================
    if (products.length === 0) {
      console.log("DOMParser failed, triggering Regex Fallback...");
      // Tìm tất cả các thẻ có tên giống Tên Hàng Hóa và lấy nội dung
      const regexStr = `<(?:\\w+:)?(THHDVu?|TenHang|TenSP|TenHHDV|TenDichVu|TenHangHoa|ItemName|ProductName|ProdName|TenDV|HangHoa|DichVu)(?:>| [^>]*>)([\\s\\S]*?)<\\/(?:\\w+:)?\\1>`;
      const nameRegex = new RegExp(regexStr, 'gi');
      
      let match;
      while ((match = nameRegex.exec(xmlString)) !== null) {
        const nameText = match[2].trim();
        
        if (nameText && !nameText.includes('<')) { // Đảm bảo không chứa thẻ con
          // Trích xuất toàn bộ text xung quanh nameText (trong khoảng 1000 ký tự) để mò các thẻ khác
          const index = match.index;
          const contextStart = Math.max(0, index - 500);
          const contextEnd = Math.min(xmlString.length, index + 500);
          const context = xmlString.substring(contextStart, contextEnd);
          
          const extractRegex = (tags: string[]) => {
            for (const tag of tags) {
              const r = new RegExp(`<(?:\\w+:)?${tag}(?:>| [^>]*>)([\\s\\S]*?)<\\/(?:\\w+:)?${tag}>`, 'i');
              const m = context.match(r);
              if (m && !m[1].includes('<')) return m[1].trim();
            }
            return '';
          };

          const quantityStr = extractRegex(['SLuong', 'SoLuong', 'Quantity', 'Qty']);
          const priceStr = extractRegex(['DGia', 'DonGia', 'Price', 'UnitPrice']);
          const taxRateStr = extractRegex(['TSuat', 'ThueSuat', 'VATRate', 'TaxRate']);
          const amountStr = extractRegex(['ThTien', 'ThanhTien', 'TTien', 'Amount', 'TotalAmount']);
          const codeStr = extractRegex(['MHHDVu', 'MHHDV', 'MaHang', 'MaSP', 'ItemCode', 'ProdCode']);
          const unitStr = extractRegex(['DVTinh', 'DonViTinh', 'DVT', 'DonVi', 'UnitName', 'Unit']);

          const isDuplicate = products.some(p => p.name === nameText && p.amount === parseFloat(amountStr.replace(',', '.') || '0'));
          
          if (!isDuplicate && (quantityStr || priceStr || amountStr)) {
            products.push({
              code: codeStr,
              name: nameText,
              unit: unitStr,
              quantity: parseFloat(quantityStr.replace(',', '.') || '1'),
              unitPrice: parseFloat(priceStr.replace(',', '.') || '0'),
              taxRate: parseFloat(taxRateStr.replace('%', '') || '0'),
              amount: parseFloat(amountStr.replace(',', '.') || '0'),
              stock: 0,
            });
          }
        }
      }
    }

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
