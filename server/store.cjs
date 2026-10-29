"use strict";
const { DatabaseSync } = require("node:sqlite");
const fs = require("node:fs"),
  path = require("node:path");
function openStore(file) {
  if (file !== ":memory:")
    fs.mkdirSync(path.dirname(path.resolve(file)), { recursive: true });
  const db = new DatabaseSync(file);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS users(uid TEXT PRIMARY KEY,name TEXT NOT NULL,lower TEXT NOT NULL UNIQUE,pass TEXT NOT NULL,recovery TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'player',ban INTEGER NOT NULL DEFAULT 0,deleted INTEGER NOT NULL DEFAULT 0,created INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(uid),expires INTEGER NOT NULL);
    CREATE INDEX IF NOT EXISTS session_uid ON sessions(uid);
    CREATE TABLE IF NOT EXISTS saves(uid TEXT PRIMARY KEY REFERENCES users(uid),payload TEXT NOT NULL,rev INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE IF NOT EXISTS runs(id TEXT PRIMARY KEY,uid TEXT NOT NULL REFERENCES users(uid),dex INTEGER NOT NULL,stars INTEGER NOT NULL,started INTEGER NOT NULL,beat INTEGER NOT NULL,t REAL NOT NULL DEFAULT 0,budget REAL NOT NULL DEFAULT 0,speed INTEGER NOT NULL DEFAULT 1,doubled INTEGER NOT NULL DEFAULT 0,dirty INTEGER NOT NULL DEFAULT 0,ended INTEGER NOT NULL DEFAULT 0,mode TEXT NOT NULL,room TEXT);
    CREATE INDEX IF NOT EXISTS runs_uid ON runs(uid);
    CREATE TABLE IF NOT EXISTS run_scores(uid TEXT PRIMARY KEY REFERENCES users(uid),score INTEGER NOT NULL,stars INTEGER NOT NULL,t INTEGER NOT NULL,dex INTEGER NOT NULL,lv INTEGER NOT NULL,kills INTEGER NOT NULL,run TEXT NOT NULL,at INTEGER NOT NULL,breakdown TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS time_scores(uid TEXT PRIMARY KEY REFERENCES users(uid),t INTEGER NOT NULL,dex INTEGER NOT NULL,lv INTEGER NOT NULL,kills INTEGER NOT NULL,run TEXT NOT NULL,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS friends(a TEXT NOT NULL,b TEXT NOT NULL,from_uid TEXT NOT NULL,ok INTEGER NOT NULL DEFAULT 0,PRIMARY KEY(a,b));
    CREATE TABLE IF NOT EXISTS reports(id TEXT PRIMARY KEY,by_uid TEXT NOT NULL,target TEXT NOT NULL,board TEXT NOT NULL,at INTEGER NOT NULL,UNIQUE(by_uid,target,board));
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY,actor TEXT NOT NULL,target TEXT NOT NULL,action TEXT NOT NULL,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS completion_scores(uid TEXT PRIMARY KEY REFERENCES users(uid),score INTEGER NOT NULL DEFAULT 0,at INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS nursery_rooms(owner TEXT PRIMARY KEY REFERENCES users(uid),dex INTEGER NOT NULL,epoch TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS nursery_invites(owner TEXT NOT NULL REFERENCES users(uid),guest TEXT NOT NULL REFERENCES users(uid),epoch TEXT NOT NULL,at INTEGER NOT NULL,PRIMARY KEY(owner,guest));
    CREATE INDEX IF NOT EXISTS nursery_invites_guest ON nursery_invites(guest);
    CREATE TABLE IF NOT EXISTS nursery_hatches(id TEXT PRIMARY KEY,owner TEXT NOT NULL REFERENCES users(uid),guest TEXT REFERENCES users(uid),dex INTEGER NOT NULL,partner INTEGER NOT NULL,a TEXT NOT NULL,b TEXT NOT NULL,started INTEGER NOT NULL,ends INTEGER NOT NULL,owner_claim TEXT,guest_claim TEXT);
    CREATE INDEX IF NOT EXISTS nursery_owner ON nursery_hatches(owner,owner_claim);
    CREATE INDEX IF NOT EXISTS nursery_guest ON nursery_hatches(guest,guest_claim);
    CREATE TABLE IF NOT EXISTS gifts(id TEXT PRIMARY KEY,sender TEXT NOT NULL REFERENCES users(uid),recipient TEXT NOT NULL REFERENCES users(uid),day INTEGER NOT NULL,at INTEGER NOT NULL,reward TEXT NOT NULL,claimed INTEGER NOT NULL DEFAULT 0,UNIQUE(sender,recipient,day));
    CREATE INDEX IF NOT EXISTS gifts_recipient ON gifts(recipient,claimed);
  `);
  // Existing hatches have no reliable shiny snapshot; preserve them as ordinary parents.
  const hatchColumns = db.prepare('PRAGMA table_info(nursery_hatches)').all();
  for (const column of ['a_shiny', 'b_shiny']) {
    if (!hatchColumns.some(c => c.name === column))
      db.exec(`ALTER TABLE nursery_hatches ADD COLUMN ${column} INTEGER NOT NULL DEFAULT 0`);
  }
  if(!db.prepare('PRAGMA table_info(runs)').all().some(c=>c.name==='score_counts'))
    db.exec("ALTER TABLE runs ADD COLUMN score_counts TEXT NOT NULL DEFAULT '{}'");
  return db;
}
module.exports = { openStore };
