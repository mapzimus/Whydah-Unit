/*
 * Captain Bellamy — chapters
 *
 * Bellamy's real life, one playable leg at a time. Each chapter is the same
 * engine wearing a different hat: sail, dive, chase or storm.
 *
 * Spawn entries each own their own timer, so tuning one enemy never disturbs
 * the rest. `from`/`to` are fractions of the chapter, which is how a leg
 * ramps up without a scripted table.
 */
window.CHAPTERS = [

  /* 1 ------------------------------------------------------------ */
  {
    id: "capecod",
    title: "Cape Cod",
    when: "1715",
    theme: "dawn",
    mode: "sail",
    duration: 46,
    goal: "Load supplies. Learn the ropes.",
    land: { alpha: 0.5, height: 1 },
    tutorial: true,
    intro: {
      line: "Sam Bellamy has no ship, no money, and one very large idea: a Spanish treasure fleet went down off Florida, and the silver is still there.",
      cue: "Steer clear of the rocks. Grab everything that floats."
    },
    outro: {
      line: "Provisions aboard. Paulsgrave Williams — a Rhode Island jeweller's son with money and nerve — throws in with you.",
      fact: "Bellamy arrived on Cape Cod around 1715. Local legend pairs him with Mary “Maria” Hallett of Eastham, said to have waited on the bluffs for a ship that never came."
    },
    spawns: [
      { kind: "barrel", every: [1.7, 2.6], count: [1, 2] },
      { kind: "coin", every: [1.1, 1.8], count: [2, 4] },
      { kind: "reef", every: [3.2, 4.8], from: 0.25 },
      { kind: "fishing", every: [6, 9], from: 0.35 },
      { kind: "page", every: [17, 19], count: [1, 1], max: 2 }
    ]
  },

  /* 2 ------------------------------------------------------------ */
  {
    id: "florida",
    title: "The Wreck Fleet",
    when: "Florida, 1716",
    theme: "reef",
    mode: "dive",
    duration: 54,
    goal: "Dive the wrecks. Mind your air.",
    intro: {
      line: "Eleven Spanish ships went down here in a hurricane. You are late — Spanish guards already hold the site — so you go over the side and take what the sea still owes you.",
      cue: "Swim with the drag. FIRE / SPACE dashes you clear."
    },
    outro: {
      line: "Not enough silver to make a man rich. Enough to make him hungry.",
      fact: "A Spanish treasure fleet of eleven ships wrecked off Florida in July 1715. Bellamy and Williams sailed to salvage it in 1716 and found the Spanish already guarding the site — which is what pushed them into piracy."
    },
    spawns: [
      { kind: "silver", every: [0.9, 1.5], count: [1, 3] },
      { kind: "air", every: [5.5, 7.5] },
      { kind: "urchin", every: [1.6, 2.4], count: [1, 2] },
      { kind: "shark", every: [6, 8.5], from: 0.2 },
      { kind: "page", every: [19, 22], count: [1, 1], max: 2 }
    ]
  },

  /* 3 ------------------------------------------------------------ */
  {
    id: "nassau",
    title: "Nassau",
    when: "1716",
    theme: "day",
    mode: "sail",
    duration: 60,
    goal: "Cripple a prize. Then sail in and board her.",
    intro: {
      line: "Benjamin Hornigold — old, canny, and captain of the Marianne — takes you on. Now you learn the trade.",
      cue: "Cannon fire knocks a ship out. Ram the drifting hulk to board it."
    },
    outro: {
      line: "You are good at this. The crew has noticed. Hornigold has noticed too, and he doesn't like it.",
      fact: "Nassau in the Bahamas was a self-governing pirate haven. Hornigold's crew included Edward Teach — later Blackbeard — who sailed alongside Bellamy before either was famous."
    },
    spawns: [
      { kind: "merchant", every: [3.4, 4.6] },
      { kind: "coin", every: [2.4, 3.4], count: [2, 3] },
      { kind: "sloop", every: [5.5, 7], from: 0.25 },
      { kind: "barrel", every: [6, 8] },
      { kind: "swimmer", every: [7, 10], from: 0.3 },
      { kind: "reef", every: [6, 9], from: 0.5 },
      { kind: "page", every: [21, 24], count: [1, 1], max: 2 }
    ]
  },

  /* 4 ------------------------------------------------------------ */
  {
    id: "election",
    title: "The Vote",
    when: "Spring 1716",
    theme: "dusk",
    mode: "sail",
    duration: 52,
    goal: "Show the crew what you're worth.",
    intro: {
      line: "Hornigold won't attack English ships. The crew calls a vote — and every prize you take before sundown is an argument in your favour.",
      cue: "Board prizes. Pull your people out of the water. Both count."
    },
    outro: {
      line: "The count goes against Hornigold. He takes a sloop and goes. The rest shout one name: Black Sam.",
      fact: "Pirate crews really did elect their captains — and could vote them out again. In spring 1716 Bellamy's crew removed Hornigold and elected Bellamy in his place."
    },
    spawns: [
      { kind: "merchant", every: [2.9, 3.9] },
      { kind: "swimmer", every: [3.2, 4.6] },
      { kind: "sloop", every: [4.5, 6] },
      { kind: "coin", every: [2.6, 3.6], count: [2, 4] },
      { kind: "barrel", every: [7, 9] },
      { kind: "page", every: [18, 21], count: [1, 1], max: 2 }
    ]
  },

  /* 5 ------------------------------------------------------------ */
  {
    id: "whydah",
    title: "Hunt the Whydah",
    when: "February 1717",
    theme: "day",
    mode: "chase",
    duration: 74,
    goal: "Three days of chasing. Bring down her masts.",
    boss: { kind: "whydah", hp: 46, name: "Whydah Gally" },
    intro: {
      line: "A big galley running the Windward Passage, heavy with cargo. You chase her for three days. On the third day you are close enough to shoot.",
      cue: "Keep the guns on her. Her escorts will try to make you stop."
    },
    outro: {
      line: "She strikes her colours. You hand her captain your own sloop and let him sail off unhurt — then you rename nothing, and keep the name Whydah.",
      fact: "The Whydah Gally was a slave ship, launched in London in 1715. Bellamy captured her in February 1717 after a three-day chase, gave Captain Lawrence Prince his sloop the Sultana, and let him and his crew go free."
    },
    spawns: [
      { kind: "sloop", every: [4.2, 5.6] },
      { kind: "coin", every: [3, 4], count: [2, 3] },
      { kind: "barrel", every: [7.5, 10] },
      { kind: "reef", every: [8, 11], from: 0.3 },
      { kind: "page", every: [26, 30], count: [1, 1], max: 2 }
    ]
  },

  /* 6 ------------------------------------------------------------ */
  {
    id: "north",
    title: "Northward, Laden",
    when: "April 1717",
    theme: "night",
    mode: "sail",
    duration: 62,
    goal: "Run the coast. The Navy is awake.",
    land: { alpha: 0.28, height: 0.7 },
    intro: {
      line: "Four and a half tons of gold, silver and ivory in the hold, and a course set north for Cape Cod. Word is out. The Navy is looking for you.",
      cue: "Navy ships fire in threes. Move early, not late."
    },
    outro: {
      line: "Wellfleet is over the horizon. The glass is falling fast.",
      fact: "Bellamy took more than fifty ships in about a year — the most successful pirate of his era. Pamphlets called him the “Prince of Pirates”; later writers called him the Robin Hood of the Sea, because he mostly took cargo and let crews live."
    },
    spawns: [
      { kind: "navy", every: [7, 9] },
      { kind: "merchant", every: [4.5, 6] },
      { kind: "sloop", every: [4.5, 6] },
      { kind: "coin", every: [2.8, 3.8], count: [2, 4] },
      { kind: "barrel", every: [5.5, 7.5] },
      { kind: "swimmer", every: [8, 11] },
      { kind: "reef", every: [6, 8], from: 0.4 },
      { kind: "page", every: [22, 26], count: [1, 1], max: 2 }
    ]
  },

  /* 7 ------------------------------------------------------------ */
  {
    id: "storm",
    title: "The Nor'easter",
    when: "26 April 1717",
    theme: "storm",
    mode: "storm",
    duration: 66,
    goal: "Hold her together. Find the gaps.",
    land: { alpha: 0.16, height: 0.6 },
    final: true,
    intro: {
      line: "Midnight. The wind swings and comes at you from the north-east, and the Whydah is driven toward a sandbar she cannot cross.",
      cue: "Steer through the gaps in the waves. FIRE / SPACE braces the ship."
    },
    outro: {
      line: "Dawn. Sand under the keel, and the Cape ahead.",
      fact: "The Whydah was driven onto the bar off Wellfleet in a nor'easter on 26 April 1717. She went down with about 145 men aboard. Only two survived."
    },
    spawns: [
      { kind: "wave", every: [2.6, 3.4] },
      { kind: "bolt", every: [4.5, 6.5], from: 0.15 },
      { kind: "barrel", every: [6, 8] },
      { kind: "page", every: [24, 28], count: [1, 1], max: 2 }
    ]
  }
];

