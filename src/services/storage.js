/**
 * storage.js - Firestore + AsyncStorage hybrid
 * 
 * Strategy:
 * - Primary: Firestore (cloud, per-user)
 * - Fallback: AsyncStorage (offline / unauthenticated)
 * 
 * All Firestore data is stored under users/{uid}/...
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, updateDoc } from 'firebase/firestore';
import { db, auth } from './firebase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUserId = () => auth.currentUser?.uid || null;

const userDoc = (path) => {
    const uid = getUserId();
    if (!uid) return null;
    return doc(db, 'users', uid, ...path.split('/'));
};

// Local cache keys (fallback when offline / not logged in)
const KEYS = {
    PROFILE: '@supplement_tracker_profile',
    SUPPLEMENTS: '@supplement_tracker_supplements',
    WATER_LOG: '@supplement_tracker_water',
    CONSUMPTION_LOG: '@supplement_tracker_consumption',
    SETTINGS: '@supplement_tracker_settings',
    WATER_REMINDERS: '@supplement_tracker_water_reminders',
    WATER_CELEBRATION: '@supplement_tracker_water_celebration',
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const saveProfile = async (profile, uid = null) => {
    try {
        // Save to AsyncStorage (local cache)
        await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));

        // Save to Firestore if authenticated
        const userId = uid || getUserId();
        if (userId) {
            await setDoc(doc(db, 'users', userId, 'data', 'profile'), {
                ...profile,
                updatedAt: new Date().toISOString(),
            });
        }
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        return false;
    }
};

export const getProfile = async (uid = null) => {
    try {
        // Try Firestore first if authenticated
        const userId = uid || getUserId();
        if (userId) {
            const ref = doc(db, 'users', userId, 'data', 'profile');
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                // Update local cache
                await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(data));
                return data;
            }
        }
        // Fallback to local cache
        const data = await AsyncStorage.getItem(KEYS.PROFILE);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting profile:', error);
        // Fallback to local
        const data = await AsyncStorage.getItem(KEYS.PROFILE);
        return data ? JSON.parse(data) : null;
    }
};

// ─── Supplements ──────────────────────────────────────────────────────────────

export const saveSupplements = async (supplements) => {
    try {
        await AsyncStorage.setItem(KEYS.SUPPLEMENTS, JSON.stringify(supplements));

        const userId = getUserId();
        if (userId) {
            await setDoc(doc(db, 'users', userId, 'data', 'supplements'), {
                list: supplements,
                updatedAt: new Date().toISOString(),
            });
        }
        return true;
    } catch (error) {
        console.error('Error saving supplements:', error);
        return false;
    }
};

export const getSupplements = async () => {
    try {
        const userId = getUserId();
        if (userId) {
            const ref = doc(db, 'users', userId, 'data', 'supplements');
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data().list || [];
                await AsyncStorage.setItem(KEYS.SUPPLEMENTS, JSON.stringify(data));
                return data;
            }
        }
        const data = await AsyncStorage.getItem(KEYS.SUPPLEMENTS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        console.error('Error getting supplements:', error);
        const data = await AsyncStorage.getItem(KEYS.SUPPLEMENTS);
        return data ? JSON.parse(data) : [];
    }
};

// ─── Water Log ────────────────────────────────────────────────────────────────

export const getWaterLog = async (date) => {
    try {
        const userId = getUserId();
        if (userId) {
            const ref = doc(db, 'users', userId, 'waterLog', date);
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data();
        }
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};
        return logs[date] || { amount: 0, entries: [] };
    } catch (error) {
        console.error('Error getting water log:', error);
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};
        return logs[date] || { amount: 0, entries: [] };
    }
};

export const addWaterEntry = async (date, amount) => {
    try {
        const current = await getWaterLog(date);
        const updated = {
            amount: (current.amount || 0) + amount,
            entries: [...(current.entries || []), { amount, time: new Date().toISOString() }],
        };

        // Update local
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};
        logs[date] = updated;
        await AsyncStorage.setItem(KEYS.WATER_LOG, JSON.stringify(logs));

        // Update Firestore
        const userId = getUserId();
        if (userId) {
            await setDoc(doc(db, 'users', userId, 'waterLog', date), updated);
        }
        return updated;
    } catch (error) {
        console.error('Error adding water entry:', error);
        return null;
    }
};

export const removeWaterEntry = async (date, entryIndex) => {
    try {
        const current = await getWaterLog(date);
        if (!current.entries?.[entryIndex]) return null;

        const removedAmount = current.entries[entryIndex].amount;
        const updated = {
            amount: Math.max(0, (current.amount || 0) - removedAmount),
            entries: current.entries.filter((_, i) => i !== entryIndex),
        };

        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};
        logs[date] = updated;
        await AsyncStorage.setItem(KEYS.WATER_LOG, JSON.stringify(logs));

        const userId = getUserId();
        if (userId) {
            await setDoc(doc(db, 'users', userId, 'waterLog', date), updated);
        }
        return updated;
    } catch (error) {
        console.error('Error removing water entry:', error);
        return null;
    }
};

export const getWaterHistory = async (days = 7) => {
    try {
        const history = [];
        for (let i = 0; i < days; i++) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const dateStr = date.toISOString().split('T')[0];
            const log = await getWaterLog(dateStr);
            history.unshift({ date: dateStr, amount: log.amount || 0 });
        }
        return history;
    } catch (error) {
        console.error('Error getting water history:', error);
        return [];
    }
};

// ─── Water Reminders ──────────────────────────────────────────────────────────

export const getWaterReminders = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_REMINDERS);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
};

export const saveWaterReminders = async (reminders) => {
    try {
        await AsyncStorage.setItem(KEYS.WATER_REMINDERS, JSON.stringify(reminders));
        return true;
    } catch (error) {
        return false;
    }
};

// ─── Consumption Log ─────────────────────────────────────────────────────────

export const logConsumption = async (supplementId, date) => {
    try {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};
        if (!logs[date]) logs[date] = [];
        if (!logs[date].includes(supplementId)) logs[date].push(supplementId);
        await AsyncStorage.setItem(KEYS.CONSUMPTION_LOG, JSON.stringify(logs));

        const userId = getUserId();
        if (userId) {
            await setDoc(doc(db, 'users', userId, 'consumption', date), {
                taken: logs[date],
                updatedAt: new Date().toISOString(),
            });
        }
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

            const userId = getUserId();
            if (userId) {
                await setDoc(doc(db, 'users', userId, 'consumption', date), {
                    taken: logs[date],
                    updatedAt: new Date().toISOString(),
                });
            }
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
        const userId = getUserId();
        if (userId) {
            const ref = doc(db, 'users', userId, 'consumption', date);
            const snap = await getDoc(ref);
            if (snap.exists()) return snap.data().taken || [];
        }
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};
        return logs[date] || [];
    } catch (error) {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};
        return logs[date] || [];
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

            const supplementsOnDate = supplements.filter(s => {
                if (!s.addedAt) return true;
                return new Date(s.addedAt).getTime() <= dateTimestamp;
            });

            if (supplementsOnDate.length === 0) {
                if (i > 0) break;
                continue;
            }

            const dailyLog = logs[dateStr] || [];
            const allTaken = supplementsOnDate.every(s => dailyLog.includes(s.id));
            if (allTaken) streak++;
            else if (i > 0) break;
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
                    ? Math.round((dailyLog.length / supplements.length) * 100) : 0,
            });
        }
        return history;
    } catch (error) {
        return [];
    }
};

// ─── Celebrations ─────────────────────────────────────────────────────────────

export const hasShownCelebrationToday = async () => {
    try {
        const data = await AsyncStorage.getItem(KEYS.WATER_CELEBRATION);
        if (!data) return false;
        const { date } = JSON.parse(data);
        return date === new Date().toISOString().split('T')[0];
    } catch (error) {
        return false;
    }
};

export const markCelebrationShown = async () => {
    try {
        await AsyncStorage.setItem(KEYS.WATER_CELEBRATION, JSON.stringify({
            date: new Date().toISOString().split('T')[0],
        }));
        return true;
    } catch (error) {
        return false;
    }
};

// ─── Achievements ─────────────────────────────────────────────────────────────

const ACHIEVEMENTS_KEY = '@supplement_tracker_achievements_unlocked';

export const getStoredAchievements = async () => {
    try {
        const data = await AsyncStorage.getItem(ACHIEVEMENTS_KEY);
        return data ? JSON.parse(data) : [];
    } catch (error) {
        return [];
    }
};

export const saveStoredAchievements = async (achievementIds) => {
    try {
        await AsyncStorage.setItem(ACHIEVEMENTS_KEY, JSON.stringify(achievementIds));
        return true;
    } catch (error) {
        return false;
    }
};
