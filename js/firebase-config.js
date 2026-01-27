// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyCf8ccXGbqCIZ-yySiQvIHTeHLKTZ8nyH4",
    authDomain: "kozygo-2f9d5.firebaseapp.com",
    projectId: "kozygo-2f9d5",
    storageBucket: "kozygo-2f9d5.firebasestorage.app",
    messagingSenderId: "487931695263",
    appId: "1:487931695263:web:dc605bf6bf9d0f203f12aa"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { auth, db };
