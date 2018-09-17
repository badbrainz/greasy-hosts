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

pipeline(stdin, Input(), Parse(), debug)
  .on('data', data => onInput(data).catch(onError))

async function onInput(chunk) {
  const file = path.join(scripts_dir, chunk.file)
  watcher[chunk.unwatch ? 'remove' : 'add'](file)
}

function onError(error) {
  debug(error)
  response.write({ error })
}

function debug(error) {
  stderr.write(`${error || 'stream ended.'}\n`)
}
