/**
 * combat.js — Auto-fight combat loop tied to the walking/encounter system.
 * When auto-fight is ON:
 *   1. Player walks through the world
 *   2. Enemy spawns ahead after a short walk
 *   3. Player approaches enemy, stops, and they trade blows
 *   4. Enemy dies → player resumes walking → repeat
 */

var Combat = (function () {

  var fighting = false;       // is auto-fight enabled?
  var tickTimer = null;       // combat tick interval (only active during "fighting" state)
  var spawnTimer = null;      // timer to spawn next enemy while walking
  var onEvent = null;         // event callback for game.js

  /**
   * Register an event handler for combat events.
   */
  function setEventHandler(fn) {
    onEvent = fn;
  }

  /**
   * Fire a combat event.
   */
  function emit(type, data) {
    if (onEvent) onEvent({ type: type, data: data || {}, time: Date.now() });
  }

  /**
   * Start auto-fighting. Player begins walking and encountering enemies.
   */
  function start() {
    if (fighting) return;
    fighting = true;

    // Start walking and schedule the first enemy
    Renderer.startWalking();
    _scheduleNextEnemy();

    // Poll renderer state to know when to start fighting
    _startStatePoller();

    emit("fight_start");
  }

  /**
   * Stop auto-fighting. Player stops walking.
   */
  function stop() {
    fighting = false;
    _clearTimers();
    emit("fight_stop");
  }

  /**
   * Toggle auto-fight.
   */
  function toggle() {
    fighting ? stop() : start();
  }

  /**
   * Clear all timers.
   */
  function _clearTimers() {
    if (tickTimer) { clearInterval(tickTimer); tickTimer = null; }
    if (spawnTimer) { clearTimeout(spawnTimer); spawnTimer = null; }
  }

  /**
   * Schedule the next enemy to spawn after a short walking delay.
   * Gives the player time to walk through the environment between fights.
   */
  function _scheduleNextEnemy() {
    if (!fighting) return;

    // Random delay before next enemy (1-2.5 seconds of walking)
    var delay = 1000 + Math.random() * 1500;

    spawnTimer = setTimeout(function () {
      if (!fighting) return;
      _spawnEnemy();
    }, delay);
  }

  /**
   * Spawn an enemy and tell the renderer to place it ahead in the world.
   */
  function _spawnEnemy() {
    var ps = Player.getState();

    // Boss check: every N kills, spawn the zone boss
    var isBoss = (ps.killCount > 0 && ps.killCount % GameData.killsPerBoss === 0 && !ps.bossDefeated);

    if (isBoss) {
      Enemy.spawnBoss();
    } else {
      Enemy.spawnRandom();
    }

    var enemy = Enemy.getCurrent();

    // Tell renderer to place the enemy ahead and start approaching
    Renderer.notifyEnemySpawn(isBoss);

    emit(isBoss ? "boss_spawn" : "enemy_spawn", { enemy: enemy });
  }

  /**
   * Poll the renderer state. When renderer says "fighting", start combat ticks.
   * When renderer says "walking" (after a kill), schedule next enemy.
   */
  function _startStatePoller() {
    var lastState = "";

    var poller = setInterval(function () {
      if (!fighting) {
        clearInterval(poller);
        return;
      }

      var rState = Renderer.getState();

      // Transition: just entered "fighting" state
      if (rState === "fighting" && lastState !== "fighting") {
        _startCombatTicks();
      }

      // Transition: just started "walking" after a victory
      if (rState === "walking" && lastState === "victory") {
        _stopCombatTicks();
        _scheduleNextEnemy();
      }

      lastState = rState;
    }, 100); // check 10x/sec
  }

  /**
   * Start the combat tick loop — player and enemy trade blows.
   */
  function _startCombatTicks() {
    if (tickTimer) return; // already ticking
    tickTimer = setInterval(_tick, GameData.combatTickMs);
    // Do first tick immediately so there's no dead pause
    _tick();
  }

  /**
   * Stop combat ticks (between fights).
   */
  function _stopCombatTicks() {
    if (tickTimer) {
      clearInterval(tickTimer);
      tickTimer = null;
    }
  }

  /**
   * One combat tick — player hits enemy, then enemy hits player (if alive).
   */
  function _tick() {
    if (!fighting) return;

    var ps = Player.getState();
    var enemy = Enemy.getCurrent();
    if (!enemy) return;

    // --- PLAYER ATTACKS ---
    // Calculate damage with variance, then apply to enemy directly
    var rawDmg = Math.max(1, ps.atk - enemy.def);
    var variance = 0.8 + Math.random() * 0.4; // +/- 20%
    var finalDmg = Math.max(1, Math.floor(rawDmg * variance));

    // Subtract HP directly (don't use Enemy.takeDamage which double-subtracts def)
    enemy.hp -= finalDmg;
    var enemyDied = enemy.hp <= 0;
    if (enemy.hp < 0) enemy.hp = 0;

    // Tell renderer to animate and show the damage dealt
    Renderer.animatePlayerAttack(finalDmg);
    emit("player_attack", { damage: finalDmg });

    // --- ENEMY DIES ---
    if (enemyDied) {
      _handleEnemyDeath(enemy);
      return;
    }

    // --- ENEMY ATTACKS (same tick, slight conceptual delay) ---
    // Player.takeDamage subtracts def internally, so pass raw atk
    var actualDmg = Math.max(1, enemy.atk - ps.def);
    Player.takeDamage(enemy.atk);
    var playerDied = ps.hp <= 0;
    Renderer.animateEnemyAttack(actualDmg);
    emit("enemy_attack", { damage: actualDmg });

    if (playerDied) {
      _handlePlayerDeath();
    }
  }

  /**
   * Handle enemy death: give rewards, tell renderer, schedule next.
   */
  function _handleEnemyDeath(enemy) {
    _stopCombatTicks();

    var leveled = Player.addXp(enemy.xp);
    Player.addGold(enemy.gold);
    Player.recordKill();

    // Tell renderer to fade out enemy and show rewards
    Renderer.notifyEnemyDeath(enemy.xp, enemy.gold, enemy.isBoss);

    emit("enemy_death", { enemy: enemy.name, xp: enemy.xp, gold: enemy.gold, isBoss: enemy.isBoss });

    if (leveled) {
      Renderer.showLevelUp(Player.getState().level);
      emit("level_up", { level: Player.getState().level });
    }

    // Boss defeated → advance zone
    if (enemy.isBoss) {
      var ps = Player.getState();
      ps.bossDefeated = true;
      emit("boss_defeated", { zone: GameData.zones[ps.currentZone].name });

      if (ps.currentZone < GameData.zones.length - 1) {
        Player.advanceZone();
        emit("zone_advance", { zone: GameData.zones[Player.getState().currentZone].name });
      }
    }

    // Heal between fights (25% of missing HP)
    var ps2 = Player.getState();
    var missing = ps2.maxHp - ps2.hp;
    Player.heal(Math.floor(missing * 0.25));

    Enemy.clear();
    // Next enemy scheduling handled by the state poller when renderer goes back to "walking"
  }

  /**
   * Handle player death: stop everything, respawn after delay.
   */
  function _handlePlayerDeath() {
    _stopCombatTicks();
    Renderer.notifyPlayerDeath();
    emit("player_death");

    var wasFighting = fighting;
    fighting = false;

    // Respawn after 2 seconds
    setTimeout(function () {
      Player.fullHeal();
      Enemy.clear();
      Renderer.notifyPlayerRespawn();
      emit("player_respawn");

      // Auto-resume if player had auto-fight on
      if (wasFighting) {
        fighting = true;
        _scheduleNextEnemy();
        _startStatePoller();
      }
    }, 2000);
  }

  function isFighting() {
    return fighting;
  }

  return {
    start: start,
    stop: stop,
    toggle: toggle,
    isFighting: isFighting,
    setEventHandler: setEventHandler
  };

})();
