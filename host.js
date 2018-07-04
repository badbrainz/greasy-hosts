#!/usr/bin/env node

const fs = require('fs')
const fileWatcher = require('filewatcher')
const childProcess = require('child_process')
const nativeMessage = require('chrome-native-messaging')

let writeStream = null
let fileWatch = fileWatcher()

fileWatch.on('change', function(file, stat) {
  let output = new nativeMessage.Output()
  let readStream = fs.createReadStream(file, 'utf8')

  output.pipe(process.stdout)

  // send the temp file back in chunks
  readStream
    .pipe(new nativeMessage.Transform(function(str, push, done) {
      push({ chunk: true, content: str })
      done()
    }))
    .pipe(output)

  // no more data
  readStream.on('end', () => {
    output.write({ end: true })
  })
})

process.stdin
  .pipe(new nativeMessage.Input())
  .pipe(new nativeMessage.Transform(function(msg, push, done) {
    // setup the temp file
    if (msg.options) {
      let opts = { ...msg.options }

      writeStream = fs.createWriteStream(opts.name, 'utf8')

      // all data has been received, so start the editor and watch the file
      writeStream.on('finish', () => {
        childProcess.spawn(opts.cmd, opts.args)
        fileWatch.add(opts.name)
      })
    }

    // rebuild the data
    else if (msg.chunk) {
      writeStream.write(msg.content)
    }

    // no more data
    else if (msg.end) {
      writeStream.end()
    }

    done()
  }))
  .pipe(new nativeMessage.Output())
  .pipe(process.stdout)
