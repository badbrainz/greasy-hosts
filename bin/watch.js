#!/usr/bin/env node

// BUG fileWatcher doesn't error check existing watchers properly

const fs = require('fs')
const path = require('path')
const util = require('util')
const fileWatcher = require('filewatcher')
const { pipeline, Transform } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')
const readdir = util.promisify(fs.readdir)
const watcher = fileWatcher()

const transformer = Transform({
  objectMode: true,
  transform(chunk, enc, cb) {
    Promise.resolve(chunk.toString().split('\n'))
      .then(watchFiles)
      .catch(e => this.push({ error: e.toString() }))
      .finally(cb)
  }
})

function watchFiles(files) {
  files.map(f => f.trim())
    .filter(f => f)
    .map(f => path.join(scripts_dir, f))
    .forEach(f => watcher.add(f))
}

watcher.on('change', function(file, stat) {
  transformer.emit('data', {
    file: path.basename(file),
    deleted: !!stat.deleted
  })
})

readdir(scripts_dir)
  .then(watchFiles)
  .catch(e => stderr.write(`${e}\n`))

pipeline(stdin, Input(), Parse(), transformer, Stringify(), Output(),
  e => stderr.write(`${e || 'end of stream'}`))
  .pipe(stdout)
