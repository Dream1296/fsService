import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { getDtComImgFsService, getDtImgFsService } from './getImg';
import { getParam } from '@/tool/typeTool';
const router = Router();





// 图片获取
router.get('/getDtImgFs', async (req: Request, res: Response) => {
    let dtid = getParam(req.query, 'dtid', 'string', null);
    let index = getParam(req.query, 'index', 'number', null);
    let size = getParam(req.query, 'size', 'number', 0);
    let type = getParam(req.query, 'type', 'string', 'buffer');

    if(dtid === null || index === null){
        res.status(400).send('dtid or index is null');
        return;
    }

    let data = await getDtImgFsService(dtid, index, size, type as 'buffer');
    res.setHeader('Content-Type', data.ContentType);
    res.setHeader('X-Image-Type', data.ContentType);
    res.setHeader('Content-Length', data.data.length);
    res.end(data.data);
})

// 评论图片
router.get('/getDtComImgFs', async (req: Request, res: Response) => {
    let Reqdtid = req.query.comid;
    let Reqindex = req.query.index;
    let size = req.query.size;
    //0或空为压缩图，其他为原图

    let dtid;
    let index;

    if (Reqdtid && Reqindex) {
        dtid = Number(Reqdtid);
        index = Number(Reqindex);
    } else {
        return res.send({ code: 402, msg: "参数不全" });
    }

    getDtComImgFsService(dtid, index, Number(size), 'buffer').then((data) => {
        res.setHeader('Content-Type', data.ContentType);
        res.setHeader('X-Image-Type', data.ContentType);
        res.setHeader('Content-Length', data.data.length);
        res.end(data.data);
    }).catch((err) => {
        console.error(err);
        res.status(500).send('Internal Server Error');
    });
})







export default router;