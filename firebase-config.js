// ===== FIREBASE CONFIG =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyC3RaEL4yubFllJOJGNMaj-k9VCXDjQ51s",
  authDomain: "aluth-f60ff.firebaseapp.com",
  projectId: "aluth-f60ff",
  storageBucket: "aluth-f60ff.firebasestorage.app",
  messagingSenderId: "768882751920",
  appId: "1:768882751920:web:1ade0f4d59bbc43411be75",
  measurementId: "G-BM3QJTGLTM"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);