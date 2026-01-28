import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { collection, addDoc, query, where, onSnapshot, doc, updateDoc, getDoc, orderBy } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentUser = null;
const monthSelect = document.getElementById('month-select');
const yearSelect = document.getElementById('year-select');

// Auth Check
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        currentUser = user;
        initDateSelectors();
        loadHabits();
    }
});

document.getElementById('logout-btn').addEventListener('click', () => signOut(auth));

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

    monthSelect.addEventListener('change', () => { updateHeader(); loadHabits(); });
    yearSelect.addEventListener('change', () => { updateHeader(); loadHabits(); });
    updateHeader();
}

function updateHeader() {
    document.getElementById('header-date').innerText = monthSelect.options[monthSelect.selectedIndex].text;
    document.getElementById('header-year').innerText = yearSelect.value;
}

// Load Habits & Render Grid
function loadHabits() {
    if (!currentUser) return;
    
    const month = parseInt(monthSelect.value);
    const year = parseInt(yearSelect.value);
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const currentMonthKey = `${year}-${month}`; 
    const today = new Date().getDate(); // For daily stats
    const isCurrentMonth = new Date().getMonth() === month && new Date().getFullYear() === year;

    // Build Table Header
    const headerRow = document.getElementById('table-header-row');
    headerRow.innerHTML = `<th>Habit</th>`;
    for (let i = 1; i <= daysInMonth; i++) {
        headerRow.innerHTML += `<th style="${i === today && isCurrentMonth ? 'color:var(--primary-pink); font-weight:bold;' : ''}">${i}</th>`;
    }
    headerRow.innerHTML += `<th>Progress</th>`; // Add Progress Header

    const tbody = document.getElementById('habit-body');
    const q = query(collection(db, "habits"), where("uid", "==", currentUser.uid));

    onSnapshot(q, (snapshot) => {
        tbody.innerHTML = "";
        let habitsDoneToday = 0;
        let totalHabits = 0;

        snapshot.forEach((docSnap) => {
            const habit = docSnap.data();
            const habitId = docSnap.id;
            const completedDays = (habit.completed && habit.completed[currentMonthKey]) ? habit.completed[currentMonthKey] : [];
            
            totalHabits++;
            if (completedDays.includes(today) && isCurrentMonth) habitsDoneToday++;

            // Calculate Progress Percentage
            const progress = Math.round((completedDays.length / daysInMonth) * 100);

            let rowHtml = `<tr><td>${habit.name}</td>`;
            
            for (let i = 1; i <= daysInMonth; i++) {
                const isChecked = completedDays.includes(i) ? "checked" : "";
                rowHtml += `
                    <td>
                        <input type="checkbox" class="habit-checkbox" ${isChecked} 
                        onchange="toggleHabit('${habitId}', ${i})">
                    </td>`;
            }

            // Progress Bar Cell
            rowHtml += `
                <td class="progress-cell">
                    <div style="display:flex; align-items:center;">
                        <div class="progress-bg">
                            <div class="progress-fill" style="width: ${progress}%"></div>
                        </div>
                        <span class="progress-text">${progress}%</span>
                    </div>
                </td>
            </tr>`;
            
            tbody.innerHTML += rowHtml;
        });

        // Update Top Stats
        const statsText = isCurrentMonth 
            ? `<i class="fa-solid fa-arrow-trend-up"></i> ${habitsDoneToday}/${totalHabits} habits done today`
            : "Viewing past records";
        document.getElementById('daily-stats').innerHTML = statsText;
    });
}

// Add New Task Logic (Simple prompt for now to keep it clean)
document.getElementById('add-task-btn').addEventListener('click', async () => {
    const taskName = prompt("Enter new habit name:");
    if (taskName) {
        await addDoc(collection(db, "habits"), {
            uid: currentUser.uid,
            name: taskName,
            createdAt: new Date(),
            completed: {}
        });
    }
});

// Toggle Logic
window.toggleHabit = async (habitId, day) => {
    const habitRef = doc(db, "habits", habitId);
    const habitSnap = await getDoc(habitRef);
    const habitData = habitSnap.data();
    const currentMonthKey = `${yearSelect.value}-${monthSelect.value}`;
    
    let completedMap = habitData.completed || {};
    let monthData = completedMap[currentMonthKey] || [];

    if (monthData.includes(day)) {
        monthData = monthData.filter(d => d !== day);
    } else {
        monthData.push(day);
    }

    completedMap[currentMonthKey] = monthData;
    await updateDoc(habitRef, { completed: completedMap });
};
