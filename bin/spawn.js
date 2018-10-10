#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { pipeline, Transform } = require('stream')
const { Input, Output, Parse, Stringify } = require('./protocol.js')
const { stdin, stdout, stderr } = process

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')

const transform = Transform({
  objectMode: true,
  transform(chunk, enc, cb) {
    spawnEditor(chunk)
      .then(() => this.push({ error: null }))
      .catch(e => this.push({ error: e.toString() }))
      .finally(cb)
  }
})

async function spawnEditor(chunk) {
  const file = path.join(scripts_dir, chunk.file)
  const proc = spawn(chunk.cmd, chunk.args.concat(file), {
    detached: true,
    stdio: 'ignore'
  })
  proc.unref()
  await new Promise((resolve, reject) => {
    if (proc.pid === undefined) {
      proc.on('error', reject)
    } else {
      proc.on('close', resolve)
    }
  })
}

pipeline(stdin, Input(), Parse(), transform, Stringify(), Output(),
  e => stderr.write(`${e || 'end of stream'}`))
  .pipe(stdout)
