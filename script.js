import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, createUserWithEmailAndPassword, signInWithEmailAndPassword, GoogleAuthProvider, signInWithPopup, signOut } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { getFirestore, collection, doc, setDoc, onSnapshot, serverTimestamp, updateDoc, runTransaction, getDoc, getDocs, writeBatch, addDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyAOJnErYKKaKspstgApgCOzGzKM4xLXlMc",
    authDomain: "writchi-4cf8c.firebaseapp.com",
    projectId: "writchi-4cf8c",
    storageBucket: "writchi-4cf8c.appspot.com",
    messagingSenderId: "1090558449303",
    appId: "1:1090558449303:web:55a12f78b88f5d6acffbd2",
    measurementId: "G-PHS7LR75TJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = firebaseConfig.projectId;

// DOM Elements
const elements = {
    loading: document.getElementById('loading'),
    authContainer: document.getElementById('auth-container'),
    loginForm: document.getElementById('login-form'),
    signupForm: document.getElementById('signup-form'),
    googleSigninBtn: document.getElementById('google-signin-btn'),
    toggleAuthLink: document.getElementById('toggle-auth-link'),
    logoutBtn: document.getElementById('logout-btn'),
    userInfoContainer: document.getElementById('user-info-container'),
    userEmail: document.getElementById('user-email'),
    createPetForm: document.getElementById('create-pet-form'),
    mainDisplay: document.getElementById('main-display'),
    userPetDisplay: document.getElementById('user-pet-display'),
    petsGrid: document.getElementById('pets-grid'),
    leaderboardDisplay: document.getElementById('leaderboard-display'),
    messageModal: document.getElementById('message-modal'),
    messageText: document.getElementById('message-text'),
    messageOkBtn: document.getElementById('message-ok-btn'),
    shopModal: document.getElementById('shop-modal'),
    shopPoints: document.getElementById('shop-points'),
    shopItems: document.getElementById('shop-items'),
    shopCloseBtn: document.getElementById('shop-close-btn'),
    openShopBtn: document.getElementById('open-shop-btn'),
    createBtn: document.getElementById('create-btn'),
    ownerName: document.getElementById('owner-name'),
    petName: document.getElementById('pet-name'),
    petOptions: document.getElementById('pet-options'),
    activeBattleStatus: document.getElementById('active-battle-status'),
    battleNotifications: document.getElementById('battle-notifications'),
    battleModal: document.getElementById('battle-modal'),
    battleOpponentInfo: document.getElementById('battle-opponent-info'),
    battleTimer: document.getElementById('battle-timer'),
    battleTextarea: document.getElementById('battle-textarea'),
    battleSubmitBtn: document.getElementById('battle-submit-btn'),
    battleCloseBtn: document.getElementById('battle-close-btn'),
    
    // Personal History
    historyModal: document.getElementById('history-modal'),
    historyCloseBtn: document.getElementById('history-close-btn'),
    calendarGrid: document.getElementById('calendar-grid'),
    calendarMonth: document.getElementById('calendar-month'),

    // Community Calendar
    communityModal: document.getElementById('community-modal'),
    communityCloseBtn: document.getElementById('community-close-btn'),
    communityGrid: document.getElementById('community-calendar-grid'),
    communityMonth: document.getElementById('community-calendar-month'),
    openCommunityBtn: document.getElementById('open-community-btn')
};

// State
let currentUserId = null;
let unsubscribePets = () => {};
let unsubscribeBattles = () => {};
let allPetsCache = [];
let activeBattleTimer = null;
let myCurrentActiveBattle = null;

// Constants
const PET_OPTIONS = [
    { id: 'rat', name: 'Rat', art: 'https://i.imgur.com/UYzs7a9.png' },
    { id: 'goose', name: 'Goose', art: 'https://i.imgur.com/X4g3zPk.png' },
    { id: 'cat', name: 'Cat', art: 'https://i.imgur.com/LHgDHwf.png' },
    { id: 'caterpillar', name: 'Caterpillar', art: 'https://i.imgur.com/md7E30R.png' },
    { id: 'dungbeetle', name: 'Dung Beetle', art: 'https://i.imgur.com/yMBgwcI.png' },
    { id: 'snail', name: 'Snail', art: 'https://i.imgur.com/ueVdeFs.png' },
    { id: 'dog', name: 'Dog', art: 'https://i.imgur.com/ykod9ux.png' },
    { id: 'frog', name: 'Frog', art: 'https://i.imgur.com/uQ3E9a1.png' },
    { id: 'racoon', name: 'Racoon', art: 'https://imgur.com/aUwTH1X' }
];

const ITEM_SHOP = [
    { id: 'plant', name: 'Plant', cost: 120, art: 'https://i.imgur.com/C2Y2IHg.png' },
    { id: 'cereal', name: 'Cereal', cost: 60, art: 'https://i.imgur.com/wT17Q00.png' },
    { id: 'partyhat', name: 'Party Hat', cost: 75, art: 'https://i.imgur.com/FPLLV4a.png' },
    { id: 'beer', name: 'Beer', cost: 90, art: 'https://i.imgur.com/BdM7tsi.png' },
    { id: 'cards', name: 'Writchi Cards', cost: 180, art: 'https://i.imgur.com/GgEVcFC.png' },
    { id: 'coffee', name: 'Coffee', cost: 80, art: 'https://i.imgur.com/uFf9HGi.png' },
    { id: 'ipod', name: 'Music Player', cost: 200, art: 'https://i.imgur.com/7V3VYXP.png' },
    { id: 'skateboard', name: 'Skateboard', cost: 150, art: 'https://i.imgur.com/c4PesGk.png' }
];

const GOLD_BADGE = { id: 'gold_badge_winner', name: 'Weekly Winner', art: 'https://i.imgur.com/qieHnaJ.gif' };

// Helper Functions
function showMessage(text) { elements.messageText.innerHTML = text; elements.messageModal.classList.remove('hidden'); }
function hideMessage() { elements.messageModal.classList.add('hidden'); }
function hideShop() { elements.shopModal.classList.add('hidden'); }
function canWriteToday(lastWrote) { 
    if (!lastWrote) return true; 
    const lastWroteDate = lastWrote.toDate(); 
    const today = new Date(); 
    return lastWroteDate.toDateString() !== today.toDateString();
}

// ==========================================
// HISTORY & CALENDAR LOGIC
// ==========================================

function getCalendarMeta() {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); 
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const firstDayIndex = new Date(year, month, 1).getDay(); // 0 is Sunday
    const todayStr = `${year}-${String(month+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;

    return { year, month, monthName: monthNames[month], daysInMonth, firstDayIndex, todayStr };
}

// 1. Personal History (Stamp View)
function openHistoryModal(pet) {
    const modal = elements.historyModal;
    const grid = elements.calendarGrid;
    const monthLabel = elements.calendarMonth;
    
    const meta = getCalendarMeta();
    monthLabel.textContent = `${meta.monthName} ${meta.year}`;
    grid.innerHTML = '';

    // Empty slots
    for (let i = 0; i < meta.firstDayIndex; i++) {
        grid.appendChild(document.createElement('div'));
    }

    const writingLog = pet.writingLog || [];

    for (let i = 1; i <= meta.daysInMonth; i++) {
        const dayEl = document.createElement('div');
        dayEl.className = "calendar-day-btn h-10 w-10 flex items-center justify-center rounded-full text-sm border border-gray-100 bg-gray-50 text-gray-400";
        
        // If user wrote, use their pet art as stamp
        const dateString = `${meta.year}-${String(meta.month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Allow interaction
        if (dateString > meta.todayStr) {
            dayEl.classList.add("future", "bg-gray-100");
            dayEl.textContent = i;
        } else {
            dayEl.onclick = () => handleToggleHistoryDate(pet.id, dateString);
            // Standard display if no write
            dayEl.textContent = i;
        }

        // If wrote: Clear text, add Image
        if (writingLog.includes(dateString)) {
            dayEl.innerHTML = `<img src="${pet.petArt}" alt="Stamp" class="w-full h-full object-contain p-1">`;
            dayEl.classList.remove("bg-gray-50", "text-gray-400");
            dayEl.classList.add("bg-white", "shadow-sm", "border-2", "border-green-400");
        } 
        
        // Today border
        if (dateString === meta.todayStr) {
            dayEl.classList.add("border-2", "border-black");
        }

        grid.appendChild(dayEl);
    }
    modal.classList.remove('hidden');
}

async function handleToggleHistoryDate(petId, dateString) {
    // Prevent future edits
    const now = new Date();
    const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
    if (dateString > todayStr) return;

    try {
        await runTransaction(db, async (transaction) => {
            const petRef = doc(db, `artifacts/${appId}/public/data/pets`, petId);
            const petDoc = await transaction.get(petRef);
            if (!petDoc.exists()) throw new Error("Pet not found");
            const currentLog = petDoc.data().writingLog || [];
            let newLog = currentLog.includes(dateString) 
                ? currentLog.filter(d => d !== dateString) 
                : [...currentLog, dateString];
            transaction.update(petRef, { writingLog: newLog });
        });
        // Re-open/refresh modal
        const updatedDoc = await getDoc(doc(db, `artifacts/${appId}/public/data/pets`, petId));
        if (updatedDoc.exists()) openHistoryModal({ id: petId, ...updatedDoc.data() });
    } catch (error) { console.error("Error toggling date:", error); }
}

// 2. Community Calendar (Face Pile)
function openCommunityModal() {
    const modal = elements.communityModal;
    const grid = elements.communityGrid;
    const monthLabel = elements.communityMonth;

    const meta = getCalendarMeta();
    monthLabel.textContent = `${meta.monthName} ${meta.year}`;
    grid.innerHTML = '';

        // Empty slots
        for (let i = 0; i < meta.firstDayIndex; i++) {
        grid.appendChild(document.createElement('div'));
    }

    for (let i = 1; i <= meta.daysInMonth; i++) {
        const dayEl = document.createElement('div');
        // Make these cells slightly bigger/flexible
        dayEl.className = "h-14 w-14 relative flex items-center justify-center rounded-lg border border-gray-100 bg-gray-50";
        
        const dateString = `${meta.year}-${String(meta.month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
        
        // Find who wrote today
        const writers = allPetsCache.filter(p => p.writingLog && p.writingLog.includes(dateString));
        
        if (writers.length === 0) {
                dayEl.innerHTML = `<span class="text-xs text-gray-300">${i}</span>`;
        } else {
            // Make it clickable to see list
            dayEl.classList.add('cursor-pointer', 'hover:bg-gray-100');
            dayEl.onclick = () => {
                const names = writers.map(w => w.ownerName);
                let msg = `<b>On ${meta.monthName} ${i}:</b><br><br>`;
                if (names.length === 1) msg += `${names[0]} wrote!`;
                else if (names.length === 2) msg += `${names[0]} and ${names[1]} wrote!`;
                else {
                    msg += `${names.slice(0, 2).join(', ')} and ${names.length - 2} others wrote!`;
                }
                showMessage(msg);
            };

            // Face Pile Logic
            if (writers.length === 1) {
                    dayEl.innerHTML = `<img src="${writers[0].petArt}" class="face-pile-img w-10 h-10">`;
            } else if (writers.length === 2) {
                dayEl.innerHTML = `
                    <img src="${writers[0].petArt}" class="face-pile-img w-8 h-8" style="top:4px; left:4px; z-index:10;">
                    <img src="${writers[1].petArt}" class="face-pile-img w-8 h-8" style="bottom:4px; right:4px; z-index:5;">
                `;
            } else {
                // 3 or more
                dayEl.innerHTML = `
                    <img src="${writers[0].petArt}" class="face-pile-img w-8 h-8" style="top:2px; left:2px; z-index:10;">
                    <img src="${writers[1].petArt}" class="face-pile-img w-8 h-8" style="bottom:2px; left:10px; z-index:5;">
                    <div class="pile-badge">+${writers.length - 2}</div>
                `;
            }
        }
        
        if (dateString === meta.todayStr) {
            dayEl.classList.add("border-2", "!border-black");
        }

        grid.appendChild(dayEl);
    }

    modal.classList.remove('hidden');
}

// ==========================================
// RENDER FUNCTIONS
// ==========================================

function renderPetOptions() { 
    elements.petOptions.innerHTML = PET_OPTIONS.map(pet => `<div class="pet-option text-center" data-pet-id="${pet.id}"><img src="${pet.art}" alt="${pet.name}" class="w-24 h-24 object-contain mx-auto"><p class="text-sm mt-1">${pet.name}</p></div>`).join(''); 
}

function renderPetCard(pet, isMainUser, rank) {
    const canWrite = canWriteToday(pet.lastWrote);
    
    // Check if Focus Mode
    const now = new Date();
    const focusEndTime = pet.focusUntil ? pet.focusUntil.toDate() : null;
    const isWritingNow = focusEndTime && focusEndTime > now;
    
    const activeClass = isWritingNow ? 'writing-pulse' : '';
    const statusBadge = isWritingNow ? '<span class="status-badge">Writing Now ✍️</span>' : '';
    const timeLeft = isWritingNow ? Math.ceil((focusEndTime - now) / 60000) : 0;

    const itemsDisplay = pet.items?.map(item => `<img src="${item.art}" alt="${item.name}" title="${item.name}" class="w-16 h-16 object-contain">`).join('') || '';
    const badgesDisplay = pet.badges?.map(badge => `<img src="${badge.art}" alt="${badge.name}" title="${badge.name}" class="w-12 h-12 object-contain">`).join('') || '';

    const focusBtnText = isWritingNow ? `Stop Focus (${timeLeft}m left)` : "Start Focus (25m)";
    const focusBtnClass = isWritingNow ? "btn-secondary bg-yellow-100 border-yellow-400" : "btn-secondary";

    const userButtons = `
        <div class="mt-4 flex gap-2 w-full">
            <input type="text" id="status-input-${pet.id}" class="!text-sm flex-grow" placeholder="Set a status..." maxlength="50" value="${pet.statusMessage || ''}">
            <button class="set-status-btn btn btn-secondary !py-2 !px-4 text-sm" data-id="${pet.id}">Set</button>
        </div>
        <button class="focus-btn btn ${focusBtnClass} w-full mt-2" data-id="${pet.id}">
                ${focusBtnText}
        </button>
        <button class="write-btn btn btn-primary w-full mt-2" data-id="${pet.id}" ${!canWrite ? 'disabled' : ''}>
            ${canWrite ? "I Wrote Today!" : "Check-in Complete"}
        </button>
        <div class="flex gap-2 mt-2">
            <button class="pet-btn btn btn-secondary flex-grow" data-id="${pet.id}">Pet Writchi  ❤ </button>
            <button class="history-btn btn btn-secondary w-16" data-id="${pet.id}" title="View History"> 📅 </button>
        </div>`;

    const otherUserButtons = `
        <div class="flex gap-2 mt-2 w-full">
            <button class="challenge-btn btn btn-primary flex-grow" data-id="${pet.id}" data-name="${pet.ownerName}">Challenge  ⚔️ </button>
            <button class="pet-btn btn btn-secondary !px-4" data-id="${pet.id}" title="Pet ${pet.petName}"> ❤ </button>
        </div>`;

    return `
        <div class="card p-5 flex flex-col items-center text-center ${activeClass}">
            ${rank ? `<span class="absolute top-2 left-2 bg-yellow-400 text-black text-xl font-bold rounded-full w-10 h-10 flex items-center justify-center shadow-md z-10">#${rank}</span>` : ''}
            <div class="pet-animation-container w-full"><img src="${pet.petArt}" alt="${pet.name}" class="w-48 h-48 object-contain mx-auto pet-image"></div>
            <div class="flex items-center justify-center gap-2 mt-4">
                <h3 class="text-3xl font-bold">${pet.petName}</h3>
                ${badgesDisplay}
            </div>
                <div class="flex items-center justify-center mt-1">${statusBadge}</div>
            <p class="text-lg text-gray-500">by ${pet.ownerName}</p>
            ${pet.statusMessage ? `<p class="text-center text-gray-700 italic bg-gray-100 p-3 rounded-lg my-4 w-full">“${pet.statusMessage}”</p>` : ''}
            <div class="flex flex-wrap justify-center gap-2 mt-4 min-h-[72px]">${itemsDisplay}</div>
            <div class="mt-4 w-full">
                <p class="text-2xl font-semibold">${pet.points || 0} WP <span class="text-base text-gray-500 font-normal">(Total)</span></p>
                <p class="text-xl font-semibold text-blue-600">${pet.weeklyPoints || 0} WP <span class="text-sm text-gray-500 font-normal">(This Week)</span></p>
            </div>
            ${isMainUser ? userButtons : otherUserButtons}
        </div>`;
}

function renderAllPets(pets) {
    allPetsCache = pets;
    const rankedPets = [...pets].sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0));
    const userPet = pets.find(p => p.id === currentUserId);
    
    if (userPet) {
        const userRank = rankedPets.findIndex(p => p.id === currentUserId) + 1;
        elements.userPetDisplay.innerHTML = renderPetCard(userPet, true, userPet.weeklyPoints > 0 ? userRank : null);
    } else { elements.userPetDisplay.innerHTML = ''; }
    
    const otherPets = pets.filter(p => p.id !== currentUserId);
    elements.petsGrid.innerHTML = otherPets.map(p => {
        const rank = rankedPets.findIndex(rp => rp.id === p.id) + 1;
        return renderPetCard(p, false, p.weeklyPoints > 0 ? rank : null);
    }).join('');
}

function renderLeaderboard(pets) {
    const sortedPets = [...pets].filter(p => p.weeklyPoints > 0).sort((a, b) => (b.weeklyPoints || 0) - (a.weeklyPoints || 0)).slice(0, 10);
    if (sortedPets.length === 0) { elements.leaderboardDisplay.classList.add('hidden'); return; }
    elements.leaderboardDisplay.innerHTML = `<h2 class="text-4xl font-bold text-center mb-4">Weekly Leaderboard  🏆 </h2><ol class="space-y-3">${sortedPets.map((pet, index) => `<li class="text-xl p-3 rounded-lg flex items-center gap-4 ${index === 0 ? 'bg-yellow-100 border-2 border-yellow-300' : 'bg-gray-50'}"><span class="font-bold text-2xl w-8 text-center">${index + 1}</span><span><span class="font-bold">${pet.ownerName}</span><span class="text-gray-600">(${pet.petName})</span></span><span class="ml-auto font-semibold text-blue-600">${pet.weeklyPoints} WP</span></li>`).join('')}</ol>`;
    elements.leaderboardDisplay.classList.remove('hidden');
}

function renderShopItems() {
    const userPet = allPetsCache.find(p => p.id === currentUserId); if (!userPet) return;
    elements.shopPoints.textContent = userPet.points || 0;
    elements.shopItems.innerHTML = ITEM_SHOP.map(item => { const hasItem = userPet.items?.some(i => i.id === item.id); const canAfford = (userPet.points || 0) >= item.cost; return `<div class="card p-2 flex flex-col items-center text-center"><img src="${item.art}" alt="${item.name}" class="w-24 h-24 object-contain"><p class="text-lg font-semibold mt-2">${item.name}</p><p class="text-gray-500">${item.cost} WP</p><button class="buy-btn btn btn-primary w-full mt-2 text-sm" data-item-id="${item.id}" ${hasItem || !canAfford ? 'disabled' : ''}>${hasItem ? 'Owned' : 'Buy'}</button></div>`; }).join('');
}

// --- Battle Feature Functions ---
function renderActiveBattleStatus(activeBattle) {
    if (activeBattle) {
        const opponentId = activeBattle.challengerId === currentUserId ? activeBattle.opponentId : activeBattle.challengerId;
        const opponent = allPetsCache.find(p => p.id === opponentId);
        const opponentName = opponent ? opponent.ownerName : 'an opponent';
        elements.activeBattleStatus.innerHTML = `
        <div class="card p-4 bg-green-50 border-green-300 text-center animate-pulse">
            <p class="text-xl font-semibold text-green-800"> ⚔️  Battle in Progress vs. ${opponentName}!</p>
            <button class="return-to-battle-btn btn btn-primary mt-2 !py-2 !px-4 text-sm">Return to Battle</button>
        </div>`;
    } else {
        elements.activeBattleStatus.innerHTML = '';
    }
}

function renderBattleNotifications(battles) {
    const pendingChallenges = battles.filter(b => b.status === 'pending' && b.opponentId === currentUserId);
    if (pendingChallenges.length === 0) {
        elements.battleNotifications.innerHTML = '';
        return;
    }
    elements.battleNotifications.innerHTML = pendingChallenges.map(b => {
        const challenger = allPetsCache.find(p => p.id === b.challengerId);
        const challengerName = challenger ? challenger.ownerName : 'Someone';
        return `<div class="card p-4 bg-blue-50 border-blue-200">
            <p class="text-xl font-semibold text-center"> ⚔️  Incoming Challenge!  ⚔️ </p>
            <p class="text-center my-2">${challengerName} has challenged you to a ${b.timeLimit}-minute Word Sprint for ${b.wager} WP!</p>
            <div class="flex justify-center gap-4 mt-2">
                <button class="accept-challenge-btn btn btn-primary" data-id="${b.id}">Accept</button>
                <button class="decline-challenge-btn btn btn-danger" data-id="${b.id}">Decline</button>
            </div>
        </div>`;
    }).join('');
}

async function handleChallengeClick(opponentId, opponentName) {
    const wagerInput = prompt(`How much WP do you want to wager for this battle with ${opponentName}?`, "20");
    const wager = parseInt(wagerInput, 10);
    if (isNaN(wager) || wager <= 0) { showMessage("Please enter a valid, positive number for the wager."); return; }
    const timeInput = prompt("How many minutes should the sprint last? (5-60)", "15");
    const timeLimit = parseInt(timeInput, 10);
    if (isNaN(timeLimit) || timeLimit < 5 || timeLimit > 60) { showMessage("Please enter a time between 5 and 60 minutes."); return; }
    const userPet = allPetsCache.find(p => p.id === currentUserId);
    if ((userPet.points || 0) < wager) { showMessage("You don't have enough WP to make that wager!"); return; }
    try {
        const battlesRef = collection(db, `artifacts/${appId}/public/data/battles`);
        await addDoc(battlesRef, { challengerId: currentUserId, opponentId: opponentId, status: 'pending', wager: wager, timeLimit: timeLimit, challengerWordCount: -1, opponentWordCount: -1, createdAt: serverTimestamp(), winner: null });
        showMessage(`Challenge sent to ${opponentName}!`);
    } catch (error) { console.error("Error creating challenge:", error); showMessage("Could not send challenge."); }
}

async function handleAcceptChallenge(battleId) {
    const battleRef = doc(db, `artifacts/${appId}/public/data/battles`, battleId);
    try {
        await runTransaction(db, async (transaction) => {
            const battleDoc = await transaction.get(battleRef);
            if (!battleDoc.exists()) throw new Error("Battle not found.");
            const battleData = battleDoc.data();
            const wager = battleData.wager;
            const challengerRef = doc(db, `artifacts/${appId}/public/data/pets`, battleData.challengerId);
            const opponentRef = doc(db, `artifacts/${appId}/public/data/pets`, battleData.opponentId);
            const challengerDoc = await transaction.get(challengerRef);
            const opponentDoc = await transaction.get(opponentRef);
            if (!challengerDoc.exists() || !opponentDoc.exists()) throw new Error("A player could not be found.");
            if ((challengerDoc.data().points || 0) < wager || (opponentDoc.data().points || 0) < wager) throw new Error("A player doesn't have enough WP for the wager.");
            transaction.update(challengerRef, { points: challengerDoc.data().points - wager });
            transaction.update(opponentRef, { points: opponentDoc.data().points - wager });
            transaction.update(battleRef, { status: 'active', startTime: serverTimestamp() });
        });
        const updatedBattleDoc = await getDoc(battleRef);
        if (updatedBattleDoc.exists() && updatedBattleDoc.data().status === 'active') { showBattleArena({ id: updatedBattleDoc.id, ...updatedBattleDoc.data() }); }
    } catch (error) {
        console.error("Error accepting challenge:", error); showMessage(error.message);
        const battleDoc = await getDoc(battleRef);
        if (battleDoc.exists() && battleDoc.data().status !== 'active') { await updateDoc(battleRef, { status: 'declined' }); }
    }
}

async function handleDeclineChallenge(battleId) {
    const battleRef = doc(db, `artifacts/${appId}/public/data/battles`, battleId);
    await updateDoc(battleRef, { status: 'declined' });
}

function showBattleArena(battle) {
    const opponentId = battle.challengerId === currentUserId ? battle.opponentId : battle.challengerId;
    const opponent = allPetsCache.find(p => p.id === opponentId);
    elements.battleOpponentInfo.textContent = `vs. ${opponent ? opponent.ownerName : 'Opponent'}`;
    elements.battleModal.classList.remove('hidden');
    elements.battleSubmitBtn.dataset.id = battle.id;
    elements.battleTextarea.value = '';
    elements.battleTextarea.placeholder = 'Write like the wind! The text box will unlock when the timer ends.';
    elements.battleTextarea.disabled = true;
    elements.battleSubmitBtn.disabled = true;
    elements.battleSubmitBtn.textContent = 'Submit Final Word Count';
    if (activeBattleTimer) clearInterval(activeBattleTimer);
    activeBattleTimer = setInterval(() => {
        if (!battle.startTime) { elements.battleTimer.textContent = `${(battle.timeLimit || 0).toString().padStart(2, '0')}:00`; return; }
        const endTime = battle.startTime.toDate().getTime() + battle.timeLimit * 60 * 1000;
        const now = new Date().getTime();
        const distance = endTime - now;
        if (distance < 0) {
            clearInterval(activeBattleTimer);
            elements.battleTimer.textContent = "00:00";
            elements.battleTextarea.disabled = false;
            elements.battleSubmitBtn.disabled = false;
            elements.battleTextarea.placeholder = "Time's up! Paste your writing here.";
            showMessage("Time's up! Submit your final word count now.");
            return;
        }
        const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((distance % (1000 * 60)) / 1000);
        elements.battleTimer.textContent = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    }, 1000);
}

async function handleWordSubmit(battleId) {
    const text = elements.battleTextarea.value;
    const wordCount = text.trim() === '' ? 0 : text.trim().split(/\s+/).length;
    const battleRef = doc(db, `artifacts/${appId}/public/data/battles`, battleId);
    const battleDoc = await getDoc(battleRef);
    const battleData = battleDoc.data();
    const isChallenger = battleData.challengerId === currentUserId;
    const updateField = isChallenger ? 'challengerWordCount' : 'opponentWordCount';
    await updateDoc(battleRef, { [updateField]: wordCount });
    elements.battleTextarea.value = `You submitted ${wordCount} words!`;
    elements.battleTextarea.disabled = true;
    elements.battleSubmitBtn.disabled = true;
    elements.battleSubmitBtn.textContent = 'Waiting for opponent...';
}

async function resolveBattle(battle) {
    const { challengerId, opponentId, challengerWordCount, opponentWordCount, wager, id } = battle;
    let winnerId = null;
    if (challengerWordCount > opponentWordCount) winnerId = challengerId;
    else if (opponentWordCount > challengerWordCount) winnerId = opponentId;
    const isChallenger = challengerId === currentUserId;
    const myWordCount = isChallenger ? challengerWordCount : opponentWordCount;
    const opponentWordCountValue = isChallenger ? opponentWordCount : challengerWordCount;
    let finalMessage = '';
    if (winnerId) {
        if (winnerId === currentUserId) {
            const prize = wager * 2;
            finalMessage = `Winner winner chicken dinner! Wow! Great job! You did the thing! And you won!<br><br>Your words: <b>${myWordCount}</b><br>Opponent's words: <b>${opponentWordCountValue}</b>`;
            const winnerRef = doc(db, `artifacts/${appId}/public/data/pets`, currentUserId);
            const winnerDoc = await getDoc(winnerRef);
            await updateDoc(winnerRef, { points: (winnerDoc.data().points || 0) + prize });
        } else {
            finalMessage = `Hey, better luck next time, but great job! You did the thing!<br><br>Your words: <b>${myWordCount}</b><br>Opponent's words: <b>${opponentWordCountValue}</b>`;
        }
    } else {
        finalMessage = `It's a tie! Your wager has been returned.<br><br>You both wrote <b>${myWordCount}</b> words!`;
        const playerRef = doc(db, `artifacts/${appId}/public/data/pets`, currentUserId);
        const playerDoc = await getDoc(playerRef);
        await updateDoc(playerRef, { points: (playerDoc.data().points || 0) + wager });
    }
    showMessage(finalMessage);
    const battleRef = doc(db, `artifacts/${appId}/public/data/battles`, id);
    await updateDoc(battleRef, { status: 'completed', winner: winnerId });
}

// --- Event Handlers ---
async function handleCreatePet() {
    const ownerName = elements.ownerName.value.trim(); const petName = elements.petName.value.trim(); const selectedPetEl = document.querySelector('.pet-option.selected');
    if (!ownerName || !petName || !selectedPetEl) { showMessage("Please fill out all fields and select a pet."); return; }
    const selectedPet = PET_OPTIONS.find(p => p.id === selectedPetEl.dataset.petId);
    try {
        // UPDATED: Added writingLog: []
        const petData = { ownerName, petName, petArt: selectedPet.art, points: 0, weeklyPoints: 0, badges: [], items: [], writingLog: [], statusMessage: '', createdAt: serverTimestamp(), lastWrote: null };
        await setDoc(doc(db, `artifacts/${appId}/public/data/pets`, currentUserId), petData);
    } catch (error) { console.error("Error creating pet:", error); showMessage("Error creating pet."); }
}

async function handleSetStatus(petId) {
    const inputElement = document.getElementById(`status-input-${petId}`); if (!inputElement) return;
    const newStatus = inputElement.value.trim();
    try { await updateDoc(doc(db, `artifacts/${appId}/public/data/pets`, petId), { statusMessage: newStatus }); }
    catch (error) { console.error("Error updating status:", error); showMessage("Could not update status."); }
}

async function handleToggleFocus(petId) {
    const petRef = doc(db, `artifacts/${appId}/public/data/pets`, petId);
    try {
        const petDoc = await getDoc(petRef);
        if (!petDoc.exists()) return;
        
        const data = petDoc.data();
        const now = new Date();
        const currentEnd = data.focusUntil ? data.focusUntil.toDate() : null;
        
        if (currentEnd && currentEnd > now) {
            await updateDoc(petRef, { focusUntil: null });
            showMessage("Focus mode stopped.");
        } else {
            const endTime = new Date(now.getTime() + 25 * 60000);
            await updateDoc(petRef, { focusUntil: endTime });
            showMessage("Focus mode started! Good luck! ✍️");
        }
    } catch (error) {
        console.error("Error toggling focus:", error);
    }
}

// Handle Write Today
async function handleWriteToday(petId) {
    const button = document.querySelector(`.write-btn[data-id="${petId}"]`); if (button) button.disabled = true;
    
    // Get today's date string (local time)
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const dateString = `${year}-${month}-${day}`;

    const pointsWon = Math.floor(Math.random() * 41) + 10;
    showMessage(`You earned ${pointsWon} WP!`);
    
    try {
        await runTransaction(db, async (transaction) => {
            const petRef = doc(db, `artifacts/${appId}/public/data/pets`, petId);
            const petDoc = await transaction.get(petRef); 
            if (!petDoc.exists()) throw new Error("Pet not found");
            
            const currentLog = petDoc.data().writingLog || [];
            if (!currentLog.includes(dateString)) {
                currentLog.push(dateString);
            }

            transaction.update(petRef, {
                points: (petDoc.data().points || 0) + pointsWon,
                weeklyPoints: (petDoc.data().weeklyPoints || 0) + pointsWon,
                lastWrote: serverTimestamp(),
                writingLog: currentLog
            });
        });
    } catch (error) { console.error("Error updating points:", error); showMessage("Error updating points."); }
}

async function handleBuyItem(itemId) { 
    const item = ITEM_SHOP.find(i => i.id === itemId); if (!item) return;
    try { await runTransaction(db, async (transaction) => { 
        const petRef = doc(db, `artifacts/${appId}/public/data/pets`, currentUserId); 
        const petDoc = await transaction.get(petRef); if (!petDoc.exists()) throw new Error("Pet not found"); 
        const petData = petDoc.data(); if ((petData.points || 0) < item.cost) { throw new Error("Not enough points"); } 
        transaction.update(petRef, { points: petData.points - item.cost, items: [...(petData.items || []), { id: item.id, name: item.name, art: item.art }] }); 
    });
    renderShopItems(); } catch (error) { console.error("Error buying item:", error); showMessage(error.message === "Not enough points" ? "Not enough points!" : "Error buying item."); } 
}

async function handlePetAnimation(petId) { 
    const card = document.querySelector(`[data-id="${petId}"]`).closest('.card'); 
    const petImage = card.querySelector('.pet-image'); 
    petImage.classList.add('shake'); setTimeout(() => petImage.classList.remove('shake'), 820);
    const heart = document.createElement('div'); heart.className = 'floating-heart'; heart.textContent = ' ❤ '; 
    card.querySelector('.pet-animation-container').appendChild(heart); setTimeout(() => heart.remove(), 1500); 
}

