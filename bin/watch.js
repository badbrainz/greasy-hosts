#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const util = require('util')
const { pipeline, PassThrough } = require('stream')
const { stdout, stderr } = process
const { Output, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')
const stat = util.promisify(fs.stat)
const tasks = new Set()

const stream = PassThrough({ objectMode: true })

function check(file) {
  return new Promise(function(res, rej) {
    setTimeout(() => stat(file).then(res).catch(rej), 300)
  })
}

fs.watch(scripts_dir, function(event, file) {
  if (!tasks.has(file)) {
    tasks.add(file)
    check(path.join(scripts_dir, file))
      .then(() => stream.emit('data', { file }))
      .catch(e => stderr.write(`${e}\n`))
      .finally(() => tasks.delete(file))
  }
})

pipeline(stream, Stringify(), Output(),
  e => stderr.write(`${e || 'end of stream'}`))
  .pipe(stdout)
