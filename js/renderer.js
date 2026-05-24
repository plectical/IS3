/**
 * renderer.js — Canvas rendering engine.
 * Side-scrolling world: player walks right through the environment,
 * encounters enemies, fights, then keeps walking.
 * Floor scrolls, trees/rocks pass by, enemies appear ahead.
 */

var Renderer = (function () {

  var canvas, ctx;
  var W, H;                   // canvas pixel dimensions (CSS)
  var scale = 1;              // device pixel ratio

  // --- WORLD SCROLL ---
  // The "camera" tracks a world X position. Everything scrolls left relative to it.
  var worldX = 0;             // how far the player has traveled (in world pixels)
  var scrollSpeed = 0;        // current scroll speed (pixels per frame). 0 = stopped (fighting)
  var WALK_SPEED = 1.5;       // normal walking speed
  var state = "walking";      // "walking" | "approaching" | "fighting" | "victory" | "dead"

  // --- PLAYER ---
  var playerScreenX = 0;      // player's X position on screen (fixed ~30% from left)
  var playerScreenY = 0;      // player's Y position on screen
  var playerBob = 0;          // bob animation counter for walk cycle
  var playerShake = 0;        // shake on hit
  var playerFlash = 0;        // red flash on hit

  // --- ENEMY ---
  var enemyWorldX = 0;        // enemy's position in world coords
  var enemyScreenY = 0;       // enemy Y on screen
  var enemyShake = 0;
  var enemyFlash = 0;
  var enemyAlpha = 1;         // fade out on death
  var enemyVisible = false;

  // --- ENVIRONMENT OBJECTS ---
  // Trees, rocks, etc. that scroll past in the background/foreground
  var envObjects = [];         // { key, worldX, y, scale }
  var lastEnvSpawn = 0;        // world X of last spawned env object

  // --- FLOOR TILES ---
  var TILE_SIZE = 64;          // drawn size of each floor tile
  var floorY = 0;              // Y position where the "ground" is

  // --- FLOATERS (damage numbers) ---
  var floaters = [];

  // --- BOSS ---
  var bossEntrance = 0;

  /**
   * Initialize the renderer.
   */
  function init() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    _resize();
    window.addEventListener("resize", _resize);

    // Seed some initial environment objects behind and ahead of the player
    _seedEnvironment();

    // Start the render loop
    requestAnimationFrame(_loop);
  }

  /**
   * Resize canvas to fill the viewport.
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

    // Ground line sits at about 65% down the screen
    floorY = H * 0.62;

    // Player always at ~28% from left, standing on the ground
    playerScreenX = W * 0.28;
    playerScreenY = floorY - 96 * 2.5; // sprite height * scale, feet on ground

    // Enemy Y matches player (same ground level)
    enemyScreenY = playerScreenY;
  }

  /**
   * Seed initial environment objects so the world isn't empty at start.
   */
  function _seedEnvironment() {
    // Place objects from behind the player to ahead
    for (var x = -200; x < 1200; x += 80 + Math.random() * 160) {
      _spawnEnvObject(x);
    }
    lastEnvSpawn = 1200;
  }

  /**
   * Spawn a random environment object (tree, rock, grass) at a world X position.
   */
  function _spawnEnvObject(wx) {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    var obstacles = zone.obstacles;

    // If no obstacles defined for this zone, use generic placement markers
    if (!obstacles || obstacles.length === 0) return;

    var key = obstacles[Math.floor(Math.random() * obstacles.length)];

    // Random Y offset: some objects in background (higher), some foreground (lower)
    var layer = Math.random(); // 0-1, lower = further back
    var yOffset = -40 + layer * 80; // spread above and below ground line

    envObjects.push({
      key: key,
      worldX: wx,
      y: floorY - 60 + yOffset, // positioned near ground
      drawScale: 1.2 + layer * 0.8, // further back = smaller, foreground = bigger
      layer: layer // for draw order
    });
  }

  /**
   * Main render loop.
   */
  function _loop() {
    _update();
    _draw();
    requestAnimationFrame(_loop);
  }

  /**
   * Update all animation state each frame.
   */
  function _update() {
    // --- SCROLL THE WORLD ---
    if (state === "walking") {
      scrollSpeed += (WALK_SPEED - scrollSpeed) * 0.05; // ease into walk speed
      worldX += scrollSpeed;
      playerBob += 0.08; // walk bob cycle
    } else if (state === "approaching") {
      // Slow down as we approach an enemy
      scrollSpeed *= 0.95;
      worldX += scrollSpeed;
      playerBob += 0.06;

      // Check if player reached the enemy (enemy should be ~70% screen width away)
      var enemyOnScreen = enemyWorldX - worldX;
      if (enemyOnScreen <= W * 0.65) {
        scrollSpeed = 0;
        state = "fighting";
      }
    } else if (state === "victory") {
      // Brief pause, then resume walking
      // (handled by timeout in notifyEnemyDeath)
    } else {
      scrollSpeed *= 0.9; // decelerate to stop
      playerBob += 0.02; // subtle idle bob
    }

    // --- SPAWN NEW ENV OBJECTS as world scrolls ---
    // Spawn objects ahead of camera
    var cameraRight = worldX + W + 200;
    while (lastEnvSpawn < cameraRight) {
      lastEnvSpawn += 60 + Math.random() * 180;
      if (Math.random() < 0.6) { // 60% chance to place something
        _spawnEnvObject(lastEnvSpawn);
      }
    }

    // Remove objects that scrolled way off-screen left
    var cameraLeft = worldX - 300;
    for (var i = envObjects.length - 1; i >= 0; i--) {
      if (envObjects[i].worldX < cameraLeft) {
        envObjects.splice(i, 1);
      }
    }

    // --- DECAY ANIMATIONS ---
    playerShake *= 0.85;
    enemyShake *= 0.85;
    if (Math.abs(playerShake) < 0.5) playerShake = 0;
    if (Math.abs(enemyShake) < 0.5) enemyShake = 0;
    if (playerFlash > 0) playerFlash -= 0.05;
    if (enemyFlash > 0) enemyFlash -= 0.05;
    if (bossEntrance > 0) bossEntrance -= 0.015;

    // --- UPDATE FLOATERS ---
    for (var j = floaters.length - 1; j >= 0; j--) {
      var f = floaters[j];
      f.y += f.vy;
      f.vy -= 0.03;
      f.alpha -= 0.012;
      // Floaters scroll with the world if they have a worldX
      if (f.worldX !== undefined) {
        f.screenX = f.worldX - worldX;
      }
      if (f.alpha <= 0) floaters.splice(j, 1);
    }
  }

  /**
   * Draw everything to the canvas.
   */
  function _draw() {
    ctx.clearRect(0, 0, W, H);

    _drawSky();
    _drawFloor();
    _drawEnvironmentBack();
    _drawPlayer();
    _drawEnemy();
    _drawEnvironmentFront();
    _drawFloaters();

    if (bossEntrance > 0) _drawBossEntrance();
  }

  /**
   * Draw a gradient sky background that changes per zone.
   */
  function _drawSky() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];

    // Sky colors per zone
    var skyColors = {
      forest:   ["#1a2a1a", "#0d1f0d"],
      cavern:   ["#1a1a2a", "#0d0d1f"],
      castle:   ["#2a2a2a", "#111111"],
      cemetery: ["#1f1a2a", "#0f0d1a"],
      hell:     ["#2a1010", "#1a0505"],
      cosmic:   ["#0a0a2a", "#050520"]
    };

    var colors = skyColors[zone.id] || ["#1a1a2a", "#0d0d1f"];
    var grad = ctx.createLinearGradient(0, 0, 0, floorY);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, floorY);
  }

  /**
   * Draw the scrolling tile floor.
   * Tiles move left as the player walks right.
   */
  function _drawFloor() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    var tiles = zone.tiles;
    if (!tiles || tiles.length === 0) {
      // Solid floor fallback
      ctx.fillStyle = "#222";
      ctx.fillRect(0, floorY, W, H - floorY);
      return;
    }

    var ts = TILE_SIZE;
    // How many tiles fill the floor area
    var floorH = H - floorY;
    var cols = Math.ceil(W / ts) + 2;
    var rows = Math.ceil(floorH / ts) + 1;

    // Offset based on world scroll (tiles slide left)
    var offsetX = -(worldX % ts);

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        // Pick tile deterministically so it doesn't flicker
        var worldCol = Math.floor(worldX / ts) + col;
        var tileIdx = ((row * 7 + worldCol * 13) % tiles.length + tiles.length) % tiles.length;
        var tileImg = AssetLoader.get(tiles[tileIdx]);

        var dx = col * ts + offsetX;
        var dy = floorY + row * ts;

        if (tileImg && tileImg.complete) {
          ctx.drawImage(tileImg, dx, dy, ts, ts);
        } else {
          ctx.fillStyle = (row + worldCol) % 2 === 0 ? "#2a2a3e" : "#22223a";
          ctx.fillRect(dx, dy, ts, ts);
        }
      }
    }

    // Slight darkening gradient at the ground line for depth
    var edgeGrad = ctx.createLinearGradient(0, floorY, 0, floorY + 20);
    edgeGrad.addColorStop(0, "rgba(0,0,0,0.4)");
    edgeGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = edgeGrad;
    ctx.fillRect(0, floorY, W, 20);
  }

  /**
   * Draw environment objects that are BEHIND the player (background layer).
   */
  function _drawEnvironmentBack() {
    for (var i = 0; i < envObjects.length; i++) {
      var obj = envObjects[i];
      if (obj.layer >= 0.5) continue; // foreground objects drawn later

      var screenX = obj.worldX - worldX;
      if (screenX < -100 || screenX > W + 100) continue;

      var img = AssetLoader.get(obj.key);
      if (!img || !img.complete) continue;

      var s = obj.drawScale;
      ctx.globalAlpha = 0.5 + obj.layer * 0.3; // background objects are dimmer
      ctx.drawImage(img, screenX, obj.y, img.width * s, img.height * s);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw environment objects in the FOREGROUND (in front of characters).
   */
  function _drawEnvironmentFront() {
    for (var i = 0; i < envObjects.length; i++) {
      var obj = envObjects[i];
      if (obj.layer < 0.5) continue; // already drawn in back layer

      var screenX = obj.worldX - worldX;
      if (screenX < -100 || screenX > W + 100) continue;

      var img = AssetLoader.get(obj.key);
      if (!img || !img.complete) continue;

      var s = obj.drawScale;
      ctx.globalAlpha = 0.7;
      ctx.drawImage(img, screenX, obj.y, img.width * s, img.height * s);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw the player hero sprite — walks with a bob, shakes when hit.
   */
  function _drawPlayer() {
    var spriteKey = Player.spriteKey();
    var img = AssetLoader.get(spriteKey);
    if (!img || !img.complete) return;

    var drawScale = 2.5;
    var sw = 64 * drawScale;
    var sh = 96 * drawScale;

    // Walking bob: slight up/down bounce
    var bob = 0;
    if (state === "walking" || state === "approaching") {
      bob = Math.sin(playerBob * 4) * 4; // 4px bounce
    } else {
      bob = Math.sin(playerBob * 2) * 1.5; // subtle idle bob
    }

    var dx = playerScreenX - sw / 2 + playerShake;
    var dy = playerScreenY + bob;

    ctx.save();

    // Draw shadow under player
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(playerScreenX, floorY + 4, sw * 0.3, 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw the sprite
    ctx.drawImage(img, dx, dy, sw, sh);

    // Red flash overlay when hit
    if (playerFlash > 0) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 80, 80, " + playerFlash + ")";
      ctx.fillRect(dx, dy, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    }

    // Player label
    ctx.font = "bold 12px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    var ps = Player.getState();
    ctx.fillText("Lv" + ps.level + " " + GameData.heroes[ps.heroClass].name, playerScreenX, floorY + 22);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * Draw the current enemy sprite at its world position.
   */
  function _drawEnemy() {
    if (!enemyVisible) return;
    var enemy = Enemy.getCurrent();
    if (!enemy) return;

    var img = AssetLoader.get(enemy.id);
    if (!img || !img.complete) return;

    var isBoss = enemy.isBoss;
    var srcW = isBoss ? 128 : 64;
    var srcH = isBoss ? 128 : 96;
    var drawScale = isBoss ? 2.8 : 2.5;
    var sw = srcW * drawScale;
    var sh = srcH * drawScale;

    // Convert enemy world position to screen position
    var screenX = enemyWorldX - worldX;
    var dy = enemyScreenY + (isBoss ? -50 : 0);

    // Idle bob for enemy
    var bob = Math.sin(Date.now() * 0.003) * 2;

    var dx = screenX - sw / 2 + enemyShake;
    var drawY = dy + bob;

    ctx.save();
    ctx.globalAlpha = enemyAlpha;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(screenX, floorY + 4, sw * 0.3, isBoss ? 12 : 8, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flip enemy to face LEFT (toward the player)
    ctx.translate(dx + sw, drawY);
    ctx.scale(-1, 1);
    ctx.drawImage(img, 0, 0, sw, sh);

    // White flash on hit
    if (enemyFlash > 0) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 255, 255, " + enemyFlash + ")";
      ctx.fillRect(0, 0, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    }

    ctx.restore();

    // --- HP BAR above enemy ---
    ctx.save();
    ctx.globalAlpha = enemyAlpha;
    var barW = sw * 0.8;
    var barH = 8;
    var barX = screenX - barW / 2;
    var barY = drawY - 24;
    var hpPct = enemy.hp / enemy.maxHp;

    ctx.fillStyle = "#333";
    ctx.fillRect(barX, barY, barW, barH);

    var r = Math.floor(255 * (1 - hpPct));
    var g = Math.floor(255 * hpPct);
    ctx.fillStyle = "rgb(" + r + "," + g + ",50)";
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Enemy name
    ctx.font = "bold 12px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = enemy.isBoss ? "#ff4444" : "#ddd";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    var label = (enemy.isBoss ? "BOSS " : "") + enemy.name + " Lv" + enemy.level;
    ctx.fillText(label, screenX, barY - 6);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  /**
   * Draw floating damage/XP/gold numbers.
   */
  function _drawFloaters() {
    ctx.save();
    for (var i = 0; i < floaters.length; i++) {
      var f = floaters[i];
      var fx = f.screenX !== undefined ? f.screenX : f.x;
      ctx.globalAlpha = Math.max(0, f.alpha);
      ctx.font = "bold " + f.size + "px 'Courier New'";
      ctx.textAlign = "center";
      ctx.fillStyle = f.color;
      ctx.shadowColor = "#000";
      ctx.shadowBlur = 4;
      ctx.fillText(f.text, fx, f.y);
    }
    ctx.shadowBlur = 0;
    ctx.globalAlpha = 1;
    ctx.restore();
  }

  /**
   * Draw boss entrance overlay.
   */
  function _drawBossEntrance() {
    ctx.save();
    ctx.globalAlpha = bossEntrance * 0.5;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, bossEntrance * 2);
    ctx.font = "bold 40px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 20;
    ctx.fillText("BOSS FIGHT!", W / 2, H * 0.4);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ==========================================
  //  PUBLIC API — called by game.js / combat.js
  // ==========================================

  /**
   * Start walking — the player resumes moving through the world.
   */
  function startWalking() {
    state = "walking";
    enemyVisible = false;
    scrollSpeed = 0.5;
  }

  /**
   * An enemy has spawned — place it ahead in the world and start approaching.
   */
  function notifyEnemySpawn(isBoss) {
    // Place enemy ahead of current position
    var dist = W * 0.5 + 100 + Math.random() * 200;
    enemyWorldX = worldX + playerScreenX + dist;
    enemyVisible = true;
    enemyAlpha = 1;
    state = "approaching";

    if (isBoss) {
      bossEntrance = 1;
    }
  }

  /**
   * Player attacks — lunge forward + damage number on enemy.
   */
  function animatePlayerAttack(damage) {
    playerShake = 6; // slight forward push
    enemyShake = (Math.random() > 0.5 ? 1 : -1) * 10;
    enemyFlash = 0.7;

    // Damage floater on enemy (world-anchored so it scrolls with them)
    floaters.push({
      text: "-" + damage,
      worldX: enemyWorldX + (Math.random() * 30 - 15),
      y: enemyScreenY - 10,
      vy: -1.5,
      alpha: 1.2,
      color: "#ff4444",
      size: 22
    });
  }

  /**
   * Enemy attacks — shake player + damage number.
   */
  function animateEnemyAttack(damage) {
    playerShake = (Math.random() > 0.5 ? 1 : -1) * 10;
    playerFlash = 0.6;

    floaters.push({
      text: "-" + damage,
      x: playerScreenX + (Math.random() * 20 - 10),
      y: playerScreenY - 10,
      vy: -1.5,
      alpha: 1.2,
      color: "#ff6666",
      size: 18
    });
  }

  /**
   * Enemy died — fade it out, show rewards, then resume walking.
   */
  function notifyEnemyDeath(xp, gold, isBoss) {
    state = "victory";

    // Fade out enemy
    var fadeInterval = setInterval(function () {
      enemyAlpha -= 0.05;
      if (enemyAlpha <= 0) {
        enemyAlpha = 0;
        clearInterval(fadeInterval);
      }
    }, 30);

    // XP + gold floaters in the middle of the screen
    floaters.push({
      text: "+" + xp + " XP",
      x: W * 0.5,
      y: H * 0.35,
      vy: -1,
      alpha: 1.5,
      color: "#88aaff",
      size: 18
    });
    floaters.push({
      text: "+" + gold + "g",
      x: W * 0.5,
      y: H * 0.35 + 26,
      vy: -1,
      alpha: 1.5,
      color: "#ffd700",
      size: 18
    });

    // Resume walking after a brief pause
    setTimeout(function () {
      enemyVisible = false;
      startWalking();
    }, isBoss ? 1200 : 700);
  }

  /**
   * Player died — stop everything.
   */
  function notifyPlayerDeath() {
    state = "dead";
    scrollSpeed = 0;
  }

  /**
   * Player respawned — start walking again.
   */
  function notifyPlayerRespawn() {
    startWalking();
  }

  /**
   * Show level up floater.
   */
  function showLevelUp(level) {
    floaters.push({
      text: "LEVEL UP! Lv" + level,
      x: playerScreenX,
      y: playerScreenY - 50,
      vy: -1.5,
      alpha: 2,
      color: "#ffd700",
      size: 26
    });
  }

  /**
   * Get current renderer state (for combat.js to know when to start fighting).
   */
  function getState() {
    return state;
  }

  return {
    init: init,
    startWalking: startWalking,
    notifyEnemySpawn: notifyEnemySpawn,
    animatePlayerAttack: animatePlayerAttack,
    animateEnemyAttack: animateEnemyAttack,
    notifyEnemyDeath: notifyEnemyDeath,
    notifyPlayerDeath: notifyPlayerDeath,
    notifyPlayerRespawn: notifyPlayerRespawn,
    showLevelUp: showLevelUp,
    getState: getState
  };

})();