// Auth Handlers
const handleSignUp = async (e) => { e.preventDefault(); const email = elements.signupForm.querySelector('#signup-email').value; const password = elements.signupForm.querySelector('#signup-password').value;
try { await createUserWithEmailAndPassword(auth, email, password); } catch (error) { showMessage(error.message); } };
const handleLogin = async (e) => { e.preventDefault(); const email = elements.loginForm.querySelector('#login-email').value; const password = elements.loginForm.querySelector('#login-password').value;
try { await signInWithEmailAndPassword(auth, email, password); } catch (error) { showMessage(error.message); } };
const handleGoogleSignIn = async () => { const provider = new GoogleAuthProvider(); try { await signInWithPopup(auth, provider);
} catch (error) { showMessage(error.message); } };
const handleLogout = () => { signOut(auth); };

// Setup Event Listeners
elements.messageOkBtn.addEventListener('click', hideMessage);
elements.shopCloseBtn.addEventListener('click', hideShop);
elements.battleCloseBtn.addEventListener('click', () => { elements.battleModal.classList.add('hidden'); if (activeBattleTimer) clearInterval(activeBattleTimer); });
elements.historyCloseBtn.addEventListener('click', () => { elements.historyModal.classList.add('hidden'); });
elements.communityCloseBtn.addEventListener('click', () => { elements.communityModal.classList.add('hidden'); });

