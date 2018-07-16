'use strict'

const assert = require('assert')
const lodash = require('lodash')
const FunctionDescription = require('./function-description')

function modify (name, a, b) {
  return [
    {type: 'delete', name},
    {type: 'add', name, config: b}
  ]
}

function fillNulls (a, b) {
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
  fillNulls(a, b)

  const toPlainProps = object => {
    if (object && object.props) {
      return lodash.fromPairs(
        object.props.map(prop => [prop, object[prop]])
      )
    }
    return object
  }

  const compareFunctionDescriptions = (currentProp, nextProp) => {
    if (nextProp instanceof FunctionDescription) {
      return currentProp === nextProp.compiled
    }
  }

  const propsAreEqual = ([currentKey, currentProps], [nextKey, nextProps]) => {
    if (currentKey !== nextKey) {
      return false
    }
    return lodash.isEqualWith(currentProps, toPlainProps(nextProps), compareFunctionDescriptions)
  }

  const modifiedKeys = lodash.differenceWith(
    lodash.toPairs(a),
    lodash.toPairs(b),
    propsAreEqual
  ).map(([k, v]) => k)

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
