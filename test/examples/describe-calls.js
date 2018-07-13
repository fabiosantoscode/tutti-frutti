'use strict'

const { Immutable } = require('../../lib')

class BasicPieceOfInfrastructure extends Immutable { }

const basic = describe('basic', BasicPieceOfInfrastructure, {
  code: describeFunction((arg1, arg2) => {
    return 'hello packagedFunction! url is ' + basic.url
  })
})
