/**
 * ui.js — Updates the HTML HUD overlay elements (HP bar, gold, zone name, etc.).
 * Runs on a timer separate from the canvas render loop.
 */

var UI = (function () {

  // Cached DOM element references
  var els = {};

  // Loot popup timer
  var lootTimeout = null;

  /**
   * Initialize — grab all the DOM elements once.
   */
  function init() {
    els.level     = document.getElementById("hud-level");
    els.hpFill    = document.getElementById("hud-hp-fill");
    els.hpText    = document.getElementById("hud-hp-text");
    els.xpFill    = document.getElementById("hud-xp-fill");
    els.goldText  = document.getElementById("hud-gold-text");
    els.zoneName  = document.getElementById("zone-name");
    els.zoneLevel = document.getElementById("zone-level");
    els.fightBtn  = document.getElementById("btn-fight");
    els.lootPopup = document.getElementById("loot-popup");

    // Fight button click toggles auto-fight
    els.fightBtn.addEventListener("click", function () {
      Combat.toggle();
    });

    // Start the HUD update loop (5x per second is enough for text)
    setInterval(refresh, 200);
  }

  /**
   * Refresh all HUD elements from current game state.
   */
  function refresh() {
    var ps = Player.getState();
    var zone = GameData.zones[ps.currentZone];

    // Level display
    els.level.textContent = "Lv " + ps.level;

    // HP bar — width and color
    var hpPct = ps.maxHp > 0 ? (ps.hp / ps.maxHp) * 100 : 0;
    els.hpFill.style.width = hpPct + "%";
    els.hpText.textContent = ps.hp + " / " + ps.maxHp;

    // Change HP bar color based on percentage
    if (hpPct > 50) {
      els.hpFill.style.background = "linear-gradient(to bottom, #4c4, #282)";
    } else if (hpPct > 25) {
      els.hpFill.style.background = "linear-gradient(to bottom, #cc4, #882)";
    } else {
      els.hpFill.style.background = "linear-gradient(to bottom, #c44, #822)";
    }

    // XP bar
    var xpNeeded = GameData.xpForLevel(ps.level);
    var xpPct = xpNeeded > 0 ? (ps.xp / xpNeeded) * 100 : 0;
    els.xpFill.style.width = xpPct + "%";

    // Gold
    els.goldText.textContent = _formatGold(ps.gold) + "g";

    // Zone info
    if (zone) {
      els.zoneName.textContent = zone.name;
      els.zoneLevel.textContent = "Zone " + (ps.currentZone + 1) + " / " + GameData.zones.length +
        "  |  Kills: " + ps.killCount + " / " + GameData.killsPerBoss;
    }

    // Fight button state
    if (Combat.isFighting()) {
      els.fightBtn.textContent = "STOP";
      els.fightBtn.classList.add("auto-active");
    } else {
      els.fightBtn.textContent = "FIGHT";
      els.fightBtn.classList.remove("auto-active");
    }
  }

  /**
   * Show a loot popup message briefly.
   */
  function showLoot(text) {
    els.lootPopup.textContent = text;
    els.lootPopup.classList.remove("hidden");

    // Auto-hide after 2 seconds
    if (lootTimeout) clearTimeout(lootTimeout);
    lootTimeout = setTimeout(function () {
      els.lootPopup.classList.add("hidden");
    }, 2000);
  }

  /**
   * Format gold with K/M suffixes for large numbers.
   */
  function _formatGold(amount) {
    if (amount >= 1000000) return (amount / 1000000).toFixed(1) + "M";
    if (amount >= 10000) return (amount / 1000).toFixed(1) + "K";
    return amount.toString();
  }

  return {
    init: init,
    refresh: refresh,
    showLoot: showLoot
  };

})();
