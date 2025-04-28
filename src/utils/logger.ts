/**
 * Log levels
 */
export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  NONE = 4,
}

/**
 * Logger options
 */
export interface LoggerOptions {
  /** Minimum log level to display */
  level?: LogLevel;
  /** Whether to include timestamps in log messages */
  timestamps?: boolean;
  /** Custom log handler function */
  logHandler?: (level: LogLevel, message: string, ...args: any[]) => void;
}

/**
 * Simple logger for LocalAgentRPC
 */
export class Logger {
  private level: LogLevel;
  private timestamps: boolean;
  private logHandler?: (level: LogLevel, message: string, ...args: any[]) => void;

  /**
   * Create a new logger
   * @param options Logger options
   */
  constructor(options: LoggerOptions = {}) {
    this.level = options.level ?? LogLevel.INFO;
    this.timestamps = options.timestamps ?? true;
    this.logHandler = options.logHandler;
  }

  /**
   * Set the log level
   * @param level The new log level
   */
  setLevel(level: LogLevel): void {
    this.level = level;
  }

  /**
   * Log a debug message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  debug(message: string, ...args: any[]): void {
    this.log(LogLevel.DEBUG, message, ...args);
  }

  /**
   * Log an info message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  info(message: string, ...args: any[]): void {
    this.log(LogLevel.INFO, message, ...args);
  }

  /**
   * Log a warning message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  warn(message: string, ...args: any[]): void {
    this.log(LogLevel.WARN, message, ...args);
  }

  /**
   * Log an error message
   * @param message The message to log
   * @param args Additional arguments to log
   */
  error(message: string, ...args: any[]): void {
    this.log(LogLevel.ERROR, message, ...args);
  }

  /**
   * Log a message at the specified level
   * @param level The log level
   * @param message The message to log
   * @param args Additional arguments to log
   */
  private log(level: LogLevel, message: string, ...args: any[]): void {
    if (level < this.level) {
      return;
    }

    if (this.logHandler) {
      this.logHandler(level, message, ...args);
      return;
    }

    const timestamp = this.timestamps ? `[${new Date().toISOString()}] ` : '';
    const prefix = this.getLevelPrefix(level);
    const formattedMessage = `${timestamp}${prefix}${message}`;

    switch (level) {
      case LogLevel.DEBUG:
        console.debug(formattedMessage, ...args);
        break;
      case LogLevel.INFO:
        console.info(formattedMessage, ...args);
        break;
      case LogLevel.WARN:
        console.warn(formattedMessage, ...args);
        break;
      case LogLevel.ERROR:
        console.error(formattedMessage, ...args);
        break;
    }
  }

  /**
   * Get the prefix for a log level
   * @param level The log level
   * @returns The prefix for the log level
   */
  private getLevelPrefix(level: LogLevel): string {
    switch (level) {
      case LogLevel.DEBUG:
        return '[DEBUG] ';
      case LogLevel.INFO:
        return '[INFO] ';
      case LogLevel.WARN:
        return '[WARN] ';
      case LogLevel.ERROR:
        return '[ERROR] ';
      default:
        return '';
    }
  }
}

// Create a default logger instance
export const logger = new Logger();
