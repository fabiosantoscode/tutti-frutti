'use strict'

let assert = require('assert')
assert = assert.strict || assert
const steps = require('../lib/steps')
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
        {type: 'delete', name: 'lambda1'}
      ]
    )
  })
  it('calculates addition', () => {
    const lambda1 = WithCode('lambda1', {code: 'hello world'})
    assert.deepEqual(
      steps(
        {},
        {lambda1}
      ),
      [
        {type: 'add', name: 'lambda1', config: lambda1}
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
        { type: 'delete', name: 'lambda1' },
        { type: 'add', name: 'lambda1', config: {code: 'he world'} }
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
  it('detects changes in FunctionDescription', () => {
    const funcDesc = 'function fakeCode() {}'
    const funcDesc2 = new FunctionDescription(() => null, {fileName: '/foo'})

    funcDesc2.compiled = funcDesc

    assert.deepEqual(
      steps(
        {lambda1: {code: funcDesc}},
        {lambda1: {code: funcDesc2}}
      ),
      []
    )

    funcDesc2.compiled = 'function anotherFakeCode() {}'

    assert.deepEqual(
      steps(
        {lambda1: {code: funcDesc}},
        {lambda1: {code: funcDesc2}}
      ),
      [
        {type: 'delete', name: 'lambda1'},
        {type: 'add', name: 'lambda1', config: {code: funcDesc2}}
      ]
    )
  })
  it('detects dependencies between fruits and sorts them accordingly', () => {
    const dependency = Stateless({ postDeployProps: ['pdp'], getCurrentlyDeployed () {}, deploy () {} })('dependency', {})
    const foo = WithCode('foo', {code: dependency.postDeployProp('pdp')})

    assert.deepEqual(
      steps({
        foo: {code: 'fake-code'},
        dependency: { pdp: 'pdp-before' }
      }, {
        foo,
        dependency
      }),
      [
        {type: 'delete', name: 'dependency'},
        {type: 'add', name: 'dependency', config: dependency},
        {type: 'delete', name: 'foo'},
        {type: 'add', name: 'foo', config: foo}
      ]
    )
  })
})
