'use strict'

const {Stateless} = require('../../lib')

const BasicPieceOfInfrastructure = Stateless({
  props: ['code'],
  postDeployProps: ['url'],
  getCurrentProps () {
    // go to platform API...
    return {
      code: '() => null'
    }
  },
  async deploy () {
    return {
      url: 'http://example.com/url'
    }
  }
})

const basic = describe('basic', BasicPieceOfInfrastructure, {
  code: describeFunction((arg1, arg2) => {
    return 'hello packagedFunction! url is ' + basic.url
  })
})
