import { Pattern, PatternArraySchema } from './types';

export class PatternStorage {
    static async load(): Promise<Pattern[]> {
        if (typeof window !== 'undefined') {
            // Browser
            const data = localStorage.getItem('patterns');
            if (!data) return [];
            try {
                const parsed = JSON.parse(data);
                const validation = PatternArraySchema.safeParse(parsed);
                if (!validation.success) {
                    console.error("Invalid pattern data in localStorage:", validation.error);
                    return [];
                }
                return validation.data;
            } catch (e) {
                console.error("Error loading patterns:", e);
                return [];
            }
        } else {
            // Node.js
            const fs = await import('fs');
            const path = await import('path');
            const PATTERNS_FILE = path.join(process.cwd(), 'patterns.json');
            if (!fs.existsSync(PATTERNS_FILE)) {
                return [];
            }
            try {
                const data = fs.readFileSync(PATTERNS_FILE, 'utf-8');
                const parsed = JSON.parse(data);
                const validation = PatternArraySchema.safeParse(parsed);
                if (!validation.success) {
                    console.error("Invalid pattern data in patterns.json:", validation.error);
                    return [];
                }
                return validation.data;
            } catch (e) {
                console.error("Error loading patterns:", e);
                return [];
            }
        }
    }

    static async save(patterns: Pattern[]): Promise<void> {
        if (typeof window !== 'undefined') {
            // Browser
            localStorage.setItem('patterns', JSON.stringify(patterns));
        } else {
            // Node.js
            const fs = await import('fs');
            const path = await import('path');
            const PATTERNS_FILE = path.join(process.cwd(), 'patterns.json');
            try {
                fs.writeFileSync(PATTERNS_FILE, JSON.stringify(patterns, null, 2));
            } catch (e) {
                console.error("Error saving patterns:", e);
            }
        }
    }
}
