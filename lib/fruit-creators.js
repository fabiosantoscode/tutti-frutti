'use strict'

const assert = require('assert')
const userAsyncFunction = require('user-async-function')
const PostDeployProp = require('./post-deploy-prop')
const loadJSON = require('./load-json')

class ConfigurationError extends Error {}
const ensureConfig = (condition, message) => {
  if (!condition) {
    throw new ConfigurationError(message)
  }
}

const forbiddenConfigProps =
  ['name', 'deployed', 'fruitClass', '_deploy', 'getCurrentlyDeployed', 'props', 'postDeployProps', '_onDeployQueue']

const validateConfig = (config, props) => {
  const missingProps = props.filter(prop => !(prop in config))
  ensureConfig(!missingProps.length, 'Missing props in configuration: ' + JSON.stringify(missingProps))
  Object.keys(config)
    .forEach(key => {
      if (forbiddenConfigProps.includes(key) || StatelessFruit.prototype[key]) {
        throw new ConfigurationError(
          'Forbidden configuration property ' + JSON.stringify(key)
        )
      }
    })
}

const usedPostDeployProps = fruit => {
  return Object.keys(fruit)
    .filter(key => fruit[key] instanceof PostDeployProp)
    .map(key => [key, fruit[key]])
}

class StatelessFruit {
  constructor (name, config, { props, postDeployProps, deploy, fruitClass }) {
    validateConfig(config, props)
    Object.assign(this, config, {
      name,
      deployed: false,
      props,
      _deploy: deploy,
      postDeployProps,
      fruitClass,
      _onDeployQueue: []
    })
  }
  onDeploy (fn) {
    if (this.deployed) {
      setImmediate(fn)
    } else {
      this._onDeployQueue.push(fn)
    }
  }
  postDeployProp (name) {
    if (!this.postDeployProps.includes(name)) {
      throw new Error('Unknown postDeployProp: ' + JSON.stringify(name))
    }
    return new PostDeployProp(this, name)
  }
  loadJSONPostDeployProps (data) {
    this.postDeployProps.forEach(prop => {
      assert(prop in data, 'Missing prop in probe data: ' + prop)
      this[prop] = loadJSON(data[prop])
    })
  }
  async deploy () {
    usedPostDeployProps(this).forEach(([key, prop]) => {
      this[key] = prop.resolve()
    })
    let fn
    while ((fn = this._onDeployQueue.pop())) {
      fn()
    }
    const ret = await userAsyncFunction(this._deploy.bind(this))
    this.postDeployProps.forEach(prop => {
      this[prop] = ret[prop]
    })
    const missingProps = this.postDeployProps.filter(prop => !(prop in ret))
    if (missingProps.length) {
      throw new Error('Missing props in return from deploy(): ' + JSON.stringify(missingProps))
    }
    this.deployed = true
    return ret
  }
}

const fruitClassFunctions = (fruitClass, fruitConfig) => ({
  async getCurrentlyDeployed () {
    const ret = await userAsyncFunction(fruitConfig.getCurrentlyDeployed)

    for (const fruitName of Object.keys(ret)) {
      const fruitInfo = ret[fruitName]

      const forFruitMsg = ' for fruit ' + JSON.stringify(fruitName)
      const missingProps = fruitConfig.props
        .filter(prop => !(prop in fruitInfo))
      if (missingProps.length) {
        throw new Error('getCurrentlyDeployed return is missing props: ' +
          JSON.stringify(missingProps) + forFruitMsg)
      }

      const extraProps = Object.keys(fruitInfo)
        .filter(prop => !(
          fruitConfig.props.includes(prop) ||
          fruitConfig.postDeployProps.includes(prop)
        ))
      if (extraProps.length) {
        throw new Error('getCurrentlyDeployed return has unknown props: ' + JSON.stringify(extraProps) + forFruitMsg)
      }
    }

    return ret
  }
})

const mandatoryFunctions = ['getCurrentlyDeployed', 'deploy']
const validConfigProps = [...mandatoryFunctions, 'props', 'postDeployProps', 'compareProps']
const Stateless = (fruitConfig) => {
  const fruitClass = (name, config) =>
    new StatelessFruit(name, config, fruitConfig)

  const unknownProps = Object.keys(fruitConfig).filter(prop => !validConfigProps.includes(prop))
  if (unknownProps.length) {
    throw new Error('Unknown fruit class config properties: ' +
      JSON.stringify(unknownProps))
  }
  for (const mandatoryFunction of mandatoryFunctions) {
    ensureConfig(
      typeof fruitConfig[mandatoryFunction] === 'function',
      'Missing ' + mandatoryFunction + ' function'
    )
  }

  Object.assign(fruitConfig, {
    fruitClass,
    props: fruitConfig.props || [],
    postDeployProps: fruitConfig.postDeployProps || []
  })

  Object.assign(
    fruitClass,
    fruitConfig,
    fruitClassFunctions(fruitClass, fruitConfig)
  )

  return fruitClass
}

Object.assign(module.exports, {Stateless, usedPostDeployProps})
