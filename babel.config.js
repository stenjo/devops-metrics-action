module.exports = function (api) {
  api.cache(true)

  const presets = [
    [`@babel/preset-env`, { useBuiltIns: `usage`, corejs: `2` }],
    [`@babel/preset-react`, { development: true, minify: true }]
  ]

  const plugins = [`@babel/plugin-syntax-dynamic-import`]

  return { presets, plugins }
}
