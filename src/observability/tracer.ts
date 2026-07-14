import { Action, ActionResult, TraceEntry } from '../harness/types.js';

export class Tracer {
  private entries: TraceEntry[] = [];
  private stepCounter: number = 0;

  constructor(public sessionId: string) {}

  record(action: Action, result: ActionResult, feedback?: string): void {
    this.stepCounter++;
    this.entries.push({
      step: this.stepCounter,
      action,
      result,
      feedback,
    });
  }

  getEntries(): TraceEntry[] {
    return [...this.entries];
  }

  flush(): TraceEntry[] {
    const flushed = [...this.entries];
    this.entries = [];
    return flushed;
  }

  exportJSON(): string {
    return JSON.stringify({
      sessionId: this.sessionId,
      entries: this.entries,
    }, null, 2);
  }
}