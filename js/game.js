const CONFIG = {
    boyName: "Сёмушка",

    billboardMessages: [
        "я люблю тебя",
        "сёма - лучший гонщик!",
        "ты мой чемпион",
        "а ты красивый)",
        "18.11.2025",
        "скучаю по тебе",
        "мой умничка",
        "люблю тебя до луны и обратно"
    ],

    kissMessages: [
        "это от меня",
        "целую!",
        "ты лучший",
        "чмок"
    ],

    gameOverMessages: [
        "ничего страшного, попробуй еще",
        "я горжусь тобой",
        "у тебя все получится",
        "я верю в тебя!"
    ],

    scoreMilestones: {
        100:  "первая сотня",
        500:  "500 очков - ты крутой",
        1000: "ЛЕГЕНДА!",
        2000: "как ты это делаешь?!",
        5000: "я горжусь тобой",
    },

     distanceMilestones: {
        500:  "пол километра!",
        1000: "1 км!",
        2000: "2 км! ты неудержим!",
        5000: "5 км! ты профи?!",
    },
};

// ======== МАГАЗИН ========

const SHOP_ITEMS = [
    {
        id: "shield",
        name: "щит",
        desc: "активируй во время гонки (кнопка на экране)",
        price: 2000,
        icon: "🛡️",
        type: "active",
    },
    {
        id: "magnet",
        name: "магнит",
        desc: "монеты притягиваются 15 сек",
        price: 3500,
        icon: "🧲",
        type: "active",
    },
    {
        id: "extralife",
        name: "доп. жизнь",
        desc: "+1 жизнь в начале заезда",
        price: 3000,
        icon: "💖",
        type: "auto",
    },
    {
        id: "nitrostart",
        name: "нитро старт",
        desc: "начинай с полным нитро",
        price: 2500,
        icon: "🚀",
        type: "auto",
    },
    {
        id: "doublecoins",
        name: "x2 монеты",
        desc: "удвоение монет за весь заезд",
        price: 5000,
        icon: "💰",
        type: "auto",
    },
    {
        id: "slowtraffic",
        name: "медленный трафик",
        desc: "трафик медленнее 20 сек",
        price: 40000,
        icon: "🐢",
        type: "active",
    },
];


// ======== ВСПОМОГАЛКИ ========

function random(a, b) { return Math.random() * (b - a) + a; }
function randomInt(a, b) { return Math.floor(random(a, b + 1)); }
function randomFrom(a) { return a[Math.floor(Math.random() * a.length)]; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function lerp(a, b, t) { return a + (b - a) * t; }
function collides(a, b) {
    return a.x < b.x + b.w && a.x + a.w > b.x &&
           a.y < b.y + b.h && a.y + a.h > b.y;
}


// ======== СОХРАНЕНИЕ ========

function saveData() {
    var data = {
        totalCoins: totalCoins,
        inventory: inventory,
        highScore: highScore,
    };
    try { localStorage.setItem("nightrace", JSON.stringify(data)); } catch (e) {}
}

function loadData() {
    try {
        var d = JSON.parse(localStorage.getItem("nightrace"));
        if (d) {
            totalCoins = d.totalCoins || 0;
            inventory = d.inventory || {};
            highScore = d.highScore || 0;
        }
    } catch (e) {}
}


// ======== ПЕРЕМЕННЫЕ ========

var canvas, ctx, W, H;
var gameState = "menu";
var score = 0, distance = 0, gameTime = 0, lastTime = 0;
var totalCoins = 0, highScore = 0;
var inventory = {};
var equippedItems = [];
var usedThisRace = {};

var shieldActive = false, shieldTimer = 0;
var magnetActive = false, magnetTimer = 0;
var slowTrafficActive = false, slowTrafficTimer = 0;
var doubleCoinsActive = false;

// Дорога
var roadLeft, roadRight, roadWidth, laneWidth;
var LANE_COUNT = 3, lanes = [], markingOffset = 0;

// Игрок
var playerX, playerY, playerLane, playerTargetX;
var playerSpeed = 3, playerLives = 3;
var playerInvincible = false, playerInvTimer = 0, playerBlinkTimer = 0;
var nitro = 0, nitroActive = false, nitroTimer = 0;
var selectedCar = 0;

var CARS = [
    { name: "спорткар", emoji: "🏎️", color: "#ff0044", bodyW: 38, bodyH: 68, style: "sport" },
    { name: "седан", emoji: "🚗", color: "#0088ff", bodyW: 40, bodyH: 65, style: "sedan" },
    { name: "пикап", emoji: "🛻", color: "#44aa00", bodyW: 44, bodyH: 74, style: "pickup" },
    { name: "джип", emoji: "🚙", color: "#ff8800", bodyW: 46, bodyH: 70, style: "suv" },
];

// Трафик, бонусы, билборды
var trafficCars = [], trafficTimer = 0, trafficInterval = 1800;
var bonuses = [], bonusTimer = 0;
var billboards = [], billboardTimer = 0;

// Погода
var weather = "clear", weatherParticles = [], weatherTimer = 0;

// Звёзды
var stars = [];

// UI
var notification = null, notifTimer = 0;
var popups = [];
var shownScoreMilestones = {}, shownDistMilestones = {};

// Тач
var touchStartX = 0, touchCurrentX = 0, isTouching = false;
var lastTapTime = 0, doubleTap = false, lastLaneChangeTime = 0;


// ======== ИНИЦИАЛИЗАЦИЯ ========

window.addEventListener("load", function () {
    canvas = document.getElementById("gameCanvas");
    ctx = canvas.getContext("2d");
    loadData();
    resize();
    window.addEventListener("resize", resize);
    setupTouch();
    setupMenu();
    setupPause();
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
});

function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    var dpr = window.devicePixelRatio || 1;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    canvas.style.width = W + "px";
    canvas.style.height = H + "px";
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.scale(dpr, dpr);

    // === ДОРОГА УМЕНЬШЕНА: 55% ширины вместо 72% ===
    roadWidth = W * 0.55;
    roadLeft = (W - roadWidth) / 2;
    roadRight = roadLeft + roadWidth;
    laneWidth = roadWidth / LANE_COUNT;
    lanes = [];
    for (var i = 0; i < LANE_COUNT; i++) {
        lanes.push(roadLeft + laneWidth * i + laneWidth / 2);
    }
}


