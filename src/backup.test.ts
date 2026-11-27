import assert from 'node:assert/strict';
import { test } from 'node:test';

import { backupFileName, makeBackup, parseBackup } from './backup.ts';
import { EMPTY_DATA, sanitize } from './logic.ts';

test('export then import round-trips the data', () => {
  const data = sanitize({
    habits: [{ id: 'a', name: 'Gym', emoji: '💪', target: 3, createdAt: '2026-11-01' }],
    checks: { a: ['2026-11-02'] },
    weekStart: 1,
  });
  const parsed = parseBackup(makeBackup(data, '2026-11-27T09:00:00.000Z'));
  assert.ok(parsed.ok);
  if (parsed.ok) {
    assert.deepEqual(parsed.data, data);
    assert.equal(parsed.exportedAt, '2026-11-27T09:00:00.000Z');
  }
  assert.equal(backupFileName('2026-11-27'), 'weekchamp-backup-2026-11-27.json');
});

test('import rejects files that are not Weekchamp backups', () => {
  for (const text of ['not json', '[]', '{"app":"other","data":{}}', '{"app":"weekchamp"}']) {
    const r = parseBackup(text);
    assert.equal(r.ok, false);
  }
  const newer = parseBackup(JSON.stringify({ app: 'weekchamp', schemaVersion: 3, data: EMPTY_DATA }));
  assert.equal(newer.ok, false);
});
