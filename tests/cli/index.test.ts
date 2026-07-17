import { describe, it, expect, vi } from 'vitest';
import { parseArgs } from '../../src/cli/index.js';

describe('CLI argument parsing', () => {
  it('should parse start command', () => {
    const args = parseArgs(['start', 'fix the bug']);
    expect(args.command).toBe('start');
    expect(args.goal).toBe('fix the bug');
  });

  it('should parse config set-key command', () => {
    const args = parseArgs(['config', 'set-key']);
    expect(args.command).toBe('config');
    expect(args.subcommand).toBe('set-key');
  });

  it('should parse config view-key command', () => {
    const args = parseArgs(['config', 'view-key']);
    expect(args.command).toBe('config');
    expect(args.subcommand).toBe('view-key');
  });

  it('should parse config set-url command', () => {
    const args = parseArgs(['config', 'set-url']);
    expect(args.command).toBe('config');
    expect(args.subcommand).toBe('set-url');
  });

  it('should parse config view-url command', () => {
    const args = parseArgs(['config', 'view-url']);
    expect(args.command).toBe('config');
    expect(args.subcommand).toBe('view-url');
  });

  it('should parse config clear-url command', () => {
    const args = parseArgs(['config', 'clear-url']);
    expect(args.command).toBe('config');
    expect(args.subcommand).toBe('clear-url');
  });

  it('should parse trace command', () => {
    const args = parseArgs(['trace', 'session-123']);
    expect(args.command).toBe('trace');
    expect(args.sessionId).toBe('session-123');
  });

  it('should parse init command', () => {
    const args = parseArgs(['init', 'my-project']);
    expect(args.command).toBe('init');
    expect(args.projectName).toBe('my-project');
  });

  it('should return repl command with no args', () => {
    const args = parseArgs([]);
    expect(args.command).toBe('repl');
  });

  it('should parse --max-steps flag', () => {
    const args = parseArgs(['start', '--max-steps', '300', 'fix the bug']);
    expect(args.command).toBe('start');
    expect(args.goal).toBe('fix the bug');
    expect(args.maxSteps).toBe(300);
  });
});