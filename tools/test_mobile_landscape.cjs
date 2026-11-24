'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { context } = require('./battle_fixture.cjs');

test('touch controls adapt compactly in mobile landscape (h <= 500 && w >= h)', () => {
  const s = context('zh', false);
  s.document.body = { appendChild() {}, classList: { add() {}, remove() {}, contains() { return true; } } };
  s.document.createElement = () => ({ style: {}, remove() {}, getContext() { return fakeCtx; } });
  s.getComputedStyle = () => ({ paddingTop: '0', paddingRight: '0', paddingBottom: '0', paddingLeft: '0' });
  s.load('js/core/settings.js');
  s.load('js/core/touch.js');
  const G = s.G;

  // Normal landscape desktop or large tablet (1280 x 720)
  const norm = G.Touch.controls(1280, 720);
  assert.ok(norm.aim.r >= 50, 'desktop stick radius');
  assert.equal(norm.size, 44, 'desktop move button size');

  // Mobile landscape: iPhone 13/14 (844 x 390)
  const phone = G.Touch.controls(844, 390);
  assert.ok(phone.aim.r <= 42, `phone stick radius should be <= 42, got ${phone.aim.r}`);
  assert.equal(phone.size, 38, 'phone move button size should be 38');
  assert.ok(phone.moves.length === 4, 'four move buttons');
  
  // Verify 2x2 grid vertical span is compact (under 95px)
  const minY = Math.min(...phone.moves.map(m => m.y));
  const maxY = Math.max(...phone.moves.map(m => m.y + m.h));
  const spanY = maxY - minY;
  assert.ok(spanY <= 95, `moves vertical span in mobile landscape should be <= 95, got ${spanY}`);

  // Moves should be to the left of aim stick
  for (const m of phone.moves) {
    assert.ok(m.x + m.w < phone.aim.x, 'move button must not overlap aim stick');
  }

  // Mobile landscape: compact android (740 x 360)
  const phoneSm = G.Touch.controls(740, 360);
  assert.ok(phoneSm.aim.r <= 42, `compact phone stick radius <= 42, got ${phoneSm.aim.r}`);
  assert.equal(phoneSm.size, 38, 'compact phone move button size 38');
});

test('css rules contain mobile landscape and compact height media queries', () => {
  const styleCss = fs.readFileSync('css/style.css', 'utf8');
  const expCss = fs.readFileSync('css/expedition.css', 'utf8');
  const talentsCss = fs.readFileSync('css/trainer-talents.css', 'utf8');

  // style.css
  assert.ok(styleCss.includes('@media (max-height: 520px)'), 'style.css has max-height: 520px query');
  assert.ok(styleCss.includes('.bag-open'), 'style.css styles bag-open in compact query');
  assert.ok(styleCss.includes('.cards'), 'style.css styles cards grid in compact query');

  // expedition.css
  assert.ok(expCss.includes('@media(max-height:520px)'), 'expedition.css has max-height: 520px query');
  assert.ok(expCss.includes('.squad-open'), 'expedition.css styles squad-open in compact query');
  assert.ok(expCss.includes('.route-dashboard'), 'expedition.css styles route-dashboard in compact query');
  assert.ok(expCss.includes('.squad-formation-surface'), 'expedition.css styles squad-formation-surface in compact query');
  assert.ok(expCss.includes('#journey-status'), 'expedition.css styles journey-status in compact query');
  assert.ok(expCss.includes('.squad-detail'), 'expedition.css styles squad-detail in compact query');
  assert.ok(expCss.includes('.squad-box .expedition-progress'), 'expedition.css hides bulky expedition-progress in squad-box');
  assert.ok(expCss.includes('.squad-battle-grid'), 'expedition.css styles compact squad-battle-grid in compact query');
  assert.ok(expCss.includes('.squad-warehouse-strip'), 'expedition.css styles compact squad-warehouse-strip in compact query');

  // trainer-talents.css
  assert.ok(talentsCss.includes('@media(max-height:520px)'), 'trainer-talents.css has max-height: 520px query');
  assert.ok(talentsCss.includes('.talent-cards'), 'trainer-talents.css styles talent-cards in compact query');
});

test('hud rendering handles mobile landscape compact dimensions without errors', () => {
  const s = context('zh', false);
  s.document.body = { appendChild() {}, classList: { add() {}, remove() {}, contains() { return true; } } };
  s.document.createElement = () => ({ style: {}, remove() {}, getContext() { return fakeCtx; } });
  s.getComputedStyle = () => ({ paddingTop: '0', paddingRight: '0', paddingBottom: '0', paddingLeft: '0' });
  s.load('js/core/settings.js');
  s.load('js/core/touch.js');
  s.load('js/ui/icons.js');
  s.load('js/ui/hud.js');
  const G = s.G;
  G.World = { biomeName: () => 'Playa' };
  G.EnemyMgr = { all: () => [], shinies: () => [] };
  G.Camera = { left: () => 0, top: () => 0, scale: 1 };
  G.Events = { drawHud() {} };
  G.Spawner = { banner: () => null };
  G.Rift = {};

  const calls = [];
  const fakeCtx = {
    save() {}, restore() {},
    fillRect(x, y, w, h) { calls.push({ op: 'fillRect', x, y, w, h }); },
    strokeRect() {},
    drawImage() {},
    fillText(txt, x, y) { calls.push({ op: 'fillText', txt, x, y }); },
    strokeText() {},
    measureText(txt) { return { width: (txt || '').length * 7 }; },
    beginPath() {}, closePath() {}, arc() {}, arcTo() {}, fill() {}, stroke() {},
    moveTo() {}, lineTo() {}, clip() {},
    createLinearGradient() { return { addColorStop() {} }; },
    set fillStyle(_) {}, set strokeStyle(_) {}, set lineWidth(_) {},
    set font(_) {}, set textAlign(_) {}, set textBaseline(_) {},
    set globalAlpha(_) {}
  };

  const pl = s.player(25);
  pl.level = 10;
  pl.hp = 80;
  pl.maxHp = 100;
  pl.kills = 45;
  pl.coins = 120;
  pl.slots = [];
  const st = { time: 300, difficulty: 3 };

  // Call draw in landscape dimensions (844 x 390)
  assert.doesNotThrow(() => {
    G.HUD.draw(fakeCtx, 844, 390, pl, st);
  });

  // Verify time text is rendered compactly near the top (y <= 32)
  const timeCall = calls.find(c => c.op === 'fillText' && c.txt === '5:00');
  assert.ok(timeCall, 'time should be rendered');
  assert.ok(timeCall.y <= 32, `time y should be <= 32 in compact mode, got ${timeCall.y}`);
});
