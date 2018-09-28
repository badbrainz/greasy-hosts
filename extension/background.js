import { readFile, writeFile, spawnEditor } from './hosts.js';
import promisify from './promisify.js';

const sendMessage = promisify(chrome.runtime, 'sendMessage');
const getStorage = promisify(chrome.storage.local, 'get');

const GREASEMONKEY_ID = '{e4a8a97b-f2ed-450b-b12d-ee082ba24781}';

const defaultOptions = {
  cmd: 'gedit',
  args: []
};

let watcher = chrome.runtime.connectNative('io.greasyhost.watch');

watcher.onDisconnect.addListener(function() {
  watcher = null;
});

watcher.onMessage.addListener(onMessageWatcher);
function onMessageWatcher(message) {
  handleWatcherMessage(message).catch(e => console.error('%s', e));
}

async function handleWatcherMessage(message) {
  if (message.error) {
    throw new Error(message.error);
  }

  const [uuid] = message.file.split('.');

  if (message.deleted) {
    await sendMessage(GREASEMONKEY_ID, { name: 'delete', uuid });
  } else {
    const content = await readFile(message.file);
    await sendMessage(GREASEMONKEY_ID, { name: 'save', uuid, content });
  }
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

  watcher.postMessage({ file });

  const userOptions = await getStorage(defaultOptions);
  await spawnEditor(file, userOptions.cmd, userOptions.args);
}
