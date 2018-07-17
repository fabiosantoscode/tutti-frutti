'use strict'

const {Stateless} = require('../../lib')

const BasicPieceOfInfrastructure = Stateless({
  props: ['code'],
  postDeployProps: ['url'],
  getCurrentlyDeployed () {
    // go to platform API...
    return {
      basic: {
        code: describeFunction(packagedFunction)
      }
    }
  },
  async deploy () {
    return {
      url: 'http://example.com/url'
    }
  }
})

const packagedFunction = (arg1, arg2) => {
  return 'hello packagedFunction! url is ' + basic.url
}

const basic = describe('basic', BasicPieceOfInfrastructure, {
  code: describeFunction(packagedFunction)
})
