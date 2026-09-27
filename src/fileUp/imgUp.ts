import { getUrl } from '@/pathUtil';
import { getBufferMd5, mvFileName } from '@/tool/time';
import express, { Request, Response, Router } from 'express';
import path from 'path';
import fs from 'fs';
import { socketRequest } from '@/tool/socketReq';


let aNew = process.env.aNew!;
let upTempPath = process.env.upTempPath!;

// 空文件在数据库中的路径和名称
let nullFileDbPath = process.env.nullFileDbPath!;
let nullFileDbName = process.env.nullFileDbName!;


let fileMd5ObjArr: { md5: string, newMd5: string, filePath: string }[] = [];

async function upDtImgTempFn(t: string) {
    fileMd5ObjArr = [];
    if (t === '0') {
        await prisma?.dt_video_temp.deleteMany({});
        console.log('开始覆盖上传');
    }
    console.log('上传');

    let files = fs.readdirSync(upTempPath);
    //遍历更新，添加
    for (let file of files) {
        let filePath = path.join(upTempPath, file);

        if (!fs.statSync(filePath).isFile()) {
            continue;
        }
        // 如果上追加，先找下是否可以跳过
        if (t === '1') {
            let existing = await prisma?.dt_video_temp.findFirst({
                where: {
                    file_name: filePath
                }
            });
            if (existing) {
                continue;
            }
        }

        let buffer = fs.readFileSync(filePath);
        let md5 = getBufferMd5(buffer);
        let newMd5 = '-1';
        // 如果图片拓展名是.jpg
        if (path.extname(filePath).toLowerCase() === '.jpg') {
            newMd5 = await getImgNoGpsMd5(buffer);
        }
        if (path.extname(filePath).toLowerCase() === '.mp4') {
            newMd5 = await getVideoNoGpsMd5(buffer);
        }
        fileMd5ObjArr.push({ md5, newMd5, filePath });
        console.log(newMd5);

        await prisma?.dt_video_temp.create({
            data: {
                md5: md5,
                new_md5: newMd5,
                file_name: filePath
            }
        });
    }
}


let upDtImgTemplock = false;

export async function upDtImgTemp(req: Request, res: Response) {
    if (upDtImgTemplock) {
        return res.send({ code: 200 });
    }
    // 1表示追加，数据库原有的不删除，0表示覆盖，删除原有记录再追加
    let t = req.query.t as string ?? '1';
    upDtImgTemplock = true;

    setTimeout(() => {
        upDtImgTemplock = false;
    }, 120000)

    upDtImgTempFn(t)
        .then(() => {
            findFileByMd5();
        })
        .then(() => {
            upDtImgTemplock = false;
        })
        .finally(() => {
            upDtImgTemplock = false;
        });
    res.send({ code: 200 })
}



initFileMd5Map();
// 初始化，从数据库中获取临时目录数据写入Map变量中
function initFileMd5Map() {
    prisma?.dt_video_temp.findMany().then(rows => {
        for (let row of rows) {
            fileMd5ObjArr.push({ md5: row.md5, newMd5: row.new_md5 ?? '-1', filePath: row.file_name });
        }
    });
}



// 对图片进行md5遍历，寻找数据库中需要的图片
export async function findFileByMd5() {
    // 图片
    let imgArr = await prisma?.dt_img.findMany({
        select: {
            id: true,
            md5: true,
        },
        where: {
            img_src: nullFileDbPath,
            img_name: nullFileDbName,
        }
    })
    console.log(imgArr);

    if (imgArr && imgArr.length > 0) {
        for (let imgA of imgArr) {
            let tempFile = fileMd5ObjArr.find(item => item.md5 === imgA.md5 || item.newMd5 === imgA.md5)
            if (tempFile) {
                // 写入文件
                let filePath = getUrl('assets', 'a', aNew, 'img/original');
                let newFileName = mvFileName(path.basename(tempFile.filePath));
                let fileSrc = path.join(filePath, newFileName);
                let md5 = writeFileSync(fileSrc, fs.readFileSync(tempFile.filePath));
                if (md5 == tempFile.md5 || md5 == tempFile.newMd5) {
                    await prisma?.dt_img.update({
                        where: {
                            id: imgA.id
                        },
                        data: {
                            img_src: aNew,
                            img_name: newFileName,
                            size: Math.ceil(fs.statSync(fileSrc).size / 1024 / 1024)
                        }
                    })
                }
            }
        }
    }
    // 视频
    let videoArr = await prisma?.dt_video.findMany({
        select: {
            id: true,
            md5: true,
        },
        where: {
            video_src: nullFileDbPath,
            video_name: nullFileDbName,
        }
    })
    console.log(videoArr);

    if (videoArr && videoArr.length > 0) {
        for (let videoA of videoArr) {
            let tempFile = fileMd5ObjArr.find(item => item.md5 === videoA.md5 || item.newMd5 === videoA.md5)
            if (tempFile) {
                // 写入文件
                let filePath = getUrl('assets', 'a', aNew, 'video/original');
                let newFileName = mvFileName(path.basename(tempFile.filePath));
                let fileSrc = path.join(filePath, newFileName);
                let md5 = writeFileSync(fileSrc, fs.readFileSync(tempFile.filePath));
                if (md5 == tempFile.md5 || md5 == tempFile.newMd5) {
                    await prisma?.dt_video.update({
                        where: {
                            id: videoA.id
                        },
                        data: {
                            video_src: aNew,
                            video_name: newFileName,
                            size: Math.ceil(fs.statSync(fileSrc).size / 1024 / 1024)
                        }
                    })
                }
            }
        }
    }




}



