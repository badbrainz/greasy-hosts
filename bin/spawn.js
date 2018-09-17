#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const util = require('util')
const { spawn } = require('child_process')
const { pipeline } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')
const stat = util.promisify(fs.stat)

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')

const response = Stringify()
pipeline(response, Output(), debug).pipe(stdout)

pipeline(stdin, Input(), Parse(), debug)
  .on('data', data => onInput(data).catch(onError))

async function onInput(chunk) {
  const file = path.join(scripts_dir, chunk.file)
  await stat(file)
  const proc = spawn(chunk.cmd, [...chunk.args, file], {
    detached: true,
    stdio: 'ignore'
  })
  proc.unref()
  await new Promise((resolve, reject) => {
    proc.on('error', reject)
    proc.on('close', resolve)
  })
}

function onError(error) {
  debug(error)
  response.write({ error })
}

function debug(error) {
  stderr.write(`${error || 'stream ended.'}\n`)
}
