'use strict'

const assert = require('assert')
const lodash = require('lodash')
const dependencyGraph = require('dependency-graph')
const FunctionDescription = require('./function-description')
const {usedPostDeployProps} = require('./fruit-creators')

function modify (name, a, b) {
  return [
    {type: 'undeploy', name},
    {type: 'deploy', name, config: b}
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

  const addSteps = steps.filter(step => step.type === 'deploy')

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
    deleteStep => deleteStep.type === 'undeploy' &&
    !steps.find(addStep => addStep.type === 'deploy' && addStep.name === deleteStep.name)
  )

  const sortedSteps = graph.overallOrder()
    .map(name => {
      const deleteStep = steps.find(step => step.type === 'undeploy' && step.name === name)
      const addStep = steps.find(step => step.type === 'deploy' && step.name === name)

      assert(addStep)

      return [deleteStep, addStep]
    })
    .reduce((a, b) => a.concat(b), [])
    .filter(step => step != null)

  return [...deleteStepsWithoutAdd, ...sortedSteps]
}

const compareProp = fruitClass => (propName, currentProp, nextProp) => {
  if (fruitClass && fruitClass.compareProps && fruitClass.compareProps[propName]) {
    return fruitClass.compareProps[propName](currentProp, nextProp)
  }
  if (nextProp instanceof FunctionDescription) {
    if (currentProp instanceof FunctionDescription) {
      return currentProp.compiled === nextProp.compiled
    }
    return currentProp === nextProp.compiled
  }
  return lodash.isEqual(currentProp, nextProp)
}

function steps (a, b) {
  fillNulls(a, b)

  const propsAreEqual = ([currentKey, currentProps], [nextKey, nextProps]) => {
    if (currentKey !== nextKey) {
      return false
    }

    const fruitClass =
      (nextProps && nextProps.fruitClass) ||
      (currentProps && currentProps.fruitClass)

    const comparer = compareProp(fruitClass)

    const propNames = fruitClass && fruitClass.props
      ? fruitClass.props
      : Object.keys(currentProps || nextProps)

    const allPropsEqual = propNames
      .every(
        prop => comparer(
          prop,
          currentProps && currentProps[prop],
          nextProps && nextProps[prop]
        )
      )

    return allPropsEqual
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
        return {type: 'deploy', name: key, config: b[key]}
      }
      /* istanbul ignore else */
      if (a[key] !== null && b[key] === null) {
        return {type: 'undeploy', name: key}
      }
      /* istanbul ignore next */
      assert(false)
    }
  ).reduce((a, b) => a.concat(b), []))
}

module.exports = steps
Object.assign(module.exports, {compareProp})
