import { getUrl } from '@/pathUtil';
import { getBufferMd5, mvFileName } from '@/tool/time';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
const router = Router();

const emojiPath = getUrl('assets','system/emoji');



// 表情包下载
router.get('/emoji', (req:Request,res:Response)=>{
    let id = req.query.id as string;
    let paths = path.join(emojiPath,'emoji_all.png');
    let emojiBuffer = fs.readFileSync(paths);
    
    // 返回数据
    res.setHeader('Content-Type', 'image/png');
    res.send(emojiBuffer);
})
 





export default router;


