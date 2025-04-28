import { z } from 'zod';
import { LocalToolRegistry, Tool } from '../registry/LocalToolRegistry';
import { logger } from '../utils/logger';
import { performanceMonitor } from '../utils/performance';
import { toolCache } from '../utils/cache';
import { accessControlService } from '../security/access-control';
import { UserRole } from '../security/auth';

/**
 * Error thrown when tool execution fails
 */
export class ToolExecutionError extends Error {
  constructor(
    message: string,
    public readonly toolName: string,
    public readonly cause?: unknown
  ) {
    super(message);
    this.name = 'ToolExecutionError';
  }
}

/**
 * Result of a tool execution
 */
export interface ToolExecutionResult<T = any> {
  /** The name of the tool that was executed */
  toolName: string;
  /** The result of the tool execution */
  result: T;
  /** The time it took to execute the tool in milliseconds */
  executionTimeMs: number;
}

/**
 * Options for tool execution
 */
export interface ExecuteToolOptions {
  /** Timeout in milliseconds */
  timeoutMs?: number;
  /** Whether to use caching */
  useCache?: boolean;
  /** Cache TTL in milliseconds */
  cacheTtlMs?: number;
  /** User role for access control */
  userRole?: UserRole;
  /** Whether to collect performance metrics */
  collectMetrics?: boolean;
}

/**
 * Executor for local tools
 */
export class LocalToolExecutor {
  constructor(private registry: LocalToolRegistry) {}

  /**
   * Execute a tool by name with the given input
   * @param toolName The name of the tool to execute
   * @param input The input to pass to the tool
   * @param options Options for execution
   * @returns The result of the tool execution
   * @throws {ToolExecutionError} If the tool execution fails
   */
  async executeTool<TOutput = any>(
    toolName: string,
    input: any,
    options?: ExecuteToolOptions
  ): Promise<ToolExecutionResult<TOutput>> {
    logger.debug(`Executing tool '${toolName}'`, { input, options });

    const tool = this.registry.getTool(toolName);

    if (!tool) {
      logger.error(`Tool '${toolName}' not found`);
      throw new ToolExecutionError(`Tool '${toolName}' not found`, toolName);
    }

    // Check access control if a user role is provided
    if (options?.userRole) {
      if (!accessControlService.isAllowed(toolName, options.userRole)) {
        logger.warn(`Access denied for tool '${toolName}' with role '${options.userRole}'`);
        throw new ToolExecutionError(
          `Access denied for tool '${toolName}' with role '${options.userRole}'`,
          toolName
        );
      }
    }

    // Check cache if enabled
    const useCache = options?.useCache ?? true;
    if (useCache) {
      const cacheKey = this.generateCacheKey(toolName, input);
      const cachedResult = toolCache.get<ToolExecutionResult<TOutput>>(cacheKey);

      if (cachedResult) {
        logger.debug(`Cache hit for tool '${toolName}'`);
        return cachedResult;
      }

      logger.debug(`Cache miss for tool '${toolName}'`);
    }

    try {
      const validationStartTime = Date.now();

      // Validate input against the schema
      const validatedInput = tool.schema.parse(input);

      const validationTimeMs = Date.now() - validationStartTime;

      // Set up timeout if specified
      const timeoutMs = options?.timeoutMs || tool.config?.timeoutSeconds ? tool.config.timeoutSeconds * 1000 : undefined;

      const executionStartTime = Date.now();

      // Execute the tool with timeout if specified
      let result: TOutput;

      if (timeoutMs) {
        result = await this.executeWithTimeout<TOutput>(tool, validatedInput, timeoutMs);
      } else {
        result = await Promise.resolve(tool.handler(validatedInput));
      }

      const executionTimeMs = Date.now() - executionStartTime;

      // Create the result object
      const toolResult: ToolExecutionResult<TOutput> = {
        toolName,
        result,
        executionTimeMs,
      };

      // Record performance metrics if enabled
      if (options?.collectMetrics ?? true) {
        try {
          performanceMonitor.recordToolMetrics({
            toolName,
            executionTimeMs,
            validationTimeMs,
            inputSizeBytes: JSON.stringify(input).length,
            outputSizeBytes: JSON.stringify(result).length,
            timestamp: Date.now(),
          });
        } catch (metricsError) {
          logger.warn(`Failed to record performance metrics for tool '${toolName}':`, metricsError);
        }
      }

      // Cache the result if caching is enabled
      if (useCache) {
        const cacheKey = this.generateCacheKey(toolName, input);
        const cacheTtlMs = options?.cacheTtlMs ?? (tool.config?.cacheTimeSeconds ? tool.config.cacheTimeSeconds * 1000 : 300000); // Default: 5 minutes

        toolCache.set(cacheKey, toolResult, cacheTtlMs);
      }

      logger.debug(`Tool '${toolName}' executed successfully in ${executionTimeMs}ms`);

      return toolResult;
    } catch (error) {
      if (error instanceof z.ZodError) {
        logger.error(`Validation error for tool '${toolName}':`, error);
        throw new ToolExecutionError(
          `Validation error for tool '${toolName}': ${error.message}`,
          toolName,
          error
        );
      }

      logger.error(`Error executing tool '${toolName}':`, error);
      throw new ToolExecutionError(
        `Error executing tool '${toolName}': ${error instanceof Error ? error.message : String(error)}`,
        toolName,
        error
      );
    }
  }

  /**
   * Generate a cache key for a tool execution
   * @param toolName The name of the tool
   * @param input The input to the tool
   * @returns The cache key
   */
  private generateCacheKey(toolName: string, input: any): string {
    return `${toolName}:${JSON.stringify(input)}`;
  }

  /**
   * Execute a tool with a timeout
   * @param tool The tool to execute
   * @param input The validated input
   * @param timeoutMs The timeout in milliseconds
   * @returns The result of the tool execution
   * @throws {ToolExecutionError} If the tool execution times out
   */
  private async executeWithTimeout<TOutput>(
    tool: Tool,
    input: any,
    timeoutMs: number
  ): Promise<TOutput> {
    return new Promise<TOutput>((resolve, reject) => {
      const timeoutId = setTimeout(() => {
        reject(new ToolExecutionError(
          `Tool '${tool.name}' execution timed out after ${timeoutMs}ms`,
          tool.name
        ));
      }, timeoutMs);

      Promise.resolve(tool.handler(input))
        .then((result) => {
          clearTimeout(timeoutId);
          resolve(result as TOutput);
        })
        .catch((error) => {
          clearTimeout(timeoutId);
          reject(error);
        });
    });
  }
}
