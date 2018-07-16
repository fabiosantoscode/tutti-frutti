'use strict'

let assert = require('assert')
assert = assert.strict || assert
const FunctionDescription = require('../lib/function-description')

describe('function-description', () => {
  it('defaults the filename to undefined', () => {
    assert.equal(new FunctionDescription(() => null).fileName, undefined)
  })
  it('has a toJSON call so it can be passed into compiled functions', () => {
    const fn = () => null

    assert.deepEqual(
      new FunctionDescription(fn, {fileName: '/foo'}).toJSON(),
      {
        _functionDescription: true,
        fn: fn.toString(),
        fileName: '/foo'
      }
    )
  })
})
