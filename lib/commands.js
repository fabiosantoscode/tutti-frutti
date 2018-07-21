'use strict'

const assert = require('assert')
const probe = require('./probe')
const steps = require('./steps')
const compileFunction = require('./compile-function')
const FunctionDescription = require('./function-description')

async function compileFunctions (probed) {
  for (const fruit of Object.keys(probed)) {
    for (const prop of (probed[fruit].props || Object.keys(probed[fruit]))) {
      if (probed[fruit][prop] instanceof FunctionDescription) { await compileFunction(probed[fruit][prop]) }
    }
  }
}

async function _planWithProbed (classes, probed) {
  const before = {}
  const after = probed
  for (const fruitClass of classes) {
    const currentlyDeployed = await fruitClass.getCurrentlyDeployed()
    const keysAlreadyIn = Object.keys(currentlyDeployed).filter(key => key in before)
    if (keysAlreadyIn.length) {
      throw new Error('Fruits already exist: ' + JSON.stringify(keysAlreadyIn))
    }
    Object.assign(before, currentlyDeployed)
  }

  await compileFunctions(before)
  await compileFunctions(after)

  return steps(before, after)
}

async function plan (fileName) {
  const [classes, probed] = probe(fileName)

  return _planWithProbed(classes, probed)
}

async function _deployWithSteps (steps) {
  for (const {type, config} of steps) {
    if (type === 'deploy') {
      await config.deploy()
    } else {
      /* istanbul ignore else */
      if (type === 'undeploy') {
        await config.undeploy()
      } else {
        assert(false, 'unreachable')
      }
    }
  }
}

async function deploy (fileName) {
  const steps = await plan(fileName)

  return _deployWithSteps(steps)
}

Object.assign(module.exports, {plan, _planWithProbed, deploy, _deployWithSteps})
