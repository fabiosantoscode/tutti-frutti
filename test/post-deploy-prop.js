'use strict'

const assert = require('assert').strict
const PostDeployProp = require('../lib/post-deploy-prop')

describe('PostDeployProp', () => {
  it('resolves to a mapped value', () => {
    const pdp = new PostDeployProp({ deployed: true, test: '123' }, 'test')
      .then(value => value + '456')

    assert.equal(pdp.resolve(), '123456')
  })
  it('validates then() argument', () => {
    assert.throws(() => {
      new PostDeployProp().then('foo')
    }, /PostDeployProp.then\(\) argument must be a function, got string/)
  })
})
