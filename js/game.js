/**
 * game.js — Main entry point. Boots everything up:
 * loads assets, initializes player, connects combat events to UI, starts the game.
 * The renderer handles all visual stuff. Combat handles the fight logic.
 * This file just wires them together and manages the boot sequence.
 */

(function () {

  // Wait for DOM to be ready
  window.addEventListener("DOMContentLoaded", function () {
    boot();
  });

  /**
   * Boot sequence: show loading screen → load assets → start game.
   */
  function boot() {
    console.log("IS3 booting...");

    // Draw a simple loading screen while assets load
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Animate loading bar
    var loadInterval = setInterval(function () {
      var pct = AssetLoader.progress();
      ctx.fillStyle = "#111";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#888";
      ctx.font = "16px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillText("Loading... " + Math.floor(pct * 100) + "%", canvas.width / 2, canvas.height / 2 - 20);

      // Loading bar
      var barW = 200, barH = 12;
      var barX = canvas.width / 2 - barW / 2;
      var barY = canvas.height / 2;
      ctx.fillStyle = "#333";
      ctx.fillRect(barX, barY, barW, barH);
      ctx.fillStyle = "#4c4";
      ctx.fillRect(barX, barY, barW * pct, barH);
    }, 50);

    // Load all assets, then start
    AssetLoader.loadAll().then(function () {
      clearInterval(loadInterval);
      console.log("Assets loaded.");
      startGame();
    });
  }

  /**
   * Initialize all systems and connect combat events to UI updates.
   */
  function startGame() {
    // Load saved game or start fresh with the Knight
    if (!Player.load()) {
      Player.init("knight");
    }

    // Init canvas renderer (starts the 60fps draw loop)
    Renderer.init();

    // Init the HUD overlay (HP bar, gold, zone name, etc.)
    UI.init();

    // Wire combat events to UI popups (renderer handles its own animations)
    Combat.setEventHandler(function (evt) {
      switch (evt.type) {
        case "enemy_death":
          if (evt.data.isBoss) {
            UI.showLoot("BOSS DEFEATED! +" + evt.data.xp + " XP, +" + evt.data.gold + "g");
          } else {
            UI.showLoot(evt.data.enemy + " slain! +" + evt.data.xp + " XP");
          }
          break;

        case "level_up":
          UI.showLoot("LEVEL UP! Now level " + evt.data.level);
          break;

        case "zone_advance":
          UI.showLoot("Entered " + evt.data.zone);
          break;

        case "player_death":
          UI.showLoot("You died! Respawning...");
          break;

        case "player_respawn":
          UI.showLoot("Respawned at full HP!");
          break;

        case "boss_defeated":
          UI.showLoot("Zone cleared: " + evt.data.zone + "!");
          break;
      }
    });

    UI.refresh();
    console.log("IS3 ready. Hit FIGHT to start adventuring!");
  }

})();
