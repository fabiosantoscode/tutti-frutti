'use strict'

class FunctionDescription {
  constructor (fn, { fileName } = {}) {
    this._functionDescription = true
    this.fn = fn
    this.fileName = fileName
  }
  toJSON () {
    return Object.assign({}, this, {fn: this.fn.toString()})
  }
}

module.exports = FunctionDescription
