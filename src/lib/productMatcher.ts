import { type Product } from '../db/db';

/**
 * 1. Chuẩn hóa chuỗi văn bản:
 * - Chuyển sang Unicode NFC (Dựng sẵn).
 * - Thay thế non-breaking spaces và các ký tự khoảng trắng đặc biệt.
 * - Gộp các khoảng trắng liên tiếp thành 1 dấu cách.
 * - Trim và chuyển về chữ thường.
 */
export function normalizeText(str?: string): string {
  if (!str) return '';
  return str
    .toString()
    .normalize('NFC')
    .replace(/[\u00A0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

/**
 * Bảng từ điển ánh xạ các đơn vị tính tương đương về dạng chuẩn viết hoa đầu:
 */
const UNIT_CANONICAL_MAP: Record<string, string> = {
  // Cái / Chiếc
  'cái': 'Cái',
  'cai': 'Cái',
  'chiếc': 'Cái',
  'chiec': 'Cái',
  'ea': 'Cái',
  'pcs': 'Cái',
  'pc': 'Cái',

  // Bộ
  'bộ': 'Bộ',
  'bo': 'Bộ',
  'set': 'Bộ',

  // Chiều dài / Cáp
  'mét': 'Mét',
  'met': 'Mét',
  'm': 'Mét',
  'cuộn': 'Cuộn',
  'cuon': 'Cuộn',
  'roll': 'Cuộn',
  'sợi': 'Sợi',
  'soi': 'Sợi',
  'dây': 'Sợi',
  'day': 'Sợi',

  // Đóng gói
  'hộp': 'Hộp',
  'hop': 'Hộp',
  'box': 'Hộp',
  'thùng': 'Thùng',
  'thung': 'Thùng',
  'carton': 'Thùng',
  'ctn': 'Thùng',
  'kiện': 'Thùng',
  'kien': 'Thùng',
  'gói': 'Gói',
  'goi': 'Gói',
  'pack': 'Gói',

  // Khối lượng
  'kg': 'Kg',
  'kgs': 'Kg',
  'ký': 'Kg',
  'ky': 'Kg',
  'kilogram': 'Kg',
  'gram': 'Gram',
  'g': 'Gram',

  // Khác
  'cây': 'Cây',
  'cay': 'Cây',
  'thanh': 'Cây',
  'ống': 'Ống',
  'ong': 'Ống',
  'bình': 'Bình',
  'binh': 'Bình',
  'chai': 'Chai',
  'lọ': 'Lọ',
  'lo': 'Lọ',
  'tấm': 'Tấm',
  'tam': 'Tấm',
  'bản': 'Bản',
  'ban': 'Bản',
  'lần': 'Lần',
  'lan': 'Lần',
  'chuyến': 'Chuyến',
  'chuyen': 'Chuyến',
  'tháng': 'Tháng',
  'thang': 'Tháng',
  'năm': 'Năm',
  'nam': 'Năm',
  'giờ': 'Giờ',
  'gio': 'Giờ',
  'ngày': 'Ngày',
  'ngay': 'Ngày',
};

/**
 * 2. Chuẩn hóa Đơn vị tính:
 * - Đưa về chữ thường không dấu cách để tra bảng canonical.
 * - Nếu không có trong bảng, viết hoa chữ cái đầu (Title Case).
 */
export function normalizeUnit(unit?: string): string {
  if (!unit) return '';
  const clean = normalizeText(unit);
  if (UNIT_CANONICAL_MAP[clean]) {
    return UNIT_CANONICAL_MAP[clean];
  }
  // Title case fallback: e.g. "lon" -> "Lon", "can" -> "Can"
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

/**
 * Kiểm tra xem 2 đơn vị tính có tương đương hoặc chỉ khác nhau kiểu trình bày không:
 */
export function areUnitsEquivalent(u1?: string, u2?: string): boolean {
  if (!u1 && !u2) return true;
  if (!u1 || !u2) return true; // Một bên không ghi ĐVT thì chấp nhận linh hoạt nếu tên trùng
  const n1 = normalizeUnit(u1);
  const n2 = normalizeUnit(u2);
  return n1.toLowerCase() === n2.toLowerCase();
}

/**
 * 3. Chuẩn hóa tên cốt lõi (Core Search Key):
 * Bỏ dấu phân cách và chuẩn hóa các thông số hay viết lệch
 * Ví dụ: "Cat.6", "Cat 6", "Cat-6" -> "cat6"
 * "1.5m", "1,5m", "1.5 m" -> "1.5m"
 */
export function getCoreSearchKey(name?: string): string {
  if (!name) return '';
  let str = normalizeText(name);
  
  // Chuẩn hóa quy cách số đo: 1,5m -> 1.5m; 1.5 m -> 1.5m
  str = str.replace(/(\d+)[,.](\d+)\s*(m|mm|cm|gb|tb|mb|w|v|a|hz|ghz)/g, '$1.$2$3');
  str = str.replace(/(\d+)\s+(m|mm|cm|gb|tb|mb|w|v|a|hz|ghz)\b/g, '$1$2');
  
  // Chuẩn hóa Cat 6, Cat-6, Cat.6 -> cat6
  str = str.replace(/\bcat[\s_.-]*([0-9a-zA-Z]+)\b/g, 'cat$1');
  
  // Loại bỏ các dấu phân cách không cần thiết
  str = str.replace(/[-_.,/\\()[\]{}":;]/g, ' ').replace(/\s+/g, ' ').trim();
  return str;
}

/**
 * Trích xuất các mã model / mã số quan trọng từ tên sản phẩm để tránh gộp nhầm
 */
function extractModelTokens(str: string): string[] {
  const norm = normalizeText(str);
  // Tìm các token có chứa cả chữ và số (ví dụ: 120-40001104bl, cat6, 24awg)
  const matches = norm.match(/[a-z0-9]+[-_./]?[a-z0-9]+/g) || [];
  return matches.filter(m => /\d/.test(m) && /[a-z]/i.test(m) && m.length >= 3);
}

/**
 * Tính toán độ tương đồng giữa 2 chuỗi (Token Jaccard + Levenshtein):
 */
export function computeSimilarity(str1: string, str2: string): number {
  const s1 = getCoreSearchKey(str1);
  const s2 = getCoreSearchKey(str2);
  if (s1 === s2) return 1.0;
  if (!s1 || !s2) return 0.0;

  const words1 = s1.split(' ').filter(Boolean);
  const words2 = s2.split(' ').filter(Boolean);

  // Jaccard similarity of words
  const set1 = new Set(words1);
  const set2 = new Set(words2);
  let intersection = 0;
  for (const w of set1) {
    if (set2.has(w)) intersection++;
  }
  const union = set1.size + set2.size - intersection;
  const wordSim = union > 0 ? intersection / union : 0;

  if (wordSim >= 0.85) return wordSim;

  // Levenshtein distance
  const len1 = s1.length;
  const len2 = s2.length;
  if (Math.abs(len1 - len2) > Math.max(len1, len2) * 0.4) {
    return wordSim * 0.5;
  }

  const matrix: number[][] = [];
  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const levDist = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const levSim = maxLen > 0 ? (maxLen - levDist) / maxLen : 1;

  return Math.max(wordSim, levSim);
}

/**
 * Kiểm tra xem 2 sản phẩm có phải là CÙNG MỘT MẶT HÀNG không:
 */
export function areProductsMatch(
  p1: { name: string; unit?: string; code?: string },
  p2: { name: string; unit?: string; code?: string }
): { isMatch: boolean; confidence: number; reason: string } {
  const normName1 = normalizeText(p1.name);
  const normName2 = normalizeText(p2.name);

  if (!normName1 || !normName2) {
    return { isMatch: false, confidence: 0, reason: 'Tên rỗng' };
  }

  const unitMatch = areUnitsEquivalent(p1.unit, p2.unit);

  // 1. Tên giống hệt nhau sau chuẩn hóa Unicode & gộp khoảng trắng thừa
  if (normName1 === normName2) {
    if (unitMatch) {
      return { 
        isMatch: true, 
        confidence: 1.0, 
        reason: 'Tên và ĐVT hoàn toàn trùng khớp' 
      };
    } else {
      // Tên giống hệt nhau nhưng ĐVT khác nhau kiểu trình bày (VD: "Cuộn" vs "CUỘN")
      return { 
        isMatch: true, 
        confidence: 0.95, 
        reason: `Cùng tên, khác kiểu ĐVT ("${p1.unit || '---'}" vs "${p2.unit || '---'}")` 
      };
    }
  }

  // 2. Tên cốt lõi (Core Key) giống hệt nhau (chỉ khác dấu chấm, gạch nối, khoảng cách)
  const core1 = getCoreSearchKey(p1.name);
  const core2 = getCoreSearchKey(p2.name);
  if (core1 === core2) {
    return {
      isMatch: true,
      confidence: unitMatch ? 0.98 : 0.92,
      reason: `Tên cốt lõi trùng khớp (chỉ khác dấu phân cách và ĐVT)`
    };
  }

  // 3. Kiểm tra mã model quan trọng nếu có: nếu có mã model khác nhau thì không được gộp nhầm
  const models1 = extractModelTokens(p1.name);
  const models2 = extractModelTokens(p2.name);
  if (models1.length > 0 && models2.length > 0) {
    const hasSharedModel = models1.some(m => models2.includes(m));
    if (!hasSharedModel) {
      return { isMatch: false, confidence: 0.1, reason: 'Khác mã model / quy cách' };
    }
  }

  // 4. Đo độ tương đồng chuỗi cao
  const sim = computeSimilarity(p1.name, p2.name);
  if (sim >= 0.88 && unitMatch) {
    return {
      isMatch: true,
      confidence: sim,
      reason: `Độ tương đồng cao (${Math.round(sim * 100)}%) và cùng nhóm ĐVT`
    };
  }

  return { isMatch: false, confidence: sim, reason: 'Không trùng khớp' };
}

/**
 * Tìm sản phẩm phù hợp nhất trong danh sách sản phẩm hiện có
 */
export function findMatchingProduct(
  existingProducts: Product[],
  target: { name: string; unit?: string; code?: string }
): Product | null {
  if (!existingProducts || existingProducts.length === 0) return null;

  let bestMatch: Product | null = null;
  let highestConfidence = 0;

  for (const prod of existingProducts) {
    const res = areProductsMatch(prod, target);
    if (res.isMatch && res.confidence > highestConfidence && res.confidence >= 0.85) {
      highestConfidence = res.confidence;
      bestMatch = prod;
    }
  }

  return bestMatch;
}

/**
 * Cấu trúc thông tin của một nhóm sản phẩm bị trùng lặp
 */
export interface DuplicateGroup {
  id: string; // unique group id
  canonicalName: string;
  canonicalUnit: string;
  targetProduct: Product;
  duplicateProducts: Product[];
  allProducts: Product[];
  totalStock: number;
  totalIn: number;
  totalOut: number;
  reason: string;
}

/**
 * Tự động rà soát và nhóm các mặt hàng bị trùng lặp trong toàn bộ danh sách sản phẩm
 * Hỗ trợ nhận diện lịch sử chứng từ để tính toán Tồn kho thực tế = Tổng Nhập - Tổng Xuất
 */
export function detectDuplicateGroups(allProducts: Product[], allDocuments?: any[]): DuplicateGroup[] {
  if (!allProducts || allProducts.length < 2) return [];

  const visited = new Set<number>();
  const groups: DuplicateGroup[] = [];

  for (let i = 0; i < allProducts.length; i++) {
    const p1 = allProducts[i];
    if (!p1.id || visited.has(p1.id)) continue;

    const matchedProducts: Product[] = [p1];
    let matchReason = '';

    for (let j = i + 1; j < allProducts.length; j++) {
      const p2 = allProducts[j];
      if (!p2.id || visited.has(p2.id)) continue;

      const res = areProductsMatch(p1, p2);
      if (res.isMatch) {
        matchedProducts.push(p2);
        visited.add(p2.id);
        matchReason = res.reason;
      }
    }

    if (matchedProducts.length > 1) {
      visited.add(p1.id);

      const memberIds = new Set(matchedProducts.map(p => p.id!).filter(Boolean));
      const memberNormNames = new Set(matchedProducts.map(p => normalizeText(p.name)).filter(Boolean));

      // Tính tổng Nhập và Xuất từ toàn bộ chứng từ liên quan
      let totalIn = 0;
      let totalOut = 0;

      if (allDocuments && Array.isArray(allDocuments)) {
        allDocuments.forEach(doc => {
          if (!doc.items || !Array.isArray(doc.items)) return;
          doc.items.forEach((item: any) => {
            const isMatch = (item.productId && memberIds.has(item.productId)) ||
                            (item.productName && memberNormNames.has(normalizeText(item.productName)));
            if (isMatch) {
              const qty = Number(item.quantity) || 0;
              if (doc.type === 'INPUT_INVOICE') {
                totalIn += qty;
              } else if (doc.type === 'OUTPUT_INVOICE' || doc.type === 'DELIVERY_NOTE') {
                totalOut += qty;
              }
            }
          });
        });
      }

      // Chọn sản phẩm làm mốc: Ưu tiên sản phẩm có tồn kho > 0 hoặc tên gọn gàng hơn
      const sorted = [...matchedProducts].sort((a, b) => {
        if ((b.stock || 0) !== (a.stock || 0)) {
          return (b.stock || 0) - (a.stock || 0);
        }
        return b.name.length - a.name.length;
      });

      const targetProduct = sorted[0];
      const duplicateProducts = matchedProducts.filter(p => p.id !== targetProduct.id);

      // Chuẩn hóa tên và đơn vị tính sạch sẽ (loại bỏ double spaces, viết hoa ĐVT chuẩn)
      const canonicalName = targetProduct.name.replace(/\s+/g, ' ').trim();
      const canonicalUnit = normalizeUnit(targetProduct.unit || duplicateProducts[0]?.unit || 'Cái');

      // Tồn kho thực tế: Nếu có phát sinh mua hàng thì tính bằng Tổng Mua - Tổng Bán
      const sumStock = matchedProducts.reduce((sum, p) => sum + (p.stock || 0), 0);
      const calculatedStock = totalIn > 0 ? (totalIn - totalOut) : sumStock;

      groups.push({
        id: `dup_${targetProduct.id}_${i}`,
        canonicalName,
        canonicalUnit,
        targetProduct,
        duplicateProducts,
        allProducts: matchedProducts,
        totalStock: calculatedStock,
        totalIn,
        totalOut,
        reason: matchReason || 'Cùng tên, khác kiểu ĐVT'
      });
    }
  }

  return groups;
}
