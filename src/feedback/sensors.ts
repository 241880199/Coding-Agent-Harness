import { SensorReport, SensorDetail } from '../harness/types.js';

export type SensorFn = () => Promise<SensorReport>;

export class SensorRunner {
  constructor(
    private testSensor: SensorFn,
    private lintSensor: SensorFn,
  ) {}

  async runAll(): Promise<SensorReport> {
    const allDetails: SensorDetail[] = [];
    let allPass = true;

    for (const sensor of [this.testSensor, this.lintSensor]) {
      try {
        const report = await sensor();
        if (!report.pass) {
          allPass = false;
        }
        allDetails.push(...report.details);
      } catch {
        // sensor crash is not a test failure
      }
    }

    return { pass: allPass, details: allDetails };
  }
}