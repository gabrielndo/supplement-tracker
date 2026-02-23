import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signOut,
    updateProfile,
    onAuthStateChanged,
    sendPasswordResetEmail,
} from 'firebase/auth';
import { auth } from './firebase';

/**
 * Get current authenticated user (Firebase)
 */
export const getAuthUser = () => {
    const user = auth.currentUser;
    if (!user) return null;
    return {
        id: user.uid,
        name: user.displayName || 'Usuário',
        email: user.email,
        photoUrl: user.photoURL,
        authMethod: 'email',
    };
};

/**
 * Reset Password
 */
export const resetPassword = async (email) => {
    try {
        await sendPasswordResetEmail(auth, email.trim());
        return { success: true };
    } catch (error) {
        let message = 'Erro ao enviar e-mail de recuperação. Tente novamente.';
        if (error.code === 'auth/user-not-found') message = 'E-mail não encontrado.';
        if (error.code === 'auth/invalid-email') message = 'E-mail inválido.';
        return { success: false, error: message };
    }
};

/**
 * Listen to auth state changes
 */
export const onAuthStateChange = (callback) => {
    return onAuthStateChanged(auth, (user) => {
        if (user) {
            callback({
                id: user.uid,
                name: user.displayName || 'Usuário',
                email: user.email,
                photoUrl: user.photoURL,
                authMethod: user.providerData[0]?.providerId === 'google.com' ? 'google' : 'email',
            });
        } else {
            callback(null);
        }
    });
};

/**
 * Register with email and password
 */
export const registerWithEmail = async (name, email, password) => {
    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
        // Set display name
        await updateProfile(userCredential.user, { displayName: name.trim() });
        return {
            success: true,
            user: {
                id: userCredential.user.uid,
                name: name.trim(),
                email: userCredential.user.email,
                photoUrl: null,
                authMethod: 'email',
            }
        };
    } catch (error) {
        let message = 'Erro ao criar conta. Tente novamente.';
        if (error.code === 'auth/email-already-in-use') message = 'Este e-mail já está cadastrado.';
        if (error.code === 'auth/invalid-email') message = 'E-mail inválido.';
        if (error.code === 'auth/weak-password') message = 'Senha muito fraca. Use pelo menos 6 caracteres.';
        return { success: false, error: message };
    }
};

/**
 * Login with email and password
 */
export const loginWithEmail = async (email, password) => {
    try {
        const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
        const user = userCredential.user;
        return {
            success: true,
            user: {
                id: user.uid,
                name: user.displayName || 'Usuário',
                email: user.email,
                photoUrl: user.photoURL,
                authMethod: 'email',
            }
        };
    } catch (error) {
        let message = 'Erro ao fazer login. Tente novamente.';
        if (error.code === 'auth/user-not-found') message = 'E-mail não encontrado.';
        if (error.code === 'auth/wrong-password') message = 'Senha incorreta.';
        if (error.code === 'auth/invalid-credential') message = 'E-mail ou senha incorretos.';
        if (error.code === 'auth/too-many-requests') message = 'Muitas tentativas. Tente mais tarde.';
        return { success: false, error: message };
    }
};

/**
 * Logout
 */
export const logout = async () => {
    try {
        await signOut(auth);
        return true;
    } catch (error) {
        console.error('Logout error:', error);
        return false;
    }
};

/**
 * Check if authenticated
 */
export const isAuthenticated = () => {
    return auth.currentUser !== null;
};

// Legacy compatibility - kept for any code still using these
export const saveAuthUser = async () => true;
export const updateAuthUser = async () => true;
