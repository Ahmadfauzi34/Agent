
// src/pdr/pdr-debug.ts

export enum LogLevel {
  NONE = 0,
  INFO = 1,
  DEBUG = 2,
  TRACE = 3
}

type LogCallback = (message: string) => void;

export class PDRLogger {
  private static level: LogLevel = LogLevel.DEBUG;
  private static listeners: LogCallback[] = [];
  private static buffer: string = "";

  static setLevel(level: LogLevel) {
    this.level = level;
  }

  static addListener(callback: LogCallback) {
    this.listeners.push(callback);
  }

  static clearListeners() {
    this.listeners = [];
  }

  static getBuffer(): string {
    return this.buffer;
  }

  static clearBuffer() {
    this.buffer = "";
  }

  private static emit(msg: string) {
    console.log(msg);
    this.buffer += msg + "\n";
    this.listeners.forEach(cb => cb(msg));
  }

  static info(message: string, data?: any) {
    if (this.level >= LogLevel.INFO) {
      const msg = `ℹ️ [INFO] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`;
      this.emit(msg);
    }
  }

  static debug(message: string, data?: any) {
    if (this.level >= LogLevel.DEBUG) {
      const msg = `🐞 [DEBUG] ${message} ${data ? JSON.stringify(data) : ''}`;
      this.emit(msg);
    }
  }

  static trace(message: string, data?: any) {
    if (this.level >= LogLevel.TRACE) {
      const msg = `🔍 [TRACE] ${message} ${data ? JSON.stringify(data, null, 2) : ''}`;
      this.emit(msg);
    }
  }

  static section(title: string) {
    if (this.level >= LogLevel.INFO) {
      const msg = `\n=== ${title} ===`;
      this.emit(msg);
    }
  }
  
  // Alias for generic logging to replace direct console.log or custom loggers
  static log(message: string) {
      this.emit(message);
  }
}
