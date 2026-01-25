// Catálogo de suplementos com informações de dosagem
export const SUPPLEMENT_CATALOG = [
    {
        id: 'whey',
        name: 'Whey Protein',
        icon: '🥛',
        category: 'Proteína',
        defaultDosage: 30,
        unit: 'g',
        minDosage: 20,
        maxDosage: 50,
        dosagePerKg: 0.4,
        description: 'Proteína de rápida absorção para recuperação muscular',
        timing: 'Pós-treino ou entre refeições',
    },
    {
        id: 'creatine',
        name: 'Creatina',
        icon: '💪',
        category: 'Performance',
        defaultDosage: 5,
        unit: 'g',
        minDosage: 3,
        maxDosage: 5,
        dosagePerKg: 0.05,
        description: 'Melhora força e performance em exercícios de alta intensidade',
        timing: 'Qualquer horário, diariamente',
    },
    {
        id: 'vitamin-c',
        name: 'Vitamina C',
        icon: '🍊',
        category: 'Vitaminas',
        defaultDosage: 1000,
        unit: 'mg',
        minDosage: 500,
        maxDosage: 2000,
        dosagePerKg: null,
        description: 'Fortalece o sistema imunológico e é antioxidante',
        timing: 'Pela manhã com alimentação',
    },
    {
        id: 'vitamin-d',
        name: 'Vitamina D',
        icon: '☀️',
        category: 'Vitaminas',
        defaultDosage: 2000,
        unit: 'UI',
        minDosage: 1000,
        maxDosage: 4000,
        dosagePerKg: null,
        description: 'Essencial para saúde óssea e imunidade',
        timing: 'Pela manhã com gorduras',
    },
    {
        id: 'omega3',
        name: 'Ômega 3',
        icon: '🐟',
        category: 'Ácidos Graxos',
        defaultDosage: 2,
        unit: 'g',
        minDosage: 1,
        maxDosage: 3,
        dosagePerKg: null,
        description: 'Anti-inflamatório, saúde cardiovascular e cerebral',
        timing: 'Com refeições',
    },
    {
        id: 'multivitamin',
        name: 'Multivitamínico',
        icon: '💊',
        category: 'Vitaminas',
        defaultDosage: 1,
        unit: 'cápsula',
        minDosage: 1,
        maxDosage: 1,
        dosagePerKg: null,
        description: 'Complemento de vitaminas e minerais essenciais',
        timing: 'Pela manhã com alimentação',
    },
    {
        id: 'bcaa',
        name: 'BCAA',
        icon: '⚡',
        category: 'Aminoácidos',
        defaultDosage: 10,
        unit: 'g',
        minDosage: 5,
        maxDosage: 15,
        dosagePerKg: 0.1,
        description: 'Aminoácidos de cadeia ramificada para recuperação',
        timing: 'Durante ou pós-treino',
    },
    {
        id: 'caffeine',
        name: 'Cafeína',
        icon: '☕',
        category: 'Estimulantes',
        defaultDosage: 200,
        unit: 'mg',
        minDosage: 100,
        maxDosage: 400,
        dosagePerKg: 3,
        description: 'Aumenta foco e energia para treinos',
        timing: '30-60min antes do treino',
    },
    {
        id: 'zma',
        name: 'ZMA',
        icon: '😴',
        category: 'Minerais',
        defaultDosage: 1,
        unit: 'dose',
        minDosage: 1,
        maxDosage: 1,
        dosagePerKg: null,
        description: 'Zinco, magnésio e vitamina B6 para sono e recuperação',
        timing: 'Antes de dormir, estômago vazio',
    },
];

/**
 * Calcula dosagem sugerida baseada no perfil do usuário
 * @param {object} supplement - Suplemento do catálogo
 * @param {object} profile - Perfil do usuário (peso, idade, objetivo, gênero)
 * @returns {number} Dosagem sugerida
 */
export const calculateSuggestedDosage = (supplement, profile) => {
    if (!profile || !profile.weight) {
        return supplement.defaultDosage;
    }

    let suggested = supplement.defaultDosage;

    // Se tem dosagem por kg, calcula baseado no peso
    if (supplement.dosagePerKg && supplement.dosagePerKg > 0) {
        suggested = Math.round(profile.weight * supplement.dosagePerKg);
    }

    // Ajuste por gênero (mulheres geralmente precisam de dosagens ligeiramente menores)
    if (profile.gender === 'female') {
        // Reduz 10-15% para suplementos baseados em peso corporal
        if (['whey', 'creatine', 'bcaa', 'caffeine'].includes(supplement.id)) {
            suggested = Math.round(suggested * 0.85);
        }
    }

    // Ajustes por objetivo
    if (profile.goal === 'hipertrofia') {
        // Para hipertrofia, aumenta ligeiramente proteínas e creatina
        if (['whey', 'creatine', 'bcaa'].includes(supplement.id)) {
            suggested = Math.round(suggested * 1.1);
        }
    } else if (profile.goal === 'emagrecimento') {
        // Para emagrecimento, mantém ou reduz ligeiramente
        if (['whey'].includes(supplement.id)) {
            suggested = Math.round(suggested * 0.9);
        }
    }

    // Garante que está dentro dos limites
    suggested = Math.max(supplement.minDosage, Math.min(supplement.maxDosage, suggested));

    return suggested;
};

/**
 * Calcula meta diária de água baseada no peso e gênero
 * @param {number} weight - Peso em kg
 * @param {string} gender - Gênero ('male' ou 'female')
 * @returns {number} Meta em ml
 */
export const calculateWaterGoal = (weight, gender = 'male') => {
    if (!weight) return gender === 'female' ? 2000 : 2500;

    // Mulheres: 30ml por kg, Homens: 35ml por kg
    const mlPerKg = gender === 'female' ? 30 : 35;
    return Math.round(weight * mlPerKg);
};
