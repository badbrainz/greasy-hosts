#!/usr/bin/env node

const path = require('path')
const util = require('util')
const { createReadStream } = require('fs')
const { pipeline, finished, Transform } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')
const finish = util.promisify(finished)

const transform = Transform({
  objectMode: true,
  transform(chunk, enc, cb) {
    readFile(chunk.toString().trim())
      .catch(e => this.push({ error: e.toString() }))
      .finally(cb)
  }
})

async function readFile(filename) {
  const file = path.join(scripts_dir, filename)
  for await (const chunk of createReadStream(file)) {
    if (transform.push({ text: chunk.toString() }) === false) {
      await new Promise((resolve) => {
        transform.on('drain', resolve)
      })
    }
  }
  transform.push({ text: null })
}

pipeline(stdin, Input(), Parse(), transform, Stringify(), Output(),
  e => stderr.write(`${e || 'end of stream'}`))
  .pipe(stdout)
