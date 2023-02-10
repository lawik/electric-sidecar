import Database from 'better-sqlite3'
import { electrify } from 'electric-sql/node'

import config from './.electric/@config/index.js'
import fs from 'fs';
import path from 'path';
import util from 'util';
import readline from 'readline';
import buffer from 'buffer';
import { stdin } from 'process';

var log_file = fs.createWriteStream('/tmp/electric-sidecar.log', { flags: 'a' });
var log_stdout = process.stdout;

function log(a, b) {
    log_file.write(util.format(a) + ": " + util.format(b) + "\n");
}

let dbname = process.argv[2];
let as_port = process.argv[3] == "port";

var byte_size = 0;
var saved_data = null;
function read() {
    if (as_port) {
        // First four bytes are the size of the payload
        if (byte_size == 0) {
            size_buffer = process.stdin.read(4);
            if (size_buffer !== null && size_buffer.byteLength == 4) {
                byte_size = size_buffer.readUInt32BE(0, true)
                log("starting byte size", byte_size);
            }
        }
        log("reading bytes", byte_size);
        data = process.stdin.read(byte_size);
        if (data !== null) {
            if (saved_data === null) {
                saved_data = data;
                byte_size = byte_size - data.byteLength;
                log("new data", null);
            } else {
                saved_data = buffer.Buffer.concat([saved_data, data]);
                byte_size = byte_size - data.byteLength;
            }
            log("data size found", data.byteLength);
            log("remaining to read", byte_size);
        } else {
            log("read null data", null);
        }
        if (saved_data !== null && byte_size <= 0) {
            nice = saved_data.toString().trim()
            log("msg", "sending");
            byte_size = 0;
            saved_data = buffer.Buffer.alloc(0);
        }
    }
}

function write(payload) {
    if (as_port) {
        payloadSize = buffer.Buffer.byteLength(payload, "utf-8");
        msg = buffer.Buffer.alloc(payloadSize + 4);
        msg.writeUInt32BE(payloadSize);
        msg.write(request, 4, "utf-8");
        process.stdout.write(msg);
    } else {
        process.stdout.write(payload);
    }
}

process.stdin.on('readable', read);
process.stdin.on('end', process.exit);

const original = new Database(dbname)
electrify(original, config).then((db) => {
    db.electric.notifier.subscribeToDataChanges((change) => {
        let payload = JSON.stringify(change);
        log("change:" + payload);
        write(payload);
    })
    log("electrified: " + dbname);
})
