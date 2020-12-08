const commonjs = require('rollup-plugin-commonjs')
const VuePlugin = require('rollup-plugin-vue')
const { terser } = require('rollup-plugin-terser')

module.exports = {
  input: './index.js',
  output: [
    {
      file: 'dist/lotto.cjs.min.js',
      format: 'cjs'
    },
    {
      file: 'dist/lotto.umd.min.js',
      format: 'umd',
      name: 'AwesomeVueComponents'
    },
    {
      file: 'dist/lotto.esm.min.js',
      format: 'esm'
    }
  ],
  plugins: [
    commonjs(),
    VuePlugin(),
    terser()
  ]
}