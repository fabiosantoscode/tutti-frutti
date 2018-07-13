'use strict'

const {Stateless} = require('../../lib')

class BasicPieceOfInfrastructure extends Stateless { }

const basic = describe('basic', BasicPieceOfInfrastructure, {
  code: describeFunction((arg1, arg2) => {
    return 'hello packagedFunction! url is ' + basic.url
  })
})
