/* ===== Snake Clash — Shop & IAP System (v2 Full-Screen) =====
   Coin shop + Premium Gem shop + IAP + Upgrade Station
   Populates the #shop-grid and #upgrade-list HTML elements.
*/
(function() {
  'use strict';

  let activeTab = 'upgrades';

  // ─── Format price with € ────────────────────────────
  function fmtPrice(price) {
    return '€' + price.toFixed(2);
  }

  // ─── Coin Shop Items ────────────────────────────────
  const SHOP_ITEMS = [
    { id: 'coins100',  name: '100 Coins',   icon: '🪙', price: 100,  cost: 0, costType: 'real',  realPrice: 1.99,  desc: 'Small coin pack' },
    { id: 'coins500',  name: '500 Coins',   icon: '💰', price: 500,  cost: 0, costType: 'real',  realPrice: 4.99,  desc: 'Popular coin pack', popular: true },
    { id: 'coins1200', name: '1,200 Coins', icon: '💼', price: 1200, cost: 0, costType: 'real',  realPrice: 9.99,  desc: 'Best value!', bestValue: true },
    { id: 'coins3000', name: '3,000 Coins', icon: '🏦', price: 3000, cost: 0, costType: 'real',  realPrice: 19.99, desc: 'Mega coin pack' },
  ];

  // ─── Gem Shop Items ─────────────────────────────────
  const GEM_ITEMS = [
    { id: 'gems50',  name: '50 Gems',   icon: '💎', price: 50,  cost: 0, costType: 'real', realPrice: 2.99,  desc: 'Small gem pack' },
    { id: 'gems200', name: '200 Gems',  icon: '💎', price: 200, cost: 0, costType: 'real', realPrice: 9.99,  desc: 'Popular gem pack', popular: true },
    { id: 'gems500', name: '500 Gems',  icon: '💎', price: 500, cost: 0, costType: 'real', realPrice: 19.99, desc: 'Premium gem pack' },
  ];

  // ─── Upgrade Items (coins) ──────────────────────────
  const UPGRADE_ITEMS = [
    {
      id: 'u1', name: 'Score Multiplier', icon: '📈', desc: 'More points per food',
      key: 'scoreMult', maxLevel: 5, baseCost: 50, costMult: 1.6,
      values: [1, 1.1, 1.25, 1.4, 1.6]
    },
    {
      id: 'u2', name: 'Food Bonus', icon: '🍎', desc: 'Extra points per food eaten',
      key: 'foodBonus', maxLevel: 5, baseCost: 40, costMult: 1.6,
      values: [0, 1, 2, 3, 5]
    },
    {
      id: 'u3', name: 'Combo Bonus', icon: '🔥', desc: 'Faster combo buildup',
      key: 'comboBonus', maxLevel: 5, baseCost: 60, costMult: 1.6,
      values: [0, 1, 2, 3, 5]
    },
    {
      id: 'u4', name: 'Score Per Food', icon: '⭐', desc: 'Flat score per food',
      key: 'scorePerFood', maxLevel: 5, baseCost: 30, costMult: 1.6,
      values: [0, 1, 2, 3, 5]
    },
    {
      id: 'u5', name: 'Magnet Range', icon: '🧲', desc: 'Attract food from further',
      key: 'magnetRange', maxLevel: 5, baseCost: 80, costMult: 1.7,
      values: [0, 1, 2, 3, 4]
    },
    {
      id: 'u6', name: 'Shield Chance', icon: '🛡️', desc: 'Start with shield chance',
      key: 'shieldChance', maxLevel: 5, baseCost: 100, costMult: 1.7,
      values: [0, 0.1, 0.2, 0.3, 0.5]
    },
    {
      id: 'u7', name: 'Speed Bonus', icon: '⚡', desc: 'Faster base speed',
      key: 'speedBonus', maxLevel: 5, baseCost: 70, costMult: 1.6,
      values: [0, 1, 2, 3, 5]
    },
    {
      id: 'u8', name: 'Start Food', icon: '🥗', desc: 'Start with bonus food',
      key: 'startFood', maxLevel: 3, baseCost: 120, costMult: 1.8,
      values: [0, 1, 2, 3]
    },
    {
      id: 'u9', name: 'Trail Glow', icon: '✨', desc: 'Snake leaves glowing trail',
      key: 'trailGlow', maxLevel: 3, baseCost: 150, costMult: 2.0,
      values: [0, 1, 2, 3]
    },
  ];

  // ─── Premium Shop Items (gems only) ─────────────────
  const PREMIUM_ITEMS = [
    { id: 'p1', name: 'Remove Ads', icon: '🚫', price: 299, costType: 'gems', desc: 'No more ads!', unlockType: 'remove_ads' },
    { id: 'p2', name: 'VIP Status', icon: '👑', price: 999, costType: 'gems', desc: '2x coins, exclusive items', unlockType: 'vip' },
    { id: 'p3', name: 'Golden Skin', icon: '🌟', price: 149, costType: 'gems', desc: 'Golden snake skin', unlockType: 'golden_skin' },
    { id: 'p4', name: 'Neon Trail', icon: '🌈', price: 199, costType: 'gems', desc: 'Neon rainbow trail', unlockType: 'neon_trail' },
  ];

  // ─── Render Tab Content ─────────────────────────────
  function renderTabContent(tab, container) {
    const content = container || document.getElementById('shop-content');
    if (!content) return;
    activeTab = tab;

    // Update tab buttons
    if (!container) {
      document.querySelectorAll('.shop-tab').forEach(t => {
        t.classList.toggle('active', t.dataset.tab === tab);
      });
    }

    content.innerHTML = '';
    if (tab === 'upgrades') {
      renderUpgrades(content);
    } else {
      // Create a grid container for shop items
      const grid = document.createElement('div');
      grid.className = 'shop-items';
      grid.id = 'shop-grid';
      grid.style.gridTemplateColumns = '1fr';
      content.appendChild(grid);

      if (tab === 'coins') renderCoinShop(content);
      else if (tab === 'gems') renderGemShop(content);
      else if (tab === 'premium') renderPremiumShop(content);
    }
  }

  // ─── Render Upgrades ────────────────────────────────
  function renderUpgrades(targetContainer) {
    const list = targetContainer || document.getElementById('upgrade-list');
    if (!list) return;
    // Only clear if not already cleared by renderTabContent
    if (!targetContainer) list.innerHTML = '';
    const state = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getState() : {};

    for (const item of UPGRADE_ITEMS) {
      const currentLevel = state[item.key] || 0;
      const isMaxed = currentLevel >= item.maxLevel;
      const nextCost = isMaxed ? 0 : Math.floor(item.baseCost * Math.pow(item.costMult, currentLevel));
      const currentValue = item.values[Math.min(currentLevel, item.values.length - 1)] || 0;
      const nextValue = isMaxed ? currentValue : item.values[Math.min(currentLevel + 1, item.values.length - 1)] || 0;
      const canAfford = (state.coins || 0) >= nextCost;
      const progress = (currentLevel / item.maxLevel) * 100;

      const div = document.createElement('div');
      div.className = 'upgrade-item';
      div.innerHTML = `
        <div class="upgrade-icon">${item.icon}</div>
        <div class="upgrade-info">
          <div class="upgrade-name">${item.name}</div>
          <div class="upgrade-level">Level ${currentLevel}/${item.maxLevel} · ${formatBonusName(item.key)}: ${formatBonusValue(item.key, currentValue)}${isMaxed ? ' (MAX)' : ' → ' + formatBonusValue(item.key, nextValue)}</div>
          <div class="upgrade-bar">
            <div class="upgrade-bar-fill" style="width:${progress}%"></div>
          </div>
        </div>
        ${isMaxed ? '<div class="upgrade-cost" style="background:rgba(0,255,136,0.1);color:var(--neon-green);cursor:default;">MAX</div>'
                  : `<div class="upgrade-cost" data-id="${item.id}" data-cost="${nextCost}" style="opacity:${canAfford ? 1 : 0.5}">🪙${nextCost}</div>`}
      `;
      list.appendChild(div);

      // Buy button
      if (!isMaxed) {
        const buyBtn = div.querySelector('.upgrade-cost');
        if (buyBtn) {
          buyBtn.addEventListener('click', function() {
            const cost = parseInt(this.dataset.cost);
            if (typeof ProgressionSystem !== 'undefined' && ProgressionSystem.spendCoins(cost)) {
              ProgressionSystem.upgrade(item.key);
              renderUpgrades(container);
              updateBalances();
              const uc = document.getElementById('upgrade-coins');
              if (uc) { const s = ProgressionSystem.getState(); uc.textContent = s ? s.coins : 0; }
            } else {
              showNotification('Not enough coins!');
            }
          });
        }
      }
    }
  }

  // ─── Render Coin Shop ───────────────────────────────
  function renderCoinShop(container) {
    const grid = container?.querySelector('#shop-grid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = '1fr';

    for (const item of SHOP_ITEMS) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      if (item.popular) div.style.borderColor = 'var(--neon-yellow)';
      if (item.bestValue) div.style.borderColor = 'var(--neon-green)';
      div.innerHTML = `
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-name">${item.name} ${item.bestValue ? '🏆' : ''}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-price" style="${item.popular?'background:rgba(255,221,0,0.2);color:var(--neon-yellow)':''}">${fmtPrice(item.realPrice)}</div>
      `;
      div.addEventListener('click', () => {
        // Mock IAP - just add coins
        showNotification(`✅ Purchased ${item.name}! (simulated)`);
        if (typeof ProgressionSystem !== 'undefined') {
          ProgressionSystem.addCoins(item.price);
          updateBalances();
        }
      });
      grid.appendChild(div);
    }
  }

  // ─── Render Gem Shop ────────────────────────────────
  function renderGemShop(container) {
    const grid = container?.querySelector('#shop-grid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = '1fr';

    for (const item of GEM_ITEMS) {
      const div = document.createElement('div');
      div.className = 'shop-item';
      if (item.popular) div.style.borderColor = 'var(--neon-yellow)';
      div.innerHTML = `
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-name">${item.name} ${item.popular ? '🔥' : ''}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-price" style="background:rgba(124,58,237,0.2);color:var(--neon-purple)">${fmtPrice(item.realPrice)}</div>
      `;
      div.addEventListener('click', () => {
        showNotification(`✅ Purchased ${item.name}! (simulated)`);
      });
      grid.appendChild(div);
    }
  }

  // ─── Render Premium Shop ────────────────────────────
  function renderPremiumShop(container) {
    const grid = container?.querySelector('#shop-grid');
    if (!grid) return;

    grid.innerHTML = '';
    grid.style.gridTemplateColumns = '1fr';

    for (const item of PREMIUM_ITEMS) {
      const hasUnlock = typeof ProgressionSystem !== 'undefined' && ProgressionSystem.hasUnlock(item.unlockType);
      if (hasUnlock) continue;

      const div = document.createElement('div');
      div.className = 'shop-item';
      div.style.borderColor = 'rgba(124,58,237,0.3)';
      div.innerHTML = `
        <div class="shop-item-icon">${item.icon}</div>
        <div class="shop-item-name">${item.name}</div>
        <div class="shop-item-desc">${item.desc}</div>
        <div class="shop-item-price" style="background:rgba(124,58,237,0.2);color:var(--neon-purple)">💎${item.price}</div>
      `;
      div.addEventListener('click', () => {
        showNotification(`✅ Purchased ${item.name}! (simulated)`);
      });
      grid.appendChild(div);
    }
  }

  // ─── Update Balances ────────────────────────────────
  function updateBalances() {
    const state = typeof ProgressionSystem !== 'undefined' ? ProgressionSystem.getState() : null;
    const coins = state ? state.coins : 0;
    const gems = state ? state.gems : 0;

    // Update shop screen currencies
    const sc = document.getElementById('shop-coins');
    if (sc) sc.textContent = coins;

    // Update upgrade screen currencies
    const uc = document.getElementById('upgrade-coins');
    if (uc) uc.textContent = coins;
  }

  // ─── Populate Shop Screen (called from showScreen) ──
  function populateShopScreen() {
    updateBalances();
    // Populate upgrade list (for upgrades screen)
    const list = document.getElementById('upgrade-list');
    if (list) renderUpgrades(list);
    // Show the first tab (upgrades) content
    const content = document.getElementById('shop-content');
    if (content) {
      renderTabContent('upgrades', content);
    }
  }

  // ─── Populate Upgrade Screen (called from showScreen) ──
  function populateUpgradeScreen() {
    updateBalances();
    const list = document.getElementById('upgrade-list');
    if (list) renderUpgrades(list);
  }

  // ─── Helpers ────────────────────────────────────────
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
    const existing = document.querySelector('.notification-popup');
    if (existing) existing.remove();

    const el = document.createElement('div');
    el.className = 'notification-popup';
    el.textContent = msg;
    el.style.cssText = 'position:fixed;top:40%;left:50%;transform:translateX(-50%);padding:14px 24px;border-radius:14px;background:rgba(20,20,50,0.95);border:1px solid var(--neon-green);color:var(--neon-green);font-size:16px;font-weight:600;z-index:200;text-align:center;pointer-events:none;animation:fadeIn 0.3s ease;';
    document.body.appendChild(el);
    setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity 0.3s'; setTimeout(() => el.remove(), 300); }, 2500);
  }

  // ─── Tab button event listeners (delegated) ──────
  document.addEventListener('click', function(e) {
    const tab = e.target.closest('.shop-tab');
    if (tab && tab.dataset.tab) {
      renderTabContent(tab.dataset.tab);
    }
  });

  // ─── Export ─────────────────────────────────────────
  window.ShopUI = {
    populateShop: populateShopScreen,
    populateUpgrades: populateUpgradeScreen,
    updateBalances,
    showTab: renderTabContent,
    renderTab: renderTabContent,
  };
})();
