// src/firebase.ts
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyDUi-2wC4EXyOkZy4PiLH6DgQX07FcHIpE",
  authDomain: "os-rpmont-2025.firebaseapp.com",
  projectId: "os-rpmont-2025",
  storageBucket: "os-rpmont-2025.firebasestorage.app",
  messagingSenderId: "6083238815",
  appId: "1:6083238815:web:124c188c051d45ac753baa"
};

// Inicializa Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

export { app, analytics, db, auth, storage };
