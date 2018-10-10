#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { promisify } = require('util')
const { pipeline, Transform } = require('stream')
const { Input, Output, Parse, Stringify } = require('./protocol.js')
const { stdin, stdout, stderr } = process

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')
const unlink = promisify(fs.unlink)

const transform = Transform({
  objectMode: true,
  transform(chunk, enc, cb) {
    unlinkFile(chunk)
      .then(() => this.push({ error: null }))
      .catch(e => this.push({ error: e.toString() }))
      .finally(cb)
  }
})

async function unlinkFile(filename) {
  await unlink(path.join(scripts_dir, filename))
}

pipeline(stdin, Input(), Parse(), transform, Stringify(), Output(),
  e => stderr.write(`${e || 'end of stream'}`))
  .pipe(stdout)
