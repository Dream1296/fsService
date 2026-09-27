import path from 'path';



// root开始地址
let rootPath = process.env.rootPath as string;
// let rootPath = "/dream/HelixCore";

// console.log(rootPath);

export function getUrl(root: 'src' | 'root' | 'assets' | 'public', ...paths: string[]) {
    
    let url = '';
    if (root == 'src') {
        url = path.join(rootPath, 'src');
    }
    if (root == 'assets') {
        url = process.env.assets!;
    }
    if (root == 'root') {
        url = rootPath;
    }
    if(root == 'public'){
        url = process.env.publicPath!;
    }

    for (let a of paths) {
        url = path.join(url, a);
    }
    
    return url;
}


