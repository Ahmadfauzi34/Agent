export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4
}

export class PDRLogger {
    static level: LogLevel = LogLevel.INFO;
    static listeners: ((msg: string) => void)[] = [];
    static buffer: string[] = [];

    static setLevel(level: LogLevel) {
        this.level = level;
    }

    static clearBuffer() {
        this.buffer = [];
    }

    static getBuffer(): string {
        return this.buffer.join('\n');
    }

    static addListener(listener: (msg: string) => void) {
        this.listeners.push(listener);
    }

    static removeListener(listener: (msg: string) => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private static notify(msg: string) {
        this.buffer.push(msg);
        this.listeners.forEach(l => l(msg));
    }

    static trace(...args: any[]) { 
        if (this.level <= LogLevel.TRACE) {
            console.log(...args);
            this.notify(args.join(' '));
        }
    }
    static debug(...args: any[]) { 
        if (this.level <= LogLevel.DEBUG) {
            console.log(...args);
            this.notify(args.join(' '));
        }
    }
    static info(...args: any[]) { 
        if (this.level <= LogLevel.INFO) {
            console.log(...args);
            this.notify(args.join(' '));
        }
    }
    static warn(...args: any[]) { 
        if (this.level <= LogLevel.WARN) {
            console.warn(...args);
            this.notify(args.join(' '));
        }
    }
    static error(...args: any[]) { 
        if (this.level <= LogLevel.ERROR) {
            console.error(...args);
            this.notify(args.join(' '));
        }
    }
    static section(name: string) { 
        if (this.level <= LogLevel.INFO) {
            const msg = `\n--- ${name} ---`;
            console.log(msg);
            this.notify(msg);
        }
    }
    static log(...args: any[]) { this.info(...args); }
}
