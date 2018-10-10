#!/usr/bin/env node

const os = require('os')
const fs = require('fs')
const path = require('path')
const util = require('util')
const readline = require('readline')
const child_process = require('child_process')
const writeFile = util.promisify(fs.writeFile)
const mkdir = util.promisify(fs.mkdir)

const args = {
  root: false
}
for (const arg of process.argv.slice(2)) {
  const [key, val = true] = arg.split('=')
  args[key] = val
}

const HOST_NAME = 'io.greasyhost.%NAME%'

const TARGET_HOSTS = 'bin'
const HOME = os.homedir()

const isWin = process.platform == 'win32'

// Firefox system-wide
const TARGET_FF_LNX_SW = '/usr/lib/mozilla/native-messaging-hosts'
const TARGET_FF_OSX_SW = '/Library/Application Support/Mozilla/NativeMessagingHosts'
// Firefox user-specific
const TARGET_FF_LNX = path.join(HOME, '.mozilla/native-messaging-hosts')
const TARGET_FF_OSX = path.join(HOME, 'Library/Application Support/Mozilla/NativeMessagingHosts/')
// Chrome system-wide
const TARGET_CR_LNX_SW = '/etc/opt/chrome/native-messaging-hosts'
const TARGET_CR_OSX_SW = '/Library/Google/Chrome/NativeMessagingHosts'
// Chrome user-specific
const TARGET_CR_LNX = path.join(HOME, '.config/google-chrome/NativeMessagingHosts')
const TARGET_CR_OSX = path.join(HOME, 'Library/Application Support/Google/Chrome/NativeMessagingHosts')

const WIN_REG_FF_LM = 'HKLM\\SOFTWARE\\Mozilla\\NativeMessagingHosts'
const WIN_REG_FF_CU = 'HKCU\\SOFTWARE\\Mozilla\\NativeMessagingHosts'
const WIN_REG_CR_LM = 'HKLM\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts'
const WIN_REG_CR_CU = 'HKCU\\SOFTWARE\\Google\\Chrome\\NativeMessagingHosts'

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
    TARGET_FF = path.join(__dirname, 'bin', 'ff')
    TARGET_CR = path.join(__dirname, 'bin', 'cr')
    WIN_REG_FF = args.root ? WIN_REG_FF_LM : WIN_REG_FF_CU
    WIN_REG_CR = args.root ? WIN_REG_CR_LM : WIN_REG_CR_CU
    break;
  default:
    console.error('%s not supported', process.platform)
    process.exit(1)
}

const scripts_dir = path.join(__dirname, 'user_scripts')
const file_opers = 'read write watch spawn unlink'.split(' ')

const ff_whitelist = {
  allowed_extensions: [
    '{e4a8a97b-f2ed-450b-b12d-ee082ba24781}',
    'greasyhost@geckoid.com'
  ]
}

const cr_whitelist = {
  allowed_origins: [
    'chrome-extension://daihojmdjmhocgfjnhifkpdkdjaikjoj/',
    'chrome-extension://nkkpnoopilechlikflpmigkplmlhhbmk/'
  ]
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
})

function ask(question) {
  return new Promise(function(resolve) {
    rl.question(question, function(input) {
      input = input.trim()
      resolve(input == 'y' || !input)
    })
  })
}

async function main() {
  if (await ask('Install for Firefox? y/n ')) {
    await install(TARGET_FF, ff_whitelist, WIN_REG_FF)
  }

  if (await ask('Install for Chrome? y/n ')) {
    await install(TARGET_CR, cr_whitelist, WIN_REG_CR)
  }

  await mkdir(scripts_dir, 0744).catch(e => {})
}

main().catch((e) => console.error('%s', e)).finally(() => rl.close())

async function install(target, whitelist, key) {
  process.stdout.write(`writing to ${target}...`)
  await mkdir(target).catch(e => {})
  for (const base of file_opers) {
    const name = HOST_NAME.replace('%NAME%', base)
    const host = path.resolve(TARGET_HOSTS, `${base}.${ isWin ? 'bat' : 'js' }`)
    const json = path.join(target, `${name}.json`)

    await writeFile(json, JSON.stringify({
      name: name,
      path: host,
      description: 'external editor',
      type: 'stdio',
      ...whitelist
    }, null, 2))

    if (!isWin)
      continue

    const folder = `${key}\\${name}`
    await new Promise(function(res, rej) {
      const reg = child_process.spawn('REG', ['ADD', folder, '/ve', '/d', json, '/f'])
      reg.on('close', c => c ? rej(new Error(`Error adding registry: ${folder}`)) : res())
      reg.on('error', rej)
    })

    await writeFile(host, `@echo off\nnode "%~dp0${base}.js" %*`)
  }
  process.stdout.write('done\n')
}
