/*
 * Black Sam — ship's company
 *
 * The management layer, and deliberately the only one: it lives between
 * chapters, never during them. Three things to decide in port —
 *
 *   1. Who to recruit and promote with the gold you took.
 *   2. Who actually sails, because there are always fewer berths than crew.
 *   3. Whether to spend gold on a share-out to lift a sour crew.
 *
 * Mood is earned in the action, not maintained by chores: each officer cares
 * about a specific thing you did on the last leg. Sour crew give half their
 * bonus, keen crew give a quarter more — it is never a hard block.
 */
window.CREW = (function () {
  "use strict";

  /*
   * effect: what one star is worth. `likes` names the deed counted at the end
   * of a leg; `blurb` is the plain-language version shown on the card.
   */
  var ROSTER = [
    {
      id: "williams",
      name: "Paulsgrave Williams",
      short: "Williams",
      role: "Quartermaster",
      from: 1,
      cost: 70,
      promote: [110, 190],
      face: { skin: "#d3a578", hair: "#4a3524", hat: "tricorn", coat: "#3d5a6c" },
      stat: "plunder",
      per: 0.3,
      blurb: "Splits the plunder fairly, and argues you a bigger share of it.",
      effectText: "+30% gold from every ship you board",
      likes: "boards",
      likesText: "Likes a busy leg — boarding ships",
      note: "Real. Bellamy's partner from the start — and one of the few who outlived him."
    },
    {
      id: "davis",
      name: "Thomas Davis",
      short: "Davis",
      role: "Carpenter",
      from: 1,
      cost: 80,
      promote: [120, 200],
      face: { skin: "#e0b48c", hair: "#6b4a2a", hat: "cap", coat: "#5a4127" },
      stat: "hull",
      per: 2,
      blurb: "Keeps the planks in the hull and the water out of it.",
      effectText: "+2 hull points",
      likes: "barrels",
      likesText: "Likes being kept in timber — collecting barrels",
      note: "Real. A Welsh carpenter, forced from a captured ship. He survived the wreck."
    },
    {
      id: "goat",
      name: "Bartholomew",
      short: "Bartholomew",
      role: "Ship's Goat",
      from: 2,
      cost: 60,
      promote: [90, 150],
      face: { goat: true },
      stat: "magnet",
      per: 0.45,
      blurb: "Charges at anything that floats, and drags it back aboard.",
      effectText: "Pulls in loose gold and cargo from much further away",
      likes: "pickups",
      likesText: "Likes hoovering things up — coins, silver, barrels",
      note: "Invented — there is no goat in the records. Ships did carry live animals."
    },
    {
      id: "teach",
      name: "Edward Teach",
      short: "Teach",
      role: "Master Gunner",
      from: 2,
      cost: 90,
      promote: [130, 220],
      face: { skin: "#cd9a6d", hair: "#12100e", beard: true, hat: "tricorn", coat: "#2a2f36" },
      stat: "reload",
      per: -0.14,
      blurb: "Works the guns faster than anyone should be able to.",
      effectText: "−14% reload time (at three stars, an extra ball per volley)",
      likes: "kills",
      likesText: "Likes gunnery — crippling ships with cannon fire",
      note: "Real. Two years later, the world would know him as Blackbeard."
    },
    {
      id: "king",
      name: "John King",
      short: "King",
      role: "Powder Monkey",
      from: 3,
      cost: 85,
      promote: [120, 200],
      face: { skin: "#c98a5d", hair: "#3a2a19", young: true, coat: "#7a5c3a" },
      stat: "luck",
      per: 1,
      blurb: "Small, quick, and finds things nobody else spots.",
      effectText: "More logbook pages turn up, and loose gold drifts your way",
      likes: "pages",
      likesText: "Likes a good rummage — finding logbook pages",
      note: "Real, and about nine years old. He demanded to join the crew."
    },
    {
      id: "quintor",
      name: "Hendrick Quintor",
      short: "Quintor",
      role: "Boarder",
      from: 3,
      cost: 95,
      promote: [140, 230],
      face: { skin: "#7a5233", hair: "#171310", hat: "scarf", coat: "#6d3b34" },
      stat: "hands",
      per: 1,
      blurb: "First over the rail, and brings the other ship's crew with him.",
      effectText: "+1 extra hand joins from every ship you board",
      likes: "rescues",
      likesText: "Likes leaving nobody behind — pulling swimmers aboard",
      note: "Real. A Dutch mariner of African descent, tried in Boston after the wreck."
    },
    {
      id: "julian",
      name: "John Julian",
      short: "Julian",
      role: "Pilot",
      from: 5,
      cost: 110,
      promote: [150, 240],
      face: { skin: "#7d5436", hair: "#1a1512", young: true, coat: "#2f5147" },
      stat: "speed",
      per: 0.14,
      blurb: "Reads water nobody else can read. The ship answers faster.",
      effectText: "+14% handling — you steer quicker and turn tighter",
      likes: "clean",
      likesText: "Likes clean sailing — finishing a leg without being hit",
      note: "Real. The Whydah's Miskito pilot, and one of only two men to survive her."
    }
  ];

  var MOOD_KEEN = 70;
  var MOOD_SOUR = 35;

  function byId(id) {
    for (var i = 0; i < ROSTER.length; i++) if (ROSTER[i].id === id) return ROSTER[i];
    return null;
  }

  function moodBand(mood) {
    if (mood >= MOOD_KEEN) return "keen";
    if (mood <= MOOD_SOUR) return "sour";
    return "steady";
  }

  function moodLabel(mood) {
    return { keen: "Keen", steady: "Steady", sour: "Sour" }[moodBand(mood)];
  }

  /* Sour hands still work — they just work at half. Never a hard block. */
  function moodMultiplier(mood) {
    return { keen: 1.25, steady: 1, sour: 0.5 }[moodBand(mood)];
  }

  function berthCount(chapterIndex) {
    // The vote makes you captain; the Whydah is a far bigger ship.
    return 3 + (chapterIndex >= 3 ? 1 : 0) + (chapterIndex >= 4 ? 1 : 0);
  }

  function isHired(run, id) {
    return !!(run.officers && run.officers[id] && run.officers[id].hired);
  }

  function isAvailable(run, def) {
    return run.chapter >= def.from;
  }

  function onDeck(run, id) {
    return (run.berths || []).indexOf(id) !== -1;
  }

  function promoteCost(run, def) {
    var rec = run.officers[def.id];
    if (!rec || rec.level >= 3) return null;
    return def.promote[rec.level - 1];
  }

  /*
   * Every stat the action layer reads. Called fresh whenever the roster or a
   * berth changes, so the bars on the crew screen move as you decide.
   */
  function computeStats(run) {
    var s = {
      reload: 1,      // multiplier on reload time — lower is faster
      volley: 0,      // extra cannonballs per held volley
      hullBonus: 0,   // extra hull points
      speed: 1,       // handling multiplier
      plunder: 1,     // gold multiplier
      magnet: 1,      // pickup attraction radius multiplier
      luck: 0,        // extra page chance + loose gold
      handsPerBoard: 0
    };

    (run.berths || []).forEach(function (id) {
      var def = byId(id);
      var rec = run.officers && run.officers[id];
      if (!def || !rec || !rec.hired) return;
      var amount = def.per * rec.level * moodMultiplier(rec.mood);

      switch (def.stat) {
        case "plunder": s.plunder += amount; break;
        case "hull": s.hullBonus += Math.round(amount); break;
        case "reload": s.reload += amount; break;   // per is negative
        case "speed": s.speed += amount; break;
        case "magnet": s.magnet += amount; break;
        case "luck": s.luck += amount; break;
        case "hands": s.handsPerBoard += Math.round(amount); break;
      }
      if (def.id === "teach" && rec.level >= 3) s.volley += 1;
    });

    s.reload = Math.max(0.45, s.reload);
    s.speed = Math.min(1.7, s.speed);
    return s;
  }

  /* 0..1 readings for the bars on the crew screen. */
  function statBars(stats) {
    return [
      { key: "firepower", label: "Firepower", frac: clamp01((1 - stats.reload) / 0.55 + stats.volley * 0.25) },
      { key: "hull", label: "Hull", frac: clamp01(stats.hullBonus / 12) },
      { key: "handling", label: "Handling", frac: clamp01((stats.speed - 1) / 0.7) },
      { key: "plunder", label: "Plunder", frac: clamp01((stats.plunder - 1) / 1.4) },
      { key: "luck", label: "Fortune", frac: clamp01((stats.luck + stats.magnet - 1) / 2.4) }
    ];
  }

  function clamp01(n) { return n < 0 ? 0 : n > 1 ? 1 : n; }

  /*
   * End-of-leg mood. Officers who got the leg they wanted cheer up; officers
   * left on the beach quietly sour. `deeds` is filled in by the action layer.
   */
  function settleMood(run, deeds) {
    var changes = [];
    ROSTER.forEach(function (def) {
      var rec = run.officers && run.officers[def.id];
      if (!rec || !rec.hired) return;
      var before = rec.mood;
      var delta;

      if (!onDeck(run, def.id)) {
        delta = -6;                     // benched, and they notice
      } else {
        /*
         * A quiet leg costs almost nothing. Sour crew already give half their
         * bonus, so letting normal play drift everyone downward would compound
         * into a spiral the player can't read or escape — the exact way a mood
         * system turns into homework.
         */
        var got = deedScore(def.likes, deeds);
        delta = Math.round(-3 + got * 20);
        if (deeds.sank) delta -= 6;
        delta = Math.max(-14, Math.min(18, delta));
      }

      var floor = onDeck(run, def.id) && !deeds.sank ? 30 : 0;
      rec.mood = Math.max(floor, Math.min(100, rec.mood + delta));
      changes.push({ id: def.id, short: def.short, delta: rec.mood - before, mood: rec.mood });
    });
    return changes;
  }

  /* Normalised 0..1 "did they get what they like out of this leg". */
  function deedScore(likes, d) {
    switch (likes) {
      case "boards": return ratio(d.boards, 4);
      case "kills": return ratio(d.kills, 6);
      case "rescues": return ratio(d.rescues, 3);
      case "pages": return ratio(d.pages, 2);
      case "barrels": return ratio(d.barrels, 4);
      case "pickups": return ratio(d.pickups, 14);
      case "clean": return d.hits === 0 ? 1 : d.hits <= 1 ? 0.5 : 0;
      default: return 0.4;
    }
  }

  function ratio(got, want) {
    return Math.max(0, Math.min(1, (got || 0) / want));
  }

  var SHARE_OUT_COST = 60;
  var SHARE_OUT_MOOD = 18;

  function shareOut(run) {
    if (run.gold < SHARE_OUT_COST) return false;
    run.gold -= SHARE_OUT_COST;
    ROSTER.forEach(function (def) {
      var rec = run.officers && run.officers[def.id];
      if (rec && rec.hired) rec.mood = Math.min(100, rec.mood + SHARE_OUT_MOOD);
    });
    return true;
  }

  return {
    ROSTER: ROSTER,
    byId: byId,
    moodBand: moodBand,
    moodLabel: moodLabel,
    moodMultiplier: moodMultiplier,
    berthCount: berthCount,
    isHired: isHired,
    isAvailable: isAvailable,
    onDeck: onDeck,
    promoteCost: promoteCost,
    computeStats: computeStats,
    statBars: statBars,
    settleMood: settleMood,
    shareOut: shareOut,
    SHARE_OUT_COST: SHARE_OUT_COST
  };
})();
