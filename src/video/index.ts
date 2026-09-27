import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDtvideoCoverFsService, getDtvideoFsService, getVideoFsService } from './getVideo';
import { convertVideoToAudio } from '@/tool/media';
const router = Router();





// 视频封面
router.get('/getDtvideoCoverFs', async (req: Request, res: Response) => {
    let dtid = req.query.dtid as string ?? '0';
    let index = Number(req.query.index) ?? 0;
    let type = req.query.type as string ?? 'buffer';

    let data = await getDtvideoCoverFsService(dtid, index, type as 'buffer');

    res.setHeader('Content-Type', data.ContentType);
    res.setHeader('X-Image-Type', data.ContentType);
    res.setHeader('Content-Length', data.data.length);
    res.end(data.data);
})

// 视频获取
router.get('/getVideo', async (req: Request, res: Response) => {
    let dtid = req.query.dtid as string ?? '0';
    let index = Number(req.query.index) ?? 0;
    let start = Number(req.query.start) ?? 0;
    let end = Number(req.query.end) ?? 0;
    let maxChunkSize = Number(req.query.maxChunkSize) ?? 0;
    let type = req.query.type as string ?? 'buffer';
    let data = await getDtvideoFsService(dtid, index, start, end, maxChunkSize, type as 'buffer');

    res.setHeader('Content-Type', 'video/mp4');
    res.setHeader('Content-Length', data.chunksize);
    res.setHeader('x-file-size', data.fileSize);
    res.setHeader('x-start', Number(data.start));
    res.setHeader('x-end', Number(data.end));

    data.data.pipe(res);
})

// 大小MB
let videoBufferSizeMax = 500;
// 视频音频获取
router.get('/getVideoAudio', async (req: Request, res: Response) => {
    let dtid = req.query.dtid as string ?? '0';
    let index = Number(req.query.index) ?? 0;
    let videoBuffer = await getVideoFsService(dtid, index,videoBufferSizeMax);
    if(videoBuffer.length === 0){
        return res.end(videoBuffer);
    }
    // 请求lib进行视频音频转换
    let audioBuffer = await convertVideoToAudio(videoBuffer);

    res.setHeader('Content-Length', audioBuffer.length);
    res.end(audioBuffer);
})




//对外提供视频接口,以流式非中断方式提供
router.get('/getVideoA', async (req: Request, res: Response) => {
    let dtid = req.query.dtid as string ?? '0';
    let index = Number(req.query.index) ?? 0;
    // 非0为范围请求
    let isRange = Number(req.query.isRange) ?? 1;

    const range = req.headers.range;
    console.log('视频请求' + dtid + index + range);
    if (range && isRange != 0) {
        const parts = range.replace(/bytes=/, "").split("-");
        const start = parseInt(parts[0], 10);
        const maxChunkSize = 1024 * 1024;

        const end = Number(parts[1]) > 0 ? parts[1] : '0';

        let buffer = await getDtvideoFsService(dtid, index, start, Number(end), maxChunkSize, 'buffer');

        const head = {
            'Content-Range': `bytes ${buffer.start}-${buffer.end}/${buffer.fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': buffer.chunksize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(206, head);
        buffer.data.pipe(res);
    } else {
        let buffer = await getDtvideoFsService(dtid, index, -1, -1, 0, 'buffer');
        console.log(buffer);

        const head = {
            'Content-Range': `bytes 0-${buffer.fileSize}/${buffer.fileSize}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': buffer.fileSize,
            'Content-Type': 'video/mp4',
        };
        res.writeHead(200, head);
        buffer.data.pipe(res);
    }
})










export default router;