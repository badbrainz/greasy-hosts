#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const { spawn } = require('child_process')
const { pipeline, Transform } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')

const transformer = Transform({
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
  if (proc.pid === undefined) {
    await new Promise((resolve, reject) => {
      proc.on('error', reject)
    })
  }
}

pipeline(stdin, Input(), Parse(), transformer, Stringify(), Output(),
  e => stderr.write(`${e || 'end of stream'}`))
  .pipe(stdout)
