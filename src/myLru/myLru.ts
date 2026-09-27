import { LRUCache } from 'lru-cache';
import fs from 'fs';
import path from 'path';




const thumbnailCache = new LRUCache<string, Buffer>({
    maxSize: 100 * 1024 * 1024, // 限制总共100MB
    sizeCalculation: (value, key) => value.length, // 返回每个条目的字节数
    ttl: 0, // 不自动过期
    noDisposeOnSet: true, // 不在覆盖旧值时触发dispose
    allowStale: false, // 不允许返回已被标记为过期的值
    updateAgeOnGet: true, // 访问后刷新LRU顺序
});



 function getThumbnail(filePath: string) {
    const cached = thumbnailCache.get(filePath);
    if (cached) {
        return cached
    };
    return false;
}

 async function setThumbnail(path: string, buf: Buffer) {
    thumbnailCache.set(path, buf);
}

export const myLru = {
    getThumbnail,
    setThumbnail
}


