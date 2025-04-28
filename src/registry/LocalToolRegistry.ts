import { z } from 'zod';

/**
 * Interface for a tool definition
 */
export interface Tool<TSchema extends z.ZodType = z.ZodType, TOutput = any> {
  /** The name of the tool */
  name: string;
  /** A description of what the tool does */
  description: string;
  /** The schema for the tool's input parameters */
  schema: TSchema;
  /** The function that handles the tool execution */
  handler: (input: z.infer<TSchema>) => Promise<TOutput> | TOutput;
  /** Optional configuration for the tool */
  config?: {
    /** Number of times to retry on stall */
    retryCountOnStall?: number;
    /** Timeout in seconds */
    timeoutSeconds?: number;
    /** Whether to cache results */
    enableCache?: boolean;
    /** Time to cache results in seconds */
    cacheTimeSeconds?: number;
    /** Roles allowed to access this tool */
    allowedRoles?: string[];
  };
}

/**
 * Registry for local tools
 */
export class LocalToolRegistry {
  private tools: Map<string, Tool> = new Map();

  /**
   * Register a tool with the registry
   * @param tool The tool to register
   */
  register<TSchema extends z.ZodType, TOutput>(tool: Tool<TSchema, TOutput>): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool with name ${tool.name} already registered`);
    }
    this.tools.set(tool.name, tool);
  }

  /**
   * Get a tool by name
   * @param name The name of the tool to get
   * @returns The tool, or undefined if not found
   */
  getTool(name: string): Tool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all registered tools
   * @returns An array of all registered tools
   */
  getAllTools(): Tool[] {
    return Array.from(this.tools.values());
  }

  /**
   * Check if a tool exists
   * @param name The name of the tool to check
   * @returns True if the tool exists, false otherwise
   */
  hasTool(name: string): boolean {
    return this.tools.has(name);
  }

  /**
   * Remove a tool from the registry
   * @param name The name of the tool to remove
   * @returns True if the tool was removed, false if it didn't exist
   */
  removeTool(name: string): boolean {
    return this.tools.delete(name);
  }
}
