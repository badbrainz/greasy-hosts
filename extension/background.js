import { readFile, writeFile, editFile } from './hosts.js';

const GREASEMONKEY_ID = '{e4a8a97b-f2ed-450b-b12d-ee082ba24781}';

const defaultOptions = {
  cmd: 'gedit',
  args: []
};


let watcher = chrome.runtime.connectNative('io.greasyhost.watch');

watcher.onDisconnect.addListener(function() {
  watcher = null;
});

watcher.onMessage.addListener(function(message) {
  handleWatcherMessage(message).catch(e => console.error('%s', e));
});

async function handleWatcherMessage(message) {
  if (message.error) {
    throw new Error(message.error);
  }

  const [uuid] = message.file.split('.');
  const content = await readFile(message.file);
  await browser.runtime.sendMessage(GREASEMONKEY_ID, { uuid, content });
}


chrome.runtime.onMessageExternal.addListener(onMessageExternal);
function onMessageExternal(message, sender, sendResponse) {
  handleExtensionMessage(message, sender)
    .catch(e => ({ error: e.toString() }))
    .then(sendResponse);
  return true;
}

async function handleExtensionMessage(message, sender) {
  if (sender.id !== GREASEMONKEY_ID) {
    throw new Error(`Sender not recognized ${sender.id}`);
  }

  const file = `${message.uuid}.js`;
  await writeFile(file, message.content);

  const userOptions = await browser.storage.local.get(defaultOptions);
  await editFile(file, userOptions.cmd, userOptions.args);
}
