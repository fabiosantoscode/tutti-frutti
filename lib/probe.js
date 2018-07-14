'use strict'

const path = require('path')
const assert = require('assert').strict
const addHook = require('pirates').addHook

function probe (fileName) {
  fileName = path.resolve(fileName)
  const described = {}
  const tuttiFrutti = {
    createDescribeFunction: fileName => fn => new FunctionDescription(fn, {fileName}),
    describe: (name, infraClass, config) => {
      described[name] = {name, class: infraClass, config}
    }
  }
  assert(!global.tuttiFrutti)
  try {
    global.tuttiFrutti = tuttiFrutti
    var removeHook = addHook(
      (code, fileName) => `"use strict"; const describe = tuttiFrutti.describe; const describeFunction = tuttiFrutti.createDescribeFunction(${JSON.stringify(fileName)}); ${code}`
    )

    delete require.cache[fileName]
    require(fileName)
  } finally {
    delete global.tuttiFrutti
    removeHook()
  }

  return described
}

class FunctionDescription {
  constructor (fn, { fileName }) {
    this.fn = fn
    this.fileName = fileName
  }
}

module.exports = probe
Object.assign(module.exports, {FunctionDescription})
