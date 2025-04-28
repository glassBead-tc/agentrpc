import { LocalToolRegistry } from '../src/registry/LocalToolRegistry';
import { z } from 'zod';

describe('LocalToolRegistry', () => {
  let registry: LocalToolRegistry;

  beforeEach(() => {
    registry = new LocalToolRegistry();
  });

  test('should register a tool', () => {
    const tool = {
      name: 'test',
      description: 'A test tool',
      schema: z.object({ input: z.string() }),
      handler: (input: { input: string }) => input.input,
    };

    registry.register(tool);
    expect(registry.hasTool('test')).toBe(true);
    expect(registry.getTool('test')).toBe(tool);
  });

  test('should throw when registering a duplicate tool', () => {
    const tool = {
      name: 'test',
      description: 'A test tool',
      schema: z.object({ input: z.string() }),
      handler: (input: { input: string }) => input.input,
    };

    registry.register(tool);
    expect(() => registry.register(tool)).toThrow();
  });

  test('should get all tools', () => {
    const tool1 = {
      name: 'test1',
      description: 'A test tool 1',
      schema: z.object({ input: z.string() }),
      handler: (input: { input: string }) => input.input,
    };

    const tool2 = {
      name: 'test2',
      description: 'A test tool 2',
      schema: z.object({ input: z.number() }),
      handler: (input: { input: number }) => input.input.toString(),
    };

    registry.register(tool1);
    registry.register(tool2);

    const tools = registry.getAllTools();
    expect(tools).toHaveLength(2);
    expect(tools).toContain(tool1);
    expect(tools).toContain(tool2);
  });

  test('should remove a tool', () => {
    const tool = {
      name: 'test',
      description: 'A test tool',
      schema: z.object({ input: z.string() }),
      handler: (input: { input: string }) => input.input,
    };

    registry.register(tool);
    expect(registry.hasTool('test')).toBe(true);

    const removed = registry.removeTool('test');
    expect(removed).toBe(true);
    expect(registry.hasTool('test')).toBe(false);
    expect(registry.getTool('test')).toBeUndefined();
  });

  test('should return false when removing a non-existent tool', () => {
    const removed = registry.removeTool('nonexistent');
    expect(removed).toBe(false);
  });
});
