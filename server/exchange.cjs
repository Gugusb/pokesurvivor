"use strict";
const { randomUUID } = require("node:crypto");

const MIN_PRICES = {
  abilityGem: 100,
  pokeball: 50,
  greatball: 200,
  ultraball: 1000,
  voucher: 2000,
};

function parseItem(G, itemKey) {
  if (typeof itemKey !== "string" || !itemKey) return null;
  if (itemKey === "abilityGem") return { kind: "abilityGem", minPrice: MIN_PRICES.abilityGem };
  if (["pokeball", "greatball", "ultraball"].includes(itemKey)) {
    return { kind: "ball", ball: itemKey, minPrice: MIN_PRICES[itemKey] };
  }
  if (itemKey.startsWith("voucher:")) {
    const medalId = itemKey.slice(8);
    const def = G.AbilityDefs?.BY_ID?.[medalId];
    if (def && def.leader) return { kind: "voucher", medalId, minPrice: MIN_PRICES.voucher };
  }
  return null;
}

function createExchange({ db, G, q, all, exec, atomic, saved, save, displayName, now, fail }) {
  function listAll(uid) {
    const rows = all(
      "SELECT id, seller_uid, seller_name, item_key, price, created FROM exchange_listings WHERE status='active' ORDER BY price ASC, created ASC",
    );
    const catMap = new Map();
    const listings = [];
    const mine = [];
    for (const r of rows) {
      const entry = {
        id: r.id,
        itemKey: r.item_key,
        price: r.price,
        sellerUid: r.seller_uid,
        sellerName: r.seller_name,
        created: r.created,
      };
      listings.push(entry);
      if (r.seller_uid === uid) mine.push(entry);
      const cur = catMap.get(r.item_key);
      if (!cur) catMap.set(r.item_key, { itemKey: r.item_key, minPrice: r.price, count: 1 });
      else {
        cur.count++;
        if (r.price < cur.minPrice) cur.minPrice = r.price;
      }
    }
    return {
      ok: true,
      categories: [...catMap.values()],
      listings,
      mine,
    };
  }

  function createListing(u, b) {
    const itemKey = String(b?.itemKey || "");
    const parsed = parseItem(G, itemKey);
    if (!parsed) throw fail(400, "Item cannot be consigned");
    const price = Number(b?.price);
    if (!Number.isSafeInteger(price) || price < parsed.minPrice || price > 1e8) {
      throw fail(400, `Price must be at least ${parsed.minPrice} League Coins`);
    }
    return atomic(() => {
      const rec = saved(u.uid);
      if (!rec) throw fail(404, "Save not found");
      const s = rec.save;
      s.pokeballs = s.pokeballs || { pokeball: 0, greatball: 0, ultraball: 0 };
      s.abilityVouchers = s.abilityVouchers || {};
      if (parsed.kind === "abilityGem") {
        if ((s.abilityGems || 0) < 1) throw fail(400, "Insufficient Ability Gems");
        s.abilityGems -= 1;
      } else if (parsed.kind === "ball") {
        if ((s.pokeballs[parsed.ball] || 0) < 1) throw fail(400, "Insufficient Poké Balls");
        s.pokeballs[parsed.ball] -= 1;
      } else if (parsed.kind === "voucher") {
        if ((s.abilityVouchers[parsed.medalId] || 0) < 1) throw fail(400, "Insufficient Medal Vouchers");
        s.abilityVouchers[parsed.medalId] -= 1;
        if (s.abilityVouchers[parsed.medalId] <= 0) delete s.abilityVouchers[parsed.medalId];
      }
      const id = randomUUID();
      const created = now();
      const sellerName = displayName(u);
      exec(
        "INSERT INTO exchange_listings(id,seller_uid,seller_name,item_key,price,created,status) VALUES(?,?,?,?,?,?,'active')",
        id,
        u.uid,
        sellerName,
        itemKey,
        price,
        created,
      );
      const next = save(u.uid, s);
      return {
        ok: true,
        listing: { id, itemKey, price, sellerUid: u.uid, sellerName, created },
        save: next.save,
        rev: next.rev,
      };
    });
  }

  function buyListing(u, b) {
    const id = String(b?.id || "");
    if (!id) throw fail(400, "Missing listing id");
    return atomic(() => {
      const row = q("SELECT * FROM exchange_listings WHERE id=? AND status='active'", id);
      if (!row) throw fail(404, "Listing not found or already sold");
      if (row.seller_uid === u.uid) throw fail(400, "Cannot buy your own listing");
      const parsed = parseItem(G, row.item_key);
      if (!parsed) throw fail(400, "Invalid listing item");
      const buyerRec = saved(u.uid);
      const sellerRec = saved(row.seller_uid);
      if (!buyerRec || !sellerRec) throw fail(404, "Account save not found");
      const buyer = buyerRec.save;
      const seller = sellerRec.save;
      if ((buyer.leagueCoins || 0) < row.price) throw fail(400, "Insufficient League Coins");
      buyer.abilityMedals = buyer.abilityMedals || {};
      buyer.pokeballs = buyer.pokeballs || { pokeball: 0, greatball: 0, ultraball: 0 };

      if (parsed.kind === "voucher") {
        if (buyer.abilityMedals[parsed.medalId]) throw fail(400, "Ability medal already owned");
        buyer.abilityMedals[parsed.medalId] = { at: now(), from: "exchange" };
      } else if (parsed.kind === "abilityGem") {
        buyer.abilityGems = Math.min(1e8, (buyer.abilityGems || 0) + 1);
      } else if (parsed.kind === "ball") {
        buyer.pokeballs[parsed.ball] = Math.min(9999, (buyer.pokeballs[parsed.ball] || 0) + 1);
      }

      buyer.leagueCoins = (buyer.leagueCoins || 0) - row.price;
      seller.leagueCoins = Math.min(1e8, (seller.leagueCoins || 0) + row.price);

      exec(
        "UPDATE exchange_listings SET status='sold', buyer_uid=?, sold_at=? WHERE id=?",
        u.uid,
        now(),
        id,
      );
      save(row.seller_uid, seller);
      const nextBuyer = save(u.uid, buyer);
      return {
        ok: true,
        listing: { id: row.id, itemKey: row.item_key, price: row.price, sellerName: row.seller_name },
        save: nextBuyer.save,
        rev: nextBuyer.rev,
      };
    });
  }

  function cancelListing(u, b) {
    const id = String(b?.id || "");
    if (!id) throw fail(400, "Missing listing id");
    return atomic(() => {
      const row = q("SELECT * FROM exchange_listings WHERE id=? AND seller_uid=? AND status='active'", id, u.uid);
      if (!row) throw fail(404, "Listing not found");
      const parsed = parseItem(G, row.item_key);
      const rec = saved(u.uid);
      if (!rec) throw fail(404, "Save not found");
      const s = rec.save;
      s.pokeballs = s.pokeballs || { pokeball: 0, greatball: 0, ultraball: 0 };
      s.abilityVouchers = s.abilityVouchers || {};
      if (parsed?.kind === "abilityGem") s.abilityGems = Math.min(1e8, (s.abilityGems || 0) + 1);
      else if (parsed?.kind === "ball") s.pokeballs[parsed.ball] = Math.min(9999, (s.pokeballs[parsed.ball] || 0) + 1);
      else if (parsed?.kind === "voucher") s.abilityVouchers[parsed.medalId] = Math.min(9999, (s.abilityVouchers[parsed.medalId] || 0) + 1);
      exec("UPDATE exchange_listings SET status='cancelled' WHERE id=?", id);
      const next = save(u.uid, s);
      return { ok: true, save: next.save, rev: next.rev };
    });
  }

  function route(routePath, u, b) {
    if (routePath === "/exchange") return listAll(u.uid);
    if (routePath === "/exchange/list") return createListing(u, b);
    if (routePath === "/exchange/buy") return buyListing(u, b);
    if (routePath === "/exchange/cancel") return cancelListing(u, b);
    throw fail(404, "Not found");
  }

  return { route, MIN_PRICES, parseItem };
}

module.exports = { createExchange, MIN_PRICES, parseItem };
