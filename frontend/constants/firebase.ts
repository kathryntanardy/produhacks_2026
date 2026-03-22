import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyBaEiqr2w7SYMJqsuDvgW6shQ8x3u0ngQU",
    authDomain: "creditapp-2a0c5.firebaseapp.com",
    projectId: "creditapp-2a0c5",
    storageBucket: "creditapp-2a0c5.firebasestorage.app",
    messagingSenderId: "463448160758",
    appId: "1:463448160758:web:345eb55a6fc1b90ec16fd7",
    measurementId: "G-P337LG872Q"
};

const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

export default app;