/* Logbook facts, unlocked by the pages that float past. Optional reading —
 * invisible to anyone who just wants to sail. */
window.LOGBOOK = [
  { id: "sam", title: "Who was Black Sam?", text: "Samuel Bellamy was born in Devon, England, around 1689 and went to sea young. He was in his late twenties when he died — a pirate captain for barely a year." },
  { id: "maria", title: "Maria Hallett", text: "Cape Cod tradition names Mary “Maria” Hallett as Bellamy's sweetheart, waiting on the Eastham bluffs. No document proves she existed, which has never slowed the story down." },
  { id: "fleet", title: "The 1715 fleet", text: "A hurricane drove eleven Spanish treasure ships onto the Florida coast in July 1715. Salvage camps sprang up, and the wrecks pulled in exactly the sort of men who later turned pirate." },
  { id: "williams", title: "Paulsgrave Williams", text: "Bellamy's partner was no desperate sailor: Williams came from a wealthy Rhode Island family and was about fifteen years older. He sailed a consort ship and survived the wreck." },
  { id: "articles", title: "Ship's articles", text: "Pirate crews signed articles: shares of plunder set in advance, compensation for lost limbs, and a vote on the captain. It was closer to a rough democracy than any navy of the time." },
  { id: "teach", title: "Blackbeard's apprenticeship", text: "Edward Teach served under Hornigold at the same time as Bellamy. Neither was famous yet. Within two years Teach would be the most feared name in the Atlantic." },
  { id: "julian", title: "John Julian", text: "The Whydah's pilot was a young Miskito man from Central America — one of the earliest named Black or Indigenous mariners in New England records. He survived the wreck and was sold into slavery." },
  { id: "prince", title: "Prince of Pirates", text: "Bellamy's crew of about 180 came from many nations and included men who had escaped slavery. Contemporary accounts describe him releasing captured crews and returning ships he did not need." },
  { id: "speech", title: "The famous speech", text: "Captain Charles Johnson's 1724 history quotes Bellamy taunting a captured captain: rich men rob the poor under cover of law, he says, while “we plunder the rich under the protection of our own courage.” Whether he ever said it is another matter." },
  { id: "wreck", title: "26 April 1717", text: "The Whydah struck the bar about 500 feet off Wellfleet in a nor'easter and broke apart in the surf. Roughly 145 men drowned. Two survivors were tried in Boston; six others of Bellamy's men were hanged." },
  { id: "clifford", title: "Found, 1984", text: "Barry Clifford located the wreck off Wellfleet in 1984. A bell inscribed “THE WHYDAH GALLY 1716” confirmed it — still the only fully authenticated pirate shipwreck ever found." },
  { id: "gold", title: "What she carried", text: "Divers have recovered more than 200,000 artifacts: coins from many nations, gold dust, cannon, and a small leg bone inside a silk stocking and shoe, thought to belong to a boy of about nine who sailed with the crew." },
  { id: "cannon", title: "How the guns worked", text: "A ship's cannon was aimed by moving the whole ship. Gun crews of four to six men hauled, swabbed, loaded and ran out each gun — which is why more crew meant faster fire." },
  { id: "board", title: "Why board at all?", text: "Sinking a prize sank her cargo too. Pirates fired to disable — rigging, rudder, masts — then came alongside and took the ship intact. Bellamy's reputation for not slaughtering crews made surrender the sensible choice." }
];
