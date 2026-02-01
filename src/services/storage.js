import AsyncStorage from '@react-native-async-storage/async-storage';

const KEYS = {
    PROFILE: '@supplement_tracker_profile',
    SUPPLEMENTS: '@supplement_tracker_supplements',
    WATER_LOG: '@supplement_tracker_water',
    CONSUMPTION_LOG: '@supplement_tracker_consumption',
    SETTINGS: '@supplement_tracker_settings',
    WATER_REMINDERS: '@supplement_tracker_water_reminders',
    WATER_CELEBRATION: '@supplement_tracker_water_celebration',
};

// Profile Management
export const saveProfile = async (profile) => {
    try {
        await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        return false;
    }
};

export const getProfile = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.PROFILE);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting profile:', error);
        return null;
    }
};

// Supplements Management
export const saveSupplements = async (supplements) => {
    try {
        await AsyncStorage.setItem(KEYS.SUPPLEMENTS, JSON.stringify(supplements));
        return true;
    } catch (error) {
        console.error('Error saving supplements:', error);
        return false;
    }
};

export const getSupplements = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.SUPPLEMENTS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting supplements:', error);
        return [];
    }
};

// Water Log Management
export const getWaterLog = async (date) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};
        return logs[date] || { amount: 0, entries: [] };
    } catch (error) {
        console.error('Error getting water log:', error);
        return { amount: 0, entries: [] };
    }
};

export const addWaterEntry = async (date, amount) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};

        if (!logs[date]) {
            logs[date] = { amount: 0, entries: [] };
        }

        logs[date].amount += amount;
        logs[date].entries.push({
            amount,
            time: new Date().toISOString(),
        });

        await AsyncStorage.setItem(KEYS.WATER_LOG, JSON.stringify(logs));
        return logs[date];
    } catch (error) {
        console.error('Error adding water entry:', error);
        return null;
    }
};

export const removeWaterEntry = async (date, entryIndex) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};

        if (!logs[date] || !logs[date].entries[entryIndex]) {
            return null;
        }

        const removedEntry = logs[date].entries[entryIndex];
        logs[date].amount -= removedEntry.amount;
        logs[date].entries.splice(entryIndex, 1);

        // Ensure amount doesn't go negative
        if (logs[date].amount < 0) logs[date].amount = 0;

        await AsyncStorage.setItem(KEYS.WATER_LOG, JSON.stringify(logs));
        return logs[date];
    } catch (error) {
        console.error('Error removing water entry:', error);
        return null;
    }
};

export const getWaterHistory = async (days = 7) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};
        const history = [];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            history.unshift({
                date: dateStr,
                amount: logs[dateStr]?.amount || 0,
            });
        }

        return history;
    } catch (error) {
        console.error('Error getting water history:', error);
        return [];
    }
};

// Water Reminders Management
export const getWaterReminders = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_REMINDERS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting water reminders:', error);
        return [];
    }
};

export const saveWaterReminders = async (reminders) => {
    try {
        await AsyncStorage.setItem(KEYS.WATER_REMINDERS, JSON.stringify(reminders));
        return true;
    } catch (error) {
        console.error('Error saving water reminders:', error);
        return false;
    }
};

// Consumption Log Management
export const logConsumption = async (supplementId, date) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};

        if (!logs[date]) {
            logs[date] = [];
        }

        if (!logs[date].includes(supplementId)) {
            logs[date].push(supplementId);
        }

        await AsyncStorage.setItem(KEYS.CONSUMPTION_LOG, JSON.stringify(logs));
        return true;
    } catch (error) {
        console.error('Error logging consumption:', error);
        return false;
    }
};

export const removeConsumption = async (supplementId, date) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};

        if (!logs[date]) return false;

        const index = logs[date].indexOf(supplementId);
        if (index > -1) {
            logs[date].splice(index, 1);
            await AsyncStorage.setItem(KEYS.CONSUMPTION_LOG, JSON.stringify(logs));
            return true;
        }
        return false;
    } catch (error) {
        console.error('Error removing consumption:', error);
        return false;
    }
};

export const getConsumptionLog = async (date) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};
        return logs[date] || [];
    } catch (error) {
        console.error('Error getting consumption log:', error);
        return [];
    }
};

export const getStreak = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};
        const supplements = await getSupplements();

        if (supplements.length === 0) return 0;

        let streak = 0;
        const today = new Date();

        for (let i = 0; i < 365; i++) {
            const date = new Date(today);
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dateTimestamp = date.getTime();

            // Filter supplements that existed on this date
            const supplementsExistingOnDate = supplements.filter(s => {
                if (!s.addedAt) return true; // Legacy supplements without addedAt
                const addedDate = new Date(s.addedAt);
                return addedDate.getTime() <= dateTimestamp;
            });

            if (supplementsExistingOnDate.length === 0) {
                // No supplements existed on this date
                if (i > 0) break;
                continue;
            }

            const dailyLog = logs[dateStr] || [];
            const allTaken = supplementsExistingOnDate.every(s => dailyLog.includes(s.id));

            if (allTaken) {
                streak++;
            } else if (i > 0) {
                break;
            }
        }

        return streak;
    } catch (error) {
        console.error('Error calculating streak:', error);
        return 0;
    }
};

export const getConsumptionHistory = async (days = 7) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};
        const supplements = await getSupplements();
        const history = [];

        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const dailyLog = logs[dateStr] || [];

            history.unshift({
                date: dateStr,
                taken: dailyLog.length,
                total: supplements.length,
                percentage: supplements.length > 0
                    ? Math.round((dailyLog.length / supplements.length) * 100)
                    : 0,
            });
        }

        return history;
    } catch (error) {
        console.error('Error getting consumption history:', error);
        return [];
    }
};

// Water Celebration Management
export const hasShownCelebrationToday = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_CELEBRATION);
        if (!data) return false;

        const { date } = JSON.parse(data);
        const today = new Date().toISOString().split('T')[0];
        return date === today;
    } catch (error) {
        console.error('Error checking celebration status:', error);
        return false;
    }
};

export const markCelebrationShown = async () => {
    try {
        const today = new Date().toISOString().split('T')[0];
        await AsyncStorage.setItem(KEYS.WATER_CELEBRATION, JSON.stringify({ date: today }));
        return true;
    } catch (error) {
        console.error('Error marking celebration:', error);
        return false;
    }
};

// Achievement Persistence
const KEYS_ACHIEVEMENTS_UNLOCKED = '@supplement_tracker_achievements_unlocked';

export const getStoredAchievements = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS_ACHIEVEMENTS_UNLOCKED);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting stored achievements:', error);
        return [];
    }
};

export const saveStoredAchievements = async (achievementIds) => {
    try {
        await AsyncStorage.setItem(KEYS_ACHIEVEMENTS_UNLOCKED, JSON.stringify(achievementIds));
        return true;
    } catch (error) {
        console.error('Error saving stored achievements:', error);
        return false;
    }
};