// ======== ТАЧСКРИН ========

function setupTouch() {
    canvas.addEventListener("touchstart", function (e) {
        e.preventDefault();
        var t = e.touches[0];
        touchStartX = t.clientX;
        touchCurrentX = t.clientX;
        isTouching = true;
        var now = Date.now();
        if (now - lastTapTime < 300) doubleTap = true;
        lastTapTime = now;
    }, { passive: false });

    canvas.addEventListener("touchmove", function (e) {
        e.preventDefault();
        if (isTouching) touchCurrentX = e.touches[0].clientX;
    }, { passive: false });

    canvas.addEventListener("touchend", function (e) {
        e.preventDefault();
        isTouching = false;
    }, { passive: false });

    canvas.addEventListener("mousedown", function (e) {
        touchStartX = e.clientX; touchCurrentX = e.clientX; isTouching = true;
        var now = Date.now();
        if (now - lastTapTime < 300) doubleTap = true;
        lastTapTime = now;
    });
    canvas.addEventListener("mousemove", function (e) { if (isTouching) touchCurrentX = e.clientX; });
    canvas.addEventListener("mouseup", function () { isTouching = false; });
}

function getTouchDir() {
    if (!isTouching) return 0;
    var d = touchCurrentX - touchStartX;
    if (d > 30) return 1;
    if (d < -30) return -1;
    return 0;
}


// ======== МЕНЮ ========

function setupMenu() {
    var grid = document.getElementById("cars-grid");
    grid.innerHTML = "";
    CARS.forEach(function (car, i) {
        var div = document.createElement("div");
        div.className = "car-option" + (i === 0 ? " selected" : "");
        div.innerHTML =
            '<span class="car-emoji">' + car.emoji + "</span>" +
            '<span class="car-name">' + car.name + "</span>";
        div.addEventListener("click", function () {
            document.querySelectorAll(".car-option").forEach(function (el) {
                el.classList.remove("selected");
            });
            div.classList.add("selected");
            selectedCar = i;
        });
        grid.appendChild(div);
    });

    document.getElementById("start-btn").addEventListener("click", startGame);
    document.getElementById("restart-btn").addEventListener("click", startGame);
    document.getElementById("menu-btn").addEventListener("click", goToMenu);
    document.getElementById("shop-btn").addEventListener("click", openShop);
    document.getElementById("shop-back-btn").addEventListener("click", closeShop);
}

function goToMenu() {
    hideAll();
    document.getElementById("start-screen").style.display = "flex";
}

function hideAll() {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("shop-screen").style.display = "none";
    document.getElementById("gameover-screen").style.display = "none";
    document.getElementById("pause-screen").style.display = "none";
    document.getElementById("hud").style.display = "none";
    document.getElementById("pause-btn").classList.remove("visible");
    canvas.style.display = "none";
}

// ======== МАГАЗИН ========

function openShop() {
    document.getElementById("start-screen").style.display = "none";
    document.getElementById("shop-screen").style.display = "flex";
    renderShop();
}

function closeShop() {
    document.getElementById("shop-screen").style.display = "none";
    document.getElementById("start-screen").style.display = "flex";
}

function renderShop() {
    document.getElementById("shop-coins").textContent = "🪙 " + totalCoins;
    var container = document.getElementById("shop-items");
    container.innerHTML = "";

    SHOP_ITEMS.forEach(function (item) {
        var count = inventory[item.id] || 0;
        var canBuy = totalCoins >= item.price;

        var div = document.createElement("div");
        div.className = "shop-item" + (count > 0 ? " owned" : "");

        div.innerHTML =
            '<div class="shop-item-icon">' + item.icon + "</div>" +
            '<div class="shop-item-info">' +
                '<div class="shop-item-name">' + item.name +
                (count > 0 ? ' <span style="color:#00ff88">(x' + count + ')</span>' : '') +
                "</div>" +
                '<div class="shop-item-desc">' + item.desc + "</div>" +
            "</div>" +
            '<button class="shop-item-btn" ' +
            (!canBuy ? "disabled" : "") + ">🪙 " + item.price + "</button>";

        var btn = div.querySelector(".shop-item-btn");
        btn.addEventListener("click", function (e) {
            e.stopPropagation();
            if (totalCoins >= item.price) {
                totalCoins -= item.price;
                inventory[item.id] = (inventory[item.id] || 0) + 1;
                saveData();
                renderShop();
            }
        });

        container.appendChild(div);
    });
}

// ======== ПАУЗА ========

function setupPause() {
    document.getElementById("pause-btn").addEventListener("click", function () {
        if (gameState === "playing") pauseGame();
    });
    document.getElementById("resume-btn").addEventListener("click", resumeGame);
    document.getElementById("quit-btn").addEventListener("click", function () {
        gameState = "menu";
        goToMenu();
    });
}

function pauseGame() {
    if (gameState !== "playing") return;
    gameState = "paused";
    document.getElementById("pause-screen").style.display = "flex";
    document.getElementById("pause-btn").classList.remove("visible");
}

function resumeGame() {
     document.getElementById("pause-screen").style.display = "none";
    document.getElementById("pause-btn").classList.add("visible");
    gameState = "playing";
    lastTime = performance.now();
}


// ======== СТАРТ ========

