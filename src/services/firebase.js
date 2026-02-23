// Firebase configuration and initialization
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyDAGmLRwzEV54qPiBLZgS9Wpf8RnMDO7do",
    authDomain: "meussuple.firebaseapp.com",
    projectId: "meussuple",
    storageBucket: "meussuple.firebasestorage.app",
    messagingSenderId: "836407434116",
    appId: "1:836407434116:web:93a510c924c220d9c2dbd1",
    measurementId: "G-4TNMEQ7TMZ"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;
