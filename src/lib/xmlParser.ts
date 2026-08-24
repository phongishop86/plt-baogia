import { XMLParser } from 'fast-xml-parser';
import { type Customer, type Product } from '../db/db';

export function parseInvoiceXML(xmlString: string) {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseAttributeValue: true,
  });

  const parsed = parser.parse(xmlString);
  
  try {
    // Navigate through Circular 78 XML structure
    const dLieu = parsed['HDon']['DLHDon'];
    const ndHDon = dLieu['NDHDon'];
    const ttChung = ndHDon['TTChung'];
    const nMua = ndHDon['NMua'];
    const dshhdv = ndHDon['DSHHDV']['HHDV'];

    const customer: Partial<Customer> = {
      name: nMua['Ten'] || '',
      taxCode: nMua['MST'] || '',
      address: nMua['DChi'] || '',
      phone: nMua['SDThoai'] || '',
      email: nMua['DCTDTu'] || '',
    };

    const items = Array.isArray(dshhdv) ? dshhdv : [dshhdv];
    const products: Partial<Product>[] = items.map((item: any) => ({
      code: item['MHHDV'] || '',
      name: item['THHDV'] || '',
      unit: item['DVTinh'] || '',
      unitPrice: parseFloat(item['DGia'] || '0'),
      taxRate: parseFloat(item['TSuat']?.replace('%', '') || '0'),
      stock: 0, // Mặc định là 0 khi import từ XML
    }));

    const invoiceInfo = {
      docNumber: ttChung['SHDon'] || '',
      date: new Date(ttChung['NLap'] || Date.now()),
      subTotal: parseFloat(ndHDon['TToan']['TgTCThue'] || '0'),
      taxAmount: parseFloat(ndHDon['TToan']['TgTThue'] || '0'),
      total: parseFloat(ndHDon['TToan']['TgTTTBSo'] || '0'),
    };

    return { customer, products, invoiceInfo };
  } catch (error) {
    console.error("Error parsing e-invoice XML:", error);
    throw new Error("Invalid e-invoice XML format (Circular 78/Decree 123).");
  }
}
