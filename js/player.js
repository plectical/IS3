/**
 * player.js — Player state: stats, leveling, gear, gold, saving/loading.
 * The player object persists across fights and zones.
 */

var Player = (function () {

  // The player state object
  var state = {
    heroClass: "knight",    // which hero sprite/class
    level: 1,
    xp: 0,
    gold: 0,
    maxHp: 120,
    hp: 120,
    atk: 10,
    def: 8,
    currentZone: 0,         // index into GameData.zones
    killCount: 0,           // kills in current zone (resets on zone change)
    totalKills: 0,          // lifetime kills
    bossDefeated: false,    // whether current zone's boss has been beaten
    zonesUnlocked: 1        // how many zones player can access
  };

  /**
   * Initialize player with a chosen hero class.
   * Pulls base stats from GameData.heroes.
   */
  function init(heroClass) {
    var base = GameData.heroes[heroClass];
    if (!base) heroClass = "knight"; // fallback
    base = GameData.heroes[heroClass];

    state.heroClass = heroClass;
    state.level = 1;
    state.xp = 0;
    state.gold = 0;
    state.maxHp = base.hp;
    state.hp = base.hp;
    state.atk = base.atk;
    state.def = base.def;
    state.currentZone = 0;
    state.killCount = 0;
    state.totalKills = 0;
    state.bossDefeated = false;
    state.zonesUnlocked = 1;

    save();
  }

  /**
   * Add XP and check for level ups. Returns true if player leveled up.
   */
  function addXp(amount) {
    state.xp += amount;
    var leveled = false;

    // Keep leveling up while XP exceeds the threshold
    while (state.xp >= GameData.xpForLevel(state.level)) {
      state.xp -= GameData.xpForLevel(state.level);
      state.level++;
      leveled = true;

      // Apply stat growth on level up
      var growth = GameData.playerGrowth;
      state.maxHp += growth.hp;
      state.atk += growth.atk;
      state.def += Math.floor(growth.def);

      // Full heal on level up
      state.hp = state.maxHp;
    }

    save();
    return leveled;
  }

  /**
   * Add gold to player's total.
   */
  function addGold(amount) {
    state.gold += amount;
    save();
  }

  /**
   * Take damage. Returns true if player died (hp <= 0).
   */
  function takeDamage(amount) {
    // Reduce damage by defense, minimum 1
    var dmg = Math.max(1, amount - state.def);
    state.hp -= dmg;
    if (state.hp < 0) state.hp = 0;
    return state.hp <= 0;
  }

  /**
   * Heal the player by a flat amount.
   */
  function heal(amount) {
    state.hp = Math.min(state.maxHp, state.hp + amount);
  }

  /**
   * Full heal — used between fights or on level up.
   */
  function fullHeal() {
    state.hp = state.maxHp;
  }

  /**
   * Record a kill. Increments both zone and lifetime counters.
   */
  function recordKill() {
    state.killCount++;
    state.totalKills++;
    save();
  }

  /**
   * Move to the next zone. Resets zone kill counter.
   */
  function advanceZone() {
    if (state.currentZone < GameData.zones.length - 1) {
      state.currentZone++;
      state.killCount = 0;
      state.bossDefeated = false;

      // Unlock zone if it's new
      if (state.currentZone >= state.zonesUnlocked) {
        state.zonesUnlocked = state.currentZone + 1;
      }

      save();
    }
  }

  /**
   * Switch to a specific zone (only if unlocked).
   */
  function goToZone(zoneIndex) {
    if (zoneIndex >= 0 && zoneIndex < state.zonesUnlocked) {
      state.currentZone = zoneIndex;
      state.killCount = 0;
      state.bossDefeated = false;
      save();
    }
  }

  /**
   * Get the sprite key for this player's hero class.
   */
  function spriteKey() {
    return GameData.heroes[state.heroClass].sprite;
  }

  /**
   * Save player state to localStorage.
   */
  function save() {
    try {
      localStorage.setItem("is3_player", JSON.stringify(state));
    } catch (e) {
      // localStorage might be full or unavailable, that's fine
    }
  }

  /**
   * Load player state from localStorage. Returns true if save existed.
   */
  function load() {
    try {
      var saved = localStorage.getItem("is3_player");
      if (saved) {
        var parsed = JSON.parse(saved);
        // Merge saved values into state (keeps defaults for any missing keys)
        for (var key in parsed) {
          if (state.hasOwnProperty(key)) {
            state[key] = parsed[key];
          }
        }
        return true;
      }
    } catch (e) {
      // Corrupted save, start fresh
    }
    return false;
  }

  /**
   * Wipe save data and reset to defaults.
   */
  function reset() {
    localStorage.removeItem("is3_player");
    init("knight");
  }

  // Public API — expose state as read-only via getState()
  return {
    init: init,
    getState: function () { return state; },
    addXp: addXp,
    addGold: addGold,
    takeDamage: takeDamage,
    heal: heal,
    fullHeal: fullHeal,
    recordKill: recordKill,
    advanceZone: advanceZone,
    goToZone: goToZone,
    spriteKey: spriteKey,
    save: save,
    load: load,
    reset: reset
  };

})();
