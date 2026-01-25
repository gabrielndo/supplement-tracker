import { getWaterHistory, getConsumptionHistory, getStreak, getSupplements, getStoredAchievements, saveStoredAchievements } from '../services/storage';
import { sendAchievementNotification } from '../services/notifications';

/**
 * Achievement definitions with criteria and icons
 */
export const ACHIEVEMENTS = {
    // Hydration Achievements
    FIRST_WATER: {
        id: 'FIRST_WATER',
        title: 'Primeira Gota',
        description: 'Registrou água pela primeira vez',
        icon: '💧',
        category: 'water',
        check: async () => {
            const history = await getWaterHistory(30);
            return history.some(day => day.amount > 0);
        },
    },
    HYDRATION_MASTER: {
        id: 'HYDRATION_MASTER',
        title: 'Mestre da Hidratação',
        description: 'Atingiu a meta de água 7 dias seguidos',
        icon: '🏆',
        category: 'water',
        check: async (goal = 2000) => {
            const history = await getWaterHistory(7);
            return history.length >= 7 && history.every(day => day.amount >= goal);
        },
    },
    HYDRATION_LEGEND: {
        id: 'HYDRATION_LEGEND',
        title: 'Lenda da Hidratação',
        description: 'Atingiu a meta de água 30 dias seguidos',
        icon: '👑',
        category: 'water',
        check: async (goal = 2000) => {
            const history = await getWaterHistory(30);
            return history.length >= 30 && history.every(day => day.amount >= goal);
        },
    },
    OCEAN_DRINKER: {
        id: 'OCEAN_DRINKER',
        title: 'Bebedor de Oceanos',
        description: 'Bebeu mais de 100 litros no total',
        icon: '🌊',
        category: 'water',
        check: async () => {
            const history = await getWaterHistory(365);
            const total = history.reduce((sum, day) => sum + day.amount, 0);
            return total >= 100000; // 100 liters
        },
    },

    // Supplement Achievements
    FIRST_SUPPLEMENT: {
        id: 'FIRST_SUPPLEMENT',
        title: 'Primeiro Passo',
        description: 'Tomou um suplemento pela primeira vez',
        icon: '💊',
        category: 'supplements',
        check: async () => {
            const history = await getConsumptionHistory(30);
            return history.some(day => day.taken > 0);
        },
    },
    WEEK_STREAK: {
        id: 'WEEK_STREAK',
        title: 'Semana Perfeita',
        description: 'Manteve streak de 7 dias',
        icon: '🔥',
        category: 'supplements',
        check: async () => {
            const streak = await getStreak();
            return streak >= 7;
        },
    },
    MONTH_STREAK: {
        id: 'MONTH_STREAK',
        title: 'Mês de Ouro',
        description: 'Manteve streak de 30 dias',
        icon: '⭐',
        category: 'supplements',
        check: async () => {
            const streak = await getStreak();
            return streak >= 30;
        },
    },
    CENTURY_STREAK: {
        id: 'CENTURY_STREAK',
        title: 'Centurião',
        description: 'Manteve streak de 100 dias',
        icon: '💎',
        category: 'supplements',
        check: async () => {
            const streak = await getStreak();
            return streak >= 100;
        },
    },
    SUPPLEMENT_MASTER: {
        id: 'SUPPLEMENT_MASTER',
        title: 'Mestre dos Suplementos',
        description: 'Cadastrou 5 suplementos',
        icon: '🧪',
        category: 'supplements',
        check: async () => {
            const supplements = await getSupplements();
            return supplements.length >= 5;
        },
    },

    // General Achievements
    EARLY_BIRD: {
        id: 'EARLY_BIRD',
        title: 'Madrugador',
        description: 'Registrou atividade antes das 7h',
        icon: '🌅',
        category: 'general',
        check: async () => {
            // This would need time tracking in entries
            return false;
        },
    },
    CONSISTENT_USER: {
        id: 'CONSISTENT_USER',
        title: 'Usuário Dedicado',
        description: 'Usou o app 14 dias seguidos',
        icon: '📱',
        category: 'general',
        check: async () => {
            const history = await getConsumptionHistory(14);
            const waterHistory = await getWaterHistory(14);
            let daysActive = 0;
            for (let i = 0; i < Math.min(history.length, waterHistory.length); i++) {
                if (history[i].taken > 0 || waterHistory[i].amount > 0) {
                    daysActive++;
                }
            }
            return daysActive >= 14;
        },
    },
};

/**
 * Get all achievements with their unlock status
 * @param {number} waterGoal - Daily water goal for goal-based checks
 * @returns {Promise<Array>} Array of achievements with unlocked status
 */
export const getAllAchievements = async (waterGoal = 2000) => {
    const results = [];

    for (const key of Object.keys(ACHIEVEMENTS)) {
        const achievement = ACHIEVEMENTS[key];
        let unlocked = false;

        try {
            unlocked = await achievement.check(waterGoal);
        } catch (error) {
            console.error(`Error checking achievement ${key}:`, error);
        }

        results.push({
            ...achievement,
            unlocked,
        });
    }

    return results;
};

/**
 * Get unlocked achievements only
 * @param {number} waterGoal - Daily water goal
 * @returns {Promise<Array>} Array of unlocked achievements
 */
export const getUnlockedAchievements = async (waterGoal = 2000) => {
    const all = await getAllAchievements(waterGoal);
    return all.filter(a => a.unlocked);
};

/**
 * Get achievement counts by category
 * @param {number} waterGoal - Daily water goal
 * @returns {Promise<Object>} Counts by category
 */
export const getAchievementStats = async (waterGoal = 2000) => {
    const all = await getAllAchievements(waterGoal);
    const unlocked = all.filter(a => a.unlocked);

    const byCategory = {
        water: { total: 0, unlocked: 0 },
        supplements: { total: 0, unlocked: 0 },
        general: { total: 0, unlocked: 0 },
    };

    all.forEach(a => {
        byCategory[a.category].total++;
        if (a.unlocked) {
            byCategory[a.category].unlocked++;
        }
    });

    return {
        total: all.length,
        unlocked: unlocked.length,
        percentage: Math.round((unlocked.length / all.length) * 100),
        byCategory,
    };
};

/**
 * Check for newly unlocked achievements and notify the user
 * This should be called after water/supplement actions
 * @param {number} waterGoal - Daily water goal
 * @returns {Promise<Array>} Newly unlocked achievements
 */
export const checkAndNotify = async (waterGoal = 2000) => {
    try {
        // 1. Get currently unlocked based on data
        const currentUnlockedList = await getAllAchievements(waterGoal);
        const currentUnlockedIds = currentUnlockedList
            .filter(a => a.unlocked)
            .map(a => a.id);

        // 2. Get previously stored unlocked IDs
        const storedIds = await getStoredAchievements();

        // 3. Find new ones
        const newIds = currentUnlockedIds.filter(id => !storedIds.includes(id));

        if (newIds.length > 0) {
            // 4. Save new complete list
            await saveStoredAchievements(currentUnlockedIds);

            // 5. Notify for each new achievement
            for (const id of newIds) {
                const achievement = currentUnlockedList.find(a => a.id === id);
                if (achievement) {
                    await sendAchievementNotification(achievement.title);
                }
            }
        }

        return newIds;
    } catch (error) {
        console.error('Error in checkAndNotify:', error);
        return [];
    }
};