function startGame() {
    hideAll();
    canvas.style.display = "block";
    document.getElementById("hud").style.display = "block";
    document.getElementById("pause-btn").classList.add("visible");

    score = 0; distance = 0; gameTime = 0;
    playerLane = 1;
    playerX = lanes[1]; playerTargetX = lanes[1];
    playerY = H * 0.75; playerSpeed = 3;
    playerLives = 3; playerInvincible = false;
    playerInvTimer = 0; playerBlinkTimer = 0;
    nitro = 0; nitroActive = false;
    trafficCars = []; trafficTimer = 0; trafficInterval = 2200;
    bonuses = []; bonusTimer = 0;
    billboards = []; billboardTimer = 0;
    weather = "clear"; weatherParticles = []; weatherTimer = 0;
    markingOffset = 0; notification = null; popups = [];
    shownScoreMilestones = {}; shownDistMilestones = {};
    lastLaneChangeTime = 0;

    // Сброс предметов
    shieldActive = false; shieldTimer = 0;
    magnetActive = false; magnetTimer = 0;
    slowTrafficActive = false; slowTrafficTimer = 0;
    doubleCoinsActive = false;
    usedThisRace = {};

    // Авто-предметы (используются сразу при старте)
    if (inventory["extralife"] && inventory["extralife"] > 0) {
        playerLives = 4;
        inventory["extralife"]--;
        showNotif("+1 жизнь", "#ff4466");
    }
    if (inventory["nitrostart"] && inventory["nitrostart"] > 0) {
        nitro = 100;
        inventory["nitrostart"]--;
        showNotif("нитро заряжено", "#ff00ff");
    }
    if (inventory["doublecoins"] && inventory["doublecoins"] > 0) {
        doubleCoinsActive = true;
        inventory["doublecoins"]--;
        showNotif("x2 монеты", "#ffdd00");
    }
    saveData();

    // Показать кнопки предметов
    updateItemButtons();

    stars = [];
    for (var i = 0; i < 60; i++) {
        stars.push({
            x: random(0, W), y: random(0, H * 0.3),
            size: random(1, 2.5), twinkle: random(0, 6.28), speed: random(0.01, 0.04)
        });
    }

    gameState = "playing";
    lastTime = performance.now();
}

// ======== GAME OVER ========

function gameOver() {
    gameState = "gameover";
    canvas.style.display = "none";
    document.getElementById("hud").style.display = "none";
    document.getElementById("pause-btn").classList.remove("visible");

    var earned = score;
    if (doubleCoinsActive) earned = score * 2;
    totalCoins += earned;
    if (score > highScore) highScore = score;
    saveData();

    document.getElementById("final-score").textContent = "Очки: " + score + " 🪙";
    document.getElementById("final-distance").textContent = "Дистанция: " + Math.floor(distance) + " м";
    document.getElementById("coins-earned").textContent = "Заработано: +" + earned + " монет";
    document.getElementById("easter-msg").textContent =
        randomFrom(CONFIG.gameOverMessages).replace("{name}", CONFIG.boyName);

    document.getElementById("gameover-screen").style.display = "flex";
}


// ======== ГЛАВНЫЙ ЦИКЛ ========

function gameLoop(ts) {
    var dt = Math.min((ts - lastTime) / 1000, 0.05);
    lastTime = ts;
    if (gameState === "playing") { update(dt); draw(); }
    requestAnimationFrame(gameLoop);
}


// ======== ОБНОВЛЕНИЕ ========

