'use strict'

const assert = require('assert')
const userAsyncFunction = require('user-async-function')
const PostDeployProp = require('./post-deploy-prop')
const loadJSON = require('./load-json')

class ConfigurationError extends Error {}

const forbiddenConfigProps =
  ['name', 'deployed', 'fruitClass', '_deploy', '_getCurrentProps', 'props', 'postDeployProps', '_onDeployQueue']

const validateConfig = (config, props) => {
  const missingProps = props.filter(prop => !(prop in config))
  if (missingProps.length) {
    throw new ConfigurationError(
      'Missing props in configuration: ' + JSON.stringify(missingProps)
    )
  }
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
  constructor (name, config, { props = [], postDeployProps = [], deploy, getCurrentProps, fruitClass }) {
    validateConfig(config, props)
    Object.assign(this, config, {
      name,
      deployed: false,
      props,
      _deploy: deploy,
      _getCurrentProps: getCurrentProps,
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
  async getCurrentProps () {
    if (!(this.props.length + this.postDeployProps.length)) {
      return {}
    }
    const ret = await userAsyncFunction(this._getCurrentProps.bind(this))

    if (ret === null) {
      return null
    }

    const missingKeys = [...this.props, ...this.postDeployProps].filter(prop => !(prop in ret))

    if (missingKeys.length) {
      throw new Error('getCurrentProps return is missing props: ' + JSON.stringify(missingKeys))
    }

    return ret
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

const Stateless = (fruitConfig = {}) => {
  const fruitClass = (name, config) =>
    new StatelessFruit(name, config, fruitConfig)
  fruitConfig.fruitClass = fruitClass
  const hasAnyProps = (fruitConfig.props && fruitConfig.props.length) ||
    (fruitConfig.postDeployProps && fruitConfig.postDeployProps.length)
  if (hasAnyProps && !fruitConfig.getCurrentProps) {
    throw new Error('Missing getCurrentProps function in a fruit with props')
  }
  return fruitClass
}

Object.assign(module.exports, {Stateless, usedPostDeployProps})
