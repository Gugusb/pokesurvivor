"use strict";
const path = require("node:path"),
  { openStore } = require("./store.cjs");
const [action, name] = process.argv.slice(2);
if (
  !["promote", "demote", "users"].includes(action) ||
  (!name && action !== "users")
) {
  console.error("Usage: npm run admin -- promote|demote USERNAME | users");
  process.exit(1);
}
const db = openStore(
  process.env.DB_FILE || path.join(__dirname, "data/game.sqlite"),
);
try {
  if (action === "users")
    console.table(
      db.prepare("SELECT uid,name,role,ban,deleted FROM users LIMIT 100").all(),
    );
  else {
    const role = action === "promote" ? "admin" : "player",
      r = db
        .prepare("UPDATE users SET role=? WHERE lower=? AND deleted=0")
        .run(role, name.toLowerCase());
    if (!r.changes) throw new Error("Account not found");
    console.log(`${name}: ${role}`);
  }
} finally {
  db.close();
}
