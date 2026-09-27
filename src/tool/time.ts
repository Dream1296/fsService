import crypto from "crypto";

/**
 * 传入文件名，在文件名前加上时间戳用于唯一标识
 * @param fileName 
 * @returns 
 */
export function mvFileName(fileName: string) {
    let time = Date.now();
    let newName = formatString(fileName);
    return `${encodeBase62(time)}~${getRandomNum('str')}~${newName}`;
}


export function formatString(filename: string): string {
    return [...filename].map(char => {
        const codePoint = char.codePointAt(0)!;

        // 替换~号
        if (char === '~') return '_';

        // 替换空格
        if (char === ' ') return '_';

        // 控制字符 (0x00-0x1F)、DEL、非法 Unicode 非字符
        const isControl = codePoint <= 0x1F || codePoint === 0x7F;
        const isNonCharacter =
            (codePoint >= 0xFDD0 && codePoint <= 0xFDEF) ||
            (codePoint & 0xFFFF) === 0xFFFF ||
            (codePoint & 0xFFFF) === 0xFFFE ||
            codePoint > 0x10FFFF;
        if (isControl || isNonCharacter) {
            return '_';
        }

        return char;
    }).join('');
}
let baseSeq = 0;
export function getRandomNum(radix?: "num" | "str"): number | string {
    if (radix == "str") {
        return encodeBase62(baseSeq++);
    }
    return baseSeq++;
}






const charset = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

/**
 * 10进制转62进制字符串
 * @param num 
 * @returns 
 */
function encodeBase62(num: number): string {
    if (num === 0) return '0';
    let result = '';
    while (num > 0) {
        result = charset[num % 62] + result;
        num = Math.floor(num / 62);
    }
    return result;
}

export function getBufferMd5(buffer: Buffer): string {
    return crypto
        .createHash("md5")
        .update(buffer)
        .digest("hex");
}