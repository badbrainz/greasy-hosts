#!/usr/bin/env node

const path = require('path')
const util = require('util')
const { createWriteStream } = require('fs')
const { pipeline, finished, Transform } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')
const finish = util.promisify(finished)
const file = {}

const transformer = Transform({
  objectMode: true,
  transform(chunk, enc, cb) {
    writeToFile(chunk)
      .then(() => this.push({ error: null }))
      .catch(e => this.push({ error: e.toString() }))
      .finally(cb)
  }
})

async function writeToFile(chunk) {
  if (!file.stream) {
    file.stream = createWriteStream(path.join(scripts_dir, chunk.toString()))
    file.eof = finish(file.stream)
    file.eof.finally(() => {
      file.stream = null
      file.eof = null
    })
  }
  else if (chunk.text != null) {
    if (file.stream.write(chunk.text) === false) {
      await new Promise((resolve) => {
        file.stream.once('drain', resolve)
      })
    }
  }
  else {
    file.stream.end()
    await file.eof.finally()
  }
}

pipeline(stdin, Input(), Parse(), transformer, Stringify(), Output(),
  e => stderr.write(`${e || 'end of stream'}`))
  .pipe(stdout)
