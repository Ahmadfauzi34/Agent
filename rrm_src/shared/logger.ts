export enum LogLevel {
    TRACE = 0,
    DEBUG = 1,
    INFO = 2,
    WARN = 3,
    ERROR = 4
}

const MAX_LOG_LINES = 5000; // Mencegah memory leak dari unlimited array push

export class PDRLogger {
    static level: LogLevel = LogLevel.INFO;
    static listeners: ((msg: string) => void)[] = [];
    static buffer: string[] = new Array(MAX_LOG_LINES);
    static bufferIndex: number = 0;
    static bufferCount: number = 0;

    static setLevel(level: LogLevel) {
        this.level = level;
    }

    static clearBuffer() {
        this.bufferIndex = 0;
        this.bufferCount = 0;
    }

    static getBuffer(): string {
        // Gabungkan secara urut dari yang paling lama hingga terbaru
        if (this.bufferCount < MAX_LOG_LINES) {
            return this.buffer.slice(0, this.bufferCount).join('\n');
        } else {
            const firstPart = this.buffer.slice(this.bufferIndex);
            const secondPart = this.buffer.slice(0, this.bufferIndex);
            return firstPart.concat(secondPart).join('\n');
        }
    }

    static addListener(listener: (msg: string) => void) {
        this.listeners.push(listener);
    }

    static removeListener(listener: (msg: string) => void) {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    private static notify(msg: string) {
        // Implementasi Circular Buffer O(1) (Mencegah shift() array O(N))
        this.buffer[this.bufferIndex] = msg;
        this.bufferIndex = (this.bufferIndex + 1) % MAX_LOG_LINES;

        if (this.bufferCount < MAX_LOG_LINES) {
            this.bufferCount++;
        }

        for (let i = 0; i < this.listeners.length; i++) {
            this.listeners[i]!(msg);
        }
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
