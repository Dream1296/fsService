import { myLru } from "@/myLru/myLru";
import { getUrl } from "@/pathUtil";
import { fileIsDir } from "@/tool/filePath";
import { sendFile } from "@/tool/send";
import path from "path";
import fs from 'fs';
import { getDtVideoCover, getVideoCover } from "@/tool/media";



export async function getDtvideoCoverFsService(dtid: string, index: number, type: 'buffer') {
    let file = (await getDtVideoFile(dtid, index, 4 * 1024))[0];

    let videoUrl = path.join(getUrl('assets'), 'a', file.video_src, 'video/');

    let videoFileSrc = path.join(videoUrl, 'original', file.video_name);

    //视频预览图名字
    let videoImg = file.video_name.slice(0, -4) + '.png';

    let videoSrc = path.join(videoUrl, 'cover');

    // 缓存
    let ThumbnailData = myLru.getThumbnail(path.join(videoSrc, videoImg));
    if (ThumbnailData) {
        // console.log('从缓存中拿视频封面图');
        return {
            data: ThumbnailData,
            ContentType: 'image/png',
        }
    }
    // console.log('缓存');

    // 检查封面图是否存在
    if (fileIsDir(videoSrc, videoImg)) {
        return {
            data: sendFile(path.join(videoSrc, videoImg), type) as Buffer,
            ContentType: 'image/png',
        }
    }



    let videoFileSrcBuffer = fs.readFileSync(videoFileSrc);
    let outImgBuff = await getDtVideoCover(videoFileSrcBuffer, 1);
    let outImgPath = path.join(videoUrl, 'cover', videoImg);
    fs.writeFileSync(outImgPath, outImgBuff);
    return {
        data: outImgBuff,
        ContentType: 'image/png',
    }
}


export async function getDtvideoFsService(dtid: string, index: number, start: number, end: number, maxChunkSize: number, type: 'buffer') {
    let file = (await getDtVideoFile(dtid, index, 4 * 1024))[0];
    let videoUrl = path.join(getUrl('assets'), 'a', file.video_src, 'video/');

    //原视频文件
    let fileSrc = path.join(videoUrl, 'original', file.video_name);
    //处理后的视频文件
    let fileSrcCompressed = path.join(videoUrl, 'compressed', file.video_name);
    //如果fileSrcCompressed存在，则fileSrc值为fileSrc，否则为fileSrcCompressed
    if (fs.existsSync(fileSrcCompressed)) {
        fileSrc = fileSrcCompressed;
    }
    console.log(fileSrc);

    // //如果fileSrc不存在，则返回错误
    // if (!fileIsDir(path.dirname(fileSrc), path.basename(fileSrc))) {
    //     return res.send({ code: 402 });
    // }

    const stat = fs.statSync(fileSrc);
    const fileSize = stat.size;

    if (start == -1) {
        const audioStream = fs.createReadStream(fileSrc);
        return {
            data: audioStream,
            fileSize: fileSize,
            chunksize: fileSize,
            start,
            end,
        }
    }

    end = end != 0
        ? parseInt(end.toString(), 10)
        : Math.min(start + maxChunkSize - 1, fileSize - 1);
    // end = end != 0
    // ? parseInt(end.toString(), 10)
    // : fileSize - 1;

    const chunksize = (end - start) + 1;
    console.log(start, end);

    const audioStream = fs.createReadStream(fileSrc, { start, end });

    return {
        data: audioStream,
        fileSize: fileSize,
        chunksize,
        start,
        end,
    }
}

export async function getVideoFsService(dtid: string, index: number ,videoBufferSizeMax:number){
    let fileRow = (await getDtVideoFile(dtid, index,videoBufferSizeMax));
    if(!fileRow || fileRow.length === 0){
        return Buffer.from([]);
    }
    let file = fileRow[0];
    let videoUrl = path.join(getUrl('assets'), 'a', file.video_src, 'video/original/', file.video_name);
    let videoBuffer = fs.readFileSync(videoUrl);
    return videoBuffer;
}



export async function getDtVideoFile(dtid: string, index: number, videoBufferSizeMax: number) {
    return await prisma!.dt_video.findMany({
        where: {
            dt_id: dtid,
            video_index: index,
            size: {
                lt: videoBufferSizeMax
            }
        }
    })

}

// 视频文件大小计算
export async function getDtVideoFileSize() {

    let videoInfoArr = await prisma?.dt_video.findMany({
        select: {
            id: true,
            video_name: true,
            video_src: true,
            size: true,
        }
    })

    if (videoInfoArr && videoInfoArr?.length === 0) {
        return;
    }


    for (let videoInfo of videoInfoArr!) {
        if (!videoInfo.video_src || !videoInfo.video_name) {
            continue;
        }
        let src = path.join(getUrl('assets'), 'a', videoInfo.video_src, 'video/original', videoInfo.video_name);
        // 检查文件是否存在,转换为MB并取整
        let size = getFileSize(src);
        if (size != -1) {
            size = size / (1024 * 1024);
            // 向上取整
            size = Math.ceil(size);
        }

        await prisma?.dt_video.update({
            where: {
                id: videoInfo.id
            },
            data: {
                size: size
            }
        })
        console.log(`${videoInfo.id} 大小更新为 ${size} MB   ${videoInfo.id} / ${videoInfoArr?.length}`);

    }
}

/**
 * 获取文件大小
 * @param filePath 文件完整路径
 * @returns 文件大小（字节），文件不存在返回 -1
 */
function getFileSize(filePath: string): number {
    try {
        const stat = fs.statSync(filePath);

        // 如果是目录，也返回 -1
        if (!stat.isFile()) {
            return -1;
        }

        return stat.size;
    } catch (err) {
        return -1;
    }
}


// getDtVideoFileSize()