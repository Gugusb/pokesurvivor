"use strict";
const path = require("node:path"),
  { openStore } = require("./store.cjs");
const target = process.argv[2];
if (!target) {
  console.error(
    "Usage: node server/backup.cjs /private/backups/game-YYYYMMDD.sqlite",
  );
  process.exit(1);
}
const db = openStore(
  process.env.DB_FILE || path.join(__dirname, "data/game.sqlite"),
);
try {
  db.prepare("VACUUM INTO ?").run(path.resolve(target));
  console.log(
    "Database snapshot completed. Store it encrypted outside the web root.",
  );
} finally {
  db.close();
}
