export type PhysicsCategory = 'GRAVITY' | 'MAGNETISM' | 'TRANSLATION' | 'UNKNOWN';

export interface PhysicalRule {
    category: PhysicsCategory;
    params: any;
}

export function classifyRule(rule: any): PhysicalRule {
    // Logika hybrid: Menggunakan heuristik untuk memetakan aljabar ke fisik
    if (rule.dx === 0 && rule.dy > 0) {
        return { category: 'GRAVITY', params: { dy: rule.dy } };
    }
    if (rule.rules && rule.rules.length > 1) {
        // Deteksi sederhana untuk interaksi antar objek
        return { category: 'MAGNETISM', params: rule.rules };
    }
    if (rule.dx !== undefined || rule.dy !== undefined) {
        return { category: 'TRANSLATION', params: { dx: rule.dx, dy: rule.dy } };
    }
    
    return { category: 'UNKNOWN', params: rule };
}
