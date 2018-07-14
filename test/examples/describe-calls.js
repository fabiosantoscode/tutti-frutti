'use strict'

const {Stateless} = require('../../lib')

const BasicPieceOfInfrastructure = Stateless()

const basic = describe('basic', BasicPieceOfInfrastructure, {
  code: describeFunction((arg1, arg2) => {
    return 'hello packagedFunction! url is ' + basic.url
  })
})
