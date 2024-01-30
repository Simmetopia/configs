/**
 * Imports
 */

var mapObj = require('..')
var test = require('tape')

/**
 * Tests
 */

test('should map', function (t) {
  var obj = {a: 1, b: 2}

  t.deepEqual(mapObj(addOne, obj), {a: 2, b: 3})
  t.end()
})

function addOne(v) {
  return v + 1
}