function update(dt) {
    gameTime += dt;

    // Управление
    var dir = getTouchDir();
    var now = Date.now();
    if (dir !== 0 && now - lastLaneChangeTime > 200) {
        var nl = clamp(playerLane + dir, 0, LANE_COUNT - 1);
        if (nl !== playerLane) {
            playerLane = nl;
            touchStartX = touchCurrentX;
            lastLaneChangeTime = now;
        }
    }
    playerTargetX = lanes[playerLane];
    playerX = lerp(playerX, playerTargetX, 0.12);

    // Нитро
    if (doubleTap && nitro >= 30) {
        doubleTap = false; nitroActive = true; nitroTimer = 3;
        playSound("nitro");
    }
    doubleTap = false;

    if (nitroActive) {
        nitroTimer -= dt; nitro -= dt * 35;
        playerSpeed = lerp(playerSpeed, 12, 0.05);
        if (nitroTimer <= 0 || nitro <= 0) { nitroActive = false; nitro = Math.max(0, nitro); }
    } else {
        // Скорость растёт как в Subway Surfers
        var ts2;
        if (gameTime < 15) {
            ts2 = 2.5;
        } else if (gameTime < 40) {
            ts2 = 3 + (gameTime - 15) * 0.04;
        } else if (gameTime < 90) {
            ts2 = 4 + (gameTime - 40) * 0.03;
        } else if (gameTime < 180) {
            ts2 = 5.5 + (gameTime - 90) * 0.015;
        } else {
            ts2 = 7;
        }
        playerSpeed = lerp(playerSpeed, Math.min(ts2, 7), 0.01);
    }

    if (playerInvincible) {
        playerInvTimer -= dt; playerBlinkTimer += dt;
        if (playerInvTimer <= 0) playerInvincible = false;
          // Таймеры предметов
    if (shieldActive) {
        shieldTimer -= dt;
        if (shieldTimer <= 0) { shieldActive = false; }
    }
    if (magnetActive) {
        magnetTimer -= dt;
        if (magnetTimer <= 0) { magnetActive = false; showNotif("магнит закончился", "#888"); }
    }
    if (slowTrafficActive) {
        slowTrafficTimer -= dt;
        if (slowTrafficTimer <= 0) { slowTrafficActive = false; showNotif("замедление закончилось", "#888"); }
    }
    }

    markingOffset += playerSpeed * dt * 60;
    if (markingOffset > 60) markingOffset -= 60;
    distance += playerSpeed * dt * 10;
    stars.forEach(function (s) { s.twinkle += s.speed; });

    // Трафик
    // Трафик как в Subway Surfers — сначала медленно, потом быстрее
    if (gameTime < 10) {
        trafficInterval = 2500;
    } else if (gameTime < 30) {
        trafficInterval = 2000;
    } else if (gameTime < 60) {
        trafficInterval = 1500;
    } else if (gameTime < 120) {
        trafficInterval = 1000;
    } else if (gameTime < 180) {
        trafficInterval = 750;
    } else {
        trafficInterval = 550;
    }
    trafficTimer += dt * 1000;
    if (trafficTimer >= trafficInterval) { trafficTimer = 0; spawnTraffic(); }

    var trafficSpeedMult = slowTrafficActive ? 0.4 : 1;
    trafficCars.forEach(function (c) {
        c.y += (playerSpeed - c.speed * trafficSpeedMult) * dt * 60;
    });
    trafficCars = trafficCars.filter(function (c) { return c.y > -120 && c.y < H + 120; });

    // Бонусы
    bonusTimer += dt * 1000;
    if (bonusTimer >= 900) { bonusTimer = 0; spawnBonus(); }
    bonuses.forEach(function (b) {
        b.y += playerSpeed * dt * 60;
        b.bob += dt * 3;

        // Магнит
            if (magnetActive && (b.type === "coin" || b.type === "star")) {
            var dx = playerX - b.x;
            var dy = playerY - b.y;
            var dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 120) {
                b.x += dx * 3 * dt;
                b.y += dy * 3 * dt;
            }
        }
    });
    bonuses = bonuses.filter(function (b) { return b.y < H + 50; });

    // Билборды
    billboardTimer += dt * 1000;
    if (billboardTimer >= 4000) { billboardTimer = 0; spawnBillboard(); }
    billboards.forEach(function (b) { b.y += playerSpeed * dt * 40; b.flicker += 0.08; });
    billboards = billboards.filter(function (b) { return b.y < H + 150; });

    // Погода
    weatherTimer += dt * 1000;
    if (weatherTimer >= 25000) {
        weatherTimer = 0;
        weather = randomFrom(["clear", "rain", "rain", "snow", "clear"]);
        weatherParticles = [];
    }
    updateWeather(dt);

    // Столкновения
    var pH = { x: playerX - 17, y: playerY - 30, w: 34, h: 60 };
    for (var i = 0; i < trafficCars.length; i++) {
        var c = trafficCars[i];
        var cH = { x: c.x - 16, y: c.y - 28, w: 32, h: 56 };
        if (collides(pH, cH) && !playerInvincible) {
            playerLives--;
            playerInvincible = true; playerInvTimer = 2; playerBlinkTimer = 0;
            playerSpeed = 3; nitroActive = false;
            playSound("crash");
            showNotif("💥 Авария!", "#ff4444");
            if (playerLives <= 0) { gameOver(); return; }
            break;
        }
    }

    // Сбор бонусов
     var coinMult = doubleCoinsActive ? 2 : 1;
    for (var i = bonuses.length - 1; i >= 0; i--) {
        var b = bonuses[i];
        var bH = { x: b.x - 18, y: b.y - 18, w: 36, h: 36 };
        if (collides(pH, bH)) {
            if (b.type === "coin") {
                score += 10 * coinMult;
                addPopup(b.x, b.y, "+" + (10 * coinMult), "#ffdd00");
            } else if (b.type === "star") {
                score += 50 * coinMult;
                addPopup(b.x, b.y, "+" + (50 * coinMult), "#ffff00");
            } else if (b.type === "nitro") {
                nitro = clamp(nitro + 25, 0, 100);
                addPopup(b.x, b.y, "+⚡", "#ff00ff");
            } else if (b.type === "heart") {
                playerLives = Math.min(playerLives + 1, 5);
                addPopup(b.x, b.y, "+❤️", "#ff4466");
            } else if (b.type === "kiss") {
                score += 100 * coinMult;
                addPopup(b.x, b.y, "+" + (100 * coinMult), "#ff69b4");
                showNotif(randomFrom(CONFIG.kissMessages), "#ff69b4");
            }
            playSound("collect");
            bonuses.splice(i, 1);
        }
    }

    // Пасхалки
    for (var t in CONFIG.scoreMilestones) {
        if (score >= parseInt(t) && !shownScoreMilestones[t]) {
            shownScoreMilestones[t] = true;
            showNotif(CONFIG.scoreMilestones[t].replace("{name}", CONFIG.boyName), "#ffff00");
        }
    }
    for (var t in CONFIG.distanceMilestones) {
        if (distance >= parseInt(t) && !shownDistMilestones[t]) {
            shownDistMilestones[t] = true;
            showNotif(CONFIG.distanceMilestones[t].replace("{name}", CONFIG.boyName), "#00ffff");
        }
    }

    // HUD
    document.getElementById("score-display").textContent = "🪙 " + score;
    document.getElementById("speed-display").textContent = "🏎️ " + Math.floor(playerSpeed * 25) + " km/h";
    document.getElementById("distance-display").textContent = "📏 " + Math.floor(distance) + " m";
    document.getElementById("nitro-fill").style.width = nitro + "%";
    var h = "";
    for (var i = 0; i < playerLives; i++) h += "❤️";
    document.getElementById("lives-display").textContent = h;

    popups.forEach(function (p) { p.y -= 50 * dt; p.alpha -= dt; });
    popups = popups.filter(function (p) { return p.alpha > 0; });
    if (notification) { notifTimer -= dt; if (notifTimer <= 0) notification = null; }
}


// ======== СПАВНЕРЫ ========

