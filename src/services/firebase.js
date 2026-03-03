// Firebase configuration and initialization
import { initializeApp, getApps } from 'firebase/app';
import { initializeAuth, getAuth, getReactNativePersistence } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import AsyncStorage from '@react-native-async-storage/async-storage';

const firebaseConfig = {
    apiKey: "AIzaSyDAGmLRwzEV54qPiBLZgS9Wpf8RnMDO7do",
    authDomain: "meussuple.firebaseapp.com",
    projectId: "meussuple",
    storageBucket: "meussuple.firebasestorage.app",
    messagingSenderId: "836407434116",
    appId: "1:836407434116:web:93a510c924c220d9c2dbd1",
    measurementId: "G-4TNMEQ7TMZ"
};

// Prevent re-initialization on hot reload
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

// initializeAuth with persistence (guard against double-init)
let auth;
try {
    auth = initializeAuth(app, {
        persistence: getReactNativePersistence(AsyncStorage),
    });
} catch (e) {
    // Already initialized — fallback
    auth = getAuth(app);
}

export { auth };
export const db = getFirestore(app);

export default app;