elements.openShopBtn?.addEventListener('click', () => { renderShopItems(); elements.shopModal.classList.remove('hidden'); });
elements.openCommunityBtn?.addEventListener('click', () => { openCommunityModal(); }); // Open Community Modal

elements.createBtn?.addEventListener('click', handleCreatePet);
elements.loginForm.addEventListener('submit', handleLogin);
elements.signupForm.addEventListener('submit', handleSignUp);
elements.googleSigninBtn.addEventListener('click', handleGoogleSignIn);
elements.logoutBtn.addEventListener('click', handleLogout);
elements.toggleAuthLink.addEventListener('click', (e) => { e.preventDefault(); const isLoginShowing = !elements.loginForm.classList.contains('hidden'); elements.loginForm.classList.toggle('hidden'); elements.signupForm.classList.toggle('hidden'); e.target.textContent = isLoginShowing ? 'Have an account? Login' : 'Need an account? Sign Up'; });

// Event delegation
document.addEventListener('click', async (e) => {
    const target = e.target.closest('button') || e.target;
    if (e.target.closest('.pet-option')) { document.querySelectorAll('.pet-option').forEach(el => el.classList.remove('selected')); e.target.closest('.pet-option').classList.add('selected'); }
    if (target.classList.contains('write-btn')) await handleWriteToday(target.dataset.id);
    if (target.classList.contains('buy-btn')) await handleBuyItem(target.dataset.itemId);
    if (target.classList.contains('pet-btn')) await handlePetAnimation(target.dataset.id);
    if (target.classList.contains('set-status-btn')) await handleSetStatus(target.dataset.id);
    if (target.classList.contains('challenge-btn')) await handleChallengeClick(target.dataset.id, target.dataset.name);
    if (target.classList.contains('accept-challenge-btn')) await handleAcceptChallenge(target.dataset.id);
    if (target.classList.contains('decline-challenge-btn')) await handleDeclineChallenge(target.dataset.id);
    if (target.classList.contains('battle-submit-btn')) await handleWordSubmit(target.dataset.id);
    if (target.classList.contains('focus-btn')) await handleToggleFocus(target.dataset.id);
    if (target.classList.contains('return-to-battle-btn')) {
        if (myCurrentActiveBattle) { showBattleArena(myCurrentActiveBattle); }
    }
    // History Button Listener
    if (target.classList.contains('history-btn')) {
        const pet = allPetsCache.find(p => p.id === target.dataset.id);
        if (pet) openHistoryModal(pet);
    }
});

