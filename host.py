#!/usr/bin/env python

import os
import sys
import json
import time
import struct
import threading
import subprocess

opts = None
mod_thread = None

def send_message(message):
  sys.stdout.write(struct.pack('I', len(message)))
  sys.stdout.write(message)
  sys.stdout.flush()

def watch_file(file_name):
  modification_time = os.stat(file_name).st_mtime

  while True:
    st_mtime = os.stat(file_name).st_mtime
    if st_mtime > modification_time:
      modification_time = st_mtime

      # send the temp file back in chunks
      chunk_size = 64 * 1024
      with open(file_name, "r") as fp:
        for chunk in iter(lambda: fp.read(chunk_size), ''):
          send_message(json.dumps({ "chunk": True, "content": chunk }))

      # no more data
      send_message(json.dumps({ "end": True }))

    time.sleep(1)

while True:
  # message length uint32
  msg_len_bytes = sys.stdin.read(4)
  msg_len = struct.unpack('i', msg_len_bytes)[0]

  # message
  msg = json.loads(sys.stdin.read(msg_len).decode('utf-8'))

  # setup the temp file
  if "options" in msg:
    opts = msg["options"]

    open(opts["name"], "w")

    # setup a filewatcher
    if mod_thread is None:
      mod_thread = threading.Thread(target=watch_file, args=(opts["name"],))
      mod_thread.daemon = True
      mod_thread.start()

  # rebuild the data
  elif "chunk" in msg:
    with open(opts["name"], "w+") as fp:
      fp.write(msg["content"])

  # no more data
  elif "end" in msg:
    cmd = []
    cmd.append(opts["cmd"])
    cmd.extend(opts["args"])
    subprocess.call(cmd)
