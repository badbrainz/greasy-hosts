#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const fileWatcher = require('filewatcher')
const { pipeline } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')

const response = Stringify()
pipeline(response, Output(), debug).pipe(stdout)

const watcher = fileWatcher()
watcher.on('change', onChange)
function onChange(file, stat) {
  response.write({
    file: path.parse(file).base,
    deleted: !!stat.deleted
  })
}

pipeline(stdin, Input(), Parse(), debug).on('data', onInput)
function onInput(chunk) {
  const file = path.join(scripts_dir, chunk.file)
  fs.stat(file, function(error) {
    if (error) {
      debug(error)
      response.write({ error })
    } else {
      watcher[chunk.unwatch ? 'remove' : 'add'](file)
    }
  })
}

function debug(error) {
  stderr.write(`${error || 'stream ended.'}\n`)
}
