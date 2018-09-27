export async function readFile(fileName) {
  const port = chrome.runtime.connectNative('io.greasyhost.read')

  const chunks = await new Promise(function(resolve, reject) {
    const incomingChunks = []

    port.onMessage.addListener(function(message) {
      if (message.text == null) {
        port.disconnect()
        if (message.error) {
          return reject(message)
        }
        resolve(incomingChunks)
      } else {
        incomingChunks.push(message.text)
      }
    })

    port.onDisconnect.addListener(function() {
      reject(chrome.runtime.lastError)
    })

    port.postMessage(fileName)
  })

  return chunks.join('')
}

export async function writeFile(fileName, content, chunkSize = 65536) {
  const port = chrome.runtime.connectNative('io.greasyhost.write')

  function* chop(text) {
    const blocks = Math.max(1, Math.ceil(text.length / chunkSize))
    for (let i = 0, offset = 0; i < blocks; ++i, offset += chunkSize) {
      yield text.substr(offset, chunkSize)
    }
  }

  await new Promise(function(resolve, reject) {
    port.onMessage.addListener(function(message) {
      port.disconnect()
      if (message.error) {
        return reject(message)
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
  })
}

export async function spawnEditor(fileName, command, args = []) {
  const port = chrome.runtime.connectNative('io.greasyhost.spawn')

  await new Promise(function(resolve, reject) {
    port.onMessage.addListener(function(message) {
      port.disconnect()
      if (message.error) {
        return reject(message)
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
