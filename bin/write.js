#!/usr/bin/env node

const path = require('path')
const { createWriteStream } = require('fs')
const { pipeline, finished, Transform } = require('stream')
const { stdin, stdout, stderr } = process
const { Input, Output, Parse, Stringify } = require('./protocol.js')

const scripts_dir = path.resolve(__dirname, '..', 'user_scripts')

const response = Stringify()
pipeline(response, Output(), debug).pipe(stdout)

const parser = pipeline(stdin, Input(), Parse(), debug)
parser.once('readable', doRead)
function doRead() {
  let ok = true
  do {
    const chunk = parser.read()
    ok = chunk !== null
    if (ok) {
      if (parser.file == null) {
        parser.file = createWriteStream(path.join(scripts_dir, chunk))
        finished(parser.file, onFinished)
      } else {
        const text = chunk.text
        if (text == null) {
          parser.file.end()
          parser.file = null
        } else {
          const ret = parser.file.write(text)
          if (!ret) {
            ok = false
            parser.file.once('drain', doRead)
          }
        }
      }
    } else {
      parser.once('readable', doRead)
    }
  } while (ok)
}

function onFinished(err) {
  debug(err)
  response.write({ error: err })
}

function debug(error) {
  stderr.write(`${error || 'stream ended.'}\n`)
}
