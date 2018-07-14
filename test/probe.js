'use strict'

const assert = require('assert').strict
const path = require('path')
const probe = require('../lib/probe')
const FunctionDescription = require('../lib/function-description')

describe('probe', () => {
  it('finds and reports describe calls in a file', () => {
    const fileName = path.join(__dirname, 'examples/describe-calls.js')
    const probed = probe(fileName)

    const BasicPieceOfInfrastructure = probed.basic.class
    const describedFunction = probed.basic.config.code.fn

    assert.deepEqual(probed, {
      basic: {
        name: 'basic',
        class: BasicPieceOfInfrastructure,
        config: {
          code: new FunctionDescription(describedFunction, { fileName })
        }
      }
    })
  })
  it('errors when two equal describe calls are found', () => {
    const fileName = path.join(__dirname, 'examples/error-two-equal-describe-calls.js')

    assert.throws(() => {
      probe(fileName)
    }, /two fruits with the same name have been created: "basic"/)
  })
})
