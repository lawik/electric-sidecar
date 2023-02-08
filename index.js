import Database from 'better-sqlite3'
import { electrify } from 'electric-sql/node'

import config from './.electric/@config/index.js'
import fs from 'fs';
import path from 'path';

let dbname = process.argv[2];
fs.mkdirSync("databases", { recursive: true });
let db_path = path.join("databases", dbname);

const original = new Database(db_path)
electrify(original, config).then((db) => {
    console.log("electrified: " + dbname);
})
