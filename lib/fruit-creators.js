'use strict'

const assert = require('assert').strict

class PostDeployProp {
  constructor (fruit, name, {processor = x => x} = {}) {
    this.fruit = fruit
    this.name = name
    this.processor = processor
  }
  resolve () {
    assert(this.fruit.deployed)
    return this.processor(this.fruit[this.name])
  }
  then (fn) {
    if (typeof fn !== 'function') {
      throw new Error('PostDeployProp.then() argument must be a function, got ' + typeof fn)
    }
    const processor = value => fn(this.processor(value))
    return new PostDeployProp(this.fruit, this.name, {processor})
  }
}

class StatelessFruit {
  constructor (name, config, { props = [], postDeployProps = [], deploy }) {
    validateConfig(config, props)
    Object.assign(this, config, {
      name,
      deployed: false,
      props,
      _deploy: deploy,
      postDeployProps,
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
  dependenciesResolved () {
    const postDeployProps = this.getPostDeployProps()
    assert(postDeployProps.every(([key, prop]) => prop.fruit.deployed))
    postDeployProps.forEach(([key, prop]) => {
      this[key] = prop.resolve()
    })
  }
  async deploy () {
    this.dependenciesResolved()
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
  getPostDeployProps () {
    return Object.keys(this)
      .filter(key => this[key] instanceof PostDeployProp)
      .map(key => [key, this[key]])
  }
}

class ConfigurationError extends Error {}

const forbiddenConfigProps =
  ['name', 'deployed', '_deploy', 'props', 'postDeployProps', '_onDeployQueue']

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

const Stateless = (fruitConfig = {}) => {
  return (name, config) => new StatelessFruit(name, config, fruitConfig)
}

Object.assign(module.exports, {Stateless, _PostDeployProp: PostDeployProp})
