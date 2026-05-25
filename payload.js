// Rocket Pong Engine
const canvas = document.getElementById('pong-canvas');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const p1RocketsEl = document.getElementById('p1-rockets');
const p2RocketsEl = document.getElementById('p2-rockets');
const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

let w = canvas.width, h = canvas.height;
let isPaused = false;
let isMuted = false;
let winScore = 10;
let gameOver = false;

// Entities
const paddle = { w: 10, h: 60, speed: 6 };
const ball = { x: w/2, y: h/2, r: 5, vx: 5, vy: 5, speed: 5 };
const p1 = { y: h/2 - paddle.h/2, score: 0, rockets: 6, lastRocket: 0, badges: [], effectTimer: 0, effect: 'none' };
const p2 = { y: h/2 - paddle.h/2, score: 0, rockets: 6, lastRocket: 0, badges: [], effectTimer: 0, effect: 'none' };
let rockets = []; 

const keys = {};
window.addEventListener('keydown', e => {
    keys[e.key.toLowerCase()] = true;
    if(e.key.toLowerCase() === 'p') togglePause();
    if(e.key === ' ') resetGame();
});
window.addEventListener('keyup', e => keys[e.key.toLowerCase()] = false);

function playTone(freq, type, duration) {
    if(isMuted) return;
    try {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = type;
        osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
        gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + duration);
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.start();
        osc.stop(audioCtx.currentTime + duration);
    } catch(e) {}
}

function initRockets(player) {
    player.badges = [];
    for(let i=0; i<6; i++) {
        player.badges.push(Math.random() > 0.5 ? 'tracking' : 'normal');
    }
    updateRocketsUI();
}

function updateRocketsUI() {
    p1RocketsEl.innerHTML = p1.badges.map(b => '<span class="pong-badge ' + b + '"></span>').join('');
    p2RocketsEl.innerHTML = p2.badges.map(b => '<span class="pong-badge ' + b + '"></span>').join('');
}

function fireRocket(ownerStr) {
    const now = Date.now();
    const owner = ownerStr === 'p1' ? p1 : p2;
    if(owner.badges.length === 0 || now - owner.lastRocket < 1000) return; 
    
    owner.lastRocket = now;
    const type = owner.badges.shift();
    updateRocketsUI();
    
    const x = ownerStr === 'p1' ? 30 : w - 30;
    const y = owner.y + paddle.h/2;
    const vx = ownerStr === 'p1' ? 7 : -7;
    
    rockets.push({ x, y, vx, vy: 0, type, owner: ownerStr, active: true });
    playTone(150, 'sawtooth', 0.2);
}

function resetGame() {
    const ws = document.getElementById('win-score');
    if(ws) winScore = parseInt(ws.value) || 10;
    p1.score = 0; p2.score = 0;
    p1.y = h/2 - paddle.h/2; p2.y = h/2 - paddle.h/2;
    p1.effect = 'none'; p1.effectTimer = 0;
    p2.effect = 'none'; p2.effectTimer = 0;
    gameOver = false;
    isPaused = false;
    rockets = [];
    initRockets(p1); initRockets(p2);
    resetBall();
    updateScore();
}

function resetBall() {
    ball.x = w/2; ball.y = h/2;
    ball.vx = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
    ball.vy = (Math.random() > 0.5 ? 1 : -1) * ball.speed;
}

function togglePause() { isPaused = !isPaused; }
function toggleMute() { 
    isMuted = !isMuted; 
    const mb = document.getElementById('mute-btn');
    if(mb) mb.textContent = isMuted ? 'UNMUTE' : 'MUTE';
}

function updateScore() {
    scoreEl.textContent = p1.score + ' : ' + p2.score;
    if(p1.score >= winScore || p2.score >= winScore) {
        gameOver = true;
    }
}

function applyEffect(player, type) {
    if (type === 'tracking') {
        player.effect = 'freeze';
        player.effectTimer = 120; // 2 seconds at 60fps
        playTone(50, 'sawtooth', 1.0);
    } else {
        player.effect = 'slow';
        player.effectTimer = 180; // 3 seconds at 60fps
        playTone(80, 'square', 0.5);
    }
}

