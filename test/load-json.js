'use strict'

let assert = require('assert')
assert = assert.strict || assert
const loadJSON = require('../lib/load-json')
const FunctionDescription = require('../lib/function-description')

describe('load-json', () => {
  it('can load FunctionDescription from JSON', () => {
    const fd = loadJSON(JSON.parse(JSON.stringify(new FunctionDescription(x => x + '!', { fileName: '/foo' }))))

    assert.equal(fd.fn, 'x => x + \'!\'')
    assert.equal(fd.fileName, '/foo')
  })
  it('loads other objects', () => {
    assert.equal(loadJSON('foo'), 'foo')
    assert.deepEqual(loadJSON({foo: 'bar'}), {foo: 'bar'})
    assert.equal(loadJSON(123), 123)
  })
})
