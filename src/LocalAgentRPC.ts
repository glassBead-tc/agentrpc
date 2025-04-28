import { z } from 'zod';
import { LocalToolRegistry, Tool } from './registry/LocalToolRegistry';
import { LocalToolExecutor, ToolExecutionResult } from './executor/LocalToolExecutor';

/**
 * Event types for the LocalAgentRPC
 */
export enum EventType {
  TOOL_REGISTERED = 'tool_registered',
  TOOL_EXECUTION_STARTED = 'tool_execution_started',
  TOOL_EXECUTION_COMPLETED = 'tool_execution_completed',
  TOOL_EXECUTION_FAILED = 'tool_execution_failed',
}

/**
 * Event listener function type
 */
export type EventListener = (eventType: EventType, data: any) => void;

/**
 * Configuration options for LocalAgentRPC
 */
export interface LocalAgentRPCOptions {
  /** Default timeout in seconds for tool execution */
  defaultTimeoutSeconds?: number;
}

/**
 * Main class for LocalAgentRPC
 */
export class LocalAgentRPC {
  private registry: LocalToolRegistry;
  private executor: LocalToolExecutor;
  private eventListeners: EventListener[] = [];
  private options: LocalAgentRPCOptions;

  /**
   * Create a new LocalAgentRPC instance
   * @param options Configuration options
   */
  constructor(options: LocalAgentRPCOptions = {}) {
    this.options = options;
    this.registry = new LocalToolRegistry();
    this.executor = new LocalToolExecutor(this.registry);
  }

  /**
   * Register a tool with LocalAgentRPC
   * @param tool The tool to register
   */
  register<TSchema extends z.ZodType, TOutput>(tool: Tool<TSchema, TOutput>): void {
    this.registry.register(tool);
    this.emitEvent(EventType.TOOL_REGISTERED, { toolName: tool.name });
  }

  /**
   * Execute a tool by name with the given input
   * @param toolName The name of the tool to execute
   * @param input The input to pass to the tool
   * @returns The result of the tool execution
   */
  async executeTool<TOutput = any>(
    toolName: string,
    input: any
  ): Promise<ToolExecutionResult<TOutput>> {
    this.emitEvent(EventType.TOOL_EXECUTION_STARTED, { toolName, input });
    
    try {
      const result = await this.executor.executeTool<TOutput>(toolName, input, {
        timeoutMs: this.options.defaultTimeoutSeconds ? this.options.defaultTimeoutSeconds * 1000 : undefined,
      });
      
      this.emitEvent(EventType.TOOL_EXECUTION_COMPLETED, {
        toolName,
        result: result.result,
        executionTimeMs: result.executionTimeMs,
      });
      
      return result;
    } catch (error) {
      this.emitEvent(EventType.TOOL_EXECUTION_FAILED, {
        toolName,
        error,
      });
      
      throw error;
    }
  }

  /**
   * Get a tool by name
   * @param name The name of the tool to get
   * @returns The tool, or undefined if not found
   */
  getTool(name: string): Tool | undefined {
    return this.registry.getTool(name);
  }

  /**
   * Get all registered tools
   * @returns An array of all registered tools
   */
  getAllTools(): Tool[] {
    return this.registry.getAllTools();
  }

  /**
   * Add an event listener
   * @param listener The listener function to add
   */
  addEventListener(listener: EventListener): void {
    this.eventListeners.push(listener);
  }

  /**
   * Remove an event listener
   * @param listener The listener function to remove
   * @returns True if the listener was removed, false otherwise
   */
  removeEventListener(listener: EventListener): boolean {
    const index = this.eventListeners.indexOf(listener);
    if (index !== -1) {
      this.eventListeners.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Emit an event to all listeners
   * @param eventType The type of event
   * @param data The event data
   */
  private emitEvent(eventType: EventType, data: any): void {
    for (const listener of this.eventListeners) {
      try {
        listener(eventType, data);
      } catch (error) {
        console.error('Error in event listener:', error);
      }
    }
  }
}
