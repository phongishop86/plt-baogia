const defaultNumbers = ' hai ba bốn năm sáu bảy tám chín';
const units = ('1 một' + defaultNumbers).split(' ');
const ch = 'lẻ mười' + defaultNumbers;
const tr = 'không một' + defaultNumbers;
const tram = tr.split(' ');
const u = '2 nghìn triệu tỉ'.split(' ');
const chuc = ch.split(' ');

export function formatCurrency(number: number): string {
    if (number === 0) return 'không đồng';
    let str = Math.round(number).toString();
    let result = '';
    let blocks = [];
    
    while (str.length > 0) {
        blocks.push(str.substring(Math.max(0, str.length - 3), str.length));
        str = str.substring(0, Math.max(0, str.length - 3));
    }
    
    for (let i = 0; i < blocks.length; i++) {
        if (blocks[i] === '000') continue;
        let blockResult = '';
        const numStr = blocks[i].padStart(3, '0');
        const h = parseInt(numStr[0]);
        const t = parseInt(numStr[1]);
        const uUnit = parseInt(numStr[2]);
        
        if (h > 0 || (i < blocks.length - 1 && blocks[i] !== '000')) {
            blockResult += tram[h] + ' trăm ';
        }
        
        if (t > 1) {
            blockResult += chuc[t] + ' mươi ';
            if (uUnit === 1) blockResult += 'mốt ';
            else if (uUnit === 5) blockResult += 'lăm ';
            else if (uUnit > 0) blockResult += units[uUnit] + ' ';
        } else if (t === 1) {
            blockResult += 'mười ';
            if (uUnit === 5) blockResult += 'lăm ';
            else if (uUnit > 0) blockResult += units[uUnit] + ' ';
        } else if (t === 0) {
            if (uUnit > 0) {
                if (h > 0 || i < blocks.length - 1) blockResult += 'lẻ ';
                blockResult += units[uUnit] + ' ';
            }
        }
        
        result = blockResult + (i > 0 ? u[i % 4] + ' ' : '') + result;
    }
    
    result = result.replace(/\s+/g, ' ').trim() + ' đồng';
    return result;
}
