"use strict";
const { randomUUID, randomInt } = require("node:crypto");
const { G } = require("./domain.cjs");
/* No browser clocks, balances, parental IVs or loot rolls are accepted here. */
module.exports = function socialServices({
  q,
  all,
  exec,
  atomic,
  saved,
  save,
  isFriend,
  now,
  fail,
  notifySocial,
  rng = () => randomInt(0x100000000) / 0x100000000,
}) {
  const day = () => Math.floor((now() + 8 * 3600000) / 86400000);
  const active = (owner) =>
    q(
      "SELECT * FROM nursery_hatches WHERE owner=? AND owner_claim IS NULL ORDER BY started DESC LIMIT 1",
      owner,
    );
  const validUser = (id) =>
    q("SELECT uid,name FROM users WHERE uid=? AND ban=0 AND deleted=0", id);
  const ensureFriend = (a, b) => {
    if (!isFriend(a, b) || !validUser(b))
      throw fail(403, "Accepted friend required");
  };
  function revision(uid, rev) {
    const current = saved(uid);
    if (current.rev !== rev)
      throw fail(
        409,
        "Save changed on another device. Reload before continuing.",
      );
    return current.save;
  }
  function parent(uid, dex) {
    const s = saved(uid).save;
    if (!Number.isInteger(dex) || !G.DEX_BY[dex] || !s.owned[dex])
      throw fail(400, "Choose an owned Pokemon");
    return (s.owned[dex].iv || [1, 1, 1]).slice();
  }
  function summary(uid) {
    return {
      gifts: {
        sent: all(
          "SELECT recipient FROM gifts WHERE sender=? AND day=?",
          uid,
          day(),
        ).map((v) => v.recipient),
        inbox: all(
          "SELECT g.id,u.name,g.at FROM gifts g JOIN users u ON u.uid=g.sender WHERE g.recipient=? AND g.claimed=0 ORDER BY g.at,g.id LIMIT 100",
          uid,
        ),
        day: day(),
      },
      nurseryInvites: all(
        "SELECT i.owner,i.epoch,i.at,u.name,r.dex FROM nursery_invites i JOIN nursery_rooms r ON r.owner=i.owner AND r.epoch=i.epoch JOIN users u ON u.uid=i.owner WHERE i.guest=? AND u.deleted=0 AND u.ban=0",
        uid,
      ).filter((i) => isFriend(i.owner, uid)),
      nurseryReady: !!q(
        "SELECT id FROM nursery_hatches WHERE ends<=? AND ((owner=? AND owner_claim IS NULL) OR (guest=? AND guest_claim IS NULL)) LIMIT 1",
        now(),
        uid,
        uid,
      ),
    };
  }
  const publicHatch = (h) =>
    h
      ? {
          id: h.id,
          dex: h.dex,
          partner: h.partner,
          started: h.started,
          ends: h.ends,
          friend: !!h.guest,
          guestName: h.guest
            ? q("SELECT name FROM users WHERE uid=?", h.guest)?.name || ""
            : null,
        }
      : null;
  function view(uid, owner = uid) {
    if (uid !== owner) ensureFriend(uid, owner);
    const room = q("SELECT * FROM nursery_rooms WHERE owner=?", owner),
      h = active(owner),
      invite =
        room &&
        q(
          "SELECT epoch FROM nursery_invites WHERE owner=? AND guest=?",
          owner,
          uid,
        );
    const participating = all(
      "SELECT * FROM nursery_hatches WHERE guest=? AND guest_claim IS NULL ORDER BY started",
      uid,
    ).map(publicHatch);
    return {
      owner,
      name: q("SELECT name FROM users WHERE uid=?", owner)?.name,
      dex: room?.dex || null,
      epoch: room?.epoch || null,
      hatch: publicHatch(h),
      invited: !!room && (uid === owner || invite?.epoch === room.epoch),
      participating,
      invitedFriends:
        uid === owner
          ? all(
              "SELECT guest FROM nursery_invites WHERE owner=? AND epoch=?",
              owner,
              room?.epoch || "",
            ).map((x) => x.guest)
          : [],
      now: now(),
    };
  }
  function givePokemon(s, dex, iv) {
    const zUnlocked = G.ZAccess.acquired(s, dex, rng),
      entry = s.owned[dex];
    if (entry) entry.iv = iv.map((v, i) => Math.max(v, entry.iv?.[i] || 1));
    else s.owned[dex] = { at: now(), from: "nursery", iv: iv.slice() };
    return zUnlocked;
  }
  function claim(uid, b) {
    return atomic(() => {
      const h = q(
        "SELECT * FROM nursery_hatches WHERE id=?",
        String(b.id || ""),
      );
      if (!h || (h.owner !== uid && h.guest !== uid))
        throw fail(404, "Hatch not found");
      const column = h.owner === uid ? "owner_claim" : "guest_claim";
      if (h[column])
        return {
          ...saved(uid),
          report: JSON.parse(h[column]),
          alreadyClaimed: true,
        };
      if (now() < h.ends) throw fail(409, "Hatch not ready");
      const s = revision(uid, b.rev),
        roll = G.NurseryRules.offspring(
          JSON.parse(h.a),
          JSON.parse(h.b),
          !!h.guest,
          rng,
        );
      const zUnlocked = givePokemon(s, h.dex, roll.iv);
      const family = G.MonProgression.familyFor(h.dex),
        forms = G.MEGA_FORMS.filter(
          (f) =>
            family.includes(f.dex) &&
            f.available &&
            f.basicComplete &&
            G.MEGA_TYPES[f.id],
        );
      let mega = null;
      if (forms.length && rng() < 0.005) {
        mega = forms[Math.floor(rng() * forms.length)].id;
        s.megaStones ||= {};
        s.megaStones[mega] ||= { at: now(), from: "nursery" };
      }
      const report = { ...roll, dex: h.dex, zUnlocked, mega };
      exec(
        `UPDATE nursery_hatches SET ${column}=? WHERE id=?`,
        JSON.stringify(report),
        h.id,
      );
      G.Offline.stamp(s, now());
      return { ...save(uid, s), report };
    });
  }
  function route(route, uid, b, url) {
    if (route === "/nursery")
      return view(uid, url.searchParams.get("owner") || uid);
    if (route === "/nursery/primary")
      return atomic(() => {
        if (active(uid)) throw fail(409, "Claim the current hatch first");
        if (b.dex != null) parent(uid, b.dex);
        exec("DELETE FROM nursery_invites WHERE owner=?", uid);
        exec("DELETE FROM nursery_rooms WHERE owner=?", uid);
        if (b.dex != null)
          exec(
            "INSERT INTO nursery_rooms VALUES(?,?,?)",
            uid,
            b.dex,
            randomUUID(),
          );
        return view(uid);
      });
    if (route === "/nursery/invite") {
      ensureFriend(uid, b.uid);
      const room = q("SELECT * FROM nursery_rooms WHERE owner=?", uid);
      if (!room) throw fail(409, "Place a primary Pokemon first");
      exec(
        "INSERT INTO nursery_invites VALUES(?,?,?,?) ON CONFLICT(owner,guest) DO UPDATE SET epoch=excluded.epoch,at=excluded.at",
        uid,
        b.uid,
        room.epoch,
        now(),
      );
      notifySocial(b.uid);
      return view(uid);
    }
    if (route === "/nursery/start") {
      const result = atomic(() => {
        const owner = b.owner || uid,
          friend = owner !== uid;
        if (friend) ensureFriend(uid, owner);
        const room = q("SELECT * FROM nursery_rooms WHERE owner=?", owner);
        if (!room || room.epoch !== b.epoch)
          throw fail(409, "Nursery primary changed");
        if (
          friend &&
          !q(
            "SELECT owner FROM nursery_invites WHERE owner=? AND guest=? AND epoch=?",
            owner,
            uid,
            room.epoch,
          )
        )
          throw fail(403, "Nursery invitation required");
        if (active(owner)) throw fail(409, "Nursery is occupied");
        if (
          friend &&
          q(
            "SELECT id FROM nursery_hatches WHERE guest=? AND guest_claim IS NULL LIMIT 1",
            uid,
          )
        )
          throw fail(409, "Already participating in a friend hatch");
        const a = parent(owner, room.dex),
          p = parent(uid, b.dex),
          duration = G.NurseryRules.duration(room.dex, b.dex, friend);
        if (!duration) throw fail(400, "Incompatible egg groups");
        exec(
          "INSERT INTO nursery_hatches(id,owner,guest,dex,partner,a,b,started,ends) VALUES(?,?,?,?,?,?,?,?,?)",
          randomUUID(),
          owner,
          friend ? uid : null,
          room.dex,
          b.dex,
          JSON.stringify(a),
          JSON.stringify(p),
          now(),
          now() + duration,
        );
        return view(uid, owner);
      });
      notifySocial(b.owner || uid);
      if ((b.owner || uid) !== uid) notifySocial(uid);
      return result;
    }
    if (route === "/nursery/claim") {
      const result = claim(uid, b);
      notifySocial(uid);
      return result;
    }
    if (route === "/gifts/send") {
      atomic(() => {
        ensureFriend(uid, b.uid);
        if (
          q(
            "SELECT id FROM gifts WHERE sender=? AND recipient=? AND day=?",
            uid,
            b.uid,
            day(),
          )
        )
          throw fail(409, "Gift already sent today");
        if (
          q(
            "SELECT COUNT(*) AS n FROM gifts WHERE sender=? AND day=?",
            uid,
            day(),
          ).n >= 10
        )
          throw fail(409, "Daily gift limit reached");
        const roll = rng(),
          reward =
            roll < 0.6
              ? { coins: 200 + Math.floor(rng() * 301) }
              : roll < 0.85
                ? { tickets: 1 }
                : { gems: 1 };
        exec(
          "INSERT INTO gifts(id,sender,recipient,day,at,reward) VALUES(?,?,?,?,?,?)",
          randomUUID(),
          uid,
          b.uid,
          day(),
          now(),
          JSON.stringify(reward),
        );
      });
      notifySocial(b.uid);
      notifySocial(uid);
      return summary(uid);
    }
    if (route === "/gifts/claim") {
      const result = atomic(() => {
        const g = q(
          "SELECT * FROM gifts WHERE id=? AND recipient=?",
          String(b.id || ""),
          uid,
        );
        if (!g) throw fail(404, "Gift not found");
        const report = JSON.parse(g.reward);
        if (g.claimed) return { ...saved(uid), report, alreadyClaimed: true };
        const s = revision(uid, b.rev);
        s.coins += report.coins || 0;
        s.tickets.t1 += report.tickets || 0;
        s.abilityGems += report.gems || 0;
        if (s.coins > 1e8 || s.abilityGems > 1e8 || s.tickets.t1 > 1e7)
          throw fail(409, "Wallet limit reached");
        exec("UPDATE gifts SET claimed=1 WHERE id=?", g.id);
        return { ...save(uid, s), report };
      });
      notifySocial(uid);
      return result;
    }
    throw fail(404, "Unknown social action");
  }
  return { summary, route };
};