function spawnTraffic() {
    var lane = randomInt(0, LANE_COUNT - 1);
    if (trafficCars.some(function (c) { return c.lane === lane && c.y < 150; })) return;
    var types = [
        { w: 34, h: 62, style: "sedan" },
        { w: 38, h: 68, style: "suv" },
        { w: 32, h: 58, style: "sport" },
        { w: 40, h: 70, style: "truck" },
    ];
    var tp = randomFrom(types);
    trafficCars.push({
        x: lanes[lane], y: -80, lane: lane,
        speed: random(1, 2.5),
        color: randomFrom(["#2244aa", "#884422", "#228844", "#666", "#aa2244", "#4422aa", "#887722"]),
        w: tp.w, h: tp.h, style: tp.style
    });
}

function spawnBonus() {
    var lane = randomInt(0, LANE_COUNT - 1);
    var r = Math.random(), type;
    if (r < 0.50) type = "coin";
    else if (r < 0.70) type = "nitro";
    else if (r < 0.82) type = "star";
    else if (r < 0.92) type = "heart";
    else type = "kiss";
    bonuses.push({ x: lanes[lane], y: -30, type: type, bob: random(0, 6.28) });
}

function spawnBillboard() {
    var side = Math.random() > 0.5 ? "left" : "right";
    var x;
    if (side === "left") {
        x = 5;
    } else {
        x = roadRight + 8;
    }
    billboards.push({
        x: x, y: -120,
        w: roadLeft - 15,
        h: 70,
        side: side,
        message: randomFrom(CONFIG.billboardMessages),
        glowColor: randomFrom(["#ff00ff", "#00ffff", "#ffff00", "#ff4488"]),
        flicker: random(0, 6.28)
    });
}


// ======== ПОГОДА ========

function updateWeather(dt) {
    if (weather === "rain") {
        if (weatherParticles.length < 120) {
            for (var i = 0; i < 3; i++) {
                weatherParticles.push({
                    x: random(0, W), y: random(-30, 0),
                    speed: random(500, 900), len: random(8, 20), alpha: random(0.2, 0.5)
                });
            }
        }
        weatherParticles.forEach(function (p) { p.y += p.speed * dt; p.x -= 20 * dt; });
    } else if (weather === "snow") {
        if (weatherParticles.length < 60) {
            weatherParticles.push({
                x: random(0, W), y: -5,
                speed: random(40, 120), size: random(2, 4),
                wobble: random(0, 6.28), wobSpeed: random(1, 3), alpha: random(0.4, 0.8)
            });
        }
        weatherParticles.forEach(function (p) {
            p.y += p.speed * dt; p.wobble += p.wobSpeed * dt; p.x += Math.sin(p.wobble) * 25 * dt;
        });
    }
    weatherParticles = weatherParticles.filter(function (p) { return p.y < H + 20; });
}


// ======== UI ========

function showNotif(text, color) { notification = { text: text, color: color }; notifTimer = 3; }

// ======== КНОПКИ ПРЕДМЕТОВ НА ЭКРАНЕ ========

function updateItemButtons() {
    var container = document.getElementById("item-buttons");
    if (!container) return;
    container.innerHTML = "";

    var items = [
        { id: "shield", icon: "🛡️", label: "ЩИТ" },
        { id: "magnet", icon: "🧲", label: "МАГНИТ" },
        { id: "slowtraffic", icon: "🐢", label: "ЗАМЕДЛ." },
    ];

    items.forEach(function (item) {
        var count = inventory[item.id] || 0;
        if (count <= 0) return;
        if (usedThisRace[item.id]) return;

        var btn = document.createElement("button");
        btn.className = "item-btn";
        btn.innerHTML = item.icon + "<span>" + count + "</span>";
        btn.addEventListener("click", function () {
            useItem(item.id);
        });
        container.appendChild(btn);
    });
}

function useItem(id) {
    if (usedThisRace[id]) return;
    if (!inventory[id] || inventory[id] <= 0) return;

    inventory[id]--;
    usedThisRace[id] = true;
    saveData();

    if (id === "shield") {
        shieldActive = true;
        shieldTimer = 8;
        playerInvincible = true;
        playerInvTimer = 8;
        playerBlinkTimer = 0;
        playSound("nitro");
        showNotif("щит активирован! 8 сек", "#00ffff");
    } else if (id === "magnet") {
        magnetActive = true;
        magnetTimer = 15;
        playSound("collect");
        showNotif("магнит активирован! 15 сек", "#ffaa00");
    } else if (id === "slowtraffic") {
        slowTrafficActive = true;
        slowTrafficTimer = 20;
        playSound("collect");
        showNotif("трафик замедлен! 20 сек", "#44aa00");
    }

    updateItemButtons();
}

function addPopup(x, y, text, color) { popups.push({ x: x, y: y, text: text, color: color, alpha: 1 }); }


// ======== ЗВУК ========

var audioCtx = null;
function initAudio() { if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }

function playSound(type) {
    initAudio(); if (!audioCtx) return;
    try {
        if (type === "collect") { playTone(800, 0.1, "sine"); setTimeout(function () { playTone(1200, 0.08, "sine"); }, 50); }
        else if (type === "crash") { playNoise(0.25); }
        else if (type === "nitro") { playTone(200, 0.4, "sawtooth"); }
    } catch (e) {}
}

function playTone(f, d, t) {
    var o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = t; o.frequency.value = f;
    g.gain.setValueAtTime(0.12, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    o.connect(g); g.connect(audioCtx.destination); o.start(); o.stop(audioCtx.currentTime + d);
}

function playNoise(d) {
    var sz = audioCtx.sampleRate * d, buf = audioCtx.createBuffer(1, sz, audioCtx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < sz; i++) data[i] = Math.random() * 2 - 1;
    var s = audioCtx.createBufferSource(), g = audioCtx.createGain();
    s.buffer = buf;
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + d);
    s.connect(g); g.connect(audioCtx.destination); s.start();
}


