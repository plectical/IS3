/**
 * combat.js — Auto-fight combat loop.
 * Handles the turn-based exchange between player and enemy.
 * Produces combat events that the renderer picks up for animations.
 */

var Combat = (function () {

  // Combat state
  var fighting = false;       // is auto-fight running?
  var tickTimer = null;       // setInterval handle for the fight loop
  var phase = "idle";         // "idle" | "spawning" | "player_turn" | "enemy_turn" | "victory" | "defeat"
  var combatLog = [];         // recent combat events for the renderer to animate
  var onEvent = null;         // callback for combat events (set by game.js)

  /**
   * Register a callback that fires on every combat event.
   * Events: { type: "...", data: {...} }
   */
  function setEventHandler(fn) {
    onEvent = fn;
  }

  /**
   * Fire a combat event — pushes to log and calls the handler.
   */
  function emit(type, data) {
    var evt = { type: type, data: data || {}, time: Date.now() };
    combatLog.push(evt);
    // Keep log short so it doesn't grow forever
    if (combatLog.length > 50) combatLog.shift();
    if (onEvent) onEvent(evt);
  }

  /**
   * Start auto-fighting. Spawns an enemy and begins the tick loop.
   */
  function start() {
    if (fighting) return; // already going
    fighting = true;
    phase = "spawning";

    // Spawn first enemy
    _spawnNext();

    // Start the combat tick loop
    tickTimer = setInterval(_tick, GameData.combatTickMs);
    emit("fight_start");
  }

  /**
   * Stop auto-fighting. Clears the loop.
   */
  function stop() {
    fighting = false;
    phase = "idle";
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
    emit("fight_stop");
  }

  /**
   * Toggle auto-fight on/off.
   */
  function toggle() {
    if (fighting) {
      stop();
    } else {
      start();
    }
  }

  /**
   * Spawn the next enemy (regular or boss based on kill count).
   */
  function _spawnNext() {
    var ps = Player.getState();

    // Check if it's boss time
    if (ps.killCount > 0 && ps.killCount % GameData.killsPerBoss === 0 && !ps.bossDefeated) {
      Enemy.spawnBoss();
      emit("boss_spawn", { enemy: Enemy.getCurrent() });
    } else {
      Enemy.spawnRandom();
      emit("enemy_spawn", { enemy: Enemy.getCurrent() });
    }

    phase = "player_turn";
  }

  /**
   * One tick of combat — player hits, then enemy hits (if alive).
   * This runs every combatTickMs.
   */
  function _tick() {
    if (!fighting) return;

    var ps = Player.getState();
    var enemy = Enemy.getCurrent();
    if (!enemy) {
      _spawnNext();
      return;
    }

    // --- PLAYER ATTACKS ---
    // Damage = player atk, reduced by enemy def (min 1)
    var playerDmg = Math.max(1, ps.atk - enemy.def);

    // Add some variance: +/- 20%
    var variance = 0.8 + Math.random() * 0.4;
    playerDmg = Math.floor(playerDmg * variance);
    if (playerDmg < 1) playerDmg = 1;

    var enemyDied = Enemy.takeDamage(playerDmg + enemy.def); // pass raw atk, takeDamage applies def

    emit("player_attack", { damage: Math.max(1, ps.atk - enemy.def), target: enemy.name });

    // --- CHECK ENEMY DEATH ---
    if (enemyDied) {
      _handleEnemyDeath(enemy);
      return;
    }

    // --- ENEMY ATTACKS (after a short delay conceptually, same tick) ---
    var enemyDmg = enemy.atk; // raw attack, player.takeDamage applies defense
    var playerDied = Player.takeDamage(enemyDmg);

    // Calculate actual damage dealt for display
    var actualEnemyDmg = Math.max(1, enemyDmg - ps.def);
    emit("enemy_attack", { damage: actualEnemyDmg, target: ps.heroClass });

    // --- CHECK PLAYER DEATH ---
    if (playerDied) {
      _handlePlayerDeath();
    }
  }

  /**
   * Handle enemy dying: give rewards, spawn next.
   */
  function _handleEnemyDeath(enemy) {
    // Give XP and gold
    var leveled = Player.addXp(enemy.xp);
    Player.addGold(enemy.gold);
    Player.recordKill();

    emit("enemy_death", {
      enemy: enemy.name,
      xp: enemy.xp,
      gold: enemy.gold,
      isBoss: enemy.isBoss
    });

    if (leveled) {
      emit("level_up", { level: Player.getState().level });
    }

    // If boss died, mark it and allow zone advancement
    if (enemy.isBoss) {
      var ps = Player.getState();
      ps.bossDefeated = true;
      emit("boss_defeated", { zone: GameData.zones[ps.currentZone].name });

      // Auto-advance to next zone if available
      if (ps.currentZone < GameData.zones.length - 1) {
        Player.advanceZone();
        emit("zone_advance", { zone: GameData.zones[Player.getState().currentZone].name });
      }
    }

    // Small heal between fights (25% of missing HP)
    var ps2 = Player.getState();
    var missing = ps2.maxHp - ps2.hp;
    Player.heal(Math.floor(missing * 0.25));

    // Clear old enemy and spawn next after a brief pause
    Enemy.clear();
    setTimeout(function () {
      if (fighting) _spawnNext();
    }, 600);
  }

  /**
   * Handle player dying: stop fighting, emit death event.
   * Player respawns at full HP (roguelite - no penalty for now).
   */
  function _handlePlayerDeath() {
    emit("player_death");
    stop();

    // Respawn at full HP after a short delay
    setTimeout(function () {
      Player.fullHeal();
      emit("player_respawn");
    }, 1500);
  }

  /**
   * Get recent combat log entries.
   */
  function getLog() {
    return combatLog;
  }

  /**
   * Check if currently fighting.
   */
  function isFighting() {
    return fighting;
  }

  return {
    start: start,
    stop: stop,
    toggle: toggle,
    isFighting: isFighting,
    setEventHandler: setEventHandler,
    getLog: getLog
  };

})();
