import { exec } from "child_process";
import util from "util";
import fs from 'fs';
import path from 'path';
import { ensureDir, upImgCacheDir } from "./upImgCache";
import { access, mkdir, constants } from 'fs/promises';
import { getBufferMd5 } from "@/tool/time";

import { promisify } from 'util';

// type 0为文件夹，1为图片, 2为视频， 其他为3
type listFile = {
    name: string,
    type: 0 | 1 | 2 | 3,
    hash: string,
}

//所有路径均为实际的绝对路径
let imgCache = process.env.listImgCache!;



export async function getImgT(hash: string) {
    let a = hash.split('_')[0];
    let b = hash.split('_')[1];
    let filePath = path.join(imgCache, a, b, (hash + '.png'));
    try {
        console.log(filePath);
        
        await access(filePath, constants.F_OK);
        console.log('1');
        
        return filePath;
    } catch {
        return '-1';
    }


}

export async function upFstListDir(dir: string) {
    upImgCacheDir(dir);
}



/**
 * 根据文件扩展名判断文件类型
 * @param {string} filename - 文件名（如 'example.jpg'）
 * @returns {number} 1=图片, 2=视频, 3=其他
 */
export function getFileType(filename: string): 1 | 2 | 3 {
    // 获取文件扩展名（小写）
    const ext = path.extname(filename).toLowerCase();

    // 定义图片和视频的扩展名集合
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg', '.tiff'];
    const videoExtensions = ['.mp4', '.mov', '.avi', '.mkv', '.flv', '.wmv', '.webm', '.mpeg'];

    // 判断文件类型
    if (imageExtensions.includes(ext)) {
        return 1; // 图片
    } else if (videoExtensions.includes(ext)) {
        return 2; // 视频
    } else {
        return 3; // 其他
    }
}






const execPromise = promisify(exec);

export interface FileInfo {
    name: string;
    size: number;
    permissions: string;
    owner: string;
    group: string;
    date: string;
    type: "file" | "directory" | "symlink" | "block" | "char" | "socket" | "pipe" | "unknown";
    fullPath: string;
    inode: string;
    devId: number;
}

/**
 * 使用系统 `ls` 命令快速读取目录下文件信息
 * @param dir 目标目录路径
 */
export async function fastListDir(dir: string): Promise<FileInfo[]> {
    const targetDir = path.resolve(dir);

    // 获取当前目录所在文件系统的 device ID
    const { stdout: devStdout } = await execPromise(
        `stat -c '%d' ${JSON.stringify(targetDir)}`
    );

    const devId = parseInt(devStdout.trim(), 10);

    // -i：显示 inode
    const cmd = `ls -liA --time-style=+%Y-%m-%d_%H:%M:%S ${JSON.stringify(targetDir)}`;

    const { stdout } = await execPromise(cmd);

    const lines = stdout
        .split("\n")
        .filter(line => line && !line.startsWith("total"));

    const result: FileInfo[] = [];

    for (const line of lines) {
        /*
         * 示例：
         *
         * 123456 drwxr-xr-x 2 root root    4096 2024-02-24_00:00:00 photos
         * 123457 -rw-r--r-- 1 root root 1907866 2024-02-24_00:00:00 IMG.jpg
         *
         * inode        = parts[0]
         * permissions  = parts[1]
         * owner        = parts[3]
         * group        = parts[4]
         * size         = parts[5]
         * date         = parts[6]
         * name         = parts[7...]
         */

        const parts = line.trim().split(/\s+/);

        if (parts.length < 8) {
            continue;
        }

        const inode = parts[0];
        const permissions = parts[1];
        const owner = parts[3];
        const group = parts[4];
        const size = parseInt(parts[5], 10);
        const date = parts[6];
        const name = parts.slice(7).join(" ");

        const typeChar = permissions[0];

        let type: FileInfo["type"] = "unknown";

        switch (typeChar) {
            case "-":
                type = "file";
                break;
            case "d":
                type = "directory";
                break;
            case "l":
                type = "symlink";
                break;
            case "b":
                type = "block";
                break;
            case "c":
                type = "char";
                break;
            case "s":
                type = "socket";
                break;
            case "p":
                type = "pipe";
                break;
        }

        result.push({
            name,
            size,
            permissions,
            owner,
            group,
            date,
            type,
            fullPath: path.join(targetDir, name),
            inode,
            devId,
        });
    }

    return result;
}




export function getFileNameMd5(fileInfo: FileInfo): string {
    let name = `${fileInfo.devId}_${fileInfo.inode}`;
    let md5 = getBufferMd5(Buffer.from(name));
    return `${md5.slice(0, 2)}_${md5.slice(2, 4)}_${name}`
}