// ============================================
//  ОТРИСОВКА
// ============================================

function draw() {
    ctx.clearRect(0, 0, W, H);
    drawSky(); drawStars(); drawBuildings(); drawRoad();
    drawBillboards(); drawTraffic(); drawBonuses();
    drawPlayer(); drawWeather(); drawPopups(); drawNotif();
}

function drawSky() {
    var g = ctx.createLinearGradient(0, 0, 0, H * 0.4);
    g.addColorStop(0, "#05050f"); g.addColorStop(0.5, "#0a0a2e"); g.addColorStop(1, "#1a0a2e");
    ctx.fillStyle = g; ctx.fillRect(0, 0, W, H * 0.4);
    ctx.fillStyle = "#0f0f15"; ctx.fillRect(0, H * 0.35, W, H * 0.65);
}

function drawStars() {
    stars.forEach(function (s) {
        var a = 0.3 + 0.7 * Math.abs(Math.sin(s.twinkle));
        ctx.fillStyle = "rgba(255,255,255," + a + ")";
        ctx.beginPath(); ctx.arc(s.x, s.y, s.size, 0, 6.28); ctx.fill();
    });
}

function drawBuildings() {
    var bw = 40;
    for (var bx = 0; bx < roadLeft - 5; bx += bw + 6) {
        var bh = 80 + Math.sin(bx * 0.1) * 60;
        var by = H * 0.38 - bh;
        ctx.fillStyle = "#111118"; ctx.fillRect(bx, by, bw, bh + H);
        for (var wy = by + 8; wy < H * 0.38; wy += 16) {
            for (var wx = bx + 5; wx < bx + bw - 5; wx += 11) {
                if (Math.sin(wx * wy * 0.01) > -0.2) {
                    ctx.fillStyle = winColor(wx, wy); ctx.fillRect(wx, wy, 5, 7);
                }
            }
        }
    }
    for (var bx = roadRight + 5; bx < W; bx += bw + 6) {
        var bh = 80 + Math.cos(bx * 0.1) * 60;
        var by = H * 0.38 - bh;
        ctx.fillStyle = "#111118"; ctx.fillRect(bx, by, bw, bh + H);
        for (var wy = by + 8; wy < H * 0.38; wy += 16) {
            for (var wx = bx + 5; wx < bx + bw - 5; wx += 11) {
                if (Math.sin(wx * wy * 0.01) > -0.2) {
                    ctx.fillStyle = winColor(wx, wy); ctx.fillRect(wx, wy, 5, 7);
                }
            }
        }
    }
}

function winColor(x, y) {
    var v = Math.sin(x * 13.37 + y * 7.77);
    if (v > 0.5) return "rgba(255,255,150,0.5)";
    if (v > 0) return "rgba(150,200,255,0.4)";
    if (v > -0.3) return "rgba(255,180,100,0.4)";
    return "rgba(100,100,100,0.15)";
}

function drawRoad() {
    ctx.fillStyle = "#1c1c1c";
    ctx.fillRect(roadLeft, H * 0.35, roadWidth, H * 0.65);
    ctx.fillStyle = "#ccaa00";
    ctx.fillRect(roadLeft - 2, H * 0.35, 3, H * 0.65);
    ctx.fillRect(roadRight, H * 0.35, 3, H * 0.65);

    ctx.fillStyle = "rgba(255,255,255,0.5)";
    for (var l = 1; l < LANE_COUNT; l++) {
        var lx = roadLeft + l * laneWidth;
        for (var my = -60 + markingOffset; my < H; my += 60) ctx.fillRect(lx - 1, my, 2, 28);
    }

    var lg = ctx.createRadialGradient(W / 2, H * 0.72, 5, W / 2, H * 0.5, H * 0.35);
    lg.addColorStop(0, "rgba(255,255,200,0.07)"); lg.addColorStop(1, "rgba(255,255,200,0)");
    ctx.fillStyle = lg; ctx.fillRect(roadLeft, H * 0.35, roadWidth, H * 0.65);
}


// ===== БИЛБОРДЫ — БОЛЬШИЕ, ЗАПОЛНЯЮТ БОКОВЫЕ ОБЛАСТИ =====

function drawBillboards() {
    billboards.forEach(function (b) {
        var alpha = 0.7 + 0.3 * Math.sin(b.flicker);

        // Ширина адаптируется к свободному месту
        var bw = b.side === "left" ? roadLeft - 15 : W - roadRight - 15;
        bw = Math.max(bw, 60); // минимум
        var bh = b.h;

        var bx = b.side === "left" ? 5 : roadRight + 8;

        ctx.save();
        ctx.translate(bx, b.y);

        // Стойка
        ctx.fillStyle = "#444";
        ctx.fillRect(bw / 2 - 3, bh, 6, 25);

        // Фон
        ctx.fillStyle = "#080810";
        rr(ctx, 0, 0, bw, bh, 5);

        // Рамка неон
        ctx.strokeStyle = b.glowColor;
        ctx.lineWidth = 2.5;
        ctx.shadowColor = b.glowColor;
        ctx.shadowBlur = 15 * alpha;
        ctx.strokeRect(1, 1, bw - 2, bh - 2);
        ctx.shadowBlur = 0;

        // ТЕКСТ
        ctx.fillStyle = b.glowColor;
        ctx.globalAlpha = alpha;

        // Адаптивный размер шрифта
        var fontSize = Math.max(8, Math.min(12, bw / 8));
        ctx.font = "bold " + fontSize + "px Courier New";
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";

        // Перенос
        var maxChars = Math.max(6, Math.floor(bw / (fontSize * 0.6)));
        var words = b.message.split(" ");
        var lines = [""], li = 0;
        words.forEach(function (w) {
            if ((lines[li] + " " + w).length > maxChars && lines[li].length > 0) {
                li++; lines[li] = w;
            } else {
                lines[li] = (lines[li] + " " + w).trim();
            }
        });

        var lineH = fontSize + 3;
        var startY = bh / 2 - ((lines.length - 1) * lineH) / 2;
        lines.forEach(function (line, idx) {
            ctx.fillText(line, bw / 2, startY + idx * lineH);
        });

        ctx.globalAlpha = 1;
        ctx.restore();
    });
}


