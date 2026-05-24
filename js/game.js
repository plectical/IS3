/**
 * game.js — Main entry point. Boots everything up:
 * loads assets, initializes player, connects combat events to renderer, starts the game.
 */

(function () {

  // Wait for DOM to be ready
  window.addEventListener("DOMContentLoaded", function () {
    boot();
  });

  /**
   * Boot sequence: load assets → init systems → show game.
   */
  function boot() {
    console.log("IS3 booting...");

    // Show a loading screen on the canvas while assets load
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    ctx.fillStyle = "#111";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "#888";
    ctx.font = "16px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillText("Loading assets...", canvas.width / 2, canvas.height / 2);

    // Animate a loading bar while assets load
    var loadInterval = setInterval(function () {
      var pct = AssetLoader.progress();
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#888";
      ctx.fillText("Loading... " + Math.floor(pct * 100) + "%", canvas.width / 2, canvas.height / 2 - 20);

      // Loading bar
      var barW = 200;
      var barH = 12;
      var barX = canvas.width / 2 - barW / 2;
      var barY = canvas.height / 2;
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#4c4";
      ctx.fillRect(barX, barY, barW * pct, barH);
    }, 50);

    // Load all assets, then start the game
    AssetLoader.loadAll().then(function () {
      clearInterval(loadInterval);
      console.log("Assets loaded, starting game.");
      startGame();
    });
  }

  /**
   * Initialize all game systems and connect them together.
   */
  function startGame() {
    // Try to load a saved game, otherwise init fresh
    var hasSave = Player.load();
    if (!hasSave) {
      Player.init("knight"); // default hero class
    }

    // Init the canvas renderer
    Renderer.init();

    // Init the UI overlay
    UI.init();

    // Wire up combat events to the renderer for animations
    Combat.setEventHandler(function (evt) {
      switch (evt.type) {

        case "player_attack":
          // Player swings at enemy — lunge + damage number
          Renderer.animatePlayerAttack();
          Renderer.showEnemyDamage(evt.data.damage);
          break;

        case "enemy_attack":
          // Enemy swings at player — lunge + damage number
          Renderer.animateEnemyAttack();
          Renderer.showPlayerDamage(evt.data.damage);
          break;

        case "enemy_spawn":
          // New enemy slides in from the right
          Renderer.resetEnemyPos();
          break;

        case "boss_spawn":
          // Boss entrance with dramatic effect
          Renderer.resetEnemyPos();
          Renderer.triggerBossEntrance();
          break;

        case "enemy_death":
          // Show XP and gold gain
          Renderer.showXpGain(evt.data.xp);
          Renderer.showGoldGain(evt.data.gold);
          if (evt.data.isBoss) {
            UI.showLoot("BOSS DEFEATED! +" + evt.data.xp + " XP, +" + evt.data.gold + "g");
          } else {
            UI.showLoot(evt.data.enemy + " defeated! +" + evt.data.xp + " XP");
          }
          break;

        case "level_up":
          // Level up celebration
          Renderer.showLevelUp(evt.data.level);
          UI.showLoot("LEVEL UP! You are now level " + evt.data.level);
          break;

        case "zone_advance":
          // Moved to new zone
          UI.showLoot("Entered " + evt.data.zone);
          break;

        case "player_death":
          // Player died
          UI.showLoot("You died! Respawning...");
          break;

        case "player_respawn":
          // Player respawned
          UI.showLoot("Respawned at full HP!");
          break;

        case "boss_defeated":
          UI.showLoot("Zone cleared: " + evt.data.zone + "!");
          break;
      }
    });

    // Do an initial UI refresh
    UI.refresh();

    console.log("IS3 ready. Hit FIGHT to begin!");
  }

})();
