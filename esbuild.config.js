const esbuild = require('esbuild');


esbuild.build({
  entryPoints: ['main.ts'], // 入口文件
  bundle: true, // 启用打包
  outfile: 'distDev/index.js', // 输出文件
  platform: 'node', // 目标平台为 Node.js
  target: 'node22', // 针对 Node.js 版本
  sourcemap: true, // 生成 source map，便于调试
  external: ['canvas','i2c-bus', 'sharp'], // 排除 canvas 模块
}).catch(() => process.exit(1));