/**
 * 기도로 짓는 집 — 기도 시간 누적 서버
 *
 * Google 스프레드시트에 붙여 쓰는 Apps Script 백엔드입니다.
 * 여러 사람이 각자 휴대폰으로 올린 기도 시간이 한 시트에 쌓이고,
 * 페이지는 합계만 읽어 도면을 얼마나 그릴지 정합니다.
 *
 * 설치 방법은 prayer/README.md 를 보세요.
 */

var SHEET_NAME = 'prayers';
var MAX_ROWS   = 20000;
var MAX_TEXT   = 500;
var MAX_NAME   = 30;
var MAX_HOURS  = 100;   // 한 번에 올릴 수 있는 시간

function sheet_() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME);
    sh.appendRow(['ts', 'hours', 'topic', 'heart', 'name']);
    sh.setFrozenRows(1);
  }
  return sh;
}

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

/* 합계만 돌려줍니다. 기도제목 본문은 내보내지 않습니다 —
   공개 화면이 읽는 주소라, 시트 안에만 두는 편이 안전합니다. */
function totalHours_() {
  var sh = sheet_();
  var last = sh.getLastRow();
  if (last < 2) return 0;
  var vals = sh.getRange(2, 2, last - 1, 1).getValues();
  var sum = 0;
  for (var i = 0; i < vals.length; i++) sum += Number(vals[i][0]) || 0;
  return Math.round(sum * 100) / 100;
}

function doGet(e) {
  try {
    return json_({ ok: true, hours: totalHours_() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  }
}

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);

    var body = {};
    if (e && e.postData && e.postData.contents) body = JSON.parse(e.postData.contents);

    if ((body.action || 'add') !== 'add')
      return json_({ ok: false, error: '알 수 없는 요청입니다.' });

    var topic = String(body.topic || '').trim().slice(0, MAX_TEXT);
    var heart = String(body.heart || '').trim().slice(0, MAX_TEXT);
    var name  = String(body.name  || '').trim().slice(0, MAX_NAME);
    var hours = Number(body.hours);

    if (!topic) return json_({ ok: false, error: '기도제목이 비어 있습니다.' });
    if (!(hours > 0)) return json_({ ok: false, error: '기도 시간이 올바르지 않습니다.' });
    if (hours > MAX_HOURS) return json_({ ok: false, error: '한 번에 올릴 수 있는 시간을 넘었습니다.' });

    var sh = sheet_();
    if (sh.getLastRow() > MAX_ROWS) return json_({ ok: false, error: '접수가 가득 찼습니다.' });

    sh.appendRow([Date.now(), hours, topic, heart, name]);
    return json_({ ok: true, hours: totalHours_() });
  } catch (err) {
    return json_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (ignore) {}
  }
}
