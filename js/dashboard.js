import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut, updateProfile } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc, orderBy, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- 1. ADVANCED DAILY THEME ENGINE (Updated) ---
function setDailyTheme() {
    const dayIndex = new Date().getDay(); // 0 = Sunday, 1 = Monday...

    // Your Exact Coolors Palettes Mapped to UI Elements
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

    // Apply the colors to the CSS Variables
    root.style.setProperty('--bg-body', theme.bg);
    root.style.setProperty('--bg-card', theme.card);
    root.style.setProperty('--primary', theme.primary);
    root.style.setProperty('--primary-pink', theme.primary); // Legacy support
    root.style.setProperty('--text-main', theme.text);
    
    // For Thursday (Dark Mode), we lighten the muted text
    if (dayIndex === 4) { 
        root.style.setProperty('--text-muted', '#94a3b8'); 
    } else {
        root.style.setProperty('--text-muted', '#6b7280');
    }

    console.log(`🎨 Theme set to Day ${dayIndex}`);
}

// --- SOUNDS ---
const addSound = new Audio('https://codeskulptor-demos.commondatastorage.googleapis.com/pang/pop.mp3'); 
const successSound = new Audio('https://s3.amazonaws.com/freecodecamp/drums/Cev_H2.mp3');
addSound.volume = 0.5;
successSound.volume = 0.5;

// Debugging
addSound.addEventListener('error', (e) => console.error("❌ Add Sound Error:", e));
successSound.addEventListener('error', (e) => console.error("❌ Success Sound Error:", e));

let currentUser = null;
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');

// --- Profile Elements ---
const navProfileImg = document.getElementById('nav-profile-img');
const modalProfileImg = document.getElementById('modal-profile-img');
const profileModal = document.getElementById('profile-modal');
const nameInput = document.getElementById('profile-name-input');
const usernameInput = document.getElementById('profile-username-input');
const fileInput = document.getElementById('file-input');
const saveBtn = document.getElementById('save-profile-btn');

let originalData = { name: "", username: "", photo: "" };
let selectedFileBase64 = null; 

// --- 1. Auth Check ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        setDailyTheme(); // <--- This triggers the color change
        initProfile();
        initDateSelectors();
    }
});

// --- 2. Profile Logic (Gallery Upload / Free) ---
async function initProfile() {
    const user = auth.currentUser;
    let username = "";
    let photoBase64 = "";

    try {
        const userDoc = await getDoc(doc(db, "users", user.uid));
        if (userDoc.exists()) {
            const data = userDoc.data();
            username = data.username || "";
            photoBase64 = data.photoBase64 || ""; 
        }
    } catch (e) { console.log("No profile data found"); }

    const finalPhoto = photoBase64 || user.photoURL || `https://ui-avatars.com/api/?name=${user.email}&background=random`;
    const displayName = user.displayName || "";

    navProfileImg.src = finalPhoto;
    modalProfileImg.src = finalPhoto;
    nameInput.value = displayName;
    usernameInput.value = username;

    originalData = { name: displayName, username: username, photo: finalPhoto };

    document.getElementById('profile-btn').addEventListener('click', () => profileModal.style.display = 'flex');
    
    document.getElementById('close-profile').addEventListener('click', () => {
        profileModal.style.display = 'none';
        nameInput.value = originalData.name;
        usernameInput.value = originalData.username;
        modalProfileImg.src = originalData.photo;
        selectedFileBase64 = null;
        saveBtn.style.display = 'none';
    });

    [nameInput, usernameInput].forEach(input => input.addEventListener('input', checkChanges));

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (event) => {
                const img = new Image();
                img.src = event.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    const ctx = canvas.getContext('2d');
                    const maxWidth = 150;
                    const scaleFactor = maxWidth / img.width;
                    canvas.width = maxWidth;
                    canvas.height = img.height * scaleFactor;
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    selectedFileBase64 = canvas.toDataURL('image/jpeg', 0.8); 
                    modalProfileImg.src = selectedFileBase64; 
                    checkChanges();
                }
            }
        }
    });

    saveBtn.addEventListener('click', async () => {
        saveBtn.innerText = "Saving...";
        try {
            if (nameInput.value !== originalData.name) {
                await updateProfile(user, { displayName: nameInput.value });
            }
            const updateData = {
                username: usernameInput.value,
                email: user.email
            };
            if (selectedFileBase64) {
                updateData.photoBase64 = selectedFileBase64;
                navProfileImg.src = selectedFileBase64; 
            }
            await setDoc(doc(db, "users", user.uid), updateData, { merge: true });
            alert("Profile Saved!");
            profileModal.style.display = 'none';
            saveBtn.innerText = "Save Changes";
            saveBtn.style.display = 'none';
            originalData.name = nameInput.value;
            originalData.username = usernameInput.value;
            if(selectedFileBase64) originalData.photo = selectedFileBase64;
            selectedFileBase64 = null;
        } catch (error) {
            console.error(error);
            alert("Error: " + error.message);
            saveBtn.innerText = "Save Changes";
        }
    });

    document.getElementById('logout-btn-modal').addEventListener('click', () => signOut(auth));
}

function checkChanges() {
    const isNameChanged = nameInput.value !== originalData.name;
    const isUserChanged = usernameInput.value !== originalData.username;
    const isPhotoChanged = selectedFileBase64 !== null;

    if (isNameChanged || isUserChanged || isPhotoChanged) {
        saveBtn.style.display = 'block';
    } else {
        saveBtn.style.display = 'none';
    }
}

