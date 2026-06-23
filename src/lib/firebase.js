// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBjfI2hm7hwWCi-GWu-fGrs9G0B7FNun8M",
  authDomain: "checkmateprochess-27d5d.firebaseapp.com",
  databaseURL: "https://checkmateprochess-27d5d-default-rtdb.firebaseio.com",
  projectId: "checkmateprochess-27d5d",
  storageBucket: "checkmateprochess-27d5d.firebasestorage.app",
  messagingSenderId: "875509479965",
  appId: "1:875509479965:web:9fcf8e29885f14ca5f24f4",
  measurementId: "G-ZCVXJV9QVP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);