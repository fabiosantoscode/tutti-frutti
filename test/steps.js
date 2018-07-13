'use strict'

const assert = require('assert').strict
const steps = require('../lib/steps')

describe('steps', () => {
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
    assert.deepEqual(
      steps(
        {},
        {lambda1: {code: 'hello world'}}
      ),
      [
        {type: 'add', name: 'lambda1', config: {code: 'hello world'}}
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
})
