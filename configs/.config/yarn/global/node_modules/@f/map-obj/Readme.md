
# map-obj

[![Build status][travis-image]][travis-url]
[![Git tag][git-image]][git-url]
[![NPM version][npm-image]][npm-url]
[![Code style][standard-image]][standard-url]

Map for objects.

## Installation

    $ npm install @f/map-obj

## Usage

```js
var mapObj = require('@f/map-obj')

mapObj(addOne, {a: 1, b: 2}) // => {a: 2, b: 3}

function addOne (v) {
  return v + 1
}

```

## API

### mapObj(fn, obj)

- `fn` - map function
- `obj` - obj to map over

**Returns:** mapped object

## License

MIT

[travis-image]: https://img.shields.io/travis/micro-js/map-obj.svg?style=flat-square
[travis-url]: https://travis-ci.org/micro-js/map-obj
[git-image]: https://img.shields.io/github/tag/micro-js/map-obj.svg
[git-url]: https://github.com/micro-js/map-obj
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat
[standard-url]: https://github.com/feross/standard
[npm-image]: https://img.shields.io/npm/v/@f/map-obj.svg?style=flat-square
[npm-url]: https://npmjs.org/package/@f/map-obj
