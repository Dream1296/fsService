import express, { Application, Request, Response } from 'express';
//读取环境变量
import { envStart } from '@/utils/env';
envStart;
import fs from 'fs';
import bodyParser from 'body-parser';   //post请求接收模块

let sockPath = process.env.socketPathFs!;

const app = express();




if (fs.existsSync(sockPath)) {
    fs.unlinkSync(sockPath)
}




app.use(express.json()); // 用于解析 JSON 请求体 

// 使用 body-parser 中间件来解析 JSON 数据
app.use(bodyParser.json());


// 用于解析二进制数据
app.use(express.raw({
    type: "application/octet-stream",
    limit: "4080mb"
}));


//主接口
app.get('/', (req: Request, res: Response) => {
    res.send('Hello, world! 这是一个文件服务');
});

//音视频
import imgRouter from '@/img/index';
app.use('/img', imgRouter);

// 视频
import videoRouter from '@/video/index';
app.use('/video', videoRouter);

// 文件上传
import fileUpRouter from '@/fileUp/index';
app.use('/fileUp', fileUpRouter);

// 表情包
import emojiRouter from '@/emoji/index';
app.use('/emoji', emojiRouter);

// 文件下载
import fileRouter from '@/file/index';
import { upMd5 } from '@/tool/fileMd5Up';
import { findFileByMd5 } from '@/fileUp/imgUp';
app.use('/file', fileRouter);

// 文件列表
import listRouter from '@/list/index';
app.use('/list', listRouter);





app.listen(sockPath, () => {
    console.log(`启动成功`);
});



app.listen(4000 ,() => {
    console.log(`启动成功`);
});

// upMd5();