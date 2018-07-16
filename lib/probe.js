'use strict'

const path = require('path')
const assert = require('assert')
const addHook = require('pirates').addHook
const FunctionDescription = require('./function-description')

class RepeatedFruitNameError extends Error {}

function probe (fileName) {
  fileName = path.resolve(fileName)
  const described = {}
  const tuttiFrutti = {
    createDescribeFunction: fileName => fn => new FunctionDescription(fn, {fileName}),
    describe: (name, infraClass, config) => {
      if (name in described) {
        throw new RepeatedFruitNameError('two fruits with the same name have been created: ' + JSON.stringify(name))
      }
      return (described[name] = infraClass(name, config))
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

module.exports = probe
