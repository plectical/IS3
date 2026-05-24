/**
 * assetLoader.js — Loads all game images upfront so we can draw them on canvas.
 * Stores loaded Image objects in a dictionary keyed by a short name.
 */

var AssetLoader = (function () {

  // All loaded images stored here: { "knight": <Image>, "slime": <Image>, ... }
  var images = {};

  // Total vs loaded count for a loading bar
  var totalCount = 0;
  var loadedCount = 0;

  /**
   * Queue up a single image to load.
   * key = short name like "knight"
   * src = file path like "assets/heroes/Knight 64x96.png"
   */
  function _queue(key, src) {
    totalCount++;
    var img = new Image();
    img.onload = function () {
      loadedCount++;
    };
    img.onerror = function () {
      console.warn("Failed to load: " + src);
      loadedCount++; // count it anyway so loading finishes
    };
    img.src = src;
    images[key] = img;
  }

  /**
   * Load all game assets. Call this once at startup.
   * Returns a promise that resolves when everything is loaded.
   */
  function loadAll() {
    // --- HEROES ---
    _queue("knight",      "assets/heroes/Knight 64x96.png");
    _queue("warrior",     "assets/heroes/Warrior 64x96.png");
    _queue("archer",      "assets/heroes/Archer 64x96.png");
    _queue("assassin",    "assets/heroes/Assassin 64x96.png");
    _queue("cleric",      "assets/heroes/Cleric 64x96.png");
    _queue("necromancer", "assets/heroes/Necromancer 64x96.png");

    // --- ENEMIES (forest zone starters) ---
    _queue("slime",       "assets/enemies/Slime 64x96.png");
    _queue("rat",         "assets/enemies/Rat 64x96.png");
    _queue("snake",       "assets/enemies/Snake 64x96.png");
    _queue("spider",      "assets/enemies/Spider 64x96.png");
    _queue("wolf",        "assets/enemies/Wolf 64x96.png");
    _queue("goblin",      "assets/enemies/Goblin 64x96.png");
    _queue("kobold",      "assets/enemies/Kobold 64x96.png");
    _queue("skeleton",    "assets/enemies/Skeleton 64x96.png");

    // --- ENEMIES (castle/cavern zones) ---
    _queue("skeleton_knight", "assets/enemies/Skeleton Knight 64x96.png");
    _queue("skeleton_mage",   "assets/enemies/Skeleton Mage 64x96.png");
    _queue("ghoul",           "assets/enemies/Ghoul 64x96.png");
    _queue("orc",             "assets/enemies/Orc 64x96.png");
    _queue("minotaur",        "assets/enemies/Minotaur 64x96.png");
    _queue("fire_golem",      "assets/enemies/Fire Golem 64x96.png");
    _queue("cyclops",         "assets/enemies/Cyclops 64x96.png");
    _queue("beholder",        "assets/enemies/Beholder 64x96.png");

    // --- ENEMIES (hell/cosmic zones) ---
    _queue("wraith",          "assets/enemies/Wraith 64x96.png");
    _queue("succubus",        "assets/enemies/Succubus 64x96.png");
    _queue("hell_hound",      "assets/enemies/Hell Hound 64x96.png");
    _queue("raging_demon",    "assets/enemies/Raging Demon 64x96.png");
    _queue("mind_flayer",     "assets/enemies/Mind Flayer 64x96.png");
    _queue("elder_lich",      "assets/enemies/Elder Lich 64x96.png");
    _queue("emerald_dragon",  "assets/enemies/Emerald Dragon 64x96.png");
    _queue("manticore",       "assets/enemies/Manticore 64x96.png");

    // --- ENEMIES (remaining) ---
    _queue("crow",            "assets/enemies/Crow 64x96.png");
    _queue("ent",             "assets/enemies/Ent 64x96.png");
    _queue("ice_bat",         "assets/enemies/Ice Bat 64x96.png");
    _queue("ice_wolf",        "assets/enemies/Ice Wolf 64x96.png");
    _queue("ice_drake",       "assets/enemies/Ice Drake 64x96.png");
    _queue("ice_witch",       "assets/enemies/Ice Witch 64x96.png");
    _queue("thorn_vine",      "assets/enemies/Thorn Vine 64x96.png");
    _queue("undead_hound",    "assets/enemies/Undead Hound 64x96.png");
    _queue("berserker",       "assets/enemies/Berserker 64x96.png");
    _queue("warlock",         "assets/enemies/Warlock 64x96.png");
    _queue("guardian",        "assets/enemies/Guardian 64x96.png");
    _queue("living_shadow",   "assets/enemies/Living Shadow 64x96.png");
    _queue("living_sword",    "assets/enemies/Living Sword 64x96.png");
    _queue("earth_elemental", "assets/enemies/Earth Elemental 64x96.png");
    _queue("air_elemental",   "assets/enemies/Air Elemental 64x96.png");
    _queue("wind_golem",      "assets/enemies/Wind Golem 64x96.png");
    _queue("frost_lizard",    "assets/enemies/Frost Lizard 64x96.png");
    _queue("kirin",           "assets/enemies/Kirin 64x96.png");
    _queue("basilisk",        "assets/enemies/Basilisk 64x96.png");
    _queue("annihilator",     "assets/enemies/Annihilator 64x96.png");
    _queue("marble_guardian", "assets/enemies/Marble Guardian 64x96.png");
    _queue("silver_drake",    "assets/enemies/Silver Drake 64x96.png");
    _queue("undead_wyvern",   "assets/enemies/Undead Wyvern 64x96.png");
    _queue("man_eating_plant","assets/enemies/Man Eatikng Plant 64x96.png");
    _queue("eyes",            "assets/enemies/Eyes 64x96.png");
    _queue("flesh_golem",     "assets/enemies/Flesh Golem Summon 64x96.png");
    _queue("golem_summon",    "assets/enemies/Golem Summon 64x96.png");

    // --- BOSSES ---
    _queue("boss_dragon_king",      "assets/bosses/Dragon King 128x128.png");
    _queue("boss_chimera",          "assets/bosses/Chimera 128x128.png");
    _queue("boss_death",            "assets/bosses/Death 128x128.png");
    _queue("boss_behemoth",         "assets/bosses/Behemoth Wyrm 128x128.png");
    _queue("boss_balrog",           "assets/bosses/Infernal Balrog 128x128.png");
    _queue("boss_leviathan",        "assets/bosses/Leviathan 128x128.png");
    _queue("boss_nightmare",        "assets/bosses/Unending Nightmare 128x128.png");
    _queue("boss_forest_spirit",    "assets/bosses/Spirit of the Forest 128x160.png");
    _queue("boss_king",             "assets/bosses/The King.png");

    // --- FLOOR TILES (one per zone for now, we'll expand later) ---
    _queue("tile_forest_01",   "assets/tilesets/forest/Forest Floor Tile 01.png");
    _queue("tile_forest_02",   "assets/tilesets/forest/Forest Floor Tile 02.png");
    _queue("tile_forest_03",   "assets/tilesets/forest/Forest Floor Tile 03.png");
    _queue("tile_castle_01",   "assets/tilesets/castle/Floor Tile 01.png");
    _queue("tile_castle_02",   "assets/tilesets/castle/Floor Tile 02.png");
    _queue("tile_castle_03",   "assets/tilesets/castle/Floor Tile 03.png");
    _queue("tile_cavern_01",   "assets/tilesets/cavern/Cavern Floor Tile 01.png");
    _queue("tile_cavern_02",   "assets/tilesets/cavern/Cavern Floor Tile 02.png");
    _queue("tile_hell_01",     "assets/tilesets/hell/Hell Floor Tile 01.png");
    _queue("tile_hell_02",     "assets/tilesets/hell/Hell Floor Tile 02.png");
    _queue("tile_cosmic_01",   "assets/tilesets/cosmic/Cosmic Floor Tile 01.png");
    _queue("tile_cosmic_02",   "assets/tilesets/cosmic/Cosmic Floor Tile 02.png");
    _queue("tile_cemetery_01", "assets/tilesets/cemetery/Cemetery Floor Tile 01.png");
    _queue("tile_cemetery_02", "assets/tilesets/cemetery/Cemetery Floor Tile 02.png");
    _queue("tile_overworld_01","assets/tilesets/overworld/Overworld Floor 01.png");
    _queue("tile_overworld_02","assets/tilesets/overworld/Overworld Floor 02.png");

    // --- WALL / COLUMN TILES (for dungeon corridor framing) ---
    // Castle walls
    _queue("castle_wall_left_01",  "assets/tilesets/castle/Left Wall Tile 01.png");
    _queue("castle_wall_left_02",  "assets/tilesets/castle/Left Wall Tile 02.png");
    _queue("castle_wall_left_03",  "assets/tilesets/castle/Left Wall Tile 03.png");
    _queue("castle_wall_right_01", "assets/tilesets/castle/Right Wall Tile 01.png");
    _queue("castle_wall_right_02", "assets/tilesets/castle/Right Wall Tile 02.png");
    _queue("castle_wall_right_03", "assets/tilesets/castle/Right Wall Tile 03.png");
    _queue("castle_sconce_left",   "assets/tilesets/castle/Left Sconce Wall Tile.png");
    _queue("castle_sconce_right",  "assets/tilesets/castle/Right Sconce Wall Tile.png");
    _queue("castle_column",        "assets/tilesets/castle/Column Tile.png");
    _queue("castle_column_02",     "assets/tilesets/castle/Column Tile 02.png");

    // Cavern walls
    _queue("cavern_wall_mid",       "assets/tilesets/cavern/Cavern Wall Middle.png");
    _queue("cavern_wall_top_left",  "assets/tilesets/cavern/Cavern Wall Top Left.png");
    _queue("cavern_wall_top_right", "assets/tilesets/cavern/Cavern Wall Top Right.png");
    _queue("cavern_wall_bot_left",  "assets/tilesets/cavern/Cavern Wall Bottom Left.png");
    _queue("cavern_wall_bot_right", "assets/tilesets/cavern/Cavern Wall Bottom Right.png");
    _queue("cavern_stalagmite_01",  "assets/tilesets/cavern/Cavern Stalagmite Tile 01.png");
    _queue("cavern_stalagmite_02",  "assets/tilesets/cavern/Cavern Stalagmite Tile 02.png");

    // Hell walls/columns
    _queue("hell_column",      "assets/tilesets/hell/Hell Column.png");
    _queue("hell_spire_01",    "assets/tilesets/hell/Hell Spire 01.png");
    _queue("hell_spire_02",    "assets/tilesets/hell/Hell Spire 02.png");
    _queue("hell_bone_01",     "assets/tilesets/hell/Hell Bone Pile 01.png");
    _queue("hell_bone_02",     "assets/tilesets/hell/Hell Bone Pile 02.png");
    _queue("hell_torch",       "assets/tilesets/hell/Hell Torch.png");
    _queue("hell_lava_01",     "assets/tilesets/hell/Hell Lava 01.png");
    _queue("hell_lava_02",     "assets/tilesets/hell/Hell Lava 02.png");

    // Cosmic walls
    _queue("cosmic_wall_01",   "assets/tilesets/cosmic/Cosmic Wall 01.png");
    _queue("cosmic_wall_02",   "assets/tilesets/cosmic/Cosmic Wall 02.png");
    _queue("cosmic_wall_03",   "assets/tilesets/cosmic/Cosmic Wall 03.png");
    _queue("cosmic_light_01",  "assets/tilesets/cosmic/Cosmic Light 01.png");
    _queue("cosmic_light_02",  "assets/tilesets/cosmic/Cosmic Light 02.png");

    // Cemetery props
    _queue("cemetery_grave_01",  "assets/tilesets/cemetery/Cemetery Gravestone 01.png");
    _queue("cemetery_grave_02",  "assets/tilesets/cemetery/Cemetery Gravestone 02.png");
    _queue("cemetery_tree_01",   "assets/tilesets/cemetery/Cemetery Tree 1.png");
    _queue("cemetery_tree_02",   "assets/tilesets/cemetery/Cemetery Tree 02.png");
    _queue("cemetery_fence_col", "assets/tilesets/cemetery/Cemetery Fence Column.png");

    // Overworld walls
    _queue("overworld_wall_mid_01",  "assets/tilesets/overworld/Overworld Wall Middle 01.png");
    _queue("overworld_wall_mid_02",  "assets/tilesets/overworld/Overworld Wall Middle 02.png");
    _queue("overworld_rocks_01",     "assets/tilesets/overworld/Overworld Rocks 01.png");
    _queue("overworld_rocks_02",     "assets/tilesets/overworld/Overworld Rocks 02.png");

    // Forest props (trees/rocks for forest corridor decoration)
    _queue("tree_01",          "assets/tilesets/forest/Tree Tile 01.png");
    _queue("tree_02",          "assets/tilesets/forest/Tree Tile 02.png");
    _queue("tree_03",          "assets/tilesets/forest/Tree Tile 03.png");
    _queue("tree_04",          "assets/tilesets/forest/Tree Tile 04.png");
    _queue("grass_01",         "assets/tilesets/forest/Grass Tile 01.png");
    _queue("grass_02",         "assets/tilesets/forest/Grass Tile 02.png");
    _queue("forest_rock_01",   "assets/tilesets/forest/Forest Rock Tile 01.png");
    _queue("forest_rock_02",   "assets/tilesets/forest/Forest Rock Tile 02.png");

    // Return a promise that checks loading progress
    return new Promise(function (resolve) {
      var check = setInterval(function () {
        if (loadedCount >= totalCount) {
          clearInterval(check);
          console.log("All " + totalCount + " assets loaded.");
          resolve();
        }
      }, 50);
    });
  }

  /**
   * Get a loaded image by its short key name.
   */
  function get(key) {
    return images[key] || null;
  }

  /**
   * Get loading progress as 0-1 for a loading bar.
   */
  function progress() {
    if (totalCount === 0) return 0;
    return loadedCount / totalCount;
  }

  // Public API
  return {
    loadAll: loadAll,
    get: get,
    progress: progress
  };

})();