// ===== ТРАФИК =====

function drawTraffic() {
    trafficCars.forEach(function (c) {
        ctx.save(); ctx.translate(c.x, c.y);

        ctx.fillStyle = "rgba(0,0,0,0.3)";
        ctx.beginPath(); ctx.ellipse(0, c.h / 2 + 3, c.w / 2 + 3, 6, 0, 0, 6.28); ctx.fill();

        if (c.style === "truck") {
            ctx.fillStyle = c.color; rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 4);
            ctx.fillStyle = shade(c.color, -30); rr(ctx, -c.w / 2 + 4, -c.h / 2 + 3, c.w - 8, c.h * 0.25, 3);
            ctx.fillStyle = shade(c.color, -50); rr(ctx, -c.w / 2 + 2, -c.h / 2 + c.h * 0.3, c.w - 4, c.h * 0.6, 2);
        } else if (c.style === "suv") {
            ctx.fillStyle = c.color; rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 6);
            ctx.fillStyle = shade(c.color, -25); rr(ctx, -c.w / 2 + 4, -c.h / 4, c.w - 8, c.h * 0.4, 4);
            ctx.fillStyle = "rgba(100,200,255,0.3)"; rr(ctx, -c.w / 2 + 6, -c.h / 4 + 2, c.w - 12, c.h * 0.12, 2);
        } else if (c.style === "sport") {
            ctx.fillStyle = c.color; rr(ctx, -c.w / 2, -c.h / 2 + 5, c.w, c.h - 10, 10);
            ctx.fillStyle = shade(c.color, -30); rr(ctx, -c.w / 2 + 6, -c.h / 6, c.w - 12, c.h * 0.22, 6);
        } else {
            ctx.fillStyle = c.color; rr(ctx, -c.w / 2, -c.h / 2, c.w, c.h, 6);
            ctx.fillStyle = "rgba(0,0,0,0.2)"; rr(ctx, -c.w / 2 + 5, -c.h / 4, c.w - 10, c.h / 3, 4);
        }

        ctx.fillStyle = "#ff3333"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 8;
        ctx.beginPath(); ctx.arc(-c.w / 2 + 5, -c.h / 2 + 5, 3, 0, 6.28); ctx.fill();
        ctx.beginPath(); ctx.arc(c.w / 2 - 5, -c.h / 2 + 5, 3, 0, 6.28); ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
    });
}


// ===== БОНУСЫ — КРУПНЫЕ =====

function drawBonuses() {
    var em = { coin: "🪙", star: "⭐", nitro: "⚡", heart: "❤️", kiss: "💋" };
    var cl = { coin: "#ffdd00", star: "#ffff00", nitro: "#ff00ff", heart: "#ff4466", kiss: "#ff69b4" };

    bonuses.forEach(function (b) {
        var by2 = Math.sin(b.bob) * 6;
        ctx.save(); ctx.translate(b.x, b.y + by2);

        // Свечение
        var glow = ctx.createRadialGradient(0, 0, 2, 0, 0, 24);
        glow.addColorStop(0, cl[b.type] + "55"); glow.addColorStop(1, "transparent");
        ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(0, 0, 24, 0, 6.28); ctx.fill();

        // Подложка
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.28); ctx.fill();

        // Обводка
        ctx.strokeStyle = cl[b.type]; ctx.lineWidth = 2;
        ctx.shadowColor = cl[b.type]; ctx.shadowBlur = 14;
        ctx.beginPath(); ctx.arc(0, 0, 17, 0, 6.28); ctx.stroke();
        ctx.shadowBlur = 0;

        // Эмоджи
        ctx.font = "28px serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle";
        ctx.fillText(em[b.type], 0, 1);
        ctx.restore();
    });
}


// ===== МАШИНА ИГРОКА =====

