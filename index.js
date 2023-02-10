import Database from 'better-sqlite3'
import { electrify } from 'electric-sql/node'

import config from './.electric/@config/index.js'
import fs from 'fs';
import path from 'path';

let dbname = process.argv[2];

const original = new Database(dbname)
electrify(original, config).then((db) => {
    console.log("electrified: " + dbname);
})
