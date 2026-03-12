import { Task } from './types';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let database: (Task & { name: string })[] = [];

// @ts-ignore
if (import.meta.glob) {
    // Vite environment
    // @ts-ignore
    const taskModules = import.meta.glob('../../training/*.json', { eager: true });
    database = Object.entries(taskModules).map(([path, module]: [string, any]) => {
        const fileName = path.split('/').pop() || path;
        const taskName = fileName.replace('.json', '');
        return {
            name: `Task ${taskName}`,
            ...module.default
        };
    });
} else {
    // Node environment (for shell testing)
    try {
        const trainingDir = path.resolve(__dirname, '../../training');
        if (fs.existsSync(trainingDir)) {
            const files = fs.readdirSync(trainingDir).filter((f: string) => f.endsWith('.json'));
            database = files.map((file: string) => {
                const content = fs.readFileSync(path.join(trainingDir, file), 'utf-8');
                return {
                    name: `Task ${file.replace('.json', '')}`,
                    ...JSON.parse(content)
                };
            });
        }
    } catch (e) {
        console.warn('Could not load training data in Node environment', e);
    }
}

export const ARC_DATABASE = database;
