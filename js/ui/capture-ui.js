/* ============ capture-ui.js — 独立宝可梦捕捉界面与动画 ============ */
G.CaptureUI = (() => {
  const L = (es, en, zh) => G.I18n?.lang === 'zh' ? zh : G.I18n?.lang === 'en' ? en : es;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  let overlay = null;

  function isOpen() { return !!overlay; }

  function ballSvg(b) {
    return `<svg viewBox="0 0 64 64" width="44" height="44" aria-hidden="true">
      <circle cx="32" cy="32" r="28" fill="#f8fafc" stroke="#1e293b" stroke-width="4"/>
      <path d="M4 32a28 28 0 0 1 56 0z" fill="${b.top}" stroke="#1e293b" stroke-width="4"/>
      <rect x="4" y="29" width="56" height="6" fill="#1e293b"/>
      <circle cx="32" cy="32" r="9" fill="#fff" stroke="#1e293b" stroke-width="4"/>
      <circle cx="32" cy="32" r="4" fill="${b.color}"/>
    </svg>`;
  }

  function open(fainted, onDone) {
    if (overlay) return;
    const mon = G.DEX_BY[fainted.dex];
    const save = G.DB.save;

    overlay = document.createElement('div');
    overlay.id = 'capture-overlay';
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9500;display:flex;align-items:center;justify-content:center;background:radial-gradient(circle at 50% 35%,rgba(56,189,248,.22),rgba(9,13,26,.92));backdrop-filter:blur(6px);padding:16px;';

    const card = document.createElement('div');
    card.style.cssText = 'width:min(460px,100%);background:linear-gradient(160deg,#162038,#0f172a);border:2px solid rgba(148,163,184,.35);border-radius:18px;padding:20px;color:#f1f5f9;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.6);';

    const title = document.createElement('h2');
    title.style.cssText = 'margin:0 0 6px;font-size:20px;';
    title.textContent = (fainted.shiny ? '★ ' : '') + G.T(mon.name) + (fainted.shiny ? ' (' + L('Shiny', 'Shiny', '闪光') + ')' : '');

    const sub = document.createElement('p');
    sub.style.cssText = 'margin:0 0 12px;font-size:13px;color:#94a3b8;';
    sub.textContent = L('Elige una Poké Ball (1 intento)', 'Choose a Poké Ball (1 attempt)', '选择宝可梦球进行捕捉（仅 1 次机会）');

    const stage = document.createElement('div');
    stage.style.cssText = 'position:relative;height:170px;display:flex;align-items:center;justify-content:center;overflow:hidden;border-radius:12px;background:radial-gradient(circle at 50% 70%,rgba(255,255,255,.08),transparent 65%);margin-bottom:14px;';
    const sprite = G.UI.spriteCanvas(fainted.dex, 140, 140, { lively: true, scale: 3, shiny: fainted.shiny });
    sprite.style.transition = 'transform .35s ease, opacity .35s ease, filter .35s ease';
    stage.appendChild(sprite);

    const status = document.createElement('div');
    status.style.cssText = 'min-height:24px;font-size:14px;font-weight:600;margin-bottom:12px;color:#fde68a;';

    const ballsRow = document.createElement('div');
    ballsRow.style.cssText = 'display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-bottom:14px;';

    const closeBtn = document.createElement('button');
    closeBtn.className = 'btn ghost';
    closeBtn.textContent = L('Dejar escapar', 'Let it go', '放弃捕捉');
    const finish = () => {
      if (!overlay) return;
      overlay.remove();
      overlay = null;
      if (onDone) onDone();
    };
    closeBtn.onclick = finish;

    let busy = false;
    for (const b of G.Capture.BALLS) {
      const count = save.pokeballs?.[b.id] || 0;
      const pct = Math.round(G.Capture.catchChance(b.id, fainted) * 100);
      const btn = document.createElement('button');
      btn.className = 'btn';
      btn.style.cssText = 'display:flex;flex-direction:column;align-items:center;gap:4px;padding:10px 6px;';
      btn.disabled = count <= 0;
      btn.innerHTML = ballSvg(b) + `<b>${L(b.name.es, b.name.en, b.name.zh)}</b><small>×${count} · ${pct}%</small>`;
      btn.onclick = async () => {
        if (busy) return;
        const res = G.Capture.attempt(b.id, fainted, save);
        if (!res) return;
        busy = true;
        ballsRow.querySelectorAll('button').forEach(x => { x.disabled = true; });
        closeBtn.disabled = true;

        // 1. Throw arc
        const proj = document.createElement('div');
        proj.innerHTML = ballSvg(b);
        proj.style.cssText = 'position:absolute;bottom:-10px;left:50%;transform:translateX(-50%) scale(.8);transition:all .4s cubic-bezier(.2,.8,.3,1);';
        stage.appendChild(proj);
        status.textContent = L('¡Poké Ball lanzada!', 'Poké Ball thrown!', '投出了宝可梦球！');
        G.Audio?.sfx?.('dash');
        await wait(30);
        proj.style.bottom = '62px';
        proj.style.transform = 'translateX(-50%) scale(1.15) rotate(360deg)';
        await wait(400);

        // 2. Absorb flash
        sprite.style.filter = 'brightness(3)';
        sprite.style.transform = 'scale(0.1)';
        sprite.style.opacity = '0';
        G.Audio?.sfx?.('hit');
        await wait(320);

        // 3. Wobble shakes
        for (let s = 0; s < res.shakes; s++) {
          status.textContent = '.'.repeat(s + 1);
          proj.style.transform = `translateX(-50%) scale(1.1) rotate(${s % 2 === 0 ? -18 : 18}deg)`;
          G.Audio?.sfx?.('tick');
          await wait(320);
          proj.style.transform = 'translateX(-50%) scale(1.1) rotate(0deg)';
          await wait(240);
        }

        // 4. Outcome
        if (res.caught) {
          proj.style.filter = 'drop-shadow(0 0 14px #ffd700)';
          G.Audio?.sfx?.(fainted.shiny ? 'shinyGet' : 'legend');
          status.style.color = '#86efac';
          status.textContent = L(
            `¡${mon.name} capturado! Familia desbloqueada.`,
            `Caught ${mon.name}! Family unlocked.`,
            `成功捕捉 ${G.T(mon.name)}！已永久解锁该家族。`
          );
          G.Progress?.checkAch?.();
          await wait(1100);
        } else {
          proj.remove();
          sprite.style.filter = '';
          sprite.style.transform = 'scale(1)';
          sprite.style.opacity = '1';
          G.Audio?.sfx?.('error');
          status.style.color = '#fca5a5';
          status.textContent = L(`¡${mon.name} se ha escapado!`, `${mon.name} broke free!`, `${G.T(mon.name)} 挣脱并逃走了！`);
          await wait(950);
        }
        finish();
      };
      ballsRow.appendChild(btn);
    }

    card.append(title, sub, stage, status, ballsRow, closeBtn);
    overlay.appendChild(card);
    document.body.appendChild(overlay);
  }

  return { open, isOpen };
})();
