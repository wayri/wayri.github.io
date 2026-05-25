document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('year').textContent = new Date().getFullYear();
    
    // THEME LOGIC
    const savedTheme = localStorage.getItem('theme');
    const label = document.getElementById('theme-label');
    
    if (savedTheme === 'light') {
        document.documentElement.removeAttribute('data-theme');
        if(label) label.textContent = "Light";
    } else {
        document.documentElement.setAttribute('data-theme', 'dark');
        if(label) label.textContent = "Dark";
    }

    // STEAMPUNK ANOMALOUS WIDGET (if present)
    if(document.getElementById('steampunk-clock-text')) {
        initSteampunkWidget();
    }
});

function toggleTheme() {
    const body = document.documentElement;
    const currentTheme = body.getAttribute('data-theme');
    const label = document.getElementById('theme-label');
    
    if (currentTheme === 'dark') {
        body.removeAttribute('data-theme');
        localStorage.setItem('theme', 'light');
        if(label) label.textContent = "Light";
    } else {
        body.setAttribute('data-theme', 'dark');
        localStorage.setItem('theme', 'dark');
        if(label) label.textContent = "Dark";
    }

    // Dispatch custom event for tools that need to redraw canvas
    window.dispatchEvent(new Event('themeChanged'));
}

function toggleMobileMenu() {
    const menu = document.getElementById('mobile-menu');
    const icon = document.getElementById('menu-icon');
    
    if (menu.classList.contains('hidden')) {
        menu.classList.remove('hidden');
        icon.classList.remove('fa-bars');
        icon.classList.add('fa-xmark');
    } else {
        menu.classList.add('hidden');
        icon.classList.remove('fa-xmark');
        icon.classList.add('fa-bars');
    }
}

// Steampunk Logic extracted
let steamAnimId;
let clockEl = null;
let steamCanvas = null;
let steamCtx = null;
let glitchCounter = 0;
let timeOffset = 0;

function initSteampunkWidget() {
    clockEl = document.getElementById('steampunk-clock-text');
    steamCanvas = document.getElementById('steampunk-canvas');
    if(!steamCanvas) return;
    steamCtx = steamCanvas.getContext('2d');
    requestAnimationFrame(drawSteampunkScope);
    setInterval(updateSteampunkClock, 1000);
    updateSteampunkClock();
}

function updateSteampunkClock() {
    if(!clockEl) clockEl = document.getElementById('steampunk-clock-text');
    if(!clockEl || glitchCounter > 0) return;
    const d = new Date();
    clockEl.textContent = d.getHours().toString().padStart(2, '0') + ":" + 
                          d.getMinutes().toString().padStart(2, '0') + ":" + 
                          d.getSeconds().toString().padStart(2, '0');
}

function triggerAnomaly() {
    if(glitchCounter > 0) return;
    glitchCounter = 25; 
    
    const y = document.getElementById('hero-y');
    const a1 = document.getElementById('hero-a1');
    const w = document.getElementById('hero-w');
    const a2 = document.getElementById('hero-a2');
    const r = document.getElementById('hero-r');
    const dot = document.getElementById('hero-dot');
    if(!y || !a1 || !w || !a2 || !r || !dot) return;
    
    w.style.transform = 'translateX(-1.35em)';
    a2.style.transform = 'translateX(-1.45em)';
    y.style.transform = 'translateX(1.4em)';
    r.style.transform = 'translateX(-0.6em)';
    
    a1.style.transform = 'translateX(2.6em)';
    
    setTimeout(() => {
        a1.innerText = 'I';
        dot.style.transform = 'scale(0)';
        dot.style.opacity = '0';
    }, 250);
    
    setTimeout(() => {
        a1.style.transform = 'translateX(2.6em) scaleY(0.2) translateY(12px)';
        a1.style.opacity = '0';
        
        setTimeout(() => {
            dot.style.transform = 'scale(1)';
            dot.style.opacity = '1';
            
            a1.innerText = 'A';
            a1.style.opacity = '1';
            a1.style.transform = 'translateX(0) scaleY(1) translateY(0)';
            
            y.style.transform = 'translateX(0)';
            w.style.transform = 'translateX(0)';
            a2.style.transform = 'translateX(0)';
            r.style.transform = 'translateX(0)';
        }, 200);
    }, 3000);
}

function drawSteampunkScope() {
    if(!steamCanvas || !steamCanvas.offsetParent) {
        steamAnimId = requestAnimationFrame(drawSteampunkScope);
        return;
    }
    if (steamCanvas.width !== steamCanvas.clientWidth) steamCanvas.width = steamCanvas.clientWidth;
    if (steamCanvas.height !== steamCanvas.clientHeight) steamCanvas.height = steamCanvas.clientHeight;
    
    const w = steamCanvas.width;
    const h = steamCanvas.height;

    steamCtx.fillStyle = 'rgba(5, 5, 5, 0.3)';
    steamCtx.fillRect(0, 0, w, h);

    steamCtx.strokeStyle = 'rgba(212, 175, 55, 0.15)';
    steamCtx.lineWidth = 1;
    steamCtx.beginPath();
    steamCtx.moveTo(0, h/2); steamCtx.lineTo(w, h/2);
    for(let i=0; i<w; i+=w/5) { steamCtx.moveTo(i, 0); steamCtx.lineTo(i, h); }
    steamCtx.stroke();

    steamCtx.strokeStyle = '#ffb703';
    steamCtx.lineWidth = glitchCounter > 0 ? 3 : 1.5;
    steamCtx.shadowBlur = glitchCounter > 0 ? 15 : 5;
    steamCtx.shadowColor = '#ff8c00';
    steamCtx.beginPath();

    timeOffset += 0.08;
    let cy = h / 2;

    for(let x = 0; x < w; x++) {
        let y = cy + Math.sin(x * 0.05 + timeOffset) * 10;
        y += (Math.random() - 0.5) * 4;
        if (glitchCounter > 0 && Math.abs(x - w/2) < 20) {
            y += (Math.random() - 0.5) * h * 0.8; 
        }

        if (x === 0) steamCtx.moveTo(x, y);
        else steamCtx.lineTo(x, y);
    }
    steamCtx.stroke();
    steamCtx.shadowBlur = 0;

    if (glitchCounter > 0 && clockEl) {
        let dx = (Math.random() - 0.5) * 8;
        let dy = (Math.random() - 0.5) * 8;
        clockEl.style.transform = `translate(${dx}px, ${dy}px) skewX(${dx*2}deg)`;
        clockEl.style.color = Math.random() > 0.5 ? '#ff3333' : '#fff';
        clockEl.style.textShadow = `${dx}px 0 0 red, ${-dx}px 0 0 blue`;
        glitchCounter--;
        if(glitchCounter === 0) {
            clockEl.style.transform = 'none';
            clockEl.style.color = '#ffb703';
            clockEl.style.textShadow = '0 0 5px #ff8c00';
            updateSteampunkClock();
        }
    }
    steamAnimId = requestAnimationFrame(drawSteampunkScope);
}
