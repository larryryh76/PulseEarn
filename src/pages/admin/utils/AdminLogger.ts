type LogLevel = 'INFO' | 'WARN' | 'ERROR' | 'FATAL';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  module: string;
  message: string;
  metadata?: any;
}

class AdminLogger {
  private static instance: AdminLogger;
  private logs: LogEntry[] = [];
  private readonly MAX_LOGS = 1000;

  private constructor() {}

  static getInstance(): AdminLogger {
    if (!AdminLogger.instance) {
      AdminLogger.instance = new AdminLogger();
    }
    return AdminLogger.instance;
  }

  log(level: LogLevel, module: string, message: string, metadata?: any) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      module,
      message,
      metadata
    };

    if (import.meta.env.DEV) {
      console.log(`[AdminOps][${level}][${module}] ${message}`, metadata || '');
    }

    this.logs.unshift(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.pop();
    }

    if (level === 'ERROR' || level === 'FATAL' || level === 'WARN') {
      this.persistCriticalLog(entry);
    }
  }

  private async persistCriticalLog(entry: LogEntry) {
    try {
      if (entry.level === 'FATAL' || entry.level === 'ERROR') {
        console.warn(`[CriticalLog][${entry.level}][${entry.module}]`, entry.message);
      }
    } catch (err) {
      console.error("Failed to persist critical log", err);
    }
  }

  getLogs(): LogEntry[] {
    return [...this.logs];
  }

  clear() {
    this.logs = [];
  }
}

export const logger = AdminLogger.getInstance();
