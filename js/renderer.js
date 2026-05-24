/**
 * renderer.js — Canvas rendering engine.
 * Dungeon corridor style: wall tiles frame the top, floor tiles scroll along the bottom,
 * decorations line the walls. Player walks right through corridors, encounters enemies.
 * Inspired by Idle Sword 2's dungeon crawl look.
 */

var Renderer = (function () {

  var canvas, ctx;
  var W, H;                   // canvas size in CSS pixels

  // --- LAYOUT ZONES ---
  // The screen is divided into vertical bands:
  //   [ceiling/wall] [upper decorations] [walkway/action area] [floor tiles] [lower decorations]
  var WALL_TOP = 0;           // where the top wall starts (0)
  var WALL_H = 0;             // height of the top wall band
  var FLOOR_Y = 0;            // Y where the walkable floor starts
  var FLOOR_H = 0;            // height of the floor tile area
  var ACTION_Y = 0;           // Y center of the action area (where sprites stand)

  // --- WORLD SCROLL ---
  var worldX = 0;             // how far player has traveled
  var scrollSpeed = 0;
  var WALK_SPEED = 1.8;
  var state = "walking";      // walking | approaching | fighting | victory | dead

  // --- PLAYER ---
  var playerScreenX = 0;
  var playerBob = 0;
  var playerShake = 0;
  var playerFlash = 0;

  // --- ENEMY ---
  var enemyWorldX = 0;
  var enemyShake = 0;
  var enemyFlash = 0;
  var enemyAlpha = 1;
  var enemyVisible = false;

  // --- FLOATERS ---
  var floaters = [];

  // --- BOSS ---
  var bossEntrance = 0;

  // --- DECORATION OBJECTS ---
  // Wall decorations that scroll with the world (columns, sconces, stalagmites, etc.)
  var topDecos = [];          // decorations along the top wall
  var botDecos = [];          // decorations along the bottom
  var lastTopDecoX = 0;
  var lastBotDecoX = 0;

  /**
   * Initialize — grab canvas, size everything, start loop.
   */
  function init() {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");

    _resize();
    window.addEventListener("resize", _resize);

    // Seed decorations
    _seedDecorations();

    requestAnimationFrame(_loop);
  }

  /**
   * Resize canvas and recalculate layout zones.
   */
  function _resize() {
    var dpr = window.devicePixelRatio || 1;
    W = window.innerWidth;
    H = window.innerHeight;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // Layout: top 25% is wall, middle 40% is action area, bottom 35% is floor
    WALL_H = Math.floor(H * 0.22);
    FLOOR_Y = Math.floor(H * 0.60);
    FLOOR_H = H - FLOOR_Y;
    ACTION_Y = FLOOR_Y - 10; // sprites stand right on the floor line

    playerScreenX = W * 0.25;
  }

  /**
   * Seed initial decorations along the corridor.
   */
  function _seedDecorations() {
    for (var x = -200; x < W + 400; x += 120 + Math.random() * 100) {
      _spawnTopDeco(x);
    }
    lastTopDecoX = W + 400;

    for (var x2 = -200; x2 < W + 400; x2 += 150 + Math.random() * 120) {
      _spawnBotDeco(x2);
    }
    lastBotDecoX = W + 400;
  }

  /**
   * Spawn a top-wall decoration at a world X.
   */
  function _spawnTopDeco(wx) {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    if (!zone.wallsTop || zone.wallsTop.length === 0) return;

    var key = zone.wallsTop[Math.floor(Math.random() * zone.wallsTop.length)];
    topDecos.push({ key: key, worldX: wx });
  }

  /**
   * Spawn a bottom-floor decoration at a world X.
   */
  function _spawnBotDeco(wx) {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    if (!zone.wallsBottom || zone.wallsBottom.length === 0) return;

    var key = zone.wallsBottom[Math.floor(Math.random() * zone.wallsBottom.length)];
    botDecos.push({ key: key, worldX: wx });
  }

  // ==========================================
  //  MAIN LOOP
  // ==========================================

  function _loop() {
    _update();
    _draw();
    requestAnimationFrame(_loop);
  }

  /**
   * Update all state each frame.
   */
  function _update() {
    // --- SCROLL ---
    if (state === "walking") {
      scrollSpeed += (WALK_SPEED - scrollSpeed) * 0.06;
      worldX += scrollSpeed;
      playerBob += 0.1;
    } else if (state === "approaching") {
      scrollSpeed *= 0.96;
      worldX += scrollSpeed;
      playerBob += 0.07;

      // Stop when enemy is at about 68% screen width
      var enemyScreen = enemyWorldX - worldX;
      if (enemyScreen <= W * 0.62) {
        scrollSpeed = 0;
        state = "fighting";
      }
    } else {
      scrollSpeed *= 0.9;
      playerBob += 0.025; // idle breathing
    }

    // --- SPAWN DECORATIONS ahead as we scroll ---
    var ahead = worldX + W + 300;
    while (lastTopDecoX < ahead) {
      lastTopDecoX += 100 + Math.random() * 140;
      _spawnTopDeco(lastTopDecoX);
    }
    while (lastBotDecoX < ahead) {
      lastBotDecoX += 130 + Math.random() * 150;
      _spawnBotDeco(lastBotDecoX);
    }

    // Cull decorations behind camera
    var behind = worldX - 300;
    _cullArray(topDecos, behind);
    _cullArray(botDecos, behind);

    // --- DECAY ANIMATIONS ---
    playerShake *= 0.82;
    enemyShake *= 0.82;
    if (Math.abs(playerShake) < 0.5) playerShake = 0;
    if (Math.abs(enemyShake) < 0.5) enemyShake = 0;
    if (playerFlash > 0) playerFlash -= 0.04;
    if (enemyFlash > 0) enemyFlash -= 0.04;
    if (bossEntrance > 0) bossEntrance -= 0.012;

    // --- FLOATERS ---
    for (var i = floaters.length - 1; i >= 0; i--) {
      var f = floaters[i];
      f.y += f.vy;
      f.vy -= 0.03;
      f.alpha -= 0.012;
      if (f.worldX !== undefined) f.screenX = f.worldX - worldX;
      if (f.alpha <= 0) floaters.splice(i, 1);
    }
  }

  /**
   * Remove objects from array whose worldX is behind the camera.
   */
  function _cullArray(arr, behind) {
    for (var i = arr.length - 1; i >= 0; i--) {
      if (arr[i].worldX < behind) arr.splice(i, 1);
    }
  }

  // ==========================================
  //  DRAW
  // ==========================================

  function _draw() {
    ctx.clearRect(0, 0, W, H);

    _drawWallBackground();    // dark wall/ceiling area
    _drawTopDecorations();    // wall decorations (trees, columns, stalagmites)
    _drawFloor();             // scrolling floor tiles
    _drawBotDecorations();    // floor-level decorations (bones, gravestones, etc.)
    _drawPlayer();
    _drawEnemy();
    _drawFloaters();

    if (bossEntrance > 0) _drawBossEntrance();
  }

  /**
   * Draw the dark wall/ceiling background at the top.
   * Uses a gradient matching the zone's sky colors.
   */
  function _drawWallBackground() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    var colors = zone.skyColor || ["#111", "#222"];

    // Top wall area — dark gradient
    var grad = ctx.createLinearGradient(0, 0, 0, FLOOR_Y);
    grad.addColorStop(0, colors[0]);
    grad.addColorStop(0.7, colors[1]);
    grad.addColorStop(1, colors[1]);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, W, FLOOR_Y);

    // Draw a "wall edge" line where the wall meets the floor
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(0, FLOOR_Y - 2, W, 2);
  }

  /**
   * Draw top wall decorations — these scroll with the world.
   * Positioned along the lower edge of the wall, framing the corridor.
   */
  function _drawTopDecorations() {
    for (var i = 0; i < topDecos.length; i++) {
      var d = topDecos[i];
      var screenX = d.worldX - worldX;
      if (screenX < -120 || screenX > W + 120) continue;

      var img = AssetLoader.get(d.key);
      if (!img || !img.complete) continue;

      // Scale to fit the wall area. Draw them anchored to the bottom of the wall zone.
      var s = 1.5;
      var dw = img.width * s;
      var dh = img.height * s;
      // Place them so their bottom aligns with the wall/floor boundary
      var dy = FLOOR_Y - dh;

      ctx.globalAlpha = 0.75;
      ctx.drawImage(img, screenX - dw / 2, dy, dw, dh);
      ctx.globalAlpha = 1;
    }

    // Dark gradient overlay at the bottom of the wall to create depth
    var depthGrad = ctx.createLinearGradient(0, FLOOR_Y - 40, 0, FLOOR_Y);
    depthGrad.addColorStop(0, "rgba(0,0,0,0)");
    depthGrad.addColorStop(1, "rgba(0,0,0,0.3)");
    ctx.fillStyle = depthGrad;
    ctx.fillRect(0, FLOOR_Y - 40, W, 40);
  }

  /**
   * Draw the scrolling floor tiles.
   */
  function _drawFloor() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];
    var tiles = zone.tiles;

    if (!tiles || tiles.length === 0) {
      ctx.fillStyle = "#1a1a1a";
      ctx.fillRect(0, FLOOR_Y, W, FLOOR_H);
      return;
    }

    var ts = 64; // tile size
    var cols = Math.ceil(W / ts) + 2;
    var rows = Math.ceil(FLOOR_H / ts) + 1;
    var offsetX = -(worldX % ts);

    for (var row = 0; row < rows; row++) {
      for (var col = 0; col < cols; col++) {
        var worldCol = Math.floor(worldX / ts) + col;
        var tileIdx = ((row * 7 + worldCol * 13) % tiles.length + tiles.length) % tiles.length;
        var tileImg = AssetLoader.get(tiles[tileIdx]);

        var dx = col * ts + offsetX;
        var dy = FLOOR_Y + row * ts;

        if (tileImg && tileImg.complete) {
          ctx.drawImage(tileImg, dx, dy, ts, ts);
        } else {
          ctx.fillStyle = (row + worldCol) % 2 === 0 ? "#2a2a3e" : "#22223a";
          ctx.fillRect(dx, dy, ts, ts);
        }
      }
    }

    // Shadow gradient at top of floor for depth
    var floorGrad = ctx.createLinearGradient(0, FLOOR_Y, 0, FLOOR_Y + 25);
    floorGrad.addColorStop(0, "rgba(0,0,0,0.35)");
    floorGrad.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, FLOOR_Y, W, 25);
  }

  /**
   * Draw bottom/floor-level decorations.
   * These sit on the floor and scroll with the world — columns, bone piles, etc.
   */
  function _drawBotDecorations() {
    for (var i = 0; i < botDecos.length; i++) {
      var d = botDecos[i];
      var screenX = d.worldX - worldX;
      if (screenX < -120 || screenX > W + 120) continue;

      var img = AssetLoader.get(d.key);
      if (!img || !img.complete) continue;

      var s = 1.3;
      var dw = img.width * s;
      var dh = img.height * s;
      // Sit on the floor, slightly above the floor line
      var dy = FLOOR_Y - dh * 0.4;

      ctx.globalAlpha = 0.5;
      ctx.drawImage(img, screenX - dw / 2, dy, dw, dh);
      ctx.globalAlpha = 1;
    }
  }

  /**
   * Draw the player sprite walking along the corridor.
   */
  function _drawPlayer() {
    var spriteKey = Player.spriteKey();
    var img = AssetLoader.get(spriteKey);
    if (!img || !img.complete) return;

    var drawScale = 2.8;
    var sw = 64 * drawScale;
    var sh = 96 * drawScale;

    // Walk bob animation
    var bob = 0;
    if (state === "walking" || state === "approaching") {
      bob = Math.sin(playerBob * 5) * 5;
    } else {
      bob = Math.sin(playerBob * 2) * 2;
    }

    // Player's feet sit on the floor line
    var dx = playerScreenX - sw / 2 + playerShake;
    var dy = ACTION_Y - sh + bob;

    ctx.save();

    // Shadow ellipse on the floor
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(playerScreenX, ACTION_Y + 2, sw * 0.28, 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Draw sprite
    ctx.drawImage(img, dx, dy, sw, sh);

    // Red flash on hit
    if (playerFlash > 0) {
      ctx.globalCompositeOperation = "source-atop";
      ctx.fillStyle = "rgba(255, 80, 80, " + playerFlash + ")";
      ctx.fillRect(dx, dy, sw, sh);
      ctx.globalCompositeOperation = "source-over";
    }

    // Name label below feet
    ctx.font = "bold 11px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd700";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    var ps = Player.getState();
    ctx.fillText("Lv" + ps.level + " " + GameData.heroes[ps.heroClass].name, playerScreenX, ACTION_Y + 18);
    ctx.shadowBlur = 0;

    ctx.restore();
  }

  /**
   * Draw the current enemy in the corridor.
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
    var drawScale = isBoss ? 3.0 : 2.8;
    var sw = srcW * drawScale;
    var sh = srcH * drawScale;

    // World to screen X
    var screenX = enemyWorldX - worldX;

    // Idle bob
    var bob = Math.sin(Date.now() * 0.003) * 2.5;

    // Feet on floor
    var dx = screenX - sw / 2 + enemyShake;
    var dy = ACTION_Y - sh + bob + (isBoss ? -20 : 0);

    ctx.save();
    ctx.globalAlpha = enemyAlpha;

    // Shadow
    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath();
    ctx.ellipse(screenX, ACTION_Y + 2, sw * 0.28, isBoss ? 10 : 7, 0, 0, Math.PI * 2);
    ctx.fill();

    // Flip to face left (toward player)
    ctx.translate(dx + sw, dy);
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

    // --- HP BAR ---
    ctx.save();
    ctx.globalAlpha = enemyAlpha;
    var barW = sw * 0.75;
    var barH = 8;
    var barX = screenX - barW / 2;
    var barY = dy - 22;
    var hpPct = enemy.hp / enemy.maxHp;

    // Background
    ctx.fillStyle = "#222";
    ctx.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);

    // Fill (red→green gradient based on HP %)
    var r = Math.floor(220 * (1 - hpPct));
    var g = Math.floor(220 * hpPct);
    ctx.fillStyle = "rgb(" + r + "," + g + ",40)";
    ctx.fillRect(barX, barY, barW * hpPct, barH);

    // Border
    ctx.strokeStyle = "#555";
    ctx.lineWidth = 1;
    ctx.strokeRect(barX, barY, barW, barH);

    // Name label
    ctx.font = "bold 11px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = isBoss ? "#ff4444" : "#ddd";
    ctx.shadowColor = "#000";
    ctx.shadowBlur = 3;
    ctx.fillText((isBoss ? "BOSS " : "") + enemy.name + " Lv" + enemy.level, screenX, barY - 6);
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
   * Boss entrance overlay — red flash + text.
   */
  function _drawBossEntrance() {
    ctx.save();
    ctx.globalAlpha = bossEntrance * 0.45;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = Math.min(1, bossEntrance * 2.5);
    ctx.font = "bold 42px 'Courier New'";
    ctx.textAlign = "center";
    ctx.fillStyle = "#fff";
    ctx.shadowColor = "#f00";
    ctx.shadowBlur = 25;
    ctx.fillText("BOSS FIGHT!", W / 2, H * 0.38);
    ctx.shadowBlur = 0;
    ctx.restore();
  }

  // ==========================================
  //  PUBLIC API
  // ==========================================

  /** Start walking through the dungeon. */
  function startWalking() {
    state = "walking";
    enemyVisible = false;
    scrollSpeed = 0.5;
  }

  /** Enemy spawned — place it ahead, start approaching. */
  function notifyEnemySpawn(isBoss) {
    var dist = W * 0.5 + 80 + Math.random() * 150;
    enemyWorldX = worldX + playerScreenX + dist;
    enemyVisible = true;
    enemyAlpha = 1;
    state = "approaching";
    if (isBoss) bossEntrance = 1;
  }

  /** Player attack animation + damage floater. */
  function animatePlayerAttack(damage) {
    playerShake = 5;
    enemyShake = (Math.random() > 0.5 ? 1 : -1) * 12;
    enemyFlash = 0.7;
    floaters.push({
      text: "-" + damage,
      worldX: enemyWorldX + (Math.random() * 30 - 15),
      y: ACTION_Y - 96 * 2.8 - 20,
      vy: -1.5, alpha: 1.3, color: "#ff4444", size: 22
    });
  }

  /** Enemy attack animation + damage floater. */
  function animateEnemyAttack(damage) {
    playerShake = (Math.random() > 0.5 ? 1 : -1) * 12;
    playerFlash = 0.6;
    floaters.push({
      text: "-" + damage,
      x: playerScreenX + (Math.random() * 20 - 10),
      y: ACTION_Y - 96 * 2.8 - 20,
      vy: -1.5, alpha: 1.3, color: "#ff6666", size: 18
    });
  }

  /** Enemy died — fade out, show rewards, resume walking. */
  function notifyEnemyDeath(xp, gold, isBoss) {
    state = "victory";
    // Fade enemy out
    var fade = setInterval(function () {
      enemyAlpha -= 0.06;
      if (enemyAlpha <= 0) { enemyAlpha = 0; clearInterval(fade); }
    }, 30);
    // Reward floaters
    floaters.push({ text: "+" + xp + " XP", x: W * 0.5, y: H * 0.32, vy: -1, alpha: 1.6, color: "#88aaff", size: 20 });
    floaters.push({ text: "+" + gold + "g", x: W * 0.5, y: H * 0.32 + 28, vy: -1, alpha: 1.6, color: "#ffd700", size: 20 });
    // Resume walking after pause
    setTimeout(function () {
      enemyVisible = false;
      startWalking();
    }, isBoss ? 1200 : 700);
  }

  /** Player died — stop. */
  function notifyPlayerDeath() {
    state = "dead";
    scrollSpeed = 0;
  }

  /** Player respawned — walk again. */
  function notifyPlayerRespawn() {
    startWalking();
  }

  /** Level up floater. */
  function showLevelUp(level) {
    floaters.push({
      text: "LEVEL UP! Lv" + level,
      x: playerScreenX, y: ACTION_Y - 96 * 2.8 - 50,
      vy: -1.5, alpha: 2.2, color: "#ffd700", size: 28
    });
  }

  /** Current renderer state for combat.js to read. */
  function getState() { return state; }

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
