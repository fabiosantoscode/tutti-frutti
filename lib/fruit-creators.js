'use strict'

const PostDeployProp = require('./post-deploy-prop')

class ConfigurationError extends Error {}

const forbiddenConfigProps =
  ['name', 'deployed', 'fruitClass', '_deploy', 'props', 'postDeployProps', '_onDeployQueue']

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
  constructor (name, config, { props = [], postDeployProps = [], deploy, fruitClass }) {
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
  async deploy () {
    usedPostDeployProps(this).forEach(([key, prop]) => {
      this[key] = prop.resolve()
    })
    let fn
    while ((fn = this._onDeployQueue.pop())) {
      fn()
    }
    const ret = await this._deploy()
    this.postDeployProps.forEach(prop => {
      this[prop] = ret[prop]
    })
    const missingProps = this.postDeployProps.filter(prop => {
      return !(prop in ret)
    })
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
  return fruitClass
}

Object.assign(module.exports, {Stateless})
