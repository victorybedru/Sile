import test from 'node:test';
import assert from 'node:assert/strict';
import { canTransitionStatus } from './types/index.js';
import { mapApiReportToRpcPayload } from './utils/mappers.js';

test('report workflow permits only the next valid status', () => {
  assert.equal(canTransitionStatus('Submitted', 'Assigned').allowed, true);
  assert.equal(canTransitionStatus('Submitted', 'Resolved').allowed, false);
  assert.equal(canTransitionStatus('Resolved', 'Submitted').allowed, false);
});

test('report submission mapper preserves client ID and location', () => {
  const payload = mapApiReportToRpcPayload({
    id: 'sile-test-1', category: 'Water', subCity: 'Bole', specificLocation: 'Near Edna Mall',
    description: 'Water supply interruption near the mall', priority: 'High', status: 'Submitted',
    createdAt: '2026-11-13T10:00:00.000Z', updatedAt: '2026-11-13T10:00:00.000Z',
  });
  assert.equal(payload.id, 'sile-test-1');
  assert.equal(payload.specificLocation, 'Near Edna Mall');
});

test('report submission mapper rejects a missing specific location', () => {
  assert.throws(() => mapApiReportToRpcPayload({ id: 'sile-test-2' }), /specificLocation is required/);
});
