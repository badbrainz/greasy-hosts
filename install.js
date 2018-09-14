#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const util = require('util')
const writeFile = util.promisify(fs.writeFile)

const args = {
  browser: 'firefox',
  root: false
}
for (const arg of process.argv.slice(2)) {
  const [key, val = true] = arg.split('=')
  args[key] = val
}

const HOST = 'io.greasyhost.%NAME%'

// Firefox system-wide
const TARGET_DIR_FF_LNX_SW = '/usr/lib/mozilla/native-messaging-hosts'
const TARGET_DIR_FF_OSX_SW = '/Library/Application Support/Mozilla/NativeMessagingHosts'
// Firefox user-specific
const TARGET_DIR_FF_LNX = path.join(process.env.HOME, '.mozilla/native-messaging-hosts')
const TARGET_DIR_FF_OSX = path.join(process.env.HOME, 'Library/Application Support/Mozilla/NativeMessagingHosts/')
// Chrome system-wide
const TARGET_DIR_CR_LNX_SW = '/etc/opt/chrome/native-messaging-hosts'
const TARGET_DIR_CR_OSX_SW = '/Library/Google/Chrome/NativeMessagingHosts'
// Chrome user-specific
const TARGET_DIR_CR_LNX = path.join(process.env.HOME, '.config/google-chrome/NativeMessagingHosts')
const TARGET_DIR_CR_OSX = path.join(process.env.HOME, 'Library/Application Support/Google/Chrome/NativeMessagingHosts')

let FIREFOX
let CHROME
switch (args.browser) {
  case 'firefox':
    FIREFOX = true
    break;
  case 'chrome':
    CHROME = true
    break;
  default:
    console.error('%s not supported', args.browser)
    process.exit(1)
}

let TARGET_DIR
switch (process.platform) {
  case 'linux':
    if (args.root) {
      TARGET_DIR = FIREFOX ? TARGET_DIR_FF_LNX_SW : TARGET_DIR_CR_LNX_SW
    } else {
      TARGET_DIR = FIREFOX ? TARGET_DIR_FF_LNX : TARGET_DIR_CR_LNX
    }
    break;
  case 'darwin':
    if (args.root) {
      TARGET_DIR = FIREFOX ? TARGET_DIR_FF_OSX_SW : TARGET_DIR_CR_OSX_SW
    } else {
      TARGET_DIR = FIREFOX ? TARGET_DIR_FF_OSX : TARGET_DIR_CR_OSX
    }
    break;
  case 'win32':
    TARGET_DIR = __dirname
    break;
  default:
    console.error('%s not supported', process.platform)
    process.exit(1)
}

const files = []

if (FIREFOX) {
  console.log('Installing for Firefox:', TARGET_DIR)
  files.push(install(TARGET_DIR, {
    allowed_extensions: [
      '{e4a8a97b-f2ed-450b-b12d-ee082ba24781}'
    ]
  }))
}

if (CHROME) {
  console.log('Installing for Chrome:', TARGET_DIR)
  files.push(install(TARGET_DIR, {
    allowed_origins: [
      'chrome-extension://daihojmdjmhocgfjnhifkpdkdjaikjoj'
    ]
  }))
}

Promise.all(files).catch(e => console.error('%s', e))

async function install(target, whitelist) {
  for (const name of 'read write watch spawn'.split(' ')) {
    const host = HOST.replace('%NAME%', name)
    const app = path.resolve('bin', `${name}.js`)
    const manifest = path.join(target, `${host}.json`)

    await writeFile(manifest, JSON.stringify({
      name: host,
      path: app,
      description: 'external editor',
      type: 'stdio',
      ...whitelist
    }, null, 2))

    if (process.platform == 'win32') {
      let regKey = args.root ? 'HKLM' : 'HKCU'
      regKey += FIREFOX ?
        '\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\' :
        '\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\'
      regKey += host
      const reg = spawn('REG',
        ['ADD', regKey, '/t', 'REG_SZ', '/d', manifest, '/f'])
      await new Promise(function(res, rej) {
        reg.on('close', e => e ? rej(e) : res())
      })
    }
  }
}
