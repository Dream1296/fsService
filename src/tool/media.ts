import path from "path";
import { fileIsDir } from "./filePath";
import { socketRequest } from "./socketReq";
import fs from 'fs';


// 传入一个视频，返回视频的h264格式
export async function ensureVideoToh254(inPathArr: string[], outPathArr: string[]) {

    if (inPathArr.length != outPathArr.length) {
        throw new Error('/dream/HelixCore/src/tool/media.ts ensureVideoToh254  原文件数量和目标文件数量不一致 ');
    }

    for (let i = 0; i < inPathArr.length; i++) {
        let inVideoPath = inPathArr[i];
        let outVideoPath = outPathArr[i];
        // 用 判断文件是否存在
        if (!fileIsDir(path.dirname(inVideoPath), path.basename(inVideoPath))) {
            console.log('视频不存在');
            continue;
        }
        // 如果视频是h254格式,
        if ((await getVideoCodec(inVideoPath)) == 'h264') {
            continue;
        }
        // 用 ffprobe 检查视频编码
        await transcodeToH264(inVideoPath, outVideoPath);
    }
}

// 获取视频转码
export async function transcodeToH264(
    inputPath: string,
    outputPath: string
): Promise<void> {
    // 读取文件
    let inputBuffer = fs.readFileSync(inputPath);
    // 转码
    let outputBuffer = await socketRequest<Buffer>('/ffmpeg/transcodeToH264', 'POST', inputBuffer, 'buffer');
    // 保存文件
    fs.writeFileSync(outputPath, outputBuffer);
    console.log('转码完成');
}


// 视频格式计算
export async function getVideoCodec(
    videoPath: string
): Promise<"h264" | "h265"> {
    let videoBuffer = fs.readFileSync(videoPath);
    let res = await socketRequest<{ code: number, codec: "h264" | "h265" }>('/ffmpeg/getVideoCodec', 'POST', videoBuffer);
    return res.codec;
}

//视频封面图获取
export async function getVideoCover(videoFileBuffer: Buffer, time: number = 1000) {
    return await socketRequest<Buffer>(`/ffmpeg/transcodeToCover?time=${time}`, 'POST', videoFileBuffer, 'buffer');
}

export async function getDtVideoCover(videoBuffer:Buffer, time: number = 1) {
    return await socketRequest<Buffer>(`/ffmpeg/transcodeToCover?time=${time}`, 'POST', videoBuffer, 'buffer');
}


// 图片压缩
export async function imgCompression(imgBuffer: Buffer, x: number, y: number) {
    return await socketRequest<Buffer>('/sh/processImage?width='+x+'&height='+y,'POST',imgBuffer,'buffer');
}

// 视频音频获取
export async function convertVideoToAudio(videoBuffer: Buffer) {
    return await socketRequest<Buffer>('/ffmpeg/transcodeToAudio', 'POST', videoBuffer, 'buffer');
}

