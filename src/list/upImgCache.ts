import path from "path";
import { fastListDir, getFileNameMd5, getFileType } from "./list";
import fs from 'fs';
import { access } from 'fs/promises';
import { getVideoCover, imgCompression } from "@/tool/media";

let imgCache = process.env.listImgCache!;

// let num = 0;
export async function upImgCacheDir(dir: string) {
    let files = await fastListDir(dir);
    const pool = new AsyncTaskPool();
    for (let file of files) {
        // console.log(num++);

        let fileTyep = getFileType(file.name);
        if (fileTyep == 3) {
            continue;
        }

        let hash = getFileNameMd5(file);
        let a = hash.split('_')[0];
        let b = hash.split('_')[1];

        let fileName = hash + '.png';
        let filePath = path.join(imgCache, a, b, fileName);

        try {
            await access(filePath);
            
            continue;
        } catch (error) {
            pool.addTask(async () => {
                await ensureDir(a, b);
                await generateMediaThumbnail(file.fullPath, filePath, fileTyep == 1 ? 'img' : 'video');
            })

        }
    }
    // 执行所有任务（并发 4 个）
    await pool.runAll(8);

}

/**
 * 判断目录是否存在，不存在执行创建
 * @param a 一级目录
 * @param b 二级目录
 * @param basePath 基础目录
 */
export async function ensureDir(
    a: string,
    b: string,
    basePath: string = '/dream/HelixCore/assets/listCache'
): Promise<void> {
    const targetDir = path.join(basePath, a, b);
    await fs.promises.mkdir(targetDir, { recursive: true });
}


/**
 * 生成媒体文件（图片/视频）的缩略图。
 * - 图片：按比例压缩，最长边不超过 maxSide。
 * - 视频：截取第 frameAt 秒的帧，生成缩略图（同尺寸）。
 *
 * @param inputPath 输入文件完整路径
 * @param outputPath 缩略图输出完整路径（包含文件名）
 * @param options 可选参数：
 *    - maxSide: 缩略图最长边（默认 200）
 *    - frameAt: 视频取帧毫秒数（默认 1000）
 */
export async function generateMediaThumbnail(
    inputPath: string,
    outputPath: string,
    type: 'img' | 'video',
    options?: {
        maxSide?: number;
        frameAt?: number;
    }
): Promise<void> {
    const { maxSide = 200, frameAt = 1 } = options || {};

    await access(inputPath);
    const outDir = path.dirname(outputPath);
    //   await mkdir(outDir, { recursive: true });



    // const vf = `scale='if(gt(iw,ih),${maxSide},-1)':'if(gt(iw,ih),-1,${maxSide})'`;

    // ✅ 判断是否为视频（有 duration 或多帧）
    try {
        if (type == 'video') {
            // 🎞 视频：取第 frameAt 秒生成缩略图
            let videoBuffer = fs.readFileSync(inputPath);
            let videoCover = await getVideoCover(videoBuffer, frameAt);
            let outfilePath = path.join(outDir, path.basename(outputPath));
            fs.writeFileSync(outfilePath, videoCover);
        } else {
            // 🖼 图片：按比例缩放
            let imgBuffer = fs.readFileSync(inputPath);
            let compressedImg = await imgCompression(imgBuffer, maxSide, maxSide);
            fs.writeFileSync(outputPath, compressedImg);
        }
    }
    catch (err) {
        console.log(inputPath);
        // throw new Error()
        console.log(err);

    }


}



/**
 * 并发任务调度器
 * 用于收集异步任务并按最大并发数执行
 */
export class AsyncTaskPool {
    private tasks: (() => Promise<void>)[] = [];

    /**
     * 添加一个任务
     * @param task 一个返回 Promise 的函数（不要在这里直接调用）
     */
    addTask(task: () => Promise<void>) {
        this.tasks.push(task);
    }

    /**
     * 执行所有任务
     * @param limit 最大并发数，默认 4
     */
    async runAll(limit = 4): Promise<void> {
        const executing: Promise<void>[] = [];
        // let completed = 0;
        // const total = this.tasks.length;
        // const startTime = Date.now();

        for (const task of this.tasks) {
            const p = task()
                .catch(err => {
                    console.error(`任务执行出错:`, err);
                })
                .finally(() => {
                    // completed++;
                    // const elapsed = (Date.now() - startTime) / 1000;
                    // const percent = ((completed / total) * 100).toFixed(1);
                    // const speed = completed / elapsed;
                    // const remaining = ((total - completed) / speed).toFixed(1);
                    // console.log(
                    //     `[${completed}/${total}] 已完成 ${percent}% | 速度: ${speed.toFixed(1)} t/s | 预计剩余: ${remaining}s`
                    // );

                    const index = executing.indexOf(p);
                    if (index >= 0) executing.splice(index, 1);
                });

            executing.push(p);

            if (executing.length >= limit) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);
    }
}
