/**
 * enemy.js — Enemy spawning and state management.
 * Creates enemies based on the current zone, scales their stats, tracks HP.
 */

var Enemy = (function () {

  // Current enemy being fought
  var current = null;

  /**
   * Spawn a random enemy from the current zone.
   * Picks a random enemy type and scales stats to zone level.
   */
  function spawnRandom() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];

    // Pick a random enemy from this zone's enemy list
    var pool = zone.enemies;
    var pick = pool[Math.floor(Math.random() * pool.length)];

    // Get base stats for this enemy type
    var base = GameData.enemies[pick];
    if (!base) {
      console.warn("Unknown enemy: " + pick);
      base = GameData.enemies["slime"]; // fallback
      pick = "slime";
    }

    // Random level within the zone's range
    var minLv = zone.levelRange[0];
    var maxLv = zone.levelRange[1];
    var enemyLevel = minLv + Math.floor(Math.random() * (maxLv - minLv + 1));

    // Scale stats based on level
    var scaled = GameData.scaleEnemy(base, enemyLevel);

    // Apply zone gold multiplier
    scaled.gold = Math.floor(scaled.gold * zone.goldMult);

    // Build the enemy object
    current = {
      id: pick,              // sprite key (matches asset loader key)
      name: scaled.name,     // display name
      level: enemyLevel,
      maxHp: scaled.hp,
      hp: scaled.hp,
      atk: scaled.atk,
      def: scaled.def,
      xp: scaled.xp,
      gold: scaled.gold,
      isBoss: false
    };

    return current;
  }

  /**
   * Spawn the zone boss.
   * Only called when killCount reaches the threshold.
   */
  function spawnBoss() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    var bossKey = zone.boss;

    var base = GameData.bosses[bossKey];
    if (!base) {
      console.warn("Unknown boss: " + bossKey);
      return spawnRandom(); // fallback to random enemy
    }

    // Bosses scale with the zone's max level
    var bossLevel = zone.levelRange[1];
    var mult = 1 + 0.1 * bossLevel;

    current = {
      id: bossKey,
      name: base.name,
      level: bossLevel,
      maxHp: Math.floor(base.hp * mult),
      hp: Math.floor(base.hp * mult),
      atk: Math.floor(base.atk * mult),
      def: Math.floor(base.def * mult),
      xp: Math.floor(base.xp * mult),
      gold: Math.floor(base.gold * mult),
      isBoss: true
    };

    return current;
  }

  /**
   * Deal damage to the current enemy.
   * Returns true if enemy died.
   */
  function takeDamage(amount) {
    if (!current) return false;

    // Reduce by enemy defense, minimum 1
    var dmg = Math.max(1, amount - current.def);
    current.hp -= dmg;
    if (current.hp < 0) current.hp = 0;
    return current.hp <= 0;
  }

  /**
   * Get the current enemy (or null if none).
   */
  function getCurrent() {
    return current;
  }

  /**
   * Clear current enemy (after death or fleeing).
   */
  function clear() {
    current = null;
  }

  return {
    spawnRandom: spawnRandom,
    spawnBoss: spawnBoss,
    takeDamage: takeDamage,
    getCurrent: getCurrent,
    clear: clear
  };

})();
