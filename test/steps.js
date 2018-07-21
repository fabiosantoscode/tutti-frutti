'use strict'

let assert = require('assert')
assert = assert.strict || assert
const steps = require('../lib/steps')
const {compareProp} = steps
const FunctionDescription = require('../lib/function-description')
const {Stateless} = require('../lib/fruit-creators')

describe('steps', () => {
  const WithCode = Stateless({
    props: ['code'],
    getCurrentlyDeployed () {
      return {code: null}
    },
    deploy () { }
  })
  it('calculates deletion', () => {
    assert.deepEqual(
      steps(
        {lambda1: {code: 'hello world'}},
        {}
      ),
      [
        {type: 'undeploy', name: 'lambda1', config: {code: 'hello world'}}
      ]
    )
  })
  it('calculates addition', () => {
    const lambda1 = {code: 'hello world'}
    assert.deepEqual(
      steps(
        {},
        {lambda1}
      ),
      [
        {type: 'deploy', name: 'lambda1', config: lambda1}
      ]
    )
  })
  it('calculates addition with fruits', () => {
    const lambda1 = WithCode('lambda1', {code: 'hello world'})
    assert.deepEqual(
      steps(
        {},
        {lambda1}
      ),
      [
        {type: 'deploy', name: 'lambda1', config: lambda1}
      ]
    )
  })
  it('immutably deletes and adds when there is a difference', () => {
    assert.deepEqual(
      steps(
        {lambda1: {code: 'eh world'}},
        {lambda1: {code: 'he world'}}
      ),
      [
        { type: 'undeploy', name: 'lambda1', config: {code: 'eh world'} },
        { type: 'deploy', name: 'lambda1', config: {code: 'he world'} }
      ]
    )
  })
  it('works with multiple keys in different orders', () => {
    assert.deepEqual(
      steps(
        {lambda1: {code: 'hey'}, lambda2: {code: 'hi'}},
        {lambda2: {code: 'hi'}, lambda1: {code: 'hey'}}
      ),
      []
    )
  })
  describe('compareProp', () => {
    it('detects changes in FunctionDescription', () => {
      const funcDesc = 'function fakeCode() {}'
      const funcDesc2 = new FunctionDescription(() => null, {fileName: '/foo'})

      funcDesc2.compiled = funcDesc

      assert.equal(compareProp(null)('lambdaCode', funcDesc, funcDesc2), true)

      funcDesc2.compiled = 'function anotherFakeCode() {}'

      assert.equal(compareProp(null)('lambdaCode', funcDesc, funcDesc2), false)
    })
    it('detects changes when both are FunctionDescription', () => {
      const funcDesc = new FunctionDescription(() => null, {fileName: '/foo'})
      const funcDesc2 = new FunctionDescription(() => null, {fileName: '/foo'})

      funcDesc.compiled = funcDesc2.compiled = '() => null'

      assert.equal(compareProp(null)('lambdaCode', funcDesc, funcDesc2), true)

      funcDesc2.compiled = '() => 1'

      assert.equal(compareProp(null)('lambdaCode', funcDesc, funcDesc2), false)
    })
    it('reads the compareProps field', () => {
      let fakeReturn = true
      const CustomCompareFruit = Stateless({
        props: ['foo'],
        getCurrentlyDeployed () {},
        deploy () {},
        compareProps: {
          foo (a, b) {
            return fakeReturn
          }
        }
      })

      const before = { foo: '123' }
      const after = CustomCompareFruit('after', {
        foo: '456'
      })

      assert.equal(compareProp(CustomCompareFruit)('foo', before.foo, after.foo), true)
    })
  })
  it('detects dependencies between fruits and sorts them accordingly', () => {
    const dependency = Stateless({ props: ['foo'], postDeployProps: ['pdp'], getCurrentlyDeployed () {}, deploy () {} })('dependency', {foo: 'baz'})
    const foo = WithCode('foo', {code: dependency.postDeployProp('pdp')})

    assert.deepEqual(
      steps({
        foo: {code: 'fake-code'},
        dependency: { pdp: 'pdp-before', foo: 'bar' }
      }, {
        dependency,
        foo
      }),
      [
        {type: 'undeploy', name: 'dependency', config: {pdp: 'pdp-before', foo: 'bar'}},
        {type: 'deploy', name: 'dependency', config: dependency},
        {type: 'undeploy', name: 'foo', config: {code: 'fake-code'}},
        {type: 'deploy', name: 'foo', config: foo}
      ]
    )
  })
})
