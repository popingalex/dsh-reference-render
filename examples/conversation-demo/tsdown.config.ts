/**
 * demo client：DSH Loader 格式（__ModuleLoader__ wrapper）。
 * dsh-reference-render 源码相对引入并打包（demo 自包含）；react/@deepseek-ai 走
 * module table external。
 */
export default [
  {
    entry: { client: 'src/client.tsx' },
    outDir: 'lib',
    format: 'cjs',
    outExtensions: () => ({ js: '.js' }),
    platform: 'browser',
    external: [/^react($|\/)/, /^react-dom($|\/)/, /^@deepseek-ai\//],
    banner: [
      `window.__ModuleLoader__.load({`,
      `  id: 'dsh-reference-render-demo',`,
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
]
