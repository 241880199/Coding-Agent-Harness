import { LLMProvider, LLMResponse, Action } from '../harness/types.js';

type MockMode = 'fixed' | 'fsm' | 'context-aware';

interface ContextAwareRule {
  match: (context: string[]) => boolean;
  response: LLMResponse;
}

export class MockLLM implements LLMProvider {
  private mode: MockMode;
  private fixedResponse: LLMResponse | null = null;
  private fsmResponses: LLMResponse[];
  private fsmIndex: number = 0;
  private contextRules: ContextAwareRule[];

  constructor(mode: 'fixed', response: LLMResponse);
  constructor(mode: 'fsm', responses: LLMResponse[]);
  constructor(mode: 'context-aware', rules: ContextAwareRule[]);
  constructor(mode: MockMode, config: LLMResponse | LLMResponse[] | ContextAwareRule[]) {
    this.mode = mode;
    this.fsmResponses = [];
    this.contextRules = [];
    if (mode === 'fixed') {
      this.fixedResponse = config as LLMResponse;
    } else if (mode === 'fsm') {
      this.fsmResponses = config as LLMResponse[];
    } else {
      this.contextRules = config as ContextAwareRule[];
    }
  }

  async call(context: string[]): Promise<LLMResponse> {
    if (this.mode === 'fixed') {
      return this.fixedResponse!;
    }
    if (this.mode === 'fsm') {
      if (this.fsmIndex >= this.fsmResponses.length) {
        throw new Error('FSM exhausted');
      }
      return this.fsmResponses[this.fsmIndex++];
    }
    for (const rule of this.contextRules) {
      if (rule.match(context)) {
        return rule.response;
      }
    }
    return { text: 'No rule matched', action: { type: 'done' } };
  }

  reset(): void {
    this.fsmIndex = 0;
  }
}