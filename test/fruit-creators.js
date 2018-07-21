'use strict'

const assert = require('assert')
const {Stateless} = require('../lib/fruit-creators')

describe('fruit creators: Stateless(...)', () => {
  const FooProducer = Stateless({
    postDeployProps: ['foo'],
    getCurrentlyDeployed () {
      return {
        foo: 'current-foo'
      }
    },
    async deploy () {
      return {
        foo: 'test-foo'
      }
    }
  })
  const Subject = Stateless({
    props: ['foo'],
    postDeployProps: ['bar'],
    getCurrentlyDeployed () {
      return {
        foo: 'current-foo',
        bar: 'current-bar'
      }
    },
    async deploy () {
      return {
        bar: 'baz'
      }
    }
  })
  const Undeployable = Stateless({
    getCurrentlyDeployed () {},
    async deploy () { },
    async undeploy () { }
  })
  describe('fruitClass', () => {
    it('is assigned to fruit instances', () => {
      assert.equal(FooProducer('fooProd', {}).fruitClass, FooProducer)
    })
    it('Have props, postDeployProps, getCurrentlyDeployed and deploy assigned to them', () => {
      assert.deepEqual(Subject.props, ['foo'])
      assert.deepEqual(Subject.postDeployProps, ['bar'])
      assert.equal(typeof Subject.getCurrentlyDeployed, 'function')
      assert.equal(typeof Subject.deploy, 'function')
    })
    it('validates props', () => {
      assert.throws(() => {
        Stateless({ props: ['deploy'], getCurrentlyDeployed () {}, deploy () {} })
      }, /Forbidden configuration property "deploy"/)
    })
  })
  it('validates config', () => {
    assert.throws(() => {
      Subject('test', { })
    }, /Missing props in configuration: \["foo"\]/)
    assert.throws(() => {
      Subject('test', { foo: 'bar', bar: 'baz' })
    }, /Extra props in configuration: \["bar"\]/)
  })
  it('validates postDeployProp() calls', () => {
    assert.throws(() => {
      FooProducer('fooProd', {}).postDeployProp('bar')
    }, /Unknown postDeployProp: "bar"/)
  })
  it('ensures fruit class configs do not have unknown properties', () => {
    try {
      Stateless({
        unknownProperty: null
      })
      assert(false)
    } catch (e) {
      assert.equal(e.message, 'Unknown fruit class config properties: ["unknownProperty"]')
    }
  })
  it('ensures fruit classes have getCurrentlyDeployed', () => {
    try {
      Stateless({ props: ['prop'] })
      assert(false)
    } catch (e) {
      assert.equal(e.message, 'Missing getCurrentlyDeployed function')
    }
  })
  it('ensures fruits have deploy function', () => {
    try {
      Stateless({
        props: [],
        getCurrentlyDeployed () { }
      })
      assert(false)
    } catch (e) {
      assert.equal(e.message, 'Missing deploy function')
    }
  })
  it('ensures fruits have undeploy function when undeploying', async () => {
    const subject = Subject('subject', { foo: 'bar' })

    try {
      await subject.undeploy()
      assert(false)
    } catch (e) {
      assert.equal(e.message, 'Cannot undeploy "subject", as its FruitClass doesn\'t have an undeploy function')
    }
  })
  it('validates return from deploy()', async () => {
    const FruitCreator = Stateless({
      postDeployProps: ['neverReturned'],
      getCurrentlyDeployed: () => null,
      deploy () {
        return {}
      }
    })

    const subject = FruitCreator('subject', {})

    try {
      await subject.deploy()
      assert(false)
    } catch (e) {
      assert.equal(e.message, 'Missing props in return from deploy(): ["neverReturned"]')
    }
  })
  it('converts errors from creating a fruit out of getCurrentlyDeployed() keys', async () => {
    const FaultyFruitCreator = Stateless({
      deploy () {},
      getCurrentlyDeployed () {
        return {
          lambda1: {
            extraProp: 'foo'
          }
        }
      }
    })

    try {
      await FaultyFruitCreator.getCurrentlyDeployed()
      assert(false)
    } catch (e) {
      assert.equal(
        e.message,
        'Error while converting getCurrentlyDeployed().lambda1: Extra props in configuration: ["extraProp"]'
      )
    }
  })
  it('returns result of getCurrentlyDeployed', async () => {
    const FruitCreator = Stateless({
      props: ['foo'],
      deploy () {},
      getCurrentlyDeployed () {
        return {
          lambda1: { foo: 'bar' }
        }
      }
    })

    assert.deepEqual(
      await FruitCreator.getCurrentlyDeployed(),
      {
        lambda1: FruitCreator('lambda1', { foo: 'bar' })
      }
    )
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

    // Too soon: fooProd hasn't been deployed, so it throws
    try {
      await subject.deploy()
      assert(false)
    } catch (e) { }

    await fooProd.deploy()

    await subject.deploy()

    assert.equal(subject.foo, 'thenned-test-foo')
  })
  it('can load postDeployProps from JSON', () => {
    const subject = FooProducer('subject')

    subject.loadJSONPostDeployProps({ foo: 'json-foo', bar: 'not-found' })

    assert.equal(subject.foo, 'json-foo')
    assert.equal(subject.bar, undefined)
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
  it('calls onUndeploy() functions when undeployed', async () => {
    const subject = Undeployable('subject')

    let called = false

    subject.onUndeploy(() => { called = true })

    await subject.undeploy()

    assert.equal(called, true)
  })
  it('calls onUndeploy functions after setImmediate when already undeployed', async () => {
    const subject = Undeployable('subject')

    await subject.undeploy()

    let called = false

    subject.onUndeploy(() => { called = true })

    assert.equal(called, false)

    await new Promise(setImmediate)

    assert.equal(called, true)
  })
})
