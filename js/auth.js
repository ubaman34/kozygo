import { auth } from './firebase-config.js';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    onAuthStateChanged 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

// DOM Elements
const form = document.getElementById('auth-form');
const emailInput = document.getElementById('email');
const passInput = document.getElementById('password');
const submitBtn = document.getElementById('submit-btn');
const toggleBtn = document.getElementById('toggle-auth');
const errorMsg = document.getElementById('error-message');
const toggleTextContainer = document.querySelector('.toggle-text'); // Parent paragraph

let isLogin = true;

// 1. Check if user is already logged in
onAuthStateChanged(auth, (user) => {
    if (user) {
        // User is signed in, redirect to dashboard
        window.location.href = "dashboard.html";
    }
});

// 2. Toggle between Login and Signup modes
toggleBtn.addEventListener('click', () => {
    isLogin = !isLogin;
    
    if (isLogin) {
        submitBtn.innerText = "Sign In";
        toggleTextContainer.innerHTML = `Don't have an account? <span id="toggle-auth">Sign Up</span>`;
    } else {
        submitBtn.innerText = "Sign Up";
        toggleTextContainer.innerHTML = `Already have an account? <span id="toggle-auth">Sign In</span>`;
    }
    
    // Re-attach listener to the new span (since innerHTML replaced it)
    document.getElementById('toggle-auth').addEventListener('click', toggleMode);
    errorMsg.innerText = "";
});

// Helper to handle re-attaching event listener
function toggleMode() {
    toggleBtn.click();
}

// 3. Handle Form Submission
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = emailInput.value;
    const password = passInput.value;
    
    submitBtn.innerText = "Processing..."; // UX feedback

    try {
        if (isLogin) {
            await signInWithEmailAndPassword(auth, email, password);
        } else {
            await createUserWithEmailAndPassword(auth, email, password);
        }
        // Redirect happens automatically via onAuthStateChanged
    } catch (error) {
        // Clean up error message (Remove 'Firebase:' prefix)
        const cleanError = error.message.replace("Firebase: ", "").replace("auth/", "");
        errorMsg.innerText = cleanError;
        submitBtn.innerText = isLogin ? "Sign In" : "Sign Up";
    }
});
