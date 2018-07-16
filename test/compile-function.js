'use strict'

let assert = require('assert')
assert = assert.strict || assert
const path = require('path')
const probe = require('../lib/probe')
const compileFunction = require('../lib/compile-function')

function evalNode (code) {
  const module = {}
  /* eslint-disable */
  const exports = module.exports = {}

  eval(code)

  return module.exports
}

describe('compile-function', () => {
  it('can compile itself with webpack', async () => {
    const fileName = path.join(__dirname, 'examples/describe-calls.js')

    const probed = probe(fileName)
    const functionDesc = probed.basic.code

    await probed.basic.deploy()

    const compiled = await compileFunction(functionDesc, probed)

    const exports = evalNode(compiled)

    assert.equal(exports(), 'hello packagedFunction! url is http://example.com/url')
  })
})
