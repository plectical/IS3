/**
 * renderer.js — Canvas rendering engine.
 * Draws the tile floor, player sprite, enemy sprite, animations, and damage numbers.
 * Runs at 60fps via requestAnimationFrame.
 */

var Renderer = (function () {

  var canvas, ctx;
  var W, H;                   // canvas pixel dimensions
  var scale = 1;              // pixel scale for retina
  var tileSize = 64;          // size of each floor tile in pixels

  // Sprite positions (in canvas coords, animated)
  var playerPos = { x: 0, y: 0, targetX: 0, targetY: 0 };
  var enemyPos  = { x: 0, y: 0, targetX: 0, targetY: 0 };

  // Animation state
  var playerShake = 0;        // screen-shake amount when player gets hit
  var enemyShake = 0;         // shake when enemy gets hit
  var playerFlash = 0;        // white flash timer on hit
  var enemyFlash = 0;

  // Floating damage numbers
  var floaters = [];          // { text, x, y, vy, alpha, color }

  // Cached tile pattern for current zone
  var tilePattern = null;
  var currentZoneId = null;

  // Boss entrance animation
  var bossEntrance = 0;

  /**
   * Initialize the renderer — grab the canvas, set up sizing.
   */
  function init() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    // Handle window resizing
    _resize();
    window.addEventListener("resize", _resize);

    // Start the render loop
    requestAnimationFrame(_loop);
  }

  /**
   * Resize canvas to fill viewport at device pixel ratio.
   */
  function _resize() {
    scale = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * scale;
    canvas.height = H * scale;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(scale, 0, 0, scale, 0, 0);

    // Recalculate sprite positions when screen size changes
    _updatePositions();

    // Force tile pattern rebuild on resize
    currentZoneId = null;
  }

  /**
   * Set sprite positions based on screen size.
   * Player on the left, enemy on the right.
   */
  function _updatePositions() {
    var centerY = H * 0.55; // slightly below center (leaves room for HUD)
    var spriteH = 96 * 2;   // sprites are drawn at 2x scale

    // Player sits at ~30% from left
    playerPos.targetX = W * 0.25;
    playerPos.targetY = centerY - spriteH / 2;
    // Snap if not yet placed
    if (playerPos.x === 0) {
      playerPos.x = playerPos.targetX;
      playerPos.y = playerPos.targetY;
    }

    // Enemy sits at ~70% from left
    enemyPos.targetX = W * 0.7;
    enemyPos.targetY = centerY - spriteH / 2;
    if (enemyPos.x === 0) {
      enemyPos.x = enemyPos.targetX;
      enemyPos.y = enemyPos.targetY;
    }
  }

  /**
   * Build a tiled floor pattern from the current zone's tiles.
   */
  function _buildTilePattern() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    if (!zone) return;

    // Check if zone changed
    if (currentZoneId === zone.id) return;
    currentZoneId = zone.id;

    // We'll just store the zone tile keys — draw them in the loop
    tilePattern = zone.tiles;
  }

  /**
   * Main render loop — called every frame.
   */
  function _loop() {
    _update();
    _draw();
    requestAnimationFrame(_loop);
  }

  /**
   * Update animations each frame (lerp positions, decay shakes, move floaters).
   */
  function _update() {
    // Lerp sprite positions toward targets (smooth movement)
    playerPos.x += (playerPos.targetX - playerPos.x) * 0.1;
    playerPos.y += (playerPos.targetY - playerPos.y) * 0.1;
    enemyPos.x += (enemyPos.targetX - enemyPos.x) * 0.1;
    enemyPos.y += (enemyPos.targetY - enemyPos.y) * 0.1;

    // Decay shake effects
    playerShake *= 0.85;
    enemyShake *= 0.85;
    if (Math.abs(playerShake) < 0.5) playerShake = 0;
    if (Math.abs(enemyShake) < 0.5) enemyShake = 0;

    // Decay flash effects
    if (playerFlash > 0) playerFlash -= 0.05;
    if (enemyFlash > 0) enemyFlash -= 0.05;

    // Boss entrance animation
    if (bossEntrance > 0) bossEntrance -= 0.02;

    // Update floating damage numbers
    for (var i = floaters.length - 1; i >= 0; i--) {
      var f = floaters[i];
      f.y += f.vy;
      f.vy -= 0.05; // slight upward deceleration (they float up)
      f.alpha -= 0.015;
      if (f.alpha <= 0) {
        floaters.splice(i, 1);
      }
    }
  }

  /**
   * Draw everything to the canvas.
   */
  function _draw() {
    // Clear the canvas
    ctx.clearRect(0, 0, W, H);

    // Draw tiled floor background
    _drawFloor();

    // Draw player sprite
    _drawPlayer();

    // Draw enemy sprite
    _drawEnemy();

    // Draw floating damage/heal numbers
    _drawFloaters();

    // Draw boss entrance overlay if active
    if (bossEntrance > 0) {
      _drawBossEntrance();
    }
  }

  /**
   * Draw the isometric tile floor using the current zone's tiles.
   */
  function _drawFloor() {
    _buildTilePattern();
    if (!tilePattern || tilePattern.length === 0) {
      // Fallback: solid dark background
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, W, H);
      return;
    }

    // Draw tiles in a grid pattern filling the screen
    // The tiles are isometric diamond shapes, so we lay them out in a staggered grid
    var ts = tileSize; // tile draw size
    var cols = Math.ceil(W / ts) + 2;
    var rows = Math.ceil(H / ts) + 2;

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        // Pick a tile deterministically based on position (so it doesn't flicker)
        var tileIdx = ((row * 7) + (col * 13)) % tilePattern.length;
        var tileImg = AssetLoader.get(tilePattern[tileIdx]);
        if (tileImg && tileImg.complete) {
          ctx.drawImage(tileImg, col * ts - ts / 2, row * ts - ts / 2, ts, ts);
        } else {
          // Fallback color if tile hasn't loaded
          ctx.fillStyle = (row + col) % 2 === 0 ? "#2a2a3e" : "#22223a";
          ctx.fillRect(col * ts, row * ts, ts, ts);
        }
      }
    }

    // Dark overlay to make sprites pop against the floor
    ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
    ctx.fillRect(0, 0, W, H);
  }

  /**
   * Draw the player's hero sprite.
   */
  function _drawPlayer() {
    var spriteKey = Player.spriteKey();
    var img = AssetLoader.get(spriteKey);
    if (!img || !img.complete) return;

    var drawScale = 2.5; // scale up the 64x96 sprites
    var sw = 64 * drawScale;
    var sh = 96 * drawScale;
    var dx = playerPos.x - sw / 2 + playerShake;
    var dy = playerPos.y;

    ctx.save();

    // White flash overlay when hit
    if (playerFlash > 0) {
      ctx.globalAlpha = 1;
      ctx.drawImage(img, dx, dy, sw, sh);
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 100, 100, " + playerFlash + ")";
      ctx.fillRect(dx, dy, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.drawImage(img, dx, dy, sw, sh);
    }

    // Draw player name/level under the sprite
    ctx.font = "bold 12px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    ctx.fillText("Lv" + Player.getState().level + " " + GameData.heroes[Player.getState().heroClass].name, playerPos.x, dy + sh + 16);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * Draw the current enemy sprite.
   */
  function _drawEnemy() {
    var enemy = Enemy.getCurrent();
    if (!enemy) return;

    var img = AssetLoader.get(enemy.id);
    if (!img || !img.complete) return;

    // Bosses are 128x128, regular enemies are 64x96
    var isBoss = enemy.isBoss;
    var srcW = isBoss ? 128 : 64;
    var srcH = isBoss ? 128 : 96;
    var drawScale = isBoss ? 2.5 : 2.5;
    var sw = srcW * drawScale;
    var sh = srcH * drawScale;
    var dx = enemyPos.x - sw / 2 + enemyShake;
    var dy = enemyPos.y + (isBoss ? -40 : 0); // bosses draw a bit higher

    ctx.save();

    // Flip enemy to face left (toward the player)
    ctx.translate(dx + sw, dy);
    ctx.scale(-1, 1);

    // White flash overlay when hit
    if (enemyFlash > 0) {
      ctx.drawImage(img, 0, 0, sw, sh);
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 255, 255, " + enemyFlash + ")";
      ctx.fillRect(0, 0, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    } else {
      ctx.drawImage(img, 0, 0, sw, sh);
    }

    ctx.restore();

    // Draw enemy HP bar above sprite
    var barW = sw * 0.8;
    var barH = 8;
    var barX = enemyPos.x - barW / 2;
    var barY = dy - 20;
    var hpPct = enemy.hp / enemy.maxHp;

    // Bar background
    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barW, barH);

    // HP fill — red to green based on percentage
    var r = Math.floor(255 * (1 - hpPct));
    var g = Math.floor(255 * hpPct);
    ctx.fillStyle = "rgb(" + r + "," + g + ",50)";
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Bar border
    ctx.strokeStyle = "#666";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Enemy name and level
    ctx.font = "bold 12px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = enemy.isBoss ? "#ff4444" : "#fff";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    var label = (enemy.isBoss ? "BOSS " : "") + enemy.name + " Lv" + enemy.level;
    ctx.fillText(label, enemyPos.x, barY - 6);
    ctx.shadowBlur = 0;
  }

  /**
   * Draw floating damage/heal/XP numbers.
   */
  function _drawFloaters() {
    ctx.save();
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.font = "bold " + f.size + "px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillStyle = f.color;
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(f.text, f.x, f.y);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Draw boss entrance dramatic overlay.
   */
  function _drawBossEntrance() {
    ctx.save();
    ctx.globalAlpha = bossEntrance * 0.6;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, bossEntrance * 2);
    ctx.font = "bold 36px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 20;
    ctx.fillText("BOSS FIGHT!", W / 2, H / 2);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // --- PUBLIC METHODS FOR COMBAT EVENTS ---

  /**
   * Trigger player attack animation (lunge toward enemy).
   */
  function animatePlayerAttack() {
    playerPos.targetX = W * 0.25 + 30;
    enemyShake = (Math.random() > 0.5 ? 1 : -1) * 8;
    enemyFlash = 0.6;
    setTimeout(function () {
      playerPos.targetX = W * 0.25;
    }, 200);
  }

  /**
   * Trigger enemy attack animation (lunge toward player).
   */
  function animateEnemyAttack() {
    enemyPos.targetX = W * 0.7 - 30;
    playerShake = (Math.random() > 0.5 ? 1 : -1) * 8;
    playerFlash = 0.6;
    setTimeout(function () {
      enemyPos.targetX = W * 0.7;
    }, 200);
  }

  /**
   * Add a floating damage number at a position.
   */
  function addFloater(text, x, y, color, size) {
    floaters.push({
      text: text,
      x: x + (Math.random() * 30 - 15),  // slight random horizontal offset
      y: y,
      vy: -1.5,       // float upward
      alpha: 1.2,      // starts slightly > 1 so it lingers
      color: color || "#fff",
      size: size || 18
    });
  }

  /**
   * Show a damage number on the enemy.
   */
  function showEnemyDamage(amount) {
    addFloater("-" + amount, enemyPos.x, enemyPos.y - 10, "#ff4444", 20);
  }

  /**
   * Show a damage number on the player.
   */
  function showPlayerDamage(amount) {
    addFloater("-" + amount, playerPos.x, playerPos.y - 10, "#ff6666", 18);
  }

  /**
   * Show XP gain floater.
   */
  function showXpGain(amount) {
    addFloater("+" + amount + " XP", W * 0.5, H * 0.4, "#88aaff", 16);
  }

  /**
   * Show gold gain floater.
   */
  function showGoldGain(amount) {
    addFloater("+" + amount + "g", W * 0.5, H * 0.4 + 24, "#ffd700", 16);
  }

  /**
   * Show level up effect.
   */
  function showLevelUp(level) {
    addFloater("LEVEL UP! Lv" + level, playerPos.x, playerPos.y - 40, "#ffd700", 24);
  }

  /**
   * Trigger boss entrance effect.
   */
  function triggerBossEntrance() {
    bossEntrance = 1;
  }

  /**
   * Reset enemy position (for new enemy spawn).
   */
  function resetEnemyPos() {
    // Start enemy off-screen right, it'll lerp in
    enemyPos.x = W + 100;
    enemyPos.targetX = W * 0.7;
  }

  return {
    init: init,
    animatePlayerAttack: animatePlayerAttack,
    animateEnemyAttack: animateEnemyAttack,
    showEnemyDamage: showEnemyDamage,
    showPlayerDamage: showPlayerDamage,
    showXpGain: showXpGain,
    showGoldGain: showGoldGain,
    showLevelUp: showLevelUp,
    triggerBossEntrance: triggerBossEntrance,
    resetEnemyPos: resetEnemyPos
  };

})();