function update() {
    if(isPaused || gameOver) return;

    if (p1.effectTimer > 0) p1.effectTimer--;
    else p1.effect = 'none';
    if (p2.effectTimer > 0) p2.effectTimer--;
    else p2.effect = 'none';

    let p1Speed = p1.effect === 'freeze' ? 0 : (p1.effect === 'slow' ? paddle.speed * 0.4 : paddle.speed);
    let p2Speed = p2.effect === 'freeze' ? 0 : (p2.effect === 'slow' ? paddle.speed * 0.4 : paddle.speed);

    if(keys['w']) p1.y = Math.max(0, p1.y - p1Speed);
    if(keys['s']) p1.y = Math.min(h - paddle.h, p1.y + p1Speed);
    if(keys['arrowup']) p2.y = Math.max(0, p2.y - p2Speed);
    if(keys['arrowdown']) p2.y = Math.min(h - paddle.h, p2.y + p2Speed);
    
    if(keys['d']) { fireRocket('p1'); keys['d'] = false; }
    if(keys['arrowleft']) { fireRocket('p2'); keys['arrowleft'] = false; }

    ball.x += ball.vx;
    ball.y += ball.vy;

    if(ball.y - ball.r < 0 || ball.y + ball.r > h) {
        ball.vy *= -1;
        playTone(400, 'square', 0.1);
    }

    if(ball.x < 0) { p2.score++; playTone(200, 'sine', 0.5); resetBall(); updateScore(); }
    if(ball.x > w) { p1.score++; playTone(200, 'sine', 0.5); resetBall(); updateScore(); }

    if(ball.vx < 0 && ball.x - ball.r < 20 && ball.y > p1.y && ball.y < p1.y + paddle.h) {
        ball.vx *= -1.1;
        ball.vy = (ball.y - (p1.y + paddle.h/2)) * 0.2;
        playTone(600, 'square', 0.1);
    }
    if(ball.vx > 0 && ball.x + ball.r > w - 20 && ball.y > p2.y && ball.y < p2.y + paddle.h) {
        ball.vx *= -1.1;
        ball.vy = (ball.y - (p2.y + paddle.h/2)) * 0.2;
        playTone(600, 'square', 0.1);
    }

    for(let i=rockets.length-1; i>=0; i--) {
        let r = rockets[i];
        if(!r.active) continue;
        
        r.x += r.vx;
        r.y += r.vy;

        if(r.type === 'tracking') {
            const target = r.owner === 'p1' ? p2 : p1;
            const targetY = target.y + paddle.h/2;
            if(r.y < targetY - 10) r.vy += 0.2;
            else if(r.y > targetY + 10) r.vy -= 0.2;
            r.vy *= 0.95;
        }

        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ball.r+5, 0, Math.PI*2);
        if(ctx.isPointInPath(r.x, r.y)) {
            ball.vx = r.vx * 1.5;
            ball.vy = (Math.random() > 0.5 ? 5 : -5);
            playTone(800, 'triangle', 0.3);
            r.active = false;
        }

        if(r.owner === 'p1' && r.x > w - 20 && r.y > p2.y && r.y < p2.y + paddle.h) {
            applyEffect(p2, r.type);
            r.active = false;
        }
        else if(r.owner === 'p2' && r.x < 20 && r.y > p1.y && r.y < p1.y + paddle.h) {
            applyEffect(p1, r.type);
            r.active = false;
        }

        if(r.x < 0 || r.x > w) r.active = false;
    }
}

function draw() {
    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--bg-color').trim() || '#0a0a0a';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#D4AF37';
    ctx.setLineDash([10, 15]);
    ctx.beginPath(); ctx.moveTo(w/2, 0); ctx.lineTo(w/2, h); ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = p1.effect === 'freeze' ? '#00e5ff' : (p1.effect === 'slow' ? '#ffaa00' : '#D4AF37');
    if (p1.effect !== 'none' && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillRect(10, p1.y, paddle.w, paddle.h);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = p2.effect === 'freeze' ? '#00e5ff' : (p2.effect === 'slow' ? '#ffaa00' : '#D4AF37');
    if (p2.effect !== 'none' && Math.floor(Date.now() / 100) % 2 === 0) ctx.globalAlpha = 0.5;
    ctx.fillRect(w - 20, p2.y, paddle.w, paddle.h);
    ctx.globalAlpha = 1.0;

    ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#D4AF37';
    ctx.beginPath();
    ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI*2);
    ctx.fill();

    for(let r of rockets) {
        if(!r.active) continue;
        ctx.fillStyle = r.type === 'tracking' ? '#ff3333' : '#ff8c00';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 10;
        ctx.beginPath();
        ctx.arc(r.x, r.y, 4, 0, Math.PI*2);
        ctx.fill();
        ctx.shadowBlur = 0;
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.arc(r.x - r.vx*1.5, r.y - r.vy*1.5, 2, 0, Math.PI*2);
        ctx.fill();
    }

    if(gameOver) {
        ctx.fillStyle = 'rgba(0,0,0,0.7)';
        ctx.fillRect(0,0,w,h);
        ctx.fillStyle = getComputedStyle(document.documentElement).getPropertyValue('--accent-color').trim() || '#D4AF37';
        ctx.font = '30px "JetBrains Mono"';
        ctx.textAlign = 'center';
        const winner = p1.score >= winScore ? 'PLAYER 1' : 'PLAYER 2';
        ctx.fillText(winner + ' WINS THE SIMULATION', w/2, h/2 - 20);
        ctx.font = '14px "JetBrains Mono"';
        ctx.fillText('Press SPACE to restart', w/2, h/2 + 20);
    }
}

function loop() {
    update();
    draw();
    requestAnimationFrame(loop);
}

window.resetGame = resetGame;
window.togglePause = togglePause;
window.toggleMute = toggleMute;

resetGame();
loop();