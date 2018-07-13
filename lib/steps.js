'use strict'

const assert = require('assert').strict
const lodash = require('lodash')
const deepEqual = require('deep-equal')
const objectDiff = require('object-diff').custom

function modify (name, a, b) {
  return [
    {type: 'delete', name},
    {type: 'add', name, config: b}
  ]
}

function fillNulls(a, b) {
  Object.keys(a).forEach(key => {
    if (!(key in b)) {
      b[key] = null
    }
  })

  Object.keys(b).forEach(key => {
    if (!(key in a)) {
      a[key] = null
    }
  })
}

function steps (a, b) {
  let out = []

  fillNulls(a, b)

  const modifiedKeys = Object.keys(objectDiff({equal: deepEqual}, a, b))

  return modifiedKeys.map(
    key => {
      if (a[key] !== null && b[key] !== null) {
        return modify(key, a[key], b[key])
      }
      if (a[key] === null && b[key] !== null) {
        return {type: 'add', name: key, config: b[key]}
      }
      /* istanbul ignore else */
      if (a[key] !== null && b[key] === null) {
        return {type: 'delete', name: key}
      }
      /* istanbul ignore next */
      assert(false)
    }
  ).reduce((a, b) => a.concat(b), [])
}

module.exports = steps
