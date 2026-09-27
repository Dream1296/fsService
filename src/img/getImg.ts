import { getUrl } from '@/pathUtil';
import { myLru } from '@/myLru/myLru';
import { getVideoCover, imgCompression } from '@/tool/media'
import fs from 'fs';
import path from 'path';
import { socketRequest } from '@/tool/socketReq';
import { prisma } from '@/config/prisma';
import { sendFile } from '@/tool/send';
// 空文件在数据库中的路径和名称
let nullFileDbPath = process.env.nullFileDbPath!;
let nullFileDbName = process.env.nullFileDbName!;


export async function getDtImgFsService(dtid: string, index: number, size: number, type: 'buffer'): Promise<{ data: Buffer, ContentType: string }> {
    let imgSrc = await prisma?.dt_img.findFirst({
        select: {
            img_src: true,
            img_name: true,
        },
        where: {
            dt_id: dtid,
            img_index: index,
        }
    })
    if (imgSrc === null) {
        let filePath = path.join(getUrl('assets'), './system/imgError.png');
        return {
            data: sendFile(filePath, type) as Buffer,
            ContentType: 'image/png',
        }
    }
    if(imgSrc.img_src === nullFileDbPath && imgSrc.img_name === nullFileDbName){
        let filePath = path.join(getUrl('assets'), './system/load.png');
        return {
            data: sendFile(filePath, type) as Buffer,
            ContentType: 'image/png',
        }
    }
    return await getImgData(imgSrc.img_src!, imgSrc.img_name, size, type);
}

export async function getDtComImgFsService(dtid: number, index: number, size: number, type: 'buffer'): Promise<{ data: Buffer, ContentType: string }> {
    let commentImg = await prisma?.dt_comments_img.findFirst({
        where: {
            comment_id: dtid,
            img_index: index
        },
        select: {
            img_src: true,
            img_name: true
        }
    });
    if (commentImg === null) {
        let filePath = path.join(getUrl('assets'), './system/imgError.png');
        return {
            data: sendFile(filePath, type) as Buffer,
            ContentType: 'image/png',
        }
    }
    return await getImgData(commentImg.img_src!, commentImg.img_name, size, type);
}


export async function getImgData(
    img_src: string,
    img_name: string,
    size: number,
    type: 'buffer'
) {
    let imgSrc = { img_src, img_name }
    if (!imgSrc) {
        let filePath = path.join(getUrl('assets'), './system/imgError.png');
        return {
            data: sendFile(filePath, type) as Buffer,
            ContentType: 'image/png',
        }
    }



    //资源路径
    let urls = path.join(getUrl('assets'));
    //文件名
    let filename = imgSrc.img_name;
    //文件路径
    let fileurl = path.join(urls, 'a', imgSrc.img_src!, 'img/original');

    //文件全名
    let filePath = path.join(fileurl, filename);

    //缩略图缓存目录
    let img_log = path.join(urls, 'a', imgSrc.img_src!, 'img/compressed');

    // 缩略图路径
    let thumbPath = path.join(img_log, filename);

    if (!fileIsDir(fileurl, filename)) {
        filePath = path.join(urls, './system/imgError.png');
        return {
            data: sendFile(filePath, type) as Buffer,
            ContentType: 'image/png',
        }
    }


    if (size == 0) {
        if (filename.endsWith('.gif')) {
            let ThumbnailData = myLru.getThumbnail(filePath);
            if (ThumbnailData) {
                console.log('从缓存中拿缩略图');
                return {
                    data: ThumbnailData,
                    ContentType: 'image/gif',
                }
            }
            return {
                data: sendFile(filePath, type) as Buffer,
                ContentType: 'image/gif',
            }
        }
        // console.log(2);

        //判断是否缓存
        let ThumbnailData = myLru.getThumbnail(thumbPath);
        // console.log(ThumbnailData == false);
        // console.log(thumbPath);

        if (ThumbnailData) {
            // console.log('从缓存中拿缩略图');
            return {
                data: ThumbnailData,
                ContentType: 'image/png',
            }
        }

        if (fileIsDir(img_log, filename)) {
            return {
                data: sendFile(thumbPath, type) as Buffer,
                ContentType: 'image/png',
            }
        }
        try {
            let imgBuffer = fs.readFileSync(filePath);
            // 压缩图片
            const data = await imgCompression(imgBuffer, 460, 460);
            filePath = path.join(img_log, filename);
            fs.writeFileSync(filePath, data);

            console.log('压缩图片');


            return {
                data: data,
                ContentType: 'image/png',
            }
        } catch (e) {
            console.log('压缩错误', e);
            // filePath = path.join(fileurl, filename);
            // return res.sendFile(filePath);
            filePath = path.join(urls, './system/imgError.png');

            return {
                data: sendFile(filePath, type) as Buffer,
                ContentType: 'image/png',
            }
        }
    } else {
        return {
            data: sendFile(filePath, type) as Buffer,
            ContentType: 'image/png',
        }
    }
}




export async function getDtVideoFile(dtid: string, index: number) {
    return await prisma!.dt_video.findMany({
        where: {
            dt_id: dtid,
            video_index: index
        }
    })

}



// 以我们需要的类型发获取文件



//判断某个目录中是否包含某个文件
export function fileIsDir(dir: string, file: string) {
    try {
        // 读取目录中的所有文件和文件夹  
        const files = fs.readdirSync(dir);
        // 检查目标文件是否在目录中  
        return files.includes(file);
    } catch (err) {
        console.error("无法读取目录", err);
        return false;
    }
}