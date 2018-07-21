'use strict'

let assert = require('assert')
assert = assert.strict || assert
const path = require('path')
const commands = require('../lib/commands')
const FunctionDescription = require('../lib/function-description')

const describeExampleFile = path.join(__dirname, 'examples/describe-calls.js')

describe('commands', () => {
  describe('plan', () => {
    it('probes a file and returns what has changed', async () => {
      assert.deepEqual(
        await commands.plan(describeExampleFile),
        []
      )
    })
    it('compiles functions', async () => {
      const probed = {
        lambda1: {
          notCompiledProp: {},
          code: new FunctionDescription(() => null, {
            fileName: describeExampleFile
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
  describe('deploy', () => {
    it('can deploy an infrastructure', async () => {
      await commands.deploy(describeExampleFile)
    })
    it('runs deploy and undeploy', async () => {
      let deployed = false
      let undeployed = false
      await commands._deployWithSteps(
        [
          {type: 'undeploy', config: {undeploy () { undeployed = true }}},
          {type: 'deploy', config: {deploy () { deployed = true }}}
        ]
      )

      assert.equal(deployed, true)
      assert.equal(undeployed, true)
    })
  })
})
