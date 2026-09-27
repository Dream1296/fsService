import { getUrl } from '@/pathUtil';
import { getBufferMd5, mvFileName } from '@/tool/time';
import { fastListDir, getImgT, upFstListDir } from './list';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { upDtImgTemp } from '@/fileUp/imgUp';
import { access } from 'fs/promises';
const router = Router();


// 获取文件夹列表
router.get('/listPath', async (req: Request, res: Response) => {
    let pathStr = req.query.path as string;

    // let pathStr = '/havens/img/2023/2023.12'
    if (!pathStr) {
        return res.status(400).send({
            code: 400,
            data: []
        })
    }
    let data = await fastListDir(pathStr);
    res.send({
        code: 200,
        data,
    });
});

// 缩略图获取
router.get('/getImgT', async (req: Request, res: Response) => {
    let fileHas = req.query.hash as string;


    if (!fileHas) {
        return res.status(400).send({
            code: 400,
            data: []
        })
    }
    let imgPath = await getImgT(fileHas);
    if (imgPath === '-1') {
        return res.status(404).send(Buffer.alloc(0))
    }
    res.send(fs.readFileSync(imgPath));
});

// 图片文件获取
router.get('/getFile', async (req: Request, res: Response) => {
    let filePath = req.query.path as string;

    console.log(filePath);

    if (!filePath) {
        return res.status(400).send({
            code: 400,
            data: []
        })
    }
    // 读取文件
    const readStream = fs.createReadStream(filePath);
    readStream.on('error', () => {
        return res.status(404).send(Buffer.alloc(0));
    });
    readStream.pipe(res);
});

router.get('/getVideo', async (req: Request, res: Response) => {
    let filePath = req.query.path as string;
    
    if (!filePath) {
        return res.status(400).send({ code: 400 });
    }
    try {
        // 1. 判断文件是否存在
        await access(filePath)
    } catch {
        // 文件不存在
        return res.status(400).send({ code: 400 });
    }

    let fileSrc = filePath;

    const stat = fs.statSync(fileSrc);
    const fileSize = stat.size;

    const range = req.headers.range;
    if (range) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const maxChunkSize = 1024 * 1024;

        // const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const end = parts[1]
            ? parseInt(parts[1], 10)
            : Math.min(start + maxChunkSize - 1, fileSize - 1);

        const chunksize = (end - start) + 1;
        const audioStream = fs.createReadStream(fileSrc, { start, end });




        const head = {
            'Content-Range': `bytes ${start}-${end}/${fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunksize,
            'Content-Type': 'video/mp4',
        };


        res.writeHead(206, head);
        audioStream.pipe(res);
        // res.end(buffer);




    } else {
        //    res.sendFile(fileSrc);
        const head = {
            'Content-Length': fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        fs.createReadStream(fileSrc).pipe(res);
    }
})



// 指定一个目录进行图片视频更新
router.get('/upFstListDir', async (req: Request, res: Response) => {
    let pathStr = req.query.path as string;

    // let pathStr = '/havens/img/2023/2023.12'
    if (!pathStr) {
        return res.status(400).send({
            code: 400,
            data: []
        })
    }
    upFstListDir(pathStr);
    res.send({
        code: 200,
    });
});








export default router;


