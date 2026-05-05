import test from 'node:test';
import assert from 'node:assert/strict';

import {
  isRecoverableStartupFailure,
  isStartupTimeoutError,
  parsePostmasterPid,
  shouldRecoverStaleServerState,
} from '../scripts/local-postgres.mjs';

test('postmaster.pid 第一行可解析为主进程 PID', () => {
  assert.equal(parsePostmasterPid('29248\nE:/data\n1777973445\n5432\n'), 29248);
  assert.equal(parsePostmasterPid('not-a-pid\n5432\n'), null);
  assert.equal(parsePostmasterPid(''), null);
});

test('数据库不可连接但残留 pid 文件时会触发异常实例清理', () => {
  assert.equal(
    shouldRecoverStaleServerState({
      databaseReachable: false,
      pgCtlThinksRunning: false,
      pidFileExists: true,
      pidAlive: true,
    }),
    true,
  );

  assert.equal(
    shouldRecoverStaleServerState({
      databaseReachable: false,
      pgCtlThinksRunning: true,
      pidFileExists: true,
      pidAlive: true,
    }),
    true,
  );

  assert.equal(
    shouldRecoverStaleServerState({
      databaseReachable: true,
      pgCtlThinksRunning: true,
      pidFileExists: true,
      pidAlive: true,
    }),
    false,
  );
});

test('识别可通过清理残留实例恢复的启动错误', () => {
  assert.equal(
    isRecoverableStartupFailure(
      'pg_ctl: another server might be running; trying to start server anyway\npg_ctl: could not open log file "postgres.log": Permission denied',
    ),
    true,
  );
  assert.equal(isRecoverableStartupFailure('FATAL: password authentication failed for user "campusfit"'), false);
});

test('识别 pg_ctl 超时但可继续做连通性确认的错误', () => {
  const timeoutError = new Error('spawnSync pg_ctl.exe ETIMEDOUT');
  timeoutError.cause = { code: 'ETIMEDOUT' };

  assert.equal(isStartupTimeoutError(timeoutError), true);
  assert.equal(isStartupTimeoutError(new Error('Permission denied')), false);
});
