const defaultNumbers = ' hai ba bốn năm sáu bảy tám chín';
const units = ('1 một' + defaultNumbers).split(' ');
const ch = 'lẻ mười' + defaultNumbers;
const tr = 'không một' + defaultNumbers;
const tram = tr.split(' ');
const u = '2 nghìn triệu tỉ'.split(' ');
const chuc = ch.split(' ');

function blockOfThree(d: string): string {
    const _a = d + '00';
    if (d === '000') return '';
    switch (_a.substring(0, 3)) {
        case '0':
        case '00':
        case '000':
            return '';
        case '1':
        case '01':
        case '001':
            return ' không trăm lẻ một';
        case '2':
        case '02':
        case '002':
            return ' không trăm lẻ hai';
        case '3':
        case '03':
        case '003':
            return ' không trăm lẻ ba';
        case '4':
        case '04':
        case '004':
            return ' không trăm lẻ bốn';
        case '5':
        case '05':
        case '005':
            return ' không trăm lẻ năm';
        case '6':
        case '06':
        case '006':
            return ' không trăm lẻ sáu';
        case '7':
        case '07':
        case '007':
            return ' không trăm lẻ bảy';
        case '8':
        case '08':
        case '008':
            return ' không trăm lẻ tám';
        case '9':
        case '09':
        case '009':
            return ' không trăm lẻ chín';
    }

    const sl1 = _a.substring(0, 1);
    const sl2 = _a.substring(1, 2);
    const sl3 = _a.substring(2, 3);
    
    let result = '';
    if (sl1 !== '0') {
        result += tram[parseInt(sl1)] + ' trăm';
    } else {
        result += ' không trăm';
    }
    
    if (sl2 !== '0') {
        if (sl2 === '1') {
            result += ' mười';
        } else {
            result += ' ' + chuc[parseInt(sl2)] + ' mươi';
        }
    } else if (sl3 !== '0') {
        result += ' lẻ';
    }
    
    if (sl3 !== '0') {
        if (sl3 === '1') {
            if (sl2 !== '0' && sl2 !== '1') {
                result += ' mốt';
            } else {
                result += ' một';
            }
        } else if (sl3 === '5' && sl2 !== '0') {
            result += ' lăm';
        } else {
            result += ' ' + units[parseInt(sl3)];
        }
    }
    
    return result;
}

export function formatCurrency(n: number | string): string {
    let _n = n.toString();
    const isNegative = _n.startsWith('-');
    if (isNegative) _n = _n.substring(1);
    
    let i = _n.length;
    if (i === 0 || _n === '0') return 'không';
    
    let str = '';
    let j = 0;
    while (i > 0) {
        const start = Math.max(0, i - 3);
        const block = _n.substring(start, i);
        i = start;
        const blockWords = blockOfThree(block);
        if (blockWords) {
            str = blockWords + (j > 0 ? ' ' + u[j] : '') + str;
        }
        j++;
        if (j > 3) j = 1;
    }
    
    str = str.replace(/^ không trăm lẻ/, '').replace(/^ không trăm/, '').trim();
    if (isNegative) str = 'âm ' + str;
    
    return str.charAt(0).toUpperCase() + str.slice(1) + ' đồng chẵn';
}
