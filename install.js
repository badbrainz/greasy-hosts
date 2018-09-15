#!/usr/bin/env node

const fs = require('fs')
const path = require('path')
const util = require('util')
const readline = require('readline')
const writeFile = util.promisify(fs.writeFile)

const args = {
  root: false
}
for (const arg of process.argv.slice(2)) {
  const [key, val = true] = arg.split('=')
  args[key] = val
}

const HOST = 'io.greasyhost.%NAME%'

// Firefox system-wide
const TARGET_FF_LNX_SW = '/usr/lib/mozilla/native-messaging-hosts'
const TARGET_FF_OSX_SW = '/Library/Application Support/Mozilla/NativeMessagingHosts'
// Firefox user-specific
const TARGET_FF_LNX = path.join(process.env.HOME, '.mozilla/native-messaging-hosts')
const TARGET_FF_OSX = path.join(process.env.HOME, 'Library/Application Support/Mozilla/NativeMessagingHosts/')
// Chrome system-wide
const TARGET_CR_LNX_SW = '/etc/opt/chrome/native-messaging-hosts'
const TARGET_CR_OSX_SW = '/Library/Google/Chrome/NativeMessagingHosts'
// Chrome user-specific
const TARGET_CR_LNX = path.join(process.env.HOME, '.config/google-chrome/NativeMessagingHosts')
const TARGET_CR_OSX = path.join(process.env.HOME, 'Library/Application Support/Google/Chrome/NativeMessagingHosts')

const WIN_REG_FF_LM = 'HKLM\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\'
const WIN_REG_FF_CU = 'HKCU\\SOFTWARE\\Mozilla\\NativeMessagingHosts\\'
const WIN_REG_CR_LM = 'HKLM\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\'
const WIN_REG_CR_CU = 'HKCU\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts\\'

let TARGET_FF
let TARGET_CR
let WIN_REG_FF
let WIN_REG_CR
switch (process.platform) {
  case 'linux':
    if (args.root) {
      TARGET_FF = TARGET_FF_LNX_SW
      TARGET_CR = TARGET_CR_LNX_SW
    } else {
      TARGET_FF = TARGET_FF_LNX
      TARGET_CR = TARGET_CR_LNX
    }
    break;
  case 'darwin':
    if (args.root) {
      TARGET_FF = TARGET_FF_OSX_SW
      TARGET_CR = TARGET_CR_OSX_SW
    } else {
      TARGET_FF = TARGET_FF_OSX
      TARGET_CR = TARGET_CR_OSX
    }
    break;
  case 'win32':
    TARGET_FF = TARGET_CR = __dirname
    WIN_REG_FF = args.root ? WIN_REG_FF_LM : WIN_REG_FF_CU
    WIN_REG_CR = args.root ? WIN_REG_CR_LM : WIN_REG_CR_CU
    break;
  default:
    console.error('%s not supported', process.platform)
    process.exit(1)
}

const scripts_dir = path.resolve(__dirname, 'user_scripts')

const ff_whitelist = {
  allowed_origins: [
    'chrome-extension://daihojmdjmhocgfjnhifkpdkdjaikjoj'
  ]
}

const cr_whitelist = {
  allowed_extensions: [
    '{e4a8a97b-f2ed-450b-b12d-ee082ba24781}'
  ]
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

new Promise((resolve, reject) => {
  rl.question('Install for Firefox? y/n ', (input) => {
    input = input.trim()
    if (input == 'y' || !input) {
      install(TARGET_FF, ff_whitelist, WIN_REG_FF).then(resolve).catch(reject)
    } else {
      resolve()
    }
  })
}).then(() => new Promise((resolve, reject) => {
  rl.question('Install for Chrome? y/n ', (input) => {
    input = input.trim()
    if (input == 'y' || !input) {
      install(TARGET_CR, cr_whitelist, WIN_REG_CR).then(resolve).catch(reject)
    } else {
      resolve()
    }
  })
})).then(() => new Promise((resolve, reject) => {
  fs.mkdir(scripts_dir, 0744, (err) => {
    if (err) {
      if (err.code == 'EEXIST') {
        resolve()
      } else {
        reject(err)
      }
    } else {
      resolve()
    }
  })
})).catch((e) => {
  console.error('%s', e)
}).finally(() => {
  rl.close()
})

async function install(target, whitelist, key) {
  for (const name of 'read write watch spawn'.split(' ')) {
    const hostname = HOST.replace('%NAME%', name)
    const script = path.resolve('bin', `${name}.js`)
    const json = path.join(target, `${hostname}.json`)

    await writeFile(json, JSON.stringify({
      name: hostname,
      path: script,
      description: 'external editor',
      type: 'stdio',
      ...whitelist
    }, null, 2))

    if (process.platform == 'win32') {
      await new Promise(function(res, rej) {
        const reg = spawn('REG', ['ADD', key, '/t', 'REG_SZ', '/d', json, '/f'])
        reg.on('close', e => e ? rej(e) : res())
      })
    }
  }
  console.log('installed')
}
