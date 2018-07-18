'use strict'

let assert = require('assert')
assert = assert.strict || assert
const path = require('path')
const commands = require('../lib/commands')
const FunctionDescription = require('../lib/function-description')

describe('commands', () => {
  describe('plan', () => {
    it('probes a file and returns what has changed', async () => {
      assert.deepEqual(
        await commands.plan(path.join(__dirname, 'examples/describe-calls.js')),
        []
      )
    })
    it('compiles functions', async () => {
      const probed = {
        lambda1: {
          notCompiledProp: {},
          code: new FunctionDescription(() => null, {
            fileName: path.join(__dirname, 'examples/describe-calls.js')
          })
        }
      }
      await commands._planWithProbed([], probed)
      assert(probed.lambda1.code.compiled)
      assert(!probed.lambda1.notCompiledProp.compiled)
    })
    it('does not allow duplicate keys resulting from multiple calls to getCurrentlyDeployed', async () => {
      const classes = [
        {
          getCurrentlyDeployed: () => ({ existingFruit: {} })
        },
        {
          getCurrentlyDeployed: () => ({ existingFruit: {} })
        }
      ]
      try {
        await commands._planWithProbed(classes, {})
        assert(false)
      } catch (e) {
        assert.equal(e.message, 'Fruits already exist: ["existingFruit"]')
      }
    })
  })
})
