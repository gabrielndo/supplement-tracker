/**
 * storage.js - Firestore + AsyncStorage hybrid
 * 
 * Strategy:
 * - Cache-first: reads from AsyncStorage immediately, syncs with Firestore in background
 * - Parallel Firestore calls via Promise.all (no more serial loops)
 * - Primary: Firestore (cloud, per-user)
 * - Fallback: AsyncStorage (offline / unauthenticated)
 * 
 * All Firestore data is stored under users/{uid}/...
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { doc, getDoc, setDoc, getDocs, collection } from 'firebase/firestore';
import { db, auth } from './firebase';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getUserId = () => auth.currentUser?.uid || null;

// Local cache keys
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
        // Save to local cache immediately
        await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(profile));

        // Persist to Firestore in background (don't await to block UI)
        const userId = uid || getUserId();
        if (userId) {
            setDoc(doc(db, 'users', userId, 'data', 'profile'), {
                ...profile,
                updatedAt: new Date().toISOString(),
            }).catch(e => console.warn('Firestore profile save failed:', e));
        }
        return true;
    } catch (error) {
        console.error('Error saving profile:', error);
        return false;
    }
};

export const getProfile = async (uid = null) => {
    try {
        // 1. Return local cache instantly
        const cached = await AsyncStorage.getItem(KEYS.PROFILE);
        if (cached) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('JSON parse error in getProfile:', e);
                return null;
            }
        }

        // 2. Cache miss → fetch from Firestore
        const userId = uid || getUserId();
        if (userId) {
            const ref = doc(db, 'users', userId, 'data', 'profile');
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                await AsyncStorage.setItem(KEYS.PROFILE, JSON.stringify(data));
                return data;
            }
        }
        return null;
    } catch (error) {
        console.error('Error getting profile:', error);
        const data = await AsyncStorage.getItem(KEYS.PROFILE);
        return data ? JSON.parse(data) : null;
    }
};

// ─── Supplements ──────────────────────────────────────────────────────────────

export const saveSupplements = async (supplements) => {
    try {
        // Save locally immediately
        await AsyncStorage.setItem(KEYS.SUPPLEMENTS, JSON.stringify(supplements));

        // Persist to Firestore in background
        const userId = getUserId();
        if (userId) {
            setDoc(doc(db, 'users', userId, 'data', 'supplements'), {
                list: supplements,
                updatedAt: new Date().toISOString(),
            }).catch(e => console.warn('Firestore supplements save failed:', e));
        }
        return true;
    } catch (error) {
        console.error('Error saving supplements:', error);
        return false;
    }
};

export const getSupplements = async () => {
    try {
        // 1. Return local cache instantly
        const cached = await AsyncStorage.getItem(KEYS.SUPPLEMENTS);
        if (cached !== null) {
            try {
                return JSON.parse(cached);
            } catch (e) {
                console.error('JSON parse error in getSupplements:', e);
                return [];
            }
        }

        // 2. Cache miss → fetch from Firestore
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
        return [];
    } catch (error) {
        console.error('Error getting supplements:', error);
        const data = await AsyncStorage.getItem(KEYS.SUPPLEMENTS);
        return data ? JSON.parse(data) : [];
    }
};

// ─── Water Log ────────────────────────────────────────────────────────────────

export const getWaterLog = async (date) => {
    try {
        // 1. Check local cache first
        const cached = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const localLogs = cached ? JSON.parse(cached) : {};
        if (localLogs[date]) return localLogs[date];

        // 2. Cache miss → fetch from Firestore
        const userId = getUserId();
        if (userId) {
            const ref = doc(db, 'users', userId, 'waterLog', date);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const data = snap.data();
                // Update local cache
                localLogs[date] = data;
                await AsyncStorage.setItem(KEYS.WATER_LOG, JSON.stringify(localLogs));
                return data;
            }
        }
        return { amount: 0, entries: [] };
    } catch (error) {
        console.error('Error getting water log:', error);
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        if (!data) return { amount: 0, entries: [] };
        try {
            const logs = JSON.parse(data);
            return logs[date] || { amount: 0, entries: [] };
        } catch (e) {
            console.error('JSON parse error in getWaterLog:', e);
            return { amount: 0, entries: [] };
        }
    }
};

export const addWaterEntry = async (date, amount) => {
    try {
        const current = await getWaterLog(date);
        const updated = {
            amount: (current.amount || 0) + amount,
            entries: [...(current.entries || []), { amount, time: new Date().toISOString() }],
        };

        // Update local immediately
        const data = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const logs = data ? JSON.parse(data) : {};
        logs[date] = updated;
        await AsyncStorage.setItem(KEYS.WATER_LOG, JSON.stringify(logs));

        // Persist to Firestore in background
        const userId = getUserId();
        if (userId) {
            setDoc(doc(db, 'users', userId, 'waterLog', date), updated)
                .catch(e => console.warn('Firestore water save failed:', e));
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

        // Persist to Firestore in background
        const userId = getUserId();
        if (userId) {
            setDoc(doc(db, 'users', userId, 'waterLog', date), updated)
                .catch(e => console.warn('Firestore water remove failed:', e));
        }
        return updated;
    } catch (error) {
        console.error('Error removing water entry:', error);
        return null;
    }
};

export const getWaterHistory = async (days = 7) => {
    try {
        // Read all local cache at once (single AsyncStorage call)
        const cached = await AsyncStorage.getItem(KEYS.WATER_LOG);
        const localLogs = cached ? JSON.parse(cached) : {};

        // Build date list
        const dates = Array.from({ length: days }, (_, i) => {
            const date = new Date();
            date.setDate(date.getDate() - i);
            return date.toISOString().split('T')[0];
        });

        // Find which dates are missing in local cache
        const missingDates = dates.filter(d => !localLogs[d]);

        // Fetch all missing dates FROM FIRESTORE IN PARALLEL (not serial)
        if (missingDates.length > 0) {
            const userId = getUserId();
            if (userId) {
                const fetches = missingDates.map(date =>
                    getDoc(doc(db, 'users', userId, 'waterLog', date))
                        .then(snap => ({ date, data: snap.exists() ? snap.data() : null }))
                        .catch(() => ({ date, data: null }))
                );
                const results = await Promise.all(fetches);
                for (const { date, data } of results) {
                    localLogs[date] = data || { amount: 0, entries: [] };
                }
                // Update local cache once with all fetched data
                await AsyncStorage.setItem(KEYS.WATER_LOG, JSON.stringify(localLogs));
            }
        }

        return dates
            .map(date => ({ date, amount: localLogs[date]?.amount || 0 }))
            .reverse();
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

        // Persist to Firestore in background
        const userId = getUserId();
        if (userId) {
            setDoc(doc(db, 'users', userId, 'consumption', date), {
                taken: logs[date],
                updatedAt: new Date().toISOString(),
            }).catch(e => console.warn('Firestore consumption save failed:', e));
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

            // Persist to Firestore in background
            const userId = getUserId();
            if (userId) {
                setDoc(doc(db, 'users', userId, 'consumption', date), {
                    taken: logs[date],
                    updatedAt: new Date().toISOString(),
                }).catch(e => console.warn('Firestore consumption remove failed:', e));
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
        // 1. Check local cache first
        const cached = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        let localLogs = {};
        if (cached) {
            try {
                localLogs = JSON.parse(cached);
                if (localLogs[date] !== undefined) return localLogs[date];
            } catch (e) {
                console.error('JSON parse error in getConsumptionLog:', e);
            }
        }

        // 2. Cache miss → Firestore
        const userId = getUserId();
        if (userId) {
            const ref = doc(db, 'users', userId, 'consumption', date);
            const snap = await getDoc(ref);
            if (snap.exists()) {
                const taken = snap.data().taken || [];
                localLogs[date] = taken;
                await AsyncStorage.setItem(KEYS.CONSUMPTION_LOG, JSON.stringify(localLogs));
                return taken;
            }
        }
        return [];
    } catch (error) {
        const data = await AsyncStorage.getItem(KEYS.CONSUMPTION_LOG);
        const logs = data ? JSON.parse(data) : {};
        return logs[date] || [];
    }
};

export const getStreak = async () => {
    try {
        // Use local cache only — supplements and consumption are always kept in sync locally
        const [supplementsRaw, consumptionRaw] = await Promise.all([
            AsyncStorage.getItem(KEYS.SUPPLEMENTS),
            AsyncStorage.getItem(KEYS.CONSUMPTION_LOG),
        ]);
        const supplements = supplementsRaw ? JSON.parse(supplementsRaw) : [];
        const logs = consumptionRaw ? JSON.parse(consumptionRaw) : {};
        if (supplements.length === 0) return 0;

        // Check last 30 days for streak
        let streak = 0;
        const today = new Date();
        for (let i = 0; i < 30; i++) {
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
        // Read both caches in parallel — no Firestore needed
        const [supplementsRaw, consumptionRaw] = await Promise.all([
            AsyncStorage.getItem(KEYS.SUPPLEMENTS),
            AsyncStorage.getItem(KEYS.CONSUMPTION_LOG),
        ]);
        const supplements = supplementsRaw ? JSON.parse(supplementsRaw) : [];
        const logs = consumptionRaw ? JSON.parse(consumptionRaw) : {};

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

// Legacy compatibility
export const saveAuthUser = async () => true;
export const updateAuthUser = async () => true;