// --- 3. Date Selectors & Habits ---
function initDateSelectors() {
    const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();

    months.forEach((m, index) => {
        const option = document.createElement('option');
        option.value = index;
        option.text = m;
        if (index === currentMonth) option.selected = true;
        monthSelect.appendChild(option);
    });

    for (let i = currentYear - 1; i <= currentYear + 5; i++) {
        const option = document.createElement('option');
        option.value = i;
        option.text = i;
        if (i === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }

    monthSelect.addEventListener('change', loadHabits);
    yearSelect.addEventListener('change', loadHabits);
    updateHeader();
    loadHabits(); 
}

function updateHeader() {
    document.getElementById('header-date').innerText = monthSelect.options[monthSelect.selectedIndex].text;
    document.getElementById('header-year').innerText = yearSelect.value;
}

function loadHabits() {
    if (!currentUser) return;
    updateHeader();

    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentMonthKey = `${year}-${month}`;
    const today = new Date().getDate();
    const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

    // 1. Setup Header
    const headerRow = document.getElementById('table-header-row');
    headerRow.innerHTML = `<th>Habit</th>`;
    for (let i = 1; i <= daysInMonth; i++) {
        // [UPDATED] Uses var(--primary) instead of fixed colors
        headerRow.innerHTML += `<th style="${i === today && isCurrentMonth ? 'color:var(--primary); font-weight:bold;' : ''}">${i}</th>`;
    }
    headerRow.innerHTML += `<th>Progress</th>`;

    // 2. Setup Footer
    const footerRow = document.getElementById('add-row-footer').firstElementChild;
    while (footerRow.children.length > 1) { footerRow.removeChild(footerRow.lastChild); }
    const spacer = document.createElement('td');
    spacer.colSpan = daysInMonth + 1; 
    footerRow.appendChild(spacer);

    // 3. Fetch Data
    const tbody = document.getElementById('habit-body');
    const q = query(
        collection(db, "habits"), 
        where("uid", "==", currentUser.uid),
        where("monthKey", "==", currentMonthKey)
    );

    onSnapshot(q, (snapshot) => {
        tbody.innerHTML = "";
        
        let habitsArray = [];
        snapshot.forEach((doc) => {
            habitsArray.push({ id: doc.id, ...doc.data() });
        });

        // Sort: Oldest time -> Newest time (1, 2, 3...)
        habitsArray.sort((a, b) => {
            const timeA = a.createdAt ? a.createdAt.seconds : 0;
            const timeB = b.createdAt ? b.createdAt.seconds : 0;
            return timeA - timeB; 
        });

        let habitsDoneToday = 0;
        let totalHabits = 0;

        habitsArray.forEach((habit, index) => {
            const habitId = habit.id;
            const completedDays = habit.completed || [];
            
            totalHabits++;
            if (completedDays.includes(today) && isCurrentMonth) habitsDoneToday++;

            const progress = Math.round((completedDays.length / daysInMonth) * 100);

            let rowHtml = `
                <tr>
                    <td class="habit-name-cell">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <span><b>${index + 1}.</b> ${habit.name}</span>
                            <i class="fa-solid fa-trash" 
                               style="color: var(--text-muted); cursor: pointer; font-size: 0.8rem; margin-left: 10px;" 
                               onclick="deleteHabit('${habitId}')">
                            </i>
                        </div>
                    </td>`;
            
            for (let i = 1; i <= daysInMonth; i++) {
                const isChecked = completedDays.includes(i) ? "checked" : "";
                rowHtml += `<td><input type="checkbox" class="habit-checkbox" ${isChecked} onchange="toggleHabit('${habitId}', ${i})"></td>`;
            }

            rowHtml += `
                <td class="progress-cell">
                    <div style="display:flex; align-items:center;">
                        <div class="progress-bg"><div class="progress-fill" style="width: ${progress}%"></div></div>
                        <span class="progress-text">${progress}%</span>
                    </div>
                </td></tr>`;
            tbody.innerHTML += rowHtml;
        });

        const statsText = isCurrentMonth 
            ? `<i class="fa-solid fa-arrow-trend-up"></i> ${habitsDoneToday}/${totalHabits} habits done today`
            : "Viewing past records";
        document.getElementById('daily-stats').innerHTML = statsText;
    });
}

// Inline Add
const inlineInput = document.getElementById('inline-habit-input');
inlineInput.addEventListener('keypress', async (e) => {
    if (e.key === 'Enter' && inlineInput.value.trim() !== "") {
        const taskName = inlineInput.value.trim();
        const currentMonthKey = `${yearSelect.value}-${monthSelect.value}`;

        addSound.currentTime = 0;
        addSound.play().catch(e => console.log(e));

        await addDoc(collection(db, "habits"), {
            uid: currentUser.uid,
            name: taskName,
            monthKey: currentMonthKey,
            createdAt: new Date(),
            completed: []
        });

        inlineInput.value = "";
    }
});

// Global functions for HTML access
window.toggleHabit = async (habitId, day) => {
    const habitRef = doc(db, "habits", habitId);
    const habitSnap = await getDoc(habitRef);
    const habitData = habitSnap.data();
    let completed = habitData.completed || [];

    if (completed.includes(day)) {
        completed = completed.filter(d => d !== day);
    } else {
        completed.push(day);
        successSound.currentTime = 0;
        successSound.play().catch(e => console.log(e));
    }

    await updateDoc(habitRef, { completed: completed });
};

window.deleteHabit = async (habitId) => {
    if (confirm("Delete this habit?")) {
        await deleteDoc(doc(db, "habits", habitId));
    }
};