async function checkForWeeklyReset() {
    const leaderboardStateRef = doc(db, `artifacts/${appId}/public/data/community/leaderboardState`);
    try {
        const stateDoc = await getDoc(leaderboardStateRef);
        const lastResetDate = stateDoc.exists() ? stateDoc.data().lastResetDate.toDate() : new Date(0);
        const now = new Date(); const sunday = new Date(now); sunday.setDate(now.getDate() - now.getDay()); sunday.setHours(0, 0, 0, 0);
        if (lastResetDate.getTime() < sunday.getTime()) {
            const petsRef = collection(db, `artifacts/${appId}/public/data/pets`);
            const petsSnapshot = await getDocs(petsRef); if (petsSnapshot.empty) { await setDoc(leaderboardStateRef, { lastResetDate: serverTimestamp() }); return; }
            const allPets = petsSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
            let highestScore = 0; let winners = [];
            allPets.forEach(pet => { const score = pet.weeklyPoints || 0; if (score > 0) { if (score > highestScore) { highestScore = score; winners = [pet.id]; } else if (score === highestScore) { winners.push(pet.id); } } });
            const batch = writeBatch(db);
            if (winners.length > 0) {
                winners.forEach(winnerId => {
                    const winnerRef = doc(db, `artifacts/${appId}/public/data/pets`, winnerId);
                    const winnerData = allPets.find(p => p.id === winnerId);
                    const newBadges = [...(winnerData.badges || []).filter(b => b.id !== GOLD_BADGE.id), GOLD_BADGE];
                    batch.update(winnerRef, { badges: newBadges });
                });
            }
            petsSnapshot.docs.forEach(petDoc => { batch.update(petDoc.ref, { weeklyPoints: 0 }); });
            batch.set(leaderboardStateRef, { lastResetDate: serverTimestamp() });
            await batch.commit();
            showMessage("A new week has begun! Leaderboard reset and winner(s) awarded.  🏆 ");
        }
    } catch (error) { console.error("Error during weekly reset:", error); }
}

// Firebase Listeners
async function setupListeners(userId) {
    currentUserId = userId;
    await checkForWeeklyReset();
    const petsRef = collection(db, `artifacts/${appId}/public/data/pets`);
    unsubscribePets = onSnapshot(petsRef, (snapshot) => {
        elements.loading.classList.add('hidden');
        const pets = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        const userHasPet = pets.some(p => p.id === currentUserId);
        elements.createPetForm.classList.toggle('hidden', userHasPet);
        elements.mainDisplay.classList.toggle('hidden', !userHasPet);
        renderAllPets(pets);
        renderLeaderboard(pets);
    }, (error) => { console.error("Firestore Error:", error); elements.loading.textContent = "Error connecting to database."; });
    const battlesRef = collection(db, `artifacts/${appId}/public/data/battles`);
    unsubscribeBattles = onSnapshot(battlesRef, (snapshot) => {
        const battles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        renderBattleNotifications(battles);
        myCurrentActiveBattle = battles.find(b => b.status === 'active' && (b.challengerId === currentUserId || b.opponentId === currentUserId));
        renderActiveBattleStatus(myCurrentActiveBattle);
        if (myCurrentActiveBattle && myCurrentActiveBattle.challengerWordCount >= 0 && myCurrentActiveBattle.opponentWordCount >= 0) {
            resolveBattle(myCurrentActiveBattle);
            elements.battleModal.classList.add('hidden');
            if(activeBattleTimer) clearInterval(activeBattleTimer);
        }
    });
}

// Auth State Handler
onAuthStateChanged(auth, (user) => {
    if (user) {
        elements.authContainer.classList.add('hidden');
        elements.userInfoContainer.classList.remove('hidden');
        elements.userInfoContainer.classList.add('flex');
        elements.userEmail.textContent = user.email;
        elements.loading.classList.remove('hidden');
        if (currentUserId !== user.uid) {
            unsubscribePets(); unsubscribeBattles(); setupListeners(user.uid);
        }
    } else {
        currentUserId = null; unsubscribePets(); unsubscribeBattles();
        elements.authContainer.classList.remove('hidden');
        elements.loading.classList.add('hidden');
        elements.mainDisplay.classList.add('hidden');
        elements.createPetForm.classList.add('hidden');
        elements.userInfoContainer.classList.add('hidden');
        elements.userInfoContainer.classList.remove('flex');
        elements.userEmail.textContent = '';
    }
});
window.addPoints=async(t)=>{if(!currentUserId||!t||t<=0)return;try{const e=doc(db,`artifacts/${appId}/public/data/pets`,currentUserId),n=await getDoc(e);if(n.exists()){const r=(n.data().points||0)+t,o=(n.data().weeklyPoints||0)+t;await updateDoc(e,{points:r,weeklyPoints:o})}}catch(a){console.error("Error adding points:",a)}};

// Initialize App
function initialize() {
    elements.messageModal.classList.add('hidden');
    elements.shopModal.classList.add('hidden');
    elements.battleModal.classList.add('hidden');
    elements.historyModal.classList.add('hidden');
    elements.communityModal.classList.add('hidden');
    renderPetOptions();
}

// Start the app
initialize();
