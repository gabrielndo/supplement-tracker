import AsyncStorage from '@react-native-async-storage/async-storage';

const AUTH_KEY = '@supplement_tracker:auth';

/**
 * Get current authenticated user
 * @returns {Promise<Object|null>} User object or null if not authenticated
 */
export const getAuthUser = async () => {
    try {
        const data = await AsyncStorage.getItem(AUTH_KEY);
        return data ? JSON.parse(data) : null;
    } catch (error) {
        console.error('Error getting auth user:', error);
        return null;
    }
};

/**
 * Save authenticated user
 * @param {Object} user - User object { id, name, email?, photoUrl?, authMethod }
 * @returns {Promise<boolean>} Success status
 */
export const saveAuthUser = async (user) => {
    try {
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify({
            ...user,
            createdAt: user.createdAt || new Date().toISOString(),
            lastLoginAt: new Date().toISOString(),
        }));
        return true;
    } catch (error) {
        console.error('Error saving auth user:', error);
        return false;
    }
};

/**
 * Update authenticated user data
 * @param {Object} updates - Partial user object to update
 * @returns {Promise<boolean>} Success status
 */
export const updateAuthUser = async (updates) => {
    try {
        const currentUser = await getAuthUser();
        if (!currentUser) return false;

        const updatedUser = {
            ...currentUser,
            ...updates,
            updatedAt: new Date().toISOString(),
        };

        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
        return true;
    } catch (error) {
        console.error('Error updating auth user:', error);
        return false;
    }
};

/**
 * Logout current user
 * @returns {Promise<boolean>} Success status
 */
export const logout = async () => {
    try {
        await AsyncStorage.removeItem(AUTH_KEY);
        return true;
    } catch (error) {
        console.error('Error logging out:', error);
        return false;
    }
};

/**
 * Check if user is authenticated
 * @returns {Promise<boolean>} Authentication status
 */
export const isAuthenticated = async () => {
    const user = await getAuthUser();
    return user !== null;
};
