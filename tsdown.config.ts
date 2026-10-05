import { defineConfig } from 'tsdown'

/**
 * 双产物：
 * 1. lib/client.js —— DSH Loader 格式（__ModuleLoader__ wrapper，CJS 脚手架），
 *    作为 DSH web profile 的 ./client 出口被浏览器装载；
 * 2. lib/runtime.js —— 纯 ESM 运行时（external react / @deepseek-ai/*），
 *    供宿主与贡献方插件经 exports './runtime' 引入。
 */
export default [
  {
    entry: { client: 'src/client-entry.ts' },
    outDir: 'lib',
    format: 'cjs',
    outExtensions: () => ({ js: '.js' }),
    platform: 'browser',
    external: [/^react($|\/)/, /^react-dom($|\/)/],
    banner: [
      `window.__ModuleLoader__.load({`,
      `  id: 'dsh-reference',`,
      `  factory: (require) => {`,
      `    var module = { exports: {} };`,
      `    var exports = module.exports;`,
    ].join('\n'),
    footer: [
      `    return module.exports;`,
      `  },`,
      `});`,
    ].join('\n'),
    dts: false,
    minify: false,
  },
  {
    entry: { runtime: 'src/index.ts' },
    outDir: 'lib',
    format: 'esm',
    platform: 'neutral',
    external: [/^react($|\/)/, /^react-dom($|\/)/, /^@deepseek-ai\//],
    dts: { sourcemap: true },
    minify: false,
  },
]
