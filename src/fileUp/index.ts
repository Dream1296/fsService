import { getUrl } from '@/pathUtil';
import { getBufferMd5, mvFileName } from '@/tool/time';
import express, { Request, Response, Router } from 'express';
import fs from 'fs';
import path from 'path';
import { upImgVideo, upDtImgTemp } from './imgUp';
const router = Router();


// 图片上传
router.post('/upImgVideo', upImgVideo)


// 视频上传
// router.post('/upVideo', upVideo);

// 临时目录的文件遍历
router.get('/upDtImgTemp', upDtImgTemp)







export default router;


