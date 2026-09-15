/**
 * WELCOME HOME 전도집회 — 초대장 접수 서버
 *
 * Google 스프레드시트에 붙여 쓰는 Apps Script 백엔드입니다.
 * 여러 사람이 각자 휴대폰으로 제출해도 한 시트에 쌓이고,
 * 전광판 페이지는 4초마다 이 주소를 읽어 화면을 갱신합니다.
 *
 * 설치 방법은 저장소 README.md 를 보세요.
 */

var SHEET_NAME  = 'invites';
var CONFIG_NAME = 'config';
var MAX_ROWS    = 2000;   // 안전장치
var MAX_NAME    = 40;
var MAX_REL     = 30;
var MAX_PRAYER  = 200;
var MAX_SENDER  = 30;

/* ── 시트 준비 ───────────────────────────── */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'ts', 'name', 'relation', 'prayer', 'sender', 'deleted']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function configSheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(CONFIG_NAME);
  if (!sh) {
    sh = ss.insertSheet(CONFIG_NAME);
    sh.appendRow(['key', 'value']);
    sh.appendRow(['goal', 30]);
    sh.appendRow(['shareUrl', '']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function readConfig_() {
  var rows = configSheet_().getDataRange().getValues();
  var out = { goal: 30, shareUrl: '' };
  for (var i = 1; i < rows.length; i++) {
    var k = String(rows[i][0]).trim();
    if (k === 'goal') {
      var g = parseInt(rows[i][1], 10);
      if (g >= 1 && g <= 200) out.goal = g;
    } else if (k === 'shareUrl') {
      out.shareUrl = String(rows[i][1] || '').trim();
    }
  }
  return out;
}

function writeConfig_(patch) {
  var sh = configSheet_();
  var rows = sh.getDataRange().getValues();
  Object.keys(patch).forEach(function (key) {
    for (var i = 1; i < rows.length; i++) {
      if (String(rows[i][0]).trim() === key) {
        sh.getRange(i + 1, 2).setValue(patch[key]);
        return;
      }
    }
    sh.appendRow([key, patch[key]]);
  });
}

/* ── 응답 ────────────────────────────────── */
function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function listAll_() {
  var rows = sheet_().getDataRange().getValues();
  var items = [];
  for (var i = 1; i < rows.length; i++) {
    if (rows[i][6] === true || rows[i][6] === 'TRUE') continue;
    if (!rows[i][0]) continue;
    items.push({
      id:       String(rows[i][0]),
      ts:       Number(rows[i][1]) || 0,
      name:     String(rows[i][2] || ''),
      relation: String(rows[i][3] || ''),
      prayer:   String(rows[i][4] || ''),
      sender:   String(rows[i][5] || '')
    });
  }
  items.sort(function (a, b) { return a.ts - b.ts; });
  var cfg = readConfig_();
  return { ok: true, items: items, goal: cfg.goal, shareUrl: cfg.shareUrl };
}

/* ── GET: 현황 읽기 ───────────────────────── */
function doGet(e) {
  try {
    return json_(listAll_());
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

/* ── POST: 접수 / 취소 / 설정 ──────────────── */
function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);
    var action = body.action || 'add';

    /* 한 번에 여러 명을 받습니다. 두 명이면 두 줄, 세 명이면 세 줄이 쌓입니다. */
    if (action === 'add' || action === 'addMany') {
      var items = body.items;
      if (!items || !items.length) items = [{ name: body.name, relation: body.relation, prayer: body.prayer }];

      var sender = String(body.sender || '').trim().slice(0, MAX_SENDER);
      var now = Date.now();
      var rows = [], ids = [];

      for (var k = 0; k < items.length; k++) {
        var nm  = String((items[k] && items[k].name)     || '').trim().slice(0, MAX_NAME);
        var rel = String((items[k] && items[k].relation) || '').trim().slice(0, MAX_REL);
        var pry = String((items[k] && items[k].prayer)   || '').trim().slice(0, MAX_PRAYER);
        if (!nm) continue;
        var id = 'i' + now + '-' + k + '-' + Math.floor(Math.random() * 10000);
        ids.push(id);
        rows.push([id, now + k, nm, rel, pry, sender, false]);
      }

      if (!rows.length) return json_({ ok: false, error: '이름이 비어 있습니다.' });

      var sh = sheet_();
      if (sh.getLastRow() + rows.length > MAX_ROWS)
        return json_({ ok: false, error: '접수가 가득 찼습니다.' });

      // 한 번의 setValues 로 여러 줄을 통째로 붙입니다.
      sh.getRange(sh.getLastRow() + 1, 1, rows.length, 7).setValues(rows);
      return json_({ ok: true, ids: ids });
    }

    if (action === 'delete') {
      var targets = body.ids && body.ids.length ? body.ids : (body.id ? [body.id] : []);
      if (!targets.length) return json_({ ok: false, error: 'id 가 없습니다.' });

      var sh2 = sheet_();
      var all = sh2.getDataRange().getValues();
      var hit = 0;
      for (var r = 1; r < all.length; r++) {
        if (targets.indexOf(String(all[r][0])) >= 0) {
          sh2.getRange(r + 1, 7).setValue(true);   // 지우지 않고 표시만 (기록 보존)
          hit++;
        }
      }
      if (!hit) return json_({ ok: false, error: '해당 초대를 찾을 수 없습니다.' });
      return json_({ ok: true, removed: hit });
    }

    if (action === 'config') {
      var patch = {};
      if (body.goal) {
        var g = parseInt(body.goal, 10);
        if (g >= 1 && g <= 200) patch.goal = g;
      }
      if (typeof body.shareUrl === 'string') patch.shareUrl = body.shareUrl.trim();
      writeConfig_(patch);
      return json_({ ok: true });
    }

    return json_({ ok: false, error: '알 수 없는 요청입니다.' });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}
