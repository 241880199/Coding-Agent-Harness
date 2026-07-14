import { describe, it, expect, vi } from 'vitest';
import { SensorRunner } from '../../src/feedback/sensors.js';

describe('SensorRunner', () => {
  it('should return pass when all sensors pass', async () => {
    const runner = new SensorRunner(
      async () => ({ pass: true, details: [] }),
      async () => ({ pass: true, details: [] }),
    );
    const report = await runner.runAll();
    expect(report.pass).toBe(true);
  });

  it('should return fail when a sensor fails', async () => {
    const runner = new SensorRunner(
      async () => ({ pass: false, details: [{ test: 'test suite', status: 'fail', message: '1 test failed' }] }),
      async () => ({ pass: true, details: [] }),
    );
    const report = await runner.runAll();
    expect(report.pass).toBe(false);
    expect(report.details.length).toBe(1);
  });

  it('should aggregate failures from multiple sensors', async () => {
    const runner = new SensorRunner(
      async () => ({ pass: false, details: [{ test: 'unit', status: 'fail', message: 'fail' }] }),
      async () => ({ pass: false, details: [{ test: 'lint', status: 'fail', message: 'lint error' }] }),
    );
    const report = await runner.runAll();
    expect(report.pass).toBe(false);
    expect(report.details.length).toBe(2);
  });

  it('should handle sensor execution errors gracefully', async () => {
    const runner = new SensorRunner(
      async () => { throw new Error('crash'); },
      async () => ({ pass: true, details: [] }),
    );
    const report = await runner.runAll();
    expect(report.pass).toBe(true);
  });
});