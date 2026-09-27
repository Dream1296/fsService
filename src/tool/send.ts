import fs from 'fs';

export function sendFile(FilePath: string, type: 'buffer') {
    if (type = 'buffer') {
        return fs.readFileSync(FilePath);
    }
}
