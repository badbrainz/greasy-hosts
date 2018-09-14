const os = require('os')
const { Transform } = require('stream')

exports.Input = Input
exports.Output = Output
exports.Parse = Parse
exports.Stringify = Stringify

let readUint32, writeUint32
if (os.endianness() == 'LE') {
  readUint32 = Buffer.prototype.readUInt32LE
  writeUint32 = Buffer.prototype.writeUInt32LE
} else {
  readUint32 = Buffer.prototype.readUInt32BE
  writeUint32 = Buffer.prototype.writeUInt32BE
}

function Input() {
  let buffer = Buffer.alloc(0)

  const transform = Transform({
    readableObjectMode: true,

    transform(chunk, enc, cb) {
      let buf = Buffer.concat([buffer, chunk])

      while (buf.length >= 4) {
        const total = 4 + readUint32.call(buf, 0)
        if (buf.length < total)
          break

        this.push(buf.slice(4, total))
        buf = buf.slice(total)
      }

      buffer = buf
      cb()
    }
  })

  return transform
}

function Output() {
  const transform = Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
      chunk = Buffer.from(chunk)

      const len = Buffer.alloc(4)
      writeUint32.call(len, chunk.length, 0)

      cb(null, Buffer.concat([len, chunk]))
    }
  })

  return transform
}

function Parse() {
  const transform = Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
      try {
        chunk = JSON.parse(chunk)
      } catch(e) {
        return cb(e)
      }
      cb(null, chunk)
    }
  })

  return transform
}

function Stringify() {
  const transform = Transform({
    objectMode: true,

    transform(chunk, enc, cb) {
      cb(null, JSON.stringify(chunk))
    }
  })

  return transform
}
