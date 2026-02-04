import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged,
    sendEmailVerification,
    signOut,
    GoogleAuthProvider,
    signInWithPopup
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// --- 1. ADVANCED DAILY THEME ENGINE (Matches Dashboard) ---
function setDailyTheme() {
    const dayIndex = new Date().getDay(); // 0 = Sunday...

    // Your Exact Coolors Palettes
    const themes = [
        // Sunday: Earthy & Warm (Peach to Brown)
        { bg: "#edc4b3", card: "#fff8f5", primary: "#9d6b53", text: "#774936" },
        // Monday: Purple Lavender (Soft & dreamy)
        { bg: "#dec9e9", card: "#fcfaff", primary: "#815ac0", text: "#6247aa" },
        // Tuesday: Forest (Nature Green)
        { bg: "#a7c957", card: "#f4f9ed", primary: "#386641", text: "#1a2f1e" },
        // Wednesday: Berry Pink (Romantic)
        { bg: "#fff0f3", card: "#ffffff", primary: "#c9184a", text: "#590d22" },
        // Thursday: Deep Ocean (Dark Mode!)
        { bg: "#002029", card: "#00303d", primary: "#00607a", text: "#e6f1f5" },
        // Friday: Sunshine (Yellow/Gold)
        { bg: "#fff75e", card: "#fffeea", primary: "#fdbe39", text: "#4a3b00" },
        // Saturday: Mint Fresh (Cool Green)
        { bg: "#d8f3dc", card: "#f0fdf4", primary: "#2d6a4f", text: "#081c15" }
    ];

    const theme = themes[dayIndex];
    const root = document.documentElement;

    // Apply colors to CSS Variables
    root.style.setProperty('--bg-body', theme.bg);
    root.style.setProperty('--bg-card', theme.card);
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-pink', theme.primary); // Legacy support
    root.style.setProperty('--text-main', theme.text);

    // Dark mode text adjustment (Thursday)
    if (dayIndex === 4) { 
        root.style.setProperty('--text-muted', '#94a3b8'); 
    } else {
        root.style.setProperty('--text-muted', '#6b7280');
    }
    console.log(`🎨 Auth Theme set to Day ${dayIndex}`);
}

// Run immediately so the login page has the right color
setDailyTheme(); 

// --- DOM Elements ---
const form = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-auth');
const errorMsg = document.getElementById('error-message');
const toggleTextContainer = document.querySelector('.toggle-text');
const googleBtn = document.getElementById('google-btn');

let isLogin = true;

// 1. Auth Guard (Redirects if Verified)
onAuthStateChanged(auth, (user) => {
    if (user) {
        if (user.emailVerified) {
            window.location.href = "dashboard.html";
        } else {
            // Logged in but not verified -> Do nothing (wait for them to check email)
            console.log("User logged in but not verified.");
        }
    }
});

// 2. Google Login
googleBtn.addEventListener('click', async () => {
    const provider = new GoogleAuthProvider();
    try {
        await signInWithPopup(auth, provider);
        // Google users are auto-verified, redirection happens in onAuthStateChanged
    } catch (error) {
        console.error("Google Error:", error);
        errorMsg.innerText = "❌ Google Sign-In failed. Try again.";
    }
});

// 3. Toggle Login / Sign Up UI
toggleBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    toggleModeUI();
});

function toggleModeUI() {
    if (isLogin) {
        submitBtn.innerText = "Sign In";
        toggleTextContainer.innerHTML = `Don't have an account? <span id="toggle-auth">Sign Up</span>`;
    } else {
        submitBtn.innerText = "Sign Up";
        toggleTextContainer.innerHTML = `Already have an account? <span id="toggle-auth">Sign In</span>`;
    }
    
    // Re-attach listener to new span
    document.getElementById('toggle-auth').addEventListener('click', () => {
        isLogin = !isLogin;
        toggleModeUI();
    });
    errorMsg.innerText = "";
}

// 4. Handle Form Submit
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passInput.value;
    
    submitBtn.innerText = "Processing...";
    errorMsg.innerText = ""; 
    errorMsg.style.color = "red";

    try {
        if (isLogin) {
            // --- LOGIN ---
            const userCredential = await signInWithEmailAndPassword(auth, email, password);
            if (!userCredential.user.emailVerified) {
                await signOut(auth);
                throw new Error("unverified-email");
            }
        } else {
            // --- SIGNUP ---
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            await sendEmailVerification(userCredential.user);
            await signOut(auth); // Force logout until verified
            
            errorMsg.style.color = "green";
            errorMsg.innerText = `✅ Verification link sent to ${email}. Check inbox!`;
            isLogin = true; 
            toggleModeUI();
        }
    } catch (error) {
        console.error(error);
        if (error.message.includes("unverified-email")) {
            errorMsg.innerText = "⚠️ Please verify your email first!";
        } else if (error.code === 'auth/email-already-in-use') {
            errorMsg.innerText = "⚠️ Email already exists. Please Login.";
        } else if (error.code === 'auth/wrong-password') {
            errorMsg.innerText = "❌ Incorrect password.";
        } else if (error.code === 'auth/user-not-found') {
            errorMsg.innerText = "❌ Account not found. Please Sign Up.";
        } else if (error.code === 'auth/weak-password') {
            errorMsg.innerText = "⚠️ Password must be 6+ characters.";
        } else {
            errorMsg.innerText = "❌ Error: " + error.message;
        }
        submitBtn.innerText = isLogin ? "Sign In" : "Sign Up";
    }
});