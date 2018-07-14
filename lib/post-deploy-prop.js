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

module.exports = PostDeployProp
