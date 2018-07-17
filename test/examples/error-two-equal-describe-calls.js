'use strict'

const {Stateless} = require('../../lib')

const BasicPieceOfInfrastructure = Stateless({
  deploy () {},
  getCurrentlyDeployed () {}
})

describe('basic', BasicPieceOfInfrastructure, {})

// this should cause an error
describe('basic', BasicPieceOfInfrastructure, {})
