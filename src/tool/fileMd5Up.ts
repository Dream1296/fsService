import { getUrl } from "@/pathUtil";
import { getBufferMd5 } from "./time";
import fs from "fs";

export async function upMd5() {
    let imgList = await prisma?.dt_img.findMany({
        select: {
            id: true,
            img_src: true,
            img_name: true
        },
        where: {
            md5: "-1"
        }
    });

    for (let imgInfo of imgList!) {
        if (!imgInfo.img_src || !imgInfo.img_name) continue;
        let filePath = getUrl('assets', 'a', imgInfo.img_src, 'img/original', imgInfo.img_name);
        let imgBuffer: Buffer;
        try {
            imgBuffer = fs.readFileSync(filePath);
        } catch {
            console.log(imgInfo.id + '  error'); 
            continue;
        }

        let md5 = getBufferMd5(imgBuffer);

        await prisma?.dt_img.update({
            where: {
                id: imgInfo.id
            },
            data: {
                md5: md5,
                size: Math.ceil(fs.statSync(filePath).size / 1024 / 1024)
            }
        })
        console.log(`${imgInfo.id} / ${imgList!.length} `);
    }
    process.exit(0);
}


