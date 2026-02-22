import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';

const AUTH_KEY = '@supplement_tracker:auth';
const USERS_KEY = '@supplement_tracker:users';

// Hash a password using SHA-256
export const hashPassword = async (password) => {
    return await Crypto.digestStringAsync(
        Crypto.CryptoDigestAlgorithm.SHA256,
        password
    );
};

/**
 * Get current authenticated user
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
 * Save authenticated user (session)
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
 * Register a new user with email and password
 * Returns { success, error }
 */
export const registerWithEmail = async (name, email, password) => {
    try {
        const usersRaw = await AsyncStorage.getItem(USERS_KEY);
        const users = usersRaw ? JSON.parse(usersRaw) : [];

        const emailLower = email.trim().toLowerCase();
        if (users.find(u => u.email === emailLower)) {
            return { success: false, error: 'Este e-mail já está cadastrado.' };
        }

        const passwordHash = await hashPassword(password);
        const user = {
            id: `email_${Date.now()}`,
            name: name.trim(),
            email: emailLower,
            passwordHash,
            photoUrl: null,
            authMethod: 'email',
            createdAt: new Date().toISOString(),
        };

        users.push(user);
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));

        // Save session (without passwordHash)
        const { passwordHash: _, ...sessionUser } = user;
        await saveAuthUser(sessionUser);

        return { success: true, user: sessionUser };
    } catch (error) {
        console.error('Register error:', error);
        return { success: false, error: 'Erro ao criar conta. Tente novamente.' };
    }
};

/**
 * Login with email and password
 * Returns { success, error }
 */
export const loginWithEmail = async (email, password) => {
    try {
        const usersRaw = await AsyncStorage.getItem(USERS_KEY);
        const users = usersRaw ? JSON.parse(usersRaw) : [];

        const emailLower = email.trim().toLowerCase();
        const user = users.find(u => u.email === emailLower);

        if (!user) {
            return { success: false, error: 'E-mail não encontrado.' };
        }

        const passwordHash = await hashPassword(password);
        if (user.passwordHash !== passwordHash) {
            return { success: false, error: 'Senha incorreta.' };
        }

        const { passwordHash: _, ...sessionUser } = user;
        await saveAuthUser(sessionUser);

        return { success: true, user: sessionUser };
    } catch (error) {
        console.error('Login error:', error);
        return { success: false, error: 'Erro ao fazer login. Tente novamente.' };
    }
};

/**
 * Update authenticated user data
 */
export const updateAuthUser = async (updates) => {
    try {
        const currentUser = await getAuthUser();
        if (!currentUser) return false;
        const updatedUser = { ...currentUser, ...updates, updatedAt: new Date().toISOString() };
        await AsyncStorage.setItem(AUTH_KEY, JSON.stringify(updatedUser));
        return true;
    } catch (error) {
        console.error('Error updating auth user:', error);
        return false;
    }
};

/**
 * Logout current user
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
 */
export const isAuthenticated = async () => {
    const user = await getAuthUser();
    return user !== null;
};