function drawPlayer() {
    if (playerInvincible && Math.sin(playerBlinkTimer * 15) > 0) return;
    var car = CARS[selectedCar];
    ctx.save(); ctx.translate(playerX, playerY);

    ctx.fillStyle = "rgba(0,0,0,0.4)";
    ctx.beginPath(); ctx.ellipse(0, 38, 27, 8, 0, 0, 6.28); ctx.fill();

    var bw = car.bodyW, bh = car.bodyH;

    if (car.style === "sport") {
        ctx.fillStyle = car.color;
        ctx.beginPath();
        ctx.moveTo(-bw / 2 + 5, bh / 2);
        ctx.lineTo(-bw / 2, bh / 2 - 15);
        ctx.lineTo(-bw / 2 + 3, -bh / 2 + 10);
        ctx.lineTo(0, -bh / 2);
        ctx.lineTo(bw / 2 - 3, -bh / 2 + 10);
        ctx.lineTo(bw / 2, bh / 2 - 15);
        ctx.lineTo(bw / 2 - 5, bh / 2);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = shade(car.color, -40); rr(ctx, -12, -8, 24, 18, 6);
        ctx.fillStyle = "rgba(80,200,255,0.5)"; rr(ctx, -10, -11, 20, 10, 4);
        ctx.fillStyle = shade(car.color, -60); ctx.fillRect(-bw / 2 + 2, bh / 2 - 5, bw - 4, 4);
    } else if (car.style === "sedan") {
        ctx.fillStyle = car.color; rr(ctx, -bw / 2, -bh / 2, bw, bh, 10);
        ctx.fillStyle = shade(car.color, -30); rr(ctx, -14, -5, 28, 22, 6);
        ctx.fillStyle = "rgba(100,200,255,0.45)"; rr(ctx, -12, -7, 24, 11, 4);
        ctx.fillStyle = shade(car.color, -15); ctx.fillRect(-bw / 4, -bh / 2 + 3, bw / 2, bh / 4);
    } else if (car.style === "pickup") {
        ctx.fillStyle = car.color; rr(ctx, -bw / 2, -bh / 2, bw, bh, 6);
        ctx.fillStyle = shade(car.color, -35); rr(ctx, -11, -14, 22, 16, 5);
        ctx.fillStyle = "rgba(100,200,255,0.4)"; rr(ctx, -9, -16, 18, 9, 3);
        ctx.fillStyle = shade(car.color, -50);
        var ky = 6;
        ctx.fillRect(-bw / 2 + 3, ky, bw - 6, bh / 2 - 8);
        ctx.strokeStyle = shade(car.color, -20); ctx.lineWidth = 1.5;
        ctx.strokeRect(-bw / 2 + 3, ky, bw - 6, bh / 2 - 8);
        ctx.fillStyle = "#888";
        ctx.fillRect(-bw / 2 + 3, ky, 2, bh / 2 - 8);
        ctx.fillRect(bw / 2 - 5, ky, 2, bh / 2 - 8);
    } else if (car.style === "suv") {
        ctx.fillStyle = car.color; rr(ctx, -bw / 2, -bh / 2, bw, bh, 7);
        ctx.fillStyle = shade(car.color, -25); rr(ctx, -17, -6, 34, 26, 5);
        ctx.fillStyle = "rgba(100,200,255,0.4)"; rr(ctx, -14, -8, 28, 14, 4);
        ctx.fillStyle = "#999"; ctx.fillRect(-17, -9, 34, 2);
        ctx.fillStyle = "#555"; rr(ctx, -bw / 2 + 5, -bh / 2 + 2, bw - 10, 5, 2);
        ctx.fillRect(-bw / 2 + 8, bh / 2 - 4, bw - 16, 3);
    }

    // Фары
    ctx.fillStyle = "#ffff88"; ctx.shadowColor = "#ffff00"; ctx.shadowBlur = 14;
    ctx.beginPath(); ctx.arc(-bw / 2 + 7, -bh / 2 + 7, 4, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(bw / 2 - 7, -bh / 2 + 7, 4, 0, 6.28); ctx.fill();
    ctx.shadowBlur = 0;

    // Задние фонари
    ctx.fillStyle = "#ff0000"; ctx.shadowColor = "#ff0000"; ctx.shadowBlur = 10;
    ctx.beginPath(); ctx.arc(-bw / 2 + 7, bh / 2 - 6, 3.5, 0, 6.28); ctx.fill();
    ctx.beginPath(); ctx.arc(bw / 2 - 7, bh / 2 - 6, 3.5, 0, 6.28); ctx.fill();
    ctx.shadowBlur = 0;

    // Нитро
    if (nitroActive) {
        for (var i = 0; i < 4; i++) {
            var fh = random(15, 35);
            ctx.fillStyle = "rgba(255," + randomInt(20, 150) + ",0," + random(0.5, 0.9) + ")";
            ctx.beginPath(); ctx.moveTo(-8 + i * 5, bh / 2);
            ctx.lineTo(-11 + i * 5, bh / 2 + fh);
            ctx.lineTo(-2 + i * 5, bh / 2 + fh);
            ctx.closePath(); ctx.fill();
        }
    }

    ctx.restore();
}

function drawWeather() {
    if (weather === "rain") {
        weatherParticles.forEach(function (p) {
            ctx.strokeStyle = "rgba(150,180,255," + p.alpha + ")";
            ctx.lineWidth = 1.5; ctx.beginPath();
            ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - 2, p.y + p.len); ctx.stroke();
        });
    } else if (weather === "snow") {
        weatherParticles.forEach(function (p) {
            ctx.fillStyle = "rgba(255,255,255," + p.alpha + ")";
            ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 6.28); ctx.fill();
        });
    }
}

function drawPopups() {
    popups.forEach(function (p) {
        ctx.save(); ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color; ctx.font = "bold 20px Courier New";
        ctx.textAlign = "center"; ctx.shadowColor = p.color; ctx.shadowBlur = 10;
        ctx.fillText(p.text, p.x, p.y); ctx.restore();
    });
}

function drawNotif() {
    if (!notification) return;
    var a = Math.min(1, notifTimer / 0.5);
    ctx.save(); ctx.globalAlpha = a;
    ctx.font = "bold 16px Courier New";
    var tw = ctx.measureText(notification.text).width + 50;
    tw = Math.max(tw, 200);
    ctx.fillStyle = "rgba(0,0,0,0.8)";
    rr(ctx, W / 2 - tw / 2, H * 0.38 - 22, tw, 44, 12);
    ctx.fillStyle = notification.color; ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.shadowColor = notification.color; ctx.shadowBlur = 12;
    ctx.fillText(notification.text, W / 2, H * 0.38);
    ctx.restore();
}


// ===== ХЕЛПЕРЫ =====

function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y); ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath(); ctx.fill();
}

function shade(c, n) {
    var num = parseInt(c.replace("#", ""), 16);
    var r = clamp(((num >> 16) & 255) + n, 0, 255);
    var g = clamp(((num >> 8) & 255) + n, 0, 255);
    var b = clamp((num & 255) + n, 0, 255);
    return "rgb(" + r + "," + g + "," + b + ")";
}
