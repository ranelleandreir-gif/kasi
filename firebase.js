// firebase.js

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

// 🔥 PASTE MO CONFIG MO DITO
const firebaseConfig = {
  apiKey: "AIzaSyAw_VjcITG-Rltan00gLQF7gui64O1hfPo",
  authDomain: "kasi-76cbd.firebaseapp.com",
  projectId: "kasi-76cbd",
  storageBucket: "kasi-76cbd.firebasestorage.app",
  messagingSenderId: "887548997152",
  appId: "1:887548997152:web:ce02811972446a86a15645",
  measurementId: "G-8VXVFSGFRV"
};


const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);