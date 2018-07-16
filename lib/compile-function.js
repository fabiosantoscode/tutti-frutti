'use strict'

const assert = require('assert')
const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

const _callWebpack = (codefile, outfile, webpack) => new Promise((resolve, reject) => {
  webpack({
    devtool: false,
    target: 'node',
    mode: 'production',
    optimization: {
      minimize: false
    },
    entry: codefile,
    output: {
      filename: path.basename(outfile),
      path: path.dirname(outfile),
      libraryTarget: 'umd'
    },
    resolve: {
      alias: {
        'tutti-frutti': path.join(__dirname, '../lib')
      }
    }
  }, (err, stats) => {
    // Super hard to test
    /* istanbul ignore if */
    if (err) {
      if (err.details) {
        console.error(err.details)
      }
      return reject(err.stack || err)
    }

    const info = stats.toJson()

    /* istanbul ignore if */
    if (stats.hasErrors()) {
      return reject(new Error(info.errors.join('\n')))
    }

    /* istanbul ignore if */
    if (stats.hasWarnings()) {
      console.warn(info.warnings)
    }

    resolve()
  })
})

async function compile (functionDesc, describedFruits) {
  assert(functionDesc.fileName)
  const codedir = path.dirname(functionDesc.fileName)
  const codefile = path.join(codedir, '.' + Math.random() + '-code.js')
  const outfile = codefile + '.out'

  const input = `(function(describedFruits) {"use strict"; global.describe = (name, Class, config) => { const ret = Class(name, config); ret.loadJSONPostDeployProps(describedFruits[name]); return ret }; global.describeFunction = fn => new (require('tutti-frutti/function-description'))(fn); }(${JSON.stringify(describedFruits)})); ${fs.readFileSync(functionDesc.fileName)}; module.exports = ${functionDesc.fn}`
  fs.writeFileSync(codefile, input)
  fs.writeFileSync(outfile, '')

  try {
    await _callWebpack(codefile, outfile, webpack)
    return fs.readFileSync(outfile, 'utf-8')
  } finally {
    fs.unlinkSync(codefile)
    try { fs.unlinkSync(outfile) } catch (e) {}
  }
}

module.exports = compile
Object.assign(module.exports, {_callWebpack})
