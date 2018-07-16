'use strict'

const assert = require('assert')
const {Stateless} = require('../lib/fruit-creators')

describe('fruit creators: Stateless(...)', () => {
  const FooProducer = Stateless({
    postDeployProps: ['foo'],
    getCurrentProps () {
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
    getCurrentProps () {
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
  it('ensures fruit classes have getCurrentProps', () => {
    try {
      Stateless({ props: ['prop'] })
      assert(false)
    } catch (e) {
      assert.equal(e.message, 'Missing getCurrentProps function in a fruit with props')
    }
  })
  it('validates return from deploy()', async () => {
    const FruitCreator = Stateless({
      postDeployProps: ['neverReturned'],
      getCurrentProps: () => null,
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
  it('validates return from getCurrentProps()', async () => {
    const FruitCreator = Stateless({
      props: ['mustHave'],
      getCurrentProps () {
        return {}
      }
    })
    const subject = FruitCreator('subject', { mustHave: 'foo' })

    try {
      await subject.getCurrentProps()
      assert(false)
    } catch (e) {
      assert.equal(e.message, 'getCurrentProps return is missing props: ["mustHave"]')
    }
  })
  it('can get current state', async () => {
    const correctSubject = Subject('correct', { foo: 'bar' })

    assert.deepEqual(
      await correctSubject.getCurrentProps(),
      { foo: 'current-foo', bar: 'current-bar' }
    )
  })
  it('understands that null means it\'s not deployed', async () => {
    const NotDeployed = Stateless({ props: ['foo'], getCurrentProps () { return null } })
    assert(
      await NotDeployed('notdeployed', {foo: 'bar'}).getCurrentProps() === null
    )
  })
  it('can get current state of a prop-less component', async () => {
    const PropLess = Stateless({ props: [] })
    assert.deepEqual(
      await PropLess('propless', {}).getCurrentProps(),
      {}
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
    const subject = FooProducer('subject', { foo: null })

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
})
