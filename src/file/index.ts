import { getUrl } from '@/pathUtil';
import { getBufferMd5, mvFileName } from '@/tool/time';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
const router = Router();


// 文件下载
router.get('/fileDow', async (req: Request, res: Response) => {
    let fileId = req.query.fileId as string;
    let fileObj = await prisma?.dt_file.findUnique({
        select: {
            file_src: true,
            file_name: true
        },
        where: {
            id: Number(fileId)
        }
    });

    if (!fileObj) {
        res.status(404).send('文件不存在');
        return;
    }

    let filePath = getUrl('assets', 'file', fileObj.file_src, fileObj.file_name);
    if (!fs.existsSync(filePath)) {
        res.status(404).send('文件不存在');
        return;
    }

    const stat = await fs.promises.stat(filePath);

        res.setHeader(
        "x-file-name",
        `${encodeURIComponent(fileObj.file_name)}`
    );

    res.setHeader("Content-Length", stat.size.toString());
    const stream = fs.createReadStream(filePath);
    stream.pipe(res);
})








export default router;


