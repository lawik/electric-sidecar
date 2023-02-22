import Database from 'better-sqlite3'
import { electrify } from 'electric-sql/node'

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
let config_path = process.argv[3] || './.electric/@config/index.js';

let config = await import(config_path);

let evil_message = "emit connectivity status connected";

function send_prefix(payload) {
    let payloadSize = buffer.Buffer.byteLength(payload, "utf-8");
    let msg = buffer.Buffer.alloc(4);
    msg.writeUInt32BE(payloadSize);
    log("prefixing", "..");
    process.stdout.write(msg);
}

send_prefix(evil_message + "\n");

var byte_size = 0;
var saved_data = null;
function read() {
    // First four bytes are the size of the payload
    if (byte_size == 0) {
        let size_buffer = process.stdin.read(4);
        if (size_buffer !== null && size_buffer.byteLength == 4) {
            byte_size = size_buffer.readUInt32BE(0, true)
            log("starting byte size", byte_size);
        }
    }
    log("reading bytes", byte_size);
    let data = process.stdin.read(byte_size);
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
        let nice = saved_data.toString().trim()
        log("msg", "sending");
        byte_size = 0;
        saved_data = buffer.Buffer.alloc(0);
    }
}


function write(payload) {
    if (as_port) {
        let payloadSize = buffer.Buffer.byteLength(payload, "utf-8");
        let msg = buffer.Buffer.alloc(payloadSize + 4);
        msg.writeUInt32BE(payloadSize);
        msg.write(payload, 4, "utf-8");
        log("writing payload", msg);
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
        let payload = JSON.stringify({ event: "data_changed", change: change });
        write(payload);
        log("data", payload);
    })
    db.electric.notifier.subscribeToConnectivityStateChange((change) => {
        let payload = JSON.stringify({ event: "connection_status", change: change });
        write(payload);
        log("connection", payload);
    })
    log("electrified", dbname);
})
