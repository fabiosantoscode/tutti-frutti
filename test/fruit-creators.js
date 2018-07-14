'use strict'

const assert = require('assert').strict
const {Stateless, _PostDeployProp: PostDeployProp} = require('../lib/fruit-creators')

describe('fruit creators: Stateless(...)', () => {
  const FooProducer = Stateless({
    postDeployProps: ['foo'],
    async deploy () {
      return {
        foo: 'test-foo'
      }
    }
  })
  const Subject = Stateless({
    props: ['foo'],
    postDeployProps: ['bar'],
    async deploy () {
      return {
        bar: 'baz'
      }
    }
  })
  it('validates config', () => {
    assert.throws(() => {
      Subject('test', { })
    }, /Missing props in configuration: \["foo"\]/)
    assert.throws(() => {
      Subject('test', { foo: 'bar', deploy: 'forbidden' })
    }, /Forbidden configuration property "deploy"/)
  })
  it('validates postDeployProp() calls', () => {
    assert.throws(() => {
      FooProducer('fooProd', {}).postDeployProp('bar')
    }, /Unknown postDeployProp: "bar"/)
  })
  it('validates return from deploy()', async () => {
    const FruitCreator = Stateless({
      postDeployProps: ['neverReturned'],
      deploy () {
        return {}
      }
    })

    const subject = FruitCreator('subject', {})

    await assert.rejects(async () => {
      await subject.deploy()
    }, /Missing props in return from deploy\(\): \["neverReturned"\]/)
  })
  it('adds props to object', () => {
    const subject = Subject('subject', { foo: 'bar' })
    assert.equal(subject.foo, 'bar')
  })
  it('can use each others postDeployProps', async () => {
    const fooProd = FooProducer('fooprod', {})
    const subject = Subject('subject', {
      foo: fooProd.postDeployProp('foo').then(value => 'thenned-' + value)
    })

    // Too soon: fooProd hasn't been deployed
    await assert.rejects(async () => {
      await subject.deploy()
    }, /AssertionError/)

    await fooProd.deploy()

    await subject.deploy()

    assert.equal(subject.foo, 'thenned-test-foo')
  })
  it('calls onDeploy functions on deploy', async () => {
    const subject = Subject('subject', { foo: 'bar' })

    let called = false
    subject.onDeploy(() => { called = true })

    await subject.deploy()

    assert.equal(called, true)
  })
  it('calls functions after setImmediate if already deployed', (cb) => {
    const subject = Subject('subject', { foo: 'bar' })

    subject.deployed = true

    let called = false
    subject.onDeploy(() => { called = true })

    assert.equal(called, false)
    setImmediate(() => {
      assert.equal(called, true)
      cb()
    })
  })
})

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
