'use strict'

const path = require('path')
const assert = require('assert')
const addHook = require('pirates').addHook
const FunctionDescription = require('./function-description')

class RepeatedFruitNameError extends Error {}

function probe (fileName) {
  fileName = path.resolve(fileName)
  const describedFruit = {}
  const registeredClasses = []
  const tuttiFrutti = {
    createDescribeFunction: fileName => fn => new FunctionDescription(fn, {fileName}),
    describe: (name, infraClass, config) => {
      if (name in describedFruit) {
        throw new RepeatedFruitNameError('two fruits with the same name have been created: ' + JSON.stringify(name))
      }
      return (describedFruit[name] = infraClass(name, config))
    },
    registerClass: (cls) => {
      registeredClasses.push(cls)
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

  return [registeredClasses, describedFruit]
}

module.exports = probe
