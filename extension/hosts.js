const fileOperations = {}
const childProcesses = {}

function operation(fileName, fn, end) {
  let { [fileName]: current = Promise.resolve() } = fileOperations
  current = current.finally(() => {}).then(() => new Promise(fn))
  if (end) current.finally(end)
  fileOperations[fileName] = current
  return current
}

function process(fileName, fn, end) {
  let current = childProcesses[fileName]
  if (!current) {
    current = Promise.resolve().then(() => new Promise(fn))
    current.finally(() => delete childProcesses[fileName])
  }
  if (end) current.finally(end)
  childProcesses[fileName] = current
  return current
}

export function readFile(fileName) {
  let port

  return operation(fileName, read, cleanup)

  function read(resolve, reject) {
    port = chrome.runtime.connectNative('io.greasyhost.read')

    const chunks = []

    port.onMessage.addListener(function(message) {
      if (message.text == null) {
        if (message.error) {
          reject(new Error(message.error))
        } else {
          resolve(chunks.join(''))
        }
      } else {
        chunks.push(message.text)
      }
    })

    port.onDisconnect.addListener(function() {
      reject(chrome.runtime.lastError)
    })

    port.postMessage(fileName)
  }

  function cleanup() {
    if (port) {
      port.disconnect()
    }
  }
}

export function writeFile(fileName, content, chunkSize = 65536) {
  let port

  return operation(fileName, write, cleanup)

  function* chop(text) {
    const blocks = Math.max(1, Math.ceil(text.length / chunkSize))
    for (let i = 0, offset = 0; i < blocks; ++i, offset += chunkSize) {
      yield text.substr(offset, chunkSize)
    }
  }

  function write(resolve, reject) {
    port = chrome.runtime.connectNative('io.greasyhost.write')

    port.onMessage.addListener(function(message) {
      if (message.error) {
        reject(new Error(message.error))
      } else {
        resolve()
      }
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

  function cleanup() {
    if (port) {
      port.disconnect()
    }
  }
}

export function deleteFile(fileName) {
  let port

  return operation(fileName, unlink, cleanup)

  function unlink(resolve, reject) {
    port = chrome.runtime.connectNative('io.greasyhost.unlink')

    port.onMessage.addListener(function(message) {
      if (message.error) {
        reject(new Error(message.error))
      } else {
        resolve()
      }
    })

    port.onDisconnect.addListener(function() {
      reject(chrome.runtime.lastError)
    })

    port.postMessage(fileName)
  }

  function cleanup() {
    if (port) {
      port.disconnect()
    }
  }
}

export function editFile(fileName, command, args = []) {
  let port

  return process(fileName, spawn, cleanup)

  function spawn(resolve, reject) {
    port = chrome.runtime.connectNative('io.greasyhost.spawn')

    port.onMessage.addListener(function(message) {
      if (message.error) {
        reject(new Error(message.error))
      } else {
        resolve()
      }
    })

    port.onDisconnect.addListener(function() {
      reject(chrome.runtime.lastError)
    })

    port.postMessage({
      file: fileName,
      cmd: command.includes(' ') ? JSON.stringify(command) : command,
      args: args
    })
  }

  function cleanup() {
    if (port) {
      port.disconnect()
    }
  }
}
