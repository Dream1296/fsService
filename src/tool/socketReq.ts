// socketRequest.ts
import http from "http";

let socketPath = process.env.socketPathLib! as string;

export type SocketRequestMethod = "GET" | "POST" | "PUT" | "DELETE";
export type SocketResponseType = "json" | "buffer" | "text";

export function socketRequest<T>(
    path: string,
    method: SocketRequestMethod = "GET",
    data?: any,
    responseType: SocketResponseType = "json"
): Promise<T> {
    return new Promise((resolve, reject) => {
        // 判断是否是文件上传
        const isFileUpload = method === "POST" && data instanceof Buffer;

        const headers: Record<string, string> = {};
        if (isFileUpload) {
            headers["Content-Type"] = "application/octet-stream";
        } else if (data) {
            headers["Content-Type"] = "application/json";
        }

        const req = http.request(
            {
                socketPath,
                path,
                method,
                headers,
            },
            (res) => {
                const chunks: Buffer[] = [];

                res.on("data", (chunk) => {
                    chunks.push(chunk);
                });

                res.on("end", () => {
                    const buffer = Buffer.concat(chunks);

                    if (responseType === "buffer") {
                        resolve(buffer as T);
                        return;
                    }

                    if (responseType === "text") {
                        resolve(buffer.toString("utf-8") as T);
                        return;
                    }

                    // 默认尝试解析JSON
                    try {
                        resolve(JSON.parse(buffer.toString("utf-8")) as T);
                    } catch (err) {
                        // 如果解析失败，直接返回文本
                        resolve(buffer.toString("utf-8") as T);
                    }
                });
            }
        );

        req.on("error", reject);

        if (data) {
            if (isFileUpload) {
                req.write(data); // 直接写入 Buffer
            } else {
                req.write(JSON.stringify(data));
            }
        }

        req.end();
    });
}