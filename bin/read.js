#!/usr/bin/env node

const path = require('path')
const { createReadStream } = require('fs')
const { pipeline, finished, Transform } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')

const response = Stringify()
pipeline(response, Output(), debug).pipe(stdout)

const transform = {
  objectMode: true,
  transform(chunk, enc, cb) {
    this.push({ text: chunk.toString() })
    cb()
  },
  flush(cb) {
    this.push({ text: null })
    cb()
  }
}

const parser = pipeline(stdin, Input(), Parse(), debug)
parser.once('readable', doRead)
function doRead() {
  const chunk = parser.read()
  if (chunk === null)
    return parser.once('readable', doRead)
  const file = createReadStream(path.join(scripts_dir, chunk))
  finished(file, onFinished)
  pipeline(file, Transform(transform), debug).pipe(response, { end: false })
}

function onFinished(err) {
  response.write({ error: err })
  doRead()
}

function debug(error) {
  stderr.write(`${error || 'stream ended.'}\n`)
}
