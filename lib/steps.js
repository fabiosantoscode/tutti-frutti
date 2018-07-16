'use strict'

const assert = require('assert')
const lodash = require('lodash')
const dependencyGraph = require('dependency-graph')
const FunctionDescription = require('./function-description')
const {usedPostDeployProps} = require('./fruit-creators')

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

function dependencySort (steps) {
  const graph = new dependencyGraph.DepGraph()

  const addSteps = steps.filter(step => step.type === 'add')

  for (const addStep of addSteps) {
    graph.addNode(addStep.name)
  }

  // find usage of .postDeployProp()
  for (const addStep of addSteps) {
    for (const [_, value] of usedPostDeployProps(addStep.config)) {  // eslint-disable-line
      const dependencyStep = steps.find(addStep => addStep.config === value.fruit)
      assert(dependencyStep)
      graph.addDependency(addStep.name, dependencyStep.name)
    }
  }

  const deleteStepsWithoutAdd = steps.filter(
    deleteStep => deleteStep.type === 'delete' &&
    !steps.find(addStep => addStep.type === 'add' && addStep.name === deleteStep.name)
  )

  const sortedSteps = graph.overallOrder()
    .map(name => {
      const deleteStep = steps.find(step => step.type === 'delete' && step.name === name)
      const addStep = steps.find(step => step.type === 'add' && step.name === name)

      assert(addStep)

      return [deleteStep, addStep]
    })
    .reduce((a, b) => a.concat(b), [])
    .filter(step => step != null)

  return [...deleteStepsWithoutAdd, ...sortedSteps]
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

  return dependencySort(modifiedKeys.map(
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
  ).reduce((a, b) => a.concat(b), []))
}

module.exports = steps