// 传入需要文件的md5，从临时上传目录中匹配对应文件
// 在使用new_md5命中时，需要将md5替换为原始md5，保证文件与md5一致，new_md5仅用于检索
function getUpTempBuffer(md5: string) {
    let fileBuffer = Buffer.alloc(0) as Buffer;
    // 判断文件夹是否存在
    if (!fs.existsSync(upTempPath)) {
        return {
            buffer: fileBuffer,
            md5: md5
        };
    }

    let fileObj = fileMd5ObjArr.find(item => item.md5 === md5);
    if (fileObj) {
        fileBuffer = fs.readFileSync(fileObj.filePath);
    }
    fileObj = fileMd5ObjArr.find(item => item.newMd5 === md5);
    if (fileObj) {
        fileBuffer = fs.readFileSync(fileObj.filePath);
        md5 = fileObj.md5;
    }

    return {
        buffer: fileBuffer,
        md5: md5
    }
}

export async function upImgVideo(req: Request, res: Response) {
    //从请求头中拿到文件名和文件md5值
    let fileName = decodeURIComponent(req.headers['x-file-name'] as string ?? '');
    let fileMd5 = req.headers['x-file-md5'] as string ?? '';
    let dtId = req.headers['x-dt-id'] as string ?? '';
    let dtIndex = req.headers['x-dt-index'] as string ?? '';
    let fileType = req.headers['x-file-type'] as 'img' | 'video';

    if (!fileName || !fileMd5 || (fileType !== 'img' && fileType !== 'video')) {
        return res.send({ code: 401 });
    }
    let fileBuffer = req.body as Buffer;


    // 尝试从临时上传目录中获取文件
    if (!fileBuffer || fileBuffer.length == 0) {
        let tempFile = getUpTempBuffer(fileMd5);
        if (tempFile) {
            fileBuffer = tempFile.buffer;
            fileMd5 = tempFile.md5;
        }
    }

    if (!fileBuffer || fileBuffer.length == 0) {
        return res.status(200).send({ code: 401 });
    }

    let md5 = getBufferMd5(fileBuffer);
    if (md5 !== fileMd5) {
        return res.status(401).send({ code: 402 });
    }



    // 写入文件
    let filePath = getUrl('assets', 'a', aNew, fileType, 'original');
    let newFileName = mvFileName(fileName);
    let fileSrc = path.join(filePath, newFileName);
    md5 = writeFileSync(fileSrc, fileBuffer);
    if (md5 !== fileMd5) {
        return res.send({ code: 402 });
    }
    if (fileType === 'img') {
        await prisma?.dt_img.create({
            data: {
                dt_id: dtId,
                img_index: parseInt(dtIndex),
                img_src: aNew,
                img_name: newFileName,
                show_proportion: '4/3',
                md5: fileMd5,
                size: Math.ceil(fileBuffer.length / 1024),
            }
        })
    }
    if(fileType === 'video'){
        await prisma?.dt_video.create({
            data: {
                dt_id: dtId,
                video_index: parseInt(dtIndex),
                video_src: aNew,
                video_name: newFileName,
                show_proportion: '4/3',
                md5: fileMd5,
                size: Math.ceil(fileBuffer.length / 1024),
            }
        })
    }

    return res.send({ code: 200 });
}


export function writeFileSync(filePath: string, fileBuffer: Buffer) {
    fs.writeFileSync(filePath, fileBuffer);
    let md5 = getBufferMd5(fs.readFileSync(filePath));
    return md5;
}


// 图片清除gps后的md5计算
export async function getImgNoGpsMd5(fileBuffer: Buffer) {
    let bufferNoGpsMd5 = await socketRequest<string>('/sh/zeroGpsExif', 'POST', fileBuffer);
    return bufferNoGpsMd5;
}

export async function getVideoNoGpsMd5(fileBuffer: Buffer) {
    let bufferNoGpsMd5 = await socketRequest<string>('/sh/zeroGpsExifVideo', 'POST', fileBuffer);
    return bufferNoGpsMd5;
}

