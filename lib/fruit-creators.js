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
  ['name', 'deployed', 'undeployed', 'fruitClass', '_deploy', '_undeploy', 'getCurrentlyDeployed', 'props', 'postDeployProps', '_onDeployQueue']

const validateConfig = (config, props) => {
  const missingProps = props.filter(prop => !(prop in config))
  ensureConfig(!missingProps.length, 'Missing props in configuration: ' + JSON.stringify(missingProps))
  const extraProps = Object.keys(config).filter(configKey => !props.includes(configKey))
  ensureConfig(!extraProps.length, 'Extra props in configuration: ' + JSON.stringify(extraProps))
}

const usedPostDeployProps = fruit => {
  return Object.keys(fruit)
    .filter(key => fruit[key] instanceof PostDeployProp)
    .map(key => [key, fruit[key]])
}

class StatelessFruit {
  constructor (name, config, { props, postDeployProps, deploy, undeploy, fruitClass }) {
    validateConfig(config, props)
    Object.assign(this, config, {
      name,
      deployed: false,
      undeployed: false,
      props,
      _deploy: deploy,
      _undeploy: undeploy,
      postDeployProps,
      fruitClass,
      _onDeployQueue: [],
      _onUndeployQueue: [],
    })
  }
  onDeploy (fn) {
    if (this.deployed) {
      setImmediate(fn)
    } else {
      this._onDeployQueue.push(fn)
    }
  }
  onUndeploy (fn) {
    if (this.undeployed) {
      setImmediate(fn)
    } else {
      this._onUndeployQueue.push(fn)
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
      await fn()
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
    this.undeployed = false
    return ret
  }
  async undeploy () {
    if (typeof this._undeploy !== 'function') {
      throw new Error('Cannot undeploy ' + JSON.stringify(this.name) + ', as its FruitClass doesn\'t have an undeploy function')
    }
    let fn
    while ((fn = this._onUndeployQueue.pop())) {
      await fn()
    }
    await userAsyncFunction(this._undeploy.bind(this))
    this.deployed = false
    this.undeployed = true
  }
}

const fruitClassFunctions = (fruitClass, clsConfig) => ({
  async getCurrentlyDeployed () {
    const ret = await userAsyncFunction(clsConfig.getCurrentlyDeployed)

    for (const fruitName of Object.keys(ret)) {
      const fruitInfo = ret[fruitName]

      try {
        ret[fruitName] = fruitClass(fruitName, fruitInfo)
      } catch (e) {
        throw new Error(
          'Error while converting getCurrentlyDeployed().' + fruitName + ': ' + e.message
        )
      }
    }

    return ret
  }
})

const mandatoryFunctions = ['getCurrentlyDeployed', 'deploy']
const validConfigProps = [...mandatoryFunctions, 'undeploy', 'props', 'postDeployProps', 'compareProps']
const Stateless = (clsConfig) => {
  const fruitClass = (name, config = {}) =>
    new StatelessFruit(name, config, clsConfig)

  const unknownProps = Object.keys(clsConfig).filter(prop => !validConfigProps.includes(prop))
  if (unknownProps.length) {
    throw new Error('Unknown fruit class config properties: ' +
      JSON.stringify(unknownProps))
  }
  for (const mandatoryFunction of mandatoryFunctions) {
    ensureConfig(
      typeof clsConfig[mandatoryFunction] === 'function',
      'Missing ' + mandatoryFunction + ' function'
    )
  }

  Object.assign(clsConfig, {
    fruitClass,
    props: clsConfig.props || [],
    postDeployProps: clsConfig.postDeployProps || []
  })

  clsConfig.props
    .forEach(prop => {
      if (forbiddenConfigProps.includes(prop) || StatelessFruit.prototype[prop])
        throw new ConfigurationError(
          'Forbidden configuration property ' + JSON.stringify(prop)
        )
    })

  Object.assign(
    fruitClass,
    clsConfig,
    fruitClassFunctions(fruitClass, clsConfig)
  )

  if (global.tuttiFrutti) {
    // A probe is active
    global.tuttiFrutti.registerClass(fruitClass)
  }

  return fruitClass
}

Object.assign(module.exports, {Stateless, usedPostDeployProps})
