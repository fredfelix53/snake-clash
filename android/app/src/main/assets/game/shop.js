/* ===== Snake Clash — Shop & IAP System =====
   Coin shop + Premium Gem shop + Real Money IAP + Upgrade Station
*/
(function() {
  'use strict';

  let shopContainer = null;
  let activeTab = 'upgrades'; // coins | gems | upgrades | premium

  // ─── Format price with € ────────────────────────────
  function fmtPrice(price) {
    return '€' + price.toFixed(2);
  }

  // ─── Create Shop Panel ──────────────────────────────
  function createShopPanel() {
    if (shopContainer) {
      shopContainer.style.display = 'block';
      showTab(activeTab);
      return;
    }

    shopContainer = document.createElement('div');
    shopContainer.id = 'shop-panel';
    shopContainer.innerHTML = `
      <div class="shop-overlay"></div>
      <div class="shop-window">
        <button class="shop-close">&times;</button>
        <h2 class="shop-title">🛒 Shop</h2>
        <div class="shop-balance-bar">
          <span class="balance-item"><span class="coin-icon">🪙</span> <span id="shop-coins">0</span></span>
          <span class="balance-item"><span class="gem-icon">💎</span> <span id="shop-gems">0</span></span>
        </div>
        <div class="shop-tabs">
          <button class="shop-tab" data-tab="coins">🪙 Shop</button>
          <button class="shop-tab" data-tab="gems">💎 Gems</button>
          <button class="shop-tab" data-tab="upgrades">⚡ Upgrades</button>
          <button class="shop-tab" data-tab="premium">👑 Premium</button>
        </div>
        <div class="shop-content" id="shop-content"></div>
      </div>
    `;

    document.body.appendChild(shopContainer);

    shopContainer.querySelector('.shop-close').addEventListener('click', closeShop);
    shopContainer.querySelector('.shop-overlay').addEventListener('click', closeShop);

    shopContainer.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => showTab(tab.dataset.tab));
    });

    showTab('upgrades');
    updateBalances();
  }

  function closeShop() {
    if (shopContainer) shopContainer.style.display = 'none';
  }

  function showTab(tabId) {
    activeTab = tabId;
    if (!shopContainer) return;
    shopContainer.querySelectorAll('.shop-tab').forEach(t => {
      t.classList.toggle('active', t.dataset.tab === tabId);
    });
    const content = shopContainer.querySelector('#shop-content');
    switch(tabId) {
      case 'coins': renderCoinShop(content); break;
      case 'gems': renderGemShop(content); break;
      case 'upgrades': renderUpgradeStation(content); break;
      case 'premium': renderPremiumShop(content); break;
    }
    updateBalances();
  }

  function updateBalances() {
    const coins = shopContainer?.querySelector('#shop-coins');
    const gems = shopContainer?.querySelector('#shop-gems');
    if (coins) coins.textContent = ProgressionSystem.getCoinBalance();
    if (gems) gems.textContent = ProgressionSystem.getGemBalance();
  }

  // ─── Tab: Coin Shop ─────────────────────────────────
  function renderCoinShop(container) {
    const catalog = ProgressionSystem.getCatalog();
    let html = '<div class="shop-section"><h3>🎨 Themes</h3><div class="shop-grid">';
    const state = ProgressionSystem.getState();
    for (const t of catalog.themes) {
      const owned = state.ownedThemes.includes(t.id);
      const active = state.activeTheme === t.id;
      html += `
        <div class="shop-item ${owned ? 'owned' : ''} ${active ? 'active' : ''}" data-type="theme" data-id="${t.id}" data-price="${t.price}">
          <div class="item-preview theme-preview" style="background: linear-gradient(135deg, ${t.colors.bg}, ${t.colors.accent})"></div>
          <div class="item-name">${t.name}</div>
          <div class="item-desc">${t.desc}</div>
          ${owned ? (active ? '<span class="item-status">✓ Active</span>' : '<button class="btn-equip">Equip</button>') : `<button class="btn-buy">🪙 ${t.price}</button>`}
        </div>`;
    }
    html += '</div></div><div class="shop-section"><h3>🎲 Board Styles</h3><div class="shop-grid">';
    for (const s of catalog.boardStyles) {
      const owned = state.ownedBoardStyles.includes(s.id);
      const active = state.activeBoardStyle === s.id;
      html += `
        <div class="shop-item ${owned ? 'owned' : ''} ${active ? 'active' : ''}" data-type="boardStyle" data-id="${s.id}" data-price="${s.price}">
          <div class="item-name">${s.name}</div>
          <div class="item-desc">${s.desc}</div>
          ${owned ? (active ? '<span class="item-status">✓ Active</span>' : '<button class="btn-equip">Equip</button>') : `<button class="btn-buy">🪙 ${s.price}</button>`}
        </div>`;
    }
    html += '</div></div><div class="shop-section"><h3>⚡ Power-Ups</h3><div class="shop-grid">';
    for (const p of catalog.powerupPacks) {
      html += `
        <div class="shop-item" data-type="powerup" data-id="${p.id}" data-price="${p.price}">
          <div class="item-name">${p.name}</div>
          <div class="item-desc">${p.desc}</div>
          <button class="btn-buy">🪙 ${p.price}</button>
        </div>`;
    }
    html += '</div></div><div class="shop-section"><h3>🚀 Boosters</h3><div class="shop-grid">';
    for (const b of catalog.boosters) {
      html += `
        <div class="shop-item" data-type="booster" data-id="${b.id}" data-price="${b.price}">
          <div class="item-name">${b.name}</div>
          <div class="item-desc">${b.desc}</div>
          <button class="btn-buy">🪙 ${b.price}</button>
        </div>`;
    }
    html += '</div></div>';
    container.innerHTML = html;

    container.querySelectorAll('.btn-buy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.shop-item');
        const type = item.dataset.type;
        const id = item.dataset.id;
        const price = parseInt(item.dataset.price);
        handleCoinPurchase(type, id, price, item);
      });
    });
    container.querySelectorAll('.btn-equip').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const item = e.target.closest('.shop-item');
        const type = item.dataset.type;
        const id = item.dataset.id;
        handleEquip(type, id);
      });
    });
  }

  function handleCoinPurchase(type, id, price, itemEl) {
    const state = ProgressionSystem.getState();
    if (type === 'theme' && state.ownedThemes.includes(id)) { handleEquip('theme', id); return; }
    if (type === 'boardStyle' && state.ownedBoardStyles.includes(id)) { handleEquip('boardStyle', id); return; }
    if (!ProgressionSystem.spendCoins(price)) { showNotification('Not enough coins!'); return; }
    if (type === 'theme') {
      state.ownedThemes.push(id);
      state.activeTheme = id;
      ProgressionSystem.save();
    } else if (type === 'boardStyle') {
      state.ownedBoardStyles.push(id);
      state.activeBoardStyle = id;
      ProgressionSystem.save();
    } else if (type === 'powerup') {
      const catalog = ProgressionSystem.getCatalog();
      const pack = catalog.powerupPacks.find(p => p.id === id);
      if (pack) {
        for (const [k, v] of Object.entries(pack.items)) {
          state.powerups[k] = (state.powerups[k] || 0) + v;
        }
        ProgressionSystem.save();
      }
    } else if (type === 'booster') {
      state.activeBoosters[id] = true;
      ProgressionSystem.save();
    }
    showNotification('Purchased! ✨');
    showTab('coins');
  }

  function handleEquip(type, id) {
    const state = ProgressionSystem.getState();
    if (type === 'theme' || type === 'boardStyle') {
      const key = type === 'theme' ? 'activeTheme' : 'activeBoardStyle';
      const arr = type === 'theme' ? state.ownedThemes : state.ownedBoardStyles;
      if (!arr.includes(id)) return;
      state[key] = id;
      ProgressionSystem.save();
      showTab('coins');
      showNotification(`${type === 'theme' ? 'Theme' : 'Style'} applied! ✅`);
    }
  }

  // ─── Tab: Gem Shop (IAP) ────────────────────────────
  function renderGemShop(container) {
    const packs = ProgressionSystem.getGemPacks();
    let html = '<div class="shop-section"><h3>💎 Buy Gems</h3><p class="shop-subtitle">Premium currency for exclusive upgrades</p><div class="shop-grid gem-grid">';
    for (const p of packs) {
      const total = p.gems + p.bonus;
      html += `
        <div class="shop-item gem-pack ${p.popular ? 'popular' : ''}" data-id="${p.id}">
          ${p.popular ? '<div class="popular-badge">🔥 Best Value</div>' : ''}
          <div class="gem-amount">💎 ${total.toLocaleString()}</div>
          ${p.bonus > 0 ? `<div class="gem-bonus">+${p.bonus} bonus</div>` : ''}
          <div class="gem-base">${p.gems.toLocaleString()} gems</div>
          <button class="btn-buy premium-btn">${fmtPrice(p.price)}</button>
        </div>`;
    }
    html += '</div></div>';
    container.innerHTML = html;
    container.querySelectorAll('.gem-pack .btn-buy').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pack = e.target.closest('.gem-pack');
        const id = pack.dataset.id;
        const data = ProgressionSystem.getGemPacks().find(p => p.id === id);
        if (!data) return;
        const total = data.gems + data.bonus;
        ProgressionSystem.addGems(total);
        showNotification(`💎 Purchased ${total} gems!`);
        updateBalances();
      });
    });
  }

  // ─── Tab: Upgrade Station ───────────────────────────
  function renderUpgradeStation(container) {
    const tiers = ProgressionSystem.getUpgradeTiers();
    const state = ProgressionSystem.getState();
    const bonuses = ProgressionSystem.getActiveBonuses();
    let html = '<div class="shop-section"><h3>⚡ Upgrade Station</h3><p class="shop-subtitle">Permanent upgrades that boost your stats</p>';
    html += `<div class="bonus-summary">
      <span>🐍 Score: <strong>${(bonuses.scoreMult).toFixed(2)}x</strong></span>
      <span>🛡️ Shield: <strong>${Math.round(bonuses.shieldChance * 100)}%</strong></span>
      <span>⚡ Speed: <strong>+${bonuses.speedBonus}</strong></span>
      <span>🍎 Food+: <strong>+${bonuses.foodBonus}</strong></span>
      <span>🔥 Combo: <strong>+${bonuses.comboBonus}</strong></span>
      <span>🍏 Per Food: <strong>+${bonuses.scorePerFood}</strong></span>
      <span>🧲 Magnet: <strong>+${bonuses.magnetRange}</strong></span>
    </div>`;
    html += `<div class="upgrade-balance">
      <span>🪙 ${state.coins.toLocaleString()}</span>
      <span>💎 ${state.gems}</span>
    </div>`;

    for (const [cat, tier] of Object.entries(tiers)) {
      const currentLevel = state.upgrades[cat] || 0;
      const currentData = tier.levels[currentLevel];
      const maxed = currentLevel >= tier.maxLevel;
      const costs = maxed ? null : ProgressionSystem.getUpgradeCost(cat, currentLevel);

      html += `<div class="upgrade-card" data-cat="${cat}">
        <div class="upgrade-header">
          <span class="upgrade-icon">${tier.icon}</span>
          <span class="upgrade-name">${tier.name}</span>
          <span class="upgrade-level">Lv.${currentLevel} → ${currentLevel + 1}</span>
        </div>
        <div class="upgrade-visual">
          <div class="upgrade-bar">
            <div class="upgrade-fill" style="width: ${(currentLevel / tier.maxLevel) * 100}%"></div>
          </div>
          <div class="upgrade-dots">`;
      for (let i = 0; i <= tier.maxLevel; i++) {
        html += `<span class="upgrade-dot ${i <= currentLevel ? 'filled' : ''} ${i === currentLevel + 1 ? 'next' : ''}">${i}</span>`;
      }
      html += `</div></div>`;

      if (currentData) {
        html += `<div class="upgrade-current">Current: <strong>${currentData.name}</strong></div>`;
        html += `<div class="upgrade-bonuses">`;
        for (const [k, v] of Object.entries(currentData.bonus)) {
          if (v > 0) html += `<span class="bonus-chip">${formatBonusValue(k, v)} ${formatBonusName(k)}</span>`;
        }
        html += `</div>`;
      }

      if (!maxed && costs) {
        const nextData = tier.levels[currentLevel + 1];
        if (nextData) {
          html += `<div class="upgrade-next">Next: <strong>${nextData.name}</strong></div>`;
        }
        const canAffordCoins = state.coins >= costs.coins;
        const canAffordGems = state.gems >= costs.gems;
        html += `<div class="upgrade-actions">
          <button class="btn-upgrade coin-upgrade ${canAffordCoins ? '' : 'disabled'}" data-cat="${cat}" data-currency="coins">
            🪙 ${costs.coins.toLocaleString()}
          </button>
          <button class="btn-upgrade gem-upgrade ${canAffordGems ? '' : 'disabled'}" data-cat="${cat}" data-currency="gems">
            💎 ${costs.gems}
          </button>
        </div>`;
      }

      if (maxed) {
        html += `<div class="upgrade-maxed">⭐ MAX LEVEL ⭐</div>`;
      }

      html += `</div>`;
    }

    html += '</div>';
    container.innerHTML = html;

    container.querySelectorAll('.btn-upgrade:not(.disabled)').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const card = e.target.closest('.upgrade-card');
        const cat = card.dataset.cat;
        const currency = btn.dataset.currency;
        const result = ProgressionSystem.upgradeItem(cat, currency === 'gems');
        if (result.success) {
          showNotification(`⬆️ ${cat} upgraded to Lv.${result.newLevel}!`);
          renderUpgradeStation(container);
          updateBalances();
        } else {
          showNotification(`Not enough ${currency}!`);
        }
      });
    });
  }

  // ─── Tab: Premium Shop (Real Money) ────────────────
  function renderPremiumShop(container) {
    const premium = ProgressionSystem.getPremiumItems();
    const state = ProgressionSystem.getState();
    let html = '<div class="shop-section"><h3>👑 Premium Shop</h3><p class="shop-subtitle">Exclusive items — real money only. Can\'t buy with coins!</p>';

    html += '<h4>⚔️ Legendary Snake Skins</h4><div class="shop-grid">';
    for (const s of premium.legendarySkins) {
      const owned = state.inventory[s.id];
      html += `
        <div class="shop-item premium-item ${owned ? 'owned' : ''}">
          <div class="premium-tier">${s.tier}</div>
          <div class="item-name">${s.name}</div>
          <div class="item-desc">${s.desc}</div>
          ${owned ? '<span class="item-status">✓ Owned</span>' : `<button class="btn-buy premium-btn iap-btn" data-id="${s.id}" data-price="${s.price}">${fmtPrice(s.price)}</button>`}
        </div>`;
    }
    html += '</div>';

    html += '<h4>📦 Value Bundles</h4><div class="shop-grid">';
    for (const b of premium.bundles) {
      const owned = state.inventory[b.id];
      html += `
        <div class="shop-item premium-item bundle-item ${owned ? 'owned' : ''}">
          <div class="item-name">${b.name}</div>
          <div class="item-desc">${b.desc}</div>
          ${owned ? '<span class="item-status">✓ Owned</span>' : `<button class="btn-buy premium-btn iap-btn" data-id="${b.id}" data-price="${b.price}">${fmtPrice(b.price)}</button>`}
        </div>`;
    }
    html += '</div>';

    html += '<h4>🎫 Premium Pass</h4><div class="shop-grid">';
    for (const p of premium.premiumCases) {
      const owned = state.inventory[p.id];
      html += `
        <div class="shop-item premium-item subscription-item ${owned ? 'owned' : ''}">
          <div class="item-name">${p.name}</div>
          <div class="item-desc">${p.desc}</div>
          ${owned ? '<span class="item-status">✓ Owned</span>' : `<button class="btn-buy premium-btn iap-btn" data-id="${p.id}" data-price="${p.price}">${fmtPrice(p.price)}</button>`}
        </div>`;
    }
    html += '</div>';

    const adFree = state.adFree;
    html += '<h4>🚫 Ads</h4><div class="shop-grid">';
    html += `
      <div class="shop-item premium-item ${adFree ? 'owned' : ''}">
        <div class="item-name">${premium.removeAds.name}</div>
        <div class="item-desc">${premium.removeAds.desc}</div>
        ${adFree ? '<span class="item-status">✓ Purchased</span>' : `<button class="btn-buy premium-btn iap-btn" data-id="remove_ads" data-price="${premium.removeAds.price}">${fmtPrice(premium.removeAds.price)}</button>`}
      </div>`;
    html += '</div></div>';

    container.innerHTML = html;
    container.querySelectorAll('.iap-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = btn.dataset.id;
        const price = parseFloat(btn.dataset.price);
        if (confirm(`Purchase this item for ${fmtPrice(price)}? (Real money — simulated for now)`)) {
          ProgressionSystem.purchasePremiumItem(id);
          showNotification(`✅ Purchased! Check your inventory.`);
          renderPremiumShop(container);
          updateBalances();
        }
      });
    });
  }

  // ─── Utilities ──────────────────────────────────────
  function formatBonusName(key) {
    const names = {
      scoreMult: 'Score', foodBonus: 'Food Bonus',
      speedBonus: 'Speed', shieldChance: 'Shield',
      magnetRange: 'Magnet', startFood: 'Start Food',
      comboBonus: 'Combo', scorePerFood: 'Per Food',
      trailGlow: 'Glow'
    };
    return names[key] || key;
  }

  function formatBonusValue(key, val) {
    if (key === 'scoreMult') return val.toFixed(1) + 'x';
    if (key === 'shieldChance') return Math.round(val * 100) + '%';
    return '+' + val;
  }

  function showNotification(msg) {
    const el = document.getElementById('notification') || (() => {
      const n = document.createElement('div');
      n.id = 'notification';
      document.body.appendChild(n);
      return n;
    })();
    el.textContent = msg;
    el.className = 'show';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => el.className = '', 2500);
  }

  // ─── Export ─────────────────────────────────────────
  window.ShopUI = {
    open: createShopPanel,
    close: closeShop,
    showTab,
    updateBalances,
  };
})();
