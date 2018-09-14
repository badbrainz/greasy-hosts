#!/usr/bin/env node

const path = require('path')
const { stat } = require('fs')
const { spawn } = require('child_process')
const { pipeline } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')

const response = Stringify()
pipeline(response, Output(), debug).pipe(stdout)

pipeline(stdin, Input(), Parse(), debug).on('data', onInput)
function onInput(chunk) {
  const file = path.join(scripts_dir, chunk.file)
  stat(file, function(err) {
    if (err) {
      onError(err)
    } else {
      const proc = spawn(chunk.process, [...chunk.args, file], {
        detached: true,
        stdio: 'ignore'
      })
      proc.unref()
      proc.on('error', onError)
    }
  })
}

function onError(error) {
  debug(error)
  response.write({ error })
}

function debug(error) {
  stderr.write(`${error || 'stream ended.'}\n`)
}
