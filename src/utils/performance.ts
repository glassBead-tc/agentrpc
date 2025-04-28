/**
 * Performance metrics for a tool execution
 */
export interface ToolPerformanceMetrics {
  /** The name of the tool */
  toolName: string;
  /** The time it took to execute the tool in milliseconds */
  executionTimeMs: number;
  /** The time it took to validate the input in milliseconds */
  validationTimeMs: number;
  /** The size of the input in bytes */
  inputSizeBytes: number;
  /** The size of the output in bytes */
  outputSizeBytes: number;
  /** The timestamp when the tool was executed */
  timestamp: number;
}

/**
 * Performance metrics for the system
 */
export interface SystemPerformanceMetrics {
  /** The CPU usage percentage */
  cpuUsagePercent: number;
  /** The memory usage in bytes */
  memoryUsageBytes: number;
  /** The timestamp when the metrics were collected */
  timestamp: number;
}

/**
 * Performance monitor for LocalAgentRPC
 */
export class PerformanceMonitor {
  private toolMetrics: ToolPerformanceMetrics[] = [];
  private systemMetrics: SystemPerformanceMetrics[] = [];
  private metricsLimit: number;
  private collectSystemMetricsInterval?: NodeJS.Timeout;

  /**
   * Create a new performance monitor
   * @param options Options for the performance monitor
   */
  constructor(options: { metricsLimit?: number; collectSystemMetrics?: boolean } = {}) {
    this.metricsLimit = options.metricsLimit ?? 1000;

    if (options.collectSystemMetrics) {
      this.startCollectingSystemMetrics();
    }
  }

  /**
   * Record metrics for a tool execution
   * @param metrics The metrics to record
   */
  recordToolMetrics(metrics: ToolPerformanceMetrics): void {
    this.toolMetrics.push(metrics);

    // Limit the number of metrics stored
    if (this.toolMetrics.length > this.metricsLimit) {
      this.toolMetrics.shift();
    }
  }

  /**
   * Get all tool metrics
   * @returns All recorded tool metrics
   */
  getToolMetrics(): ToolPerformanceMetrics[] {
    return [...this.toolMetrics];
  }

  /**
   * Get tool metrics for a specific tool
   * @param toolName The name of the tool
   * @returns The metrics for the specified tool
   */
  getToolMetricsForTool(toolName: string): ToolPerformanceMetrics[] {
    return this.toolMetrics.filter((metrics) => metrics.toolName === toolName);
  }

  /**
   * Get the average execution time for a tool
   * @param toolName The name of the tool
   * @returns The average execution time in milliseconds, or undefined if no metrics are available
   */
  getAverageExecutionTime(toolName: string): number | undefined {
    const metrics = this.getToolMetricsForTool(toolName);

    if (metrics.length === 0) {
      return undefined;
    }

    const sum = metrics.reduce((acc, metric) => acc + metric.executionTimeMs, 0);
    return sum / metrics.length;
  }

  /**
   * Get all system metrics
   * @returns All recorded system metrics
   */
  getSystemMetrics(): SystemPerformanceMetrics[] {
    return [...this.systemMetrics];
  }

  /**
   * Start collecting system metrics
   * @param intervalMs The interval in milliseconds at which to collect metrics
   */
  startCollectingSystemMetrics(intervalMs: number = 60000): void {
    if (this.collectSystemMetricsInterval) {
      clearInterval(this.collectSystemMetricsInterval);
    }

    this.collectSystemMetricsInterval = setInterval(() => {
      this.collectSystemMetrics();
    }, intervalMs);
  }

  /**
   * Stop collecting system metrics
   */
  stopCollectingSystemMetrics(): void {
    if (this.collectSystemMetricsInterval) {
      clearInterval(this.collectSystemMetricsInterval);
      this.collectSystemMetricsInterval = undefined;
    }
  }

  /**
   * Collect system metrics
   */
  private collectSystemMetrics(): void {
    try {
      const memoryUsage = process.memoryUsage();
      
      // This is a very simple CPU usage calculation
      // In a real implementation, you would use a library like os-utils
      const cpuUsagePercent = process.cpuUsage().user / 1000000;
      
      const metrics: SystemPerformanceMetrics = {
        cpuUsagePercent,
        memoryUsageBytes: memoryUsage.heapUsed,
        timestamp: Date.now(),
      };
      
      this.systemMetrics.push(metrics);
      
      // Limit the number of metrics stored
      if (this.systemMetrics.length > this.metricsLimit) {
        this.systemMetrics.shift();
      }
    } catch (error) {
      console.error('Error collecting system metrics:', error);
    }
  }

  /**
   * Clear all metrics
   */
  clearMetrics(): void {
    this.toolMetrics = [];
    this.systemMetrics = [];
  }
}

// Create a default performance monitor instance
export const performanceMonitor = new PerformanceMonitor();
