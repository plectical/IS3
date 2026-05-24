/**
 * gameData.js — All game configuration: zones, enemy stats, loot tables, level curves.
 * Pure data, no logic. Everything the game needs to look up lives here.
 */

var GameData = {

  // --- ZONES ---
  // Each zone has a name, tileset, list of enemies, a boss, and a level range.
  // Player progresses through zones by beating the boss.
  zones: [
    {
      id: "forest",
      name: "Dark Forest",
      tiles: ["tile_forest_01", "tile_forest_02", "tile_forest_03"],
      obstacles: ["tree_01", "tree_02", "grass_01", "forest_rock_01"],
      enemies: ["slime", "rat", "snake", "spider", "wolf", "goblin"],
      boss: "boss_forest_spirit",
      levelRange: [1, 5],
      goldMult: 1.0
    },
    {
      id: "cavern",
      name: "Cavern Depths",
      tiles: ["tile_cavern_01", "tile_cavern_02"],
      obstacles: [],
      enemies: ["kobold", "skeleton", "ghoul", "spider", "wolf", "orc"],
      boss: "boss_chimera",
      levelRange: [4, 10],
      goldMult: 1.5
    },
    {
      id: "castle",
      name: "Ruined Castle",
      tiles: ["tile_castle_01", "tile_castle_02", "tile_castle_03"],
      obstacles: [],
      enemies: ["skeleton_knight", "skeleton_mage", "ghoul", "orc", "minotaur", "guardian"],
      boss: "boss_king",
      levelRange: [8, 15],
      goldMult: 2.0
    },
    {
      id: "cemetery",
      name: "Forsaken Cemetery",
      tiles: ["tile_cemetery_01", "tile_cemetery_02"],
      obstacles: [],
      enemies: ["wraith", "undead_hound", "ghoul", "skeleton_mage", "living_shadow", "warlock"],
      boss: "boss_death",
      levelRange: [12, 20],
      goldMult: 2.5
    },
    {
      id: "hell",
      name: "Infernal Pits",
      tiles: ["tile_hell_01", "tile_hell_02"],
      obstacles: [],
      enemies: ["hell_hound", "fire_golem", "succubus", "raging_demon", "berserker", "cyclops"],
      boss: "boss_balrog",
      levelRange: [18, 28],
      goldMult: 3.5
    },
    {
      id: "cosmic",
      name: "Cosmic Void",
      tiles: ["tile_cosmic_01", "tile_cosmic_02"],
      obstacles: [],
      enemies: ["mind_flayer", "elder_lich", "beholder", "emerald_dragon", "annihilator", "manticore"],
      boss: "boss_nightmare",
      levelRange: [25, 40],
      goldMult: 5.0
    }
  ],

  // --- ENEMY STATS ---
  // Base stats for each enemy type. Actual stats scale with zone level.
  // hp/atk/def are base values at level 1, scaled by (1 + 0.15 * level)
  enemies: {
    // Forest tier
    slime:           { name: "Slime",           hp: 20,  atk: 4,   def: 1,  xp: 8,   gold: 3  },
    rat:             { name: "Rat",             hp: 15,  atk: 5,   def: 0,  xp: 6,   gold: 2  },
    snake:           { name: "Snake",           hp: 18,  atk: 6,   def: 1,  xp: 9,   gold: 3  },
    spider:          { name: "Spider",          hp: 22,  atk: 7,   def: 2,  xp: 10,  gold: 4  },
    wolf:            { name: "Wolf",            hp: 30,  atk: 8,   def: 2,  xp: 14,  gold: 5  },
    goblin:          { name: "Goblin",          hp: 25,  atk: 6,   def: 3,  xp: 12,  gold: 6  },

    // Cavern tier
    kobold:          { name: "Kobold",          hp: 35,  atk: 9,   def: 4,  xp: 18,  gold: 8  },
    skeleton:        { name: "Skeleton",        hp: 40,  atk: 10,  def: 5,  xp: 20,  gold: 9  },
    ghoul:           { name: "Ghoul",           hp: 50,  atk: 12,  def: 4,  xp: 24,  gold: 11 },
    orc:             { name: "Orc",             hp: 55,  atk: 14,  def: 6,  xp: 28,  gold: 13 },

    // Castle tier
    skeleton_knight: { name: "Skeleton Knight", hp: 70,  atk: 16,  def: 10, xp: 35,  gold: 18 },
    skeleton_mage:   { name: "Skeleton Mage",   hp: 45,  atk: 22,  def: 5,  xp: 38,  gold: 20 },
    minotaur:        { name: "Minotaur",        hp: 90,  atk: 18,  def: 8,  xp: 42,  gold: 22 },
    guardian:        { name: "Guardian",         hp: 100, atk: 15,  def: 14, xp: 45,  gold: 24 },

    // Cemetery tier
    wraith:          { name: "Wraith",          hp: 60,  atk: 24,  def: 6,  xp: 50,  gold: 28 },
    undead_hound:    { name: "Undead Hound",    hp: 65,  atk: 20,  def: 8,  xp: 48,  gold: 26 },
    living_shadow:   { name: "Living Shadow",   hp: 55,  atk: 28,  def: 4,  xp: 55,  gold: 30 },
    warlock:         { name: "Warlock",         hp: 50,  atk: 30,  def: 5,  xp: 58,  gold: 32 },

    // Hell tier
    hell_hound:      { name: "Hell Hound",      hp: 85,  atk: 26,  def: 10, xp: 65,  gold: 38 },
    fire_golem:      { name: "Fire Golem",      hp: 120, atk: 22,  def: 18, xp: 70,  gold: 42 },
    succubus:        { name: "Succubus",        hp: 70,  atk: 32,  def: 8,  xp: 72,  gold: 40 },
    raging_demon:    { name: "Raging Demon",    hp: 100, atk: 35,  def: 12, xp: 80,  gold: 48 },
    berserker:       { name: "Berserker",       hp: 95,  atk: 38,  def: 6,  xp: 78,  gold: 45 },
    cyclops:         { name: "Cyclops",         hp: 130, atk: 30,  def: 15, xp: 85,  gold: 50 },

    // Cosmic tier
    mind_flayer:     { name: "Mind Flayer",     hp: 90,  atk: 40,  def: 12, xp: 100, gold: 60 },
    elder_lich:      { name: "Elder Lich",      hp: 80,  atk: 45,  def: 10, xp: 110, gold: 65 },
    beholder:        { name: "Beholder",        hp: 110, atk: 42,  def: 14, xp: 115, gold: 70 },
    emerald_dragon:  { name: "Emerald Dragon",  hp: 150, atk: 38,  def: 20, xp: 130, gold: 80 },
    annihilator:     { name: "Annihilator",     hp: 140, atk: 48,  def: 16, xp: 140, gold: 90 },
    manticore:       { name: "Manticore",       hp: 120, atk: 44,  def: 18, xp: 125, gold: 75 }
  },

  // --- BOSS STATS ---
  // Bosses are beefier versions. They appear after clearing X enemies in a zone.
  bosses: {
    boss_forest_spirit: { name: "Spirit of the Forest", hp: 200,  atk: 15,  def: 8,   xp: 100,  gold: 50  },
    boss_chimera:       { name: "Chimera",              hp: 400,  atk: 28,  def: 14,  xp: 250,  gold: 120 },
    boss_king:          { name: "The King",             hp: 600,  atk: 40,  def: 22,  xp: 450,  gold: 250 },
    boss_death:         { name: "Death",                hp: 800,  atk: 55,  def: 18,  xp: 700,  gold: 400 },
    boss_balrog:        { name: "Infernal Balrog",      hp: 1200, atk: 70,  def: 30,  xp: 1000, gold: 600 },
    boss_nightmare:     { name: "Unending Nightmare",   hp: 2000, atk: 90,  def: 40,  xp: 1800, gold: 1000 },
    boss_dragon_king:   { name: "Dragon King",          hp: 3000, atk: 120, def: 50,  xp: 3000, gold: 2000 },
    boss_behemoth:      { name: "Behemoth Wyrm",        hp: 2500, atk: 100, def: 45,  xp: 2500, gold: 1500 },
    boss_leviathan:     { name: "Leviathan",            hp: 2800, atk: 110, def: 48,  xp: 2800, gold: 1800 }
  },

  // --- HERO CLASSES ---
  // Starting stats for each selectable hero class.
  heroes: {
    knight:      { name: "Knight",      hp: 120, atk: 10, def: 8,  sprite: "knight"      },
    warrior:     { name: "Warrior",     hp: 100, atk: 14, def: 6,  sprite: "warrior"     },
    archer:      { name: "Archer",      hp: 80,  atk: 16, def: 4,  sprite: "archer"      },
    assassin:    { name: "Assassin",    hp: 70,  atk: 18, def: 3,  sprite: "assassin"    },
    cleric:      { name: "Cleric",      hp: 110, atk: 8,  def: 7,  sprite: "cleric"      },
    necromancer: { name: "Necromancer", hp: 75,  atk: 20, def: 2,  sprite: "necromancer" }
  },

  // --- LEVEL CURVE ---
  // XP needed to reach the next level. Formula: base * level^exponent
  xpForLevel: function (level) {
    return Math.floor(50 * Math.pow(level, 1.6));
  },

  // --- STAT SCALING ---
  // How much stats grow per level for the player
  playerGrowth: {
    hp:  8,   // +8 max HP per level
    atk: 2,   // +2 attack per level
    def: 1.5  // +1.5 defense per level
  },

  // --- ENEMY SCALING ---
  // Enemies scale with zone level: stat * (1 + 0.15 * level)
  scaleEnemy: function (baseStats, level) {
    var mult = 1 + 0.15 * level;
    return {
      name: baseStats.name,
      hp:   Math.floor(baseStats.hp * mult),
      atk:  Math.floor(baseStats.atk * mult),
      def:  Math.floor(baseStats.def * mult),
      xp:   Math.floor(baseStats.xp * mult),
      gold: Math.floor(baseStats.gold * mult)
    };
  },

  // --- COMBAT ---
  // Kills needed before the zone boss appears
  killsPerBoss: 10,

  // Auto-fight tick speed in ms
  combatTickMs: 1500
};
