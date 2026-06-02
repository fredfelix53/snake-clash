/* ===== Snake Clash — Full Progression System =====
   Coins, Gems, Levels, Achievements, SnakeSkin/Accessories/Trail upgrades
*/
(function() {
  'use strict';

  const SAVE_KEY = 'snake_progress';
  const DAILY_KEY = 'snake_daily_bonus';

  // ─── Upgrade Tiers: SnakeSkin / Accessories / Trail ──
  const UPGRADE_TIERS = {
    weapon: {
      name: 'SnakeSkin',
      icon: '🐍',
      maxLevel: 5,
      baseCost: 1000,
      costMultiplier: 2,
      gemCost: 50,
      levels: [
        { level: 0, name: 'Plain Scales',    bonus: { scoreMult: 1.0, foodBonus: 0, speedBonus: 0 },    gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Venom Stripe',    bonus: { scoreMult: 1.1, foodBonus: 2, speedBonus: 0 },     gemReq: 50,  coinsReq: 1000 },
        { level: 2, name: 'Shadow Serpent',  bonus: { scoreMult: 1.2, foodBonus: 5, speedBonus: 1 },     gemReq: 80,  coinsReq: 2000 },
        { level: 3, name: 'Neon Viper',      bonus: { scoreMult: 1.35, foodBonus: 10, speedBonus: 2 },   gemReq: 120, coinsReq: 4000 },
        { level: 4, name: 'Crystal Cobra',   bonus: { scoreMult: 1.5, foodBonus: 15, speedBonus: 3 },    gemReq: 200, coinsReq: 8000 },
        { level: 5, name: '⚡ Dusk Hydra',   bonus: { scoreMult: 2.0, foodBonus: 25, speedBonus: 5 },    gemReq: 500, coinsReq: 20000 },
      ]
    },
    case: {
      name: 'Accessories',
      icon: '🛡️',
      maxLevel: 5,
      baseCost: 800,
      costMultiplier: 2,
      gemCost: 50,
      levels: [
        { level: 0, name: 'Bare Scale',        bonus: { shieldChance: 0, magnetRange: 0, startFood: 0 },      gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Guardian Band',     bonus: { shieldChance: 0.05, magnetRange: 0, startFood: 0 },   gemReq: 40,  coinsReq: 800 },
        { level: 2, name: 'Spiked Collar',     bonus: { shieldChance: 0.10, magnetRange: 0, startFood: 1 },   gemReq: 70,  coinsReq: 1600 },
        { level: 3, name: 'Mystic Amulet',     bonus: { shieldChance: 0.15, magnetRange: 1, startFood: 1 },   gemReq: 100, coinsReq: 3200 },
        { level: 4, name: 'Golden Crown',      bonus: { shieldChance: 0.20, magnetRange: 1, startFood: 2 },   gemReq: 180, coinsReq: 6400 },
        { level: 5, name: '💎 Oracle Eye',    bonus: { shieldChance: 0.30, magnetRange: 2, startFood: 3 },   gemReq: 400, coinsReq: 16000 },
      ]
    },
    outfit: {
      name: 'Trail Effect',
      icon: '✨',
      maxLevel: 5,
      baseCost: 600,
      costMultiplier: 2,
      gemCost: 40,
      levels: [
        { level: 0, name: 'No Trail',         bonus: { comboBonus: 0, scorePerFood: 0, trailGlow: 0 },      gemReq: 0,   coinsReq: 0 },
        { level: 1, name: 'Faint Glow',       bonus: { comboBonus: 3, scorePerFood: 1, trailGlow: 1 },      gemReq: 30,  coinsReq: 600 },
        { level: 2, name: 'Spark Trail',      bonus: { comboBonus: 6, scorePerFood: 2, trailGlow: 1 },      gemReq: 60,  coinsReq: 1200 },
        { level: 3, name: 'Fire Stream',      bonus: { comboBonus: 10, scorePerFood: 3, trailGlow: 2 },     gemReq: 90,  coinsReq: 2400 },
        { level: 4, name: 'Aurora Wake',      bonus: { comboBonus: 15, scorePerFood: 5, trailGlow: 2 },     gemReq: 150, coinsReq: 4800 },
        { level: 5, name: '🔥 Phoenix Tail',  bonus: { comboBonus: 25, scorePerFood: 8, trailGlow: 3 },     gemReq: 350, coinsReq: 12000 },
      ]
    }
  };

  // ─── Premium Items (REAL MONEY ONLY) ───────────────
  const PREMIUM_ITEMS = {
    legendarySkins: [
      { id: 'lg_void',       name: 'Void Wyrm',      desc: 'Dark matter snake skin',              price: 4.99,  gemPrice: 0, tier: 'legendary', type: 'snake_skin' },
      { id: 'lg_cosmic',     name: 'Cosmic Serpent', desc: 'Galaxy-themed scales',                price: 6.99,  gemPrice: 0, tier: 'legendary', type: 'snake_skin' },
      { id: 'lg_flame',      name: 'Inferno Coil',   desc: 'Living flame snake body',             price: 8.99,  gemPrice: 0, tier: 'legendary', type: 'snake_skin' },
    ],
    premiumCases: [
      { id: 'pc_royal',      name: 'Royal Pass',     desc: '7 days: 2x coins + 50 gems/day',      price: 4.99,  gemPrice: 0, type: 'subscription', duration: '7d' },
      { id: 'pc_vip',        name: 'VIP Status',     desc: '30 days: 3x coins + 100 gems/day + exclusive skin', price: 12.99, gemPrice: 0, type: 'subscription', duration: '30d' },
    ],
    bundles: [
      { id: 'bundle_starter',  name: 'Starter Bundle',  desc: '200 gems + 3 shields + 3 speeds + exclusive skin',   price: 2.99,  gemPrice: 0, type: 'one_time' },
      { id: 'bundle_mega',     name: 'Mega Power Pack', desc: '500 gems + 10 all power-ups + neon snake theme',      price: 7.99,  gemPrice: 0, type: 'one_time' },
      { id: 'bundle_ultimate', name: 'Ultimate Bundle', desc: '2000 gems + 50 all power-ups + all skins + legendary trail', price: 19.99, gemPrice: 0, type: 'one_time' },
    ],
    removeAds: { id: 'remove_ads', name: 'Remove Ads', desc: 'Permanently remove all ads', price: 2.99, gemPrice: 0, type: 'one_time' },
  };

  // ─── Gem Packs ─────────────────────────────────────
  const GEM_PACKS = [
    { id: 'gems_small',  name: 'Small Gem Pack',         gems: 100,  price: 0.99,  bonus: 0,    popular: false },
    { id: 'gems_medium', name: 'Standard Gem Pack',      gems: 500,  price: 3.99,  bonus: 50,   popular: true  },
    { id: 'gems_large',  name: 'Large Gem Pack',         gems: 1200, price: 7.99,  bonus: 200,  popular: false },
    { id: 'gems_mega',   name: 'Mega Gem Pack',          gems: 4000, price: 19.99, bonus: 1000, popular: false },
    { id: 'gems_ultra',  name: '🐳 Whale Pack',          gems: 10000,price: 39.99, bonus: 5000, popular: false },
  ];

  // ─── Coin Shop Catalog ──────────────────────────────
  const CATALOG = {
    themes: [
      { id: 'default',   name: 'Classic Dark',   price: 0,    desc: 'The original dark theme',          colors: { bg: '#0f1020', accent: '#1a1a2e' } },
      { id: 'ocean',     name: 'Ocean Blue',     price: 500,  desc: 'Calming ocean blues',              colors: { bg: '#023047', accent: '#0a4a6e' } },
      { id: 'sunset',    name: 'Sunset Glow',    price: 800,  desc: 'Warm sunset orange & pink',        colors: { bg: '#2d1b3d', accent: '#4a1a3a' } },
      { id: 'forest',    name: 'Forest Green',   price: 1000, desc: 'Lush forest greens',              colors: { bg: '#1a3a2a', accent: '#2a4a3a' } },
      { id: 'neon',      name: 'Neon Nights',    price: 1500, desc: 'Bright neon on dark purple',       colors: { bg: '#1a0030', accent: '#2a0050' } },
      { id: 'royal',     name: 'Royal Gold',     price: 2000, desc: 'Gold & royal purple',             colors: { bg: '#1a0030', accent: '#3a1050' } },
      { id: 'midnight',  name: 'Midnight Sky',   price: 3000, desc: 'Deep navy with starry accents',    colors: { bg: '#000a1a', accent: '#001a30' } },
      { id: 'cherry',    name: 'Cherry Blossom', price: 5000, desc: 'Soft pink cherry blossoms',        colors: { bg: '#2a0a1a', accent: '#3a1525' } },
    ],
    boardStyles: [
      { id: 'classic',    name: 'Classic Grid',  price: 0,    desc: 'Original grid style',        borderRadius: 0, glow: false },
      { id: 'rounded',    name: 'Rounded Cells', price: 600,  desc: 'Smooth rounded grid cells',  borderRadius: 6, glow: false },
      { id: 'glow',       name: 'Glow Grid',     price: 1200, desc: 'Cells with subtle glow',     borderRadius: 3, glow: true },
      { id: 'glass',      name: 'Glass Panel',   price: 2000, desc: 'Semi-transparent glass look', borderRadius: 4, glow: true },
      { id: 'neon_edge',  name: 'Neon Edge',     price: 3500, desc: 'Neon-outlined grid',          borderRadius: 2, glow: true },
    ],
    powerupPacks: [
      { id: 'starter',   name: 'Starter Pack',   price: 200,  items: { speed: 3, shield: 3, magnet: 3 },  desc: '3 of each power-up' },
      { id: 'speeder',   name: 'Speed Bundle',   price: 300,  items: { speed: 8 },                         desc: '8 speed boosts' },
      { id: 'shielder',  name: 'Shield Pack',    price: 200,  items: { shield: 8 },                        desc: '8 shields' },
      { id: 'magneter',  name: 'Magnet Pack',    price: 400,  items: { magnet: 8 },                        desc: '8 magnets' },
      { id: 'mega',      name: 'Mega Bundle',    price: 1000, items: { speed: 10, shield: 10, magnet: 10 }, desc: '10 of each power-up' },
    ],
    boosters: [
      { id: 'score_x2',   name: 'Score Booster',   price: 500,  desc: '2x score for next game',      effect: 'scoreMultiplier:2' },
      { id: 'bonus_food', name: 'Golden Feast',    price: 400,  desc: 'Start with golden food on board', effect: 'goldenStart:1' },
      { id: 'auto_magnet', name: 'Auto Magnet',    price: 800,  desc: 'Auto-activate magnet on start', effect: 'autoMagnet:1' },
    ],
  };

  // ─── Achievements (snake-themed) ───────────────────
  const ACHIEVEMENTS = [
    { id: 'first_play',      name: 'First Slither',     desc: 'Play your first game',                reward: { coins: 50, gems: 0 },    icon: '🐍',  check: p => p.totalPlays >= 1 },
    { id: 'score_100',       name: 'Snack Snatcher',    desc: 'Score 100 in one game',              reward: { coins: 100, gems: 0 },   icon: '💯',  check: p => p.bestScore >= 100 },
    { id: 'score_500',       name: 'Hungry Serpent',    desc: 'Score 500 in one game',              reward: { coins: 250, gems: 0 },   icon: '🎯',  check: p => p.bestScore >= 500 },
    { id: 'score_1000',      name: 'Python Level',      desc: 'Score 1000 in one game',             reward: { coins: 500, gems: 5 },   icon: '🏆',  check: p => p.bestScore >= 1000 },
    { id: 'score_2000',      name: 'Anaconda',          desc: 'Score 2000 in one game',             reward: { coins: 1000, gems: 10 }, icon: '👑',  check: p => p.bestScore >= 2000 },
    { id: 'score_5000',      name: 'Titan Constrictor', desc: 'Score 5000 in one game',             reward: { coins: 2000, gems: 25 }, icon: '🌟',  check: p => p.bestScore >= 5000 },
    { id: 'score_10000',     name: 'Jormungandr',       desc: 'Score 10000 in one game',            reward: { coins: 5000, gems: 50 }, icon: '🏅',  check: p => p.bestScore >= 10000 },
    { id: 'food_10',         name: 'Appetizer',         desc: 'Eat 10 food total',                  reward: { coins: 100, gems: 0 },   icon: '🍎',  check: p => p.totalFood >= 10 },
    { id: 'food_100',        name: 'Full Belly',        desc: 'Eat 100 food total',                 reward: { coins: 300, gems: 5 },   icon: '🍏',  check: p => p.totalFood >= 100 },
    { id: 'food_500',        name: 'Bottomless Pit',    desc: 'Eat 500 food total',                 reward: { coins: 800, gems: 15 },  icon: '🍎',  check: p => p.totalFood >= 500 },
    { id: 'food_1000',       name: 'Never Full',        desc: 'Eat 1000 food total',                reward: { coins: 2000, gems: 30 }, icon: '💠',  check: p => p.totalFood >= 1000 },
    { id: 'combo_3',         name: 'Snack Streak',      desc: 'Eat 3 food in a row',                reward: { coins: 100, gems: 0 },   icon: '3️⃣',  check: p => p.bestCombo >= 3 },
    { id: 'combo_5',         name: 'Feeding Frenzy',    desc: 'Eat 5 food in a row',                reward: { coins: 300, gems: 5 },   icon: '5️⃣',  check: p => p.bestCombo >= 5 },
    { id: 'combo_10',        name: 'Unstoppable',       desc: 'Eat 10 food in a row',               reward: { coins: 1000, gems: 15 }, icon: '🔟',  check: p => p.bestCombo >= 10 },
    { id: 'combo_15',        name: 'Infinite Maw',      desc: 'Eat 15+ food in a row',              reward: { coins: 2000, gems: 25 }, icon: '💥',  check: p => p.bestCombo >= 15 },
    { id: 'streak_3',        name: '3-Day Slither',     desc: 'Play 3 days in a row',                reward: { coins: 200, gems: 0 },   icon: '🔥',  check: p => p.bestStreak >= 3 },
    { id: 'streak_7',        name: 'Week Worm',         desc: 'Play 7 days in a row',                reward: { coins: 500, gems: 10 },  icon: '📅',  check: p => p.bestStreak >= 7 },
    { id: 'streak_14',       name: 'Fortnight Fang',    desc: 'Play 14 days in a row',               reward: { coins: 1500, gems: 25 }, icon: '⏰',  check: p => p.bestStreak >= 14 },
    { id: 'streak_30',       name: 'Month Mamba',       desc: 'Play 30 days in a row',               reward: { coins: 5000, gems: 100 },icon: '👑',  check: p => p.bestStreak >= 30 },
    { id: 'weapon_1',        name: 'Shedding Skin',     desc: 'Upgrade SnakeSkin to level 1',        reward: { coins: 200, gems: 0 },   icon: '🔄',  check: p => (p.upgrades?.weapon || 0) >= 1 },
    { id: 'weapon_3',        name: 'Venomous',          desc: 'Upgrade SnakeSkin to level 3',        reward: { coins: 500, gems: 10 },  icon: '🐍',  check: p => (p.upgrades?.weapon || 0) >= 3 },
    { id: 'weapon_5',        name: 'Apex Predator',     desc: 'Reach max SnakeSkin level',           reward: { coins: 2000, gems: 50 }, icon: '⚡',  check: p => (p.upgrades?.weapon || 0) >= 5 },
    { id: 'case_1',          name: 'Accessorized',      desc: 'Upgrade Accessories to level 1',      reward: { coins: 200, gems: 0 },   icon: '💍',  check: p => (p.upgrades?.case || 0) >= 1 },
    { id: 'case_3',          name: 'Well Dressed',      desc: 'Upgrade Accessories to level 3',      reward: { coins: 500, gems: 10 },  icon: '👑',  check: p => (p.upgrades?.case || 0) >= 3 },
    { id: 'case_5',          name: 'Royal Jewel',       desc: 'Reach max Accessories level',          reward: { coins: 2000, gems: 50 }, icon: '💎',  check: p => (p.upgrades?.case || 0) >= 5 },
    { id: 'outfit_1',        name: 'Glowing Start',     desc: 'Upgrade Trail Effect to level 1',     reward: { coins: 200, gems: 0 },   icon: '✨',  check: p => (p.upgrades?.outfit || 0) >= 1 },
    { id: 'outfit_3',        name: 'Trail Blazer',      desc: 'Upgrade Trail Effect to level 3',     reward: { coins: 500, gems: 10 },  icon: '🔥',  check: p => (p.upgrades?.outfit || 0) >= 3 },
    { id: 'outfit_5',        name: 'Legendary Trail',   desc: 'Reach max Trail Effect level',        reward: { coins: 2000, gems: 50 }, icon: '🌈',  check: p => (p.upgrades?.outfit || 0) >= 5 },
    { id: 'gems_100',        name: 'Gem Serpent',       desc: 'Earn 100 total gems',                 reward: { coins: 500, gems: 20 },  icon: '💎',  check: p => p.totalGems >= 100 },
    { id: 'gems_500',        name: 'Gem Dragon',        desc: 'Earn 500 total gems',                 reward: { coins: 1000, gems: 50 }, icon: '💠',  check: p => p.totalGems >= 500 },
    { id: 'all_achievements', name: 'Completionist',    desc: 'Unlock all other achievements',        reward: { coins: 10000, gems: 200 }, icon: '🏅', check: p => false },
  ];

  // ─── Player State ──────────────────────────────────
  function defaultState() {
    return {
      coins: 100,
      gems: 0,
      totalGems: 0,
      xp: 0,
      level: 1,
      bestScore: 0,
      bestCombo: 0,
      totalPlays: 0,
      totalFood: 0,
      bestStreak: 0,
      upgrades: { weapon: 0, case: 0, outfit: 0 },
      ownedThemes: ['default'],
      ownedBoardStyles: ['classic'],
      activeTheme: 'default',
      activeBoardStyle: 'classic',
      powerups: { speed: 3, shield: 3, magnet: 3 },
      activeBoosters: {},
      inventory: {},
      achievements: {},
      lastSaveDate: null,
      adFree: false,
      subscriptions: {},
    };
  }

  let state = null;

  function save() {
    state.lastSaveDate = new Date().toISOString();
    try { localStorage.setItem(SAVE_KEY, JSON.stringify(state)); } catch(e) {}
  }

  function load() {
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (raw) {
        state = { ...defaultState(), ...JSON.parse(raw) };
        if (!state.upgrades) state.upgrades = { weapon: 0, case: 0, outfit: 0 };
        if (!state.gems && state.gems !== 0) state.gems = 0;
        if (!state.totalGems) state.totalGems = 0;
        if (!state.inventory) state.inventory = {};
        if (!state.subscriptions) state.subscriptions = {};
        if (!state.adFree) state.adFree = false;
        if (!state.powerups) state.powerups = { speed: 3, shield: 3, magnet: 3 };
        if (!state.ownedBoardStyles) state.ownedBoardStyles = ['classic'];
        if (!state.activeBoardStyle) state.activeBoardStyle = 'classic';
        if (!state.totalFood) state.totalFood = 0;
        save();
        return true;
      }
    } catch(e) {}
    reset();
    return false;
  }

  function reset() {
    state = defaultState();
    save();
  }

  // ─── XP / Leveling ─────────────────────────────────
  function xpForLevel(lvl) {
    return Math.floor(100 * Math.pow(1.2, lvl - 1));
  }

  function addXp(amount) {
    if (!state) return;
    state.xp += amount;
    let leveled = false;
    while (state.xp >= xpForLevel(state.level)) {
      state.xp -= xpForLevel(state.level);
      state.level++;
      leveled = true;
    }
    save();
    return leveled;
  }

  // ─── Coins ─────────────────────────────────────────
  function addCoins(amount) {
    if (!state) return 0;
    state.coins += amount;
    save();
    return state.coins;
  }

  function spendCoins(amount) {
    if (!state || state.coins < amount) return false;
    state.coins -= amount;
    save();
    return true;
  }

  // ─── Gems ──────────────────────────────────────────
  function addGems(amount) {
    if (!state) return 0;
    state.gems += amount;
    state.totalGems += amount;
    save();
    return state.gems;
  }

  function spendGems(amount) {
    if (!state || state.gems < amount) return false;
    state.gems -= amount;
    save();
    return true;
  }

  // ─── Upgrades ──────────────────────────────────────
  function getUpgradeCost(category, currentLevel) {
    const tier = UPGRADE_TIERS[category];
    if (!tier) return null;
    const nextLevel = currentLevel + 1;
    const levelData = tier.levels.find(l => l.level === nextLevel);
    if (!levelData) return null;
    return { coins: levelData.coinsReq, gems: levelData.gemReq };
  }

  function upgradeItem(category, useGems = false) {
    if (!state) return { success: false, reason: 'no_state' };
    const tier = UPGRADE_TIERS[category];
    if (!tier) return { success: false, reason: 'invalid_category' };
    const current = state.upgrades[category] || 0;
    if (current >= tier.maxLevel) return { success: false, reason: 'max_level' };
    const costs = getUpgradeCost(category, current);
    if (!costs) return { success: false, reason: 'no_level_data' };
    if (useGems) {
      if (state.gems < costs.gems) return { success: false, reason: 'not_enough_gems' };
      spendGems(costs.gems);
    } else {
      if (state.coins < costs.coins) return { success: false, reason: 'not_enough_coins' };
      spendCoins(costs.coins);
    }
    state.upgrades[category]++;
    save();
    return { success: true, newLevel: state.upgrades[category] };
  }

  // ─── Active Bonuses ────────────────────────────────
  function getActiveBonuses() {
    if (!state) return { scoreMult: 1, foodBonus: 0, speedBonus: 0, shieldChance: 0, magnetRange: 0, startFood: 0, comboBonus: 0, scorePerFood: 0, trailGlow: 0 };

    const bonuses = { scoreMult: 1, foodBonus: 0, speedBonus: 0, shieldChance: 0, magnetRange: 0, startFood: 0, comboBonus: 0, scorePerFood: 0, trailGlow: 0 };

    const wLevel = state.upgrades.weapon || 0;
    const wData = UPGRADE_TIERS.weapon.levels[wLevel];
    if (wData) {
      bonuses.scoreMult += (wData.bonus.scoreMult - 1);
      bonuses.foodBonus += wData.bonus.foodBonus;
      bonuses.speedBonus += wData.bonus.speedBonus;
    }

    const cLevel = state.upgrades.case || 0;
    const cData = UPGRADE_TIERS.case.levels[cLevel];
    if (cData) {
      bonuses.shieldChance += cData.bonus.shieldChance;
      bonuses.magnetRange += cData.bonus.magnetRange;
      bonuses.startFood += cData.bonus.startFood;
    }

    const oLevel = state.upgrades.outfit || 0;
    const oData = UPGRADE_TIERS.outfit.levels[oLevel];
    if (oData) {
      bonuses.comboBonus += oData.bonus.comboBonus;
      bonuses.scorePerFood += oData.bonus.scorePerFood;
      bonuses.trailGlow += oData.bonus.trailGlow;
    }

    return bonuses;
  }

  // ─── Premium Items ─────────────────────────────────
  function ownsPremiumItem(itemId) {
    return state && state.inventory && state.inventory[itemId] === true;
  }

  function purchasePremiumItem(itemId) {
    if (!state) return false;
    state.inventory[itemId] = true;
    if (itemId === 'remove_ads') {
      state.adFree = true;
      if (window.AdsManager) AdsManager.onAdsRemoved();
    }
    const bundleGems = { bundle_starter: 200, bundle_mega: 500, bundle_ultimate: 2000 };
    if (bundleGems[itemId]) addGems(bundleGems[itemId]);
    // Notify collectibles
    if (window.CollectiblesSystem) {
      CollectiblesSystem.setTracker('madePurchase', true);
      CollectiblesSystem.checkUnlocks();
    }
    save();
    return true;
  }

  // ─── Achievements ──────────────────────────────────
  function checkAchievements() {
    if (!state) return [];
    const unlocked = [];
    for (const ach of ACHIEVEMENTS) {
      if (state.achievements[ach.id]) continue;
      if (ach.check(state)) {
        state.achievements[ach.id] = true;
        addCoins(ach.reward.coins);
        if (ach.reward.gems) addGems(ach.reward.gems);
        unlocked.push(ach);
      }
    }
    if (unlocked.length > 0) save();
    return unlocked;
  }

  // ─── Daily Bonus ───────────────────────────────────
  function claimDailyBonus() {
    if (!state) return null;
    const now = new Date();
    const today = now.toDateString();
    try {
      const lastClaim = localStorage.getItem(DAILY_KEY);
      if (lastClaim === today) return null;
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdayStr = yesterday.toDateString();
      let streak = 0;
      if (lastClaim === yesterdayStr) {
        streak = (state.dailyStreak || 0) + 1;
      } else {
        streak = 1;
      }
      state.dailyStreak = streak;
      if (streak > state.bestStreak) state.bestStreak = streak;
      const coins = Math.min(100 + (streak - 1) * 20, 1000);
      const gems = streak >= 7 ? 5 : streak >= 3 ? 2 : 0;
      addCoins(coins);
      if (gems) addGems(gems);
      localStorage.setItem(DAILY_KEY, today);
      save();
      return { streak, coins, gems };
    } catch(e) {
      return null;
    }
  }

  // ─── End of Game ───────────────────────────────────
  function endOfGame(result) {
    if (!state) return;
    state.totalPlays++;
    if (result.score > state.bestScore) state.bestScore = result.score;
    if (result.bestCombo > state.bestCombo) state.bestCombo = result.bestCombo;
    if (result.foodEaten) state.totalFood += result.foodEaten;
    const xpGain = Math.floor(result.score / 10) + (result.foodEaten || 0) * 5 + 20;
    addXp(xpGain);
    const coinGain = Math.floor(result.score / 20) + (result.foodEaten || 0) * 2 + 5;
    addCoins(coinGain);
    save();
  }

  // ─── Getters ───────────────────────────────────────
  function getState() { return state; }
  function getUpgradeTiers() { return UPGRADE_TIERS; }
  function getPremiumItems() { return PREMIUM_ITEMS; }
  function getGemPacks() { return GEM_PACKS; }
  function getCatalog() { return CATALOG; }
  function getAchievements() { return ACHIEVEMENTS; }
  function getCoinBalance() { return state ? state.coins : 0; }
  function getGemBalance() { return state ? state.gems : 0; }

  // ─── Export ─────────────────────────────────────────
  window.ProgressionSystem = {
    load, save, reset,
    addCoins, spendCoins, getCoinBalance,
    addGems, spendGems, getGemBalance,
    addXp, xpForLevel,
    upgradeItem, getUpgradeCost, getActiveBonuses,
    getUpgradeTiers, UPGRADE_TIERS,
    getPremiumItems, PREMIUM_ITEMS,
    getGemPacks, GEM_PACKS,
    ownsPremiumItem, purchasePremiumItem,
    getCatalog, CATALOG,
    getAchievements, ACHIEVEMENTS,
    checkAchievements, endOfGame,
    claimDailyBonus,
    getState, defaultState,
  };
})();
