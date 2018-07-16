'use strict'

const FunctionDescription = require('./function-description')

function loadJSON (json) {
  if (json._functionDescription) {
    return new FunctionDescription(json.fn, { fileName: json.fileName })
  }
  return json
}

module.exports = loadJSON
