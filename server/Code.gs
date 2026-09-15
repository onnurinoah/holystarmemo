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
var MAX_PRAYER  = 400;
var MAX_SENDER  = 30;

/* ── 시트 준비 ───────────────────────────── */
function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['id', 'ts', 'name', 'prayer', 'sender', 'deleted']);
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
    if (rows[i][5] === true || rows[i][5] === 'TRUE') continue;
    if (!rows[i][0]) continue;
    items.push({
      id:     String(rows[i][0]),
      ts:     Number(rows[i][1]) || 0,
      name:   String(rows[i][2] || ''),
      prayer: String(rows[i][3] || ''),
      sender: String(rows[i][4] || '')
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

    if (action === 'add') {
      var name   = String(body.name   || '').trim().slice(0, MAX_NAME);
      var prayer = String(body.prayer || '').trim().slice(0, MAX_PRAYER);
      var sender = String(body.sender || '').trim().slice(0, MAX_SENDER);
      if (!name)   return json_({ ok: false, error: '이름이 비어 있습니다.' });
      if (!prayer) return json_({ ok: false, error: '기도제목이 비어 있습니다.' });

      var sh = sheet_();
      if (sh.getLastRow() > MAX_ROWS) return json_({ ok: false, error: '접수가 가득 찼습니다.' });

      var id = 'i' + Date.now() + '-' + Math.floor(Math.random() * 10000);
      sh.appendRow([id, Date.now(), name, prayer, sender, false]);
      return json_({ ok: true, id: id });
    }

    if (action === 'delete') {
      var target = String(body.id || '');
      if (!target) return json_({ ok: false, error: 'id 가 없습니다.' });
      var sh2 = sheet_();
      var rows = sh2.getDataRange().getValues();
      for (var i = 1; i < rows.length; i++) {
        if (String(rows[i][0]) === target) {
          sh2.getRange(i + 1, 6).setValue(true);   // 지우지 않고 표시만 (기록 보존)
          return json_({ ok: true });
        }
      }
      return json_({ ok: false, error: '해당 초대를 찾을 수 없습니다.' });
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
