const fileOperations = {}

function operation(fileName, fn) {
  let { [fileName]: current = Promise.resolve() } = fileOperations
  current = current.finally(() => {}).then(() => new Promise(fn))
  fileOperations[fileName] = current
  return current
}

export function readFile(fileName) {
  return operation(fileName, read)

  function read(resolve, reject) {
    const port = chrome.runtime.connectNative('io.greasyhost.read')
    const chunks = []

    port.onMessage.addListener(function(message) {
      if (message.text == null) {
        port.disconnect()
        if (message.error) {
          return reject(new Error(message.error))
        }
        resolve(chunks.join(''))
      } else {
        chunks.push(message.text)
      }
    })

    port.onDisconnect.addListener(function() {
      reject(chrome.runtime.lastError)
    })

    port.postMessage(fileName)
  }
}

export function writeFile(fileName, content, chunkSize = 65536) {
  return operation(fileName, write)

  function* chop(text) {
    const blocks = Math.max(1, Math.ceil(text.length / chunkSize))
    for (let i = 0, offset = 0; i < blocks; ++i, offset += chunkSize) {
      yield text.substr(offset, chunkSize)
    }
  }

  function write(resolve, reject) {
    const port = chrome.runtime.connectNative('io.greasyhost.write')

    port.onMessage.addListener(function(message) {
      port.disconnect()
      if (message.error) {
        return reject(new Error(message.error))
      }
      resolve()
    })

    port.onDisconnect.addListener(function() {
      reject(chrome.runtime.lastError)
    })

    port.postMessage(fileName)

    for (const text of chop(content)) {
      port.postMessage({ text })
    }

    port.postMessage({ text: null })
  }
}

export async function spawnEditor(fileName, command, args = []) {
  const port = chrome.runtime.connectNative('io.greasyhost.spawn')

  await new Promise(function(resolve, reject) {
    port.onMessage.addListener(function(message) {
      port.disconnect()
      if (message.error) {
        return reject(new Error(message.error))
      }
      resolve()
    })

    port.onDisconnect.addListener(function() {
      reject(chrome.runtime.lastError)
    })

    port.postMessage({
      file: fileName,
      cmd: command,
      args: args
    })
  })
}
