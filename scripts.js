// Initialize Firebase
firebase.initializeApp({
    apiKey: "AIzaSyB6uVxF8NjNY4GpODW1h9Ha26zhhxs4Irw",
    authDomain: "nbhdhideandseek-9aa19.firebaseapp.com",
    databaseURL: "https://nbhdhideandseek-9aa19-default-rtdb.firebaseio.com",
    projectId: "nbhdhideandseek-9aa19",
    storageBucket: "nbhdhideandseek-9aa19.appspot.com",
    messagingSenderId: "628281251970",
    appId: "1:628281251970:web:312b19439a29156353bc9b"
});

const auth = firebase.auth();
const database = firebase.database();

// DOM Elements
const mainMenu = document.getElementById('main-menu');
const gameView = document.getElementById('game');
const createRoomButton = document.getElementById('create-room-button');
const joinRoomButton = document.getElementById('join-room-button');
const leaveGameButton = document.getElementById('leave-game-button');
const toggleLeaderboardButton = document.getElementById('toggle-leaderboard');
const userNameDisplay = document.getElementById('user-name');
const catchesDisplay = document.getElementById('catches');
const closeCallsDisplay = document.getElementById('close-calls');
const roomIdDisplay = document.getElementById('room-id');
const uiPopup = document.getElementById('ui-popup');

// Request Permissions
async function requestPermissions() {
    try {
        const cameraPermission = await navigator.permissions.request({ name: 'camera' });
        const geolocationPermission = await navigator.permissions.request({ name: 'geolocation' });
        const microphonePermission = await navigator.permissions.request({ name: 'microphone' });
        const accelerometerPermission = await navigator.permissions.request({ name: 'accelerometer' });

        if (cameraPermission.state !== 'granted' ||
            geolocationPermission.state !== 'granted' ||
            microphonePermission.state !== 'granted' ||
            accelerometerPermission.state !== 'granted') {
            throw new Error('Permission not granted');
        }
    } catch (err) {
        console.error('Error requesting permissions:', err);
        showPopup('Please grant all required permissions for the game to function properly.');
    }
}

// Show Popup
function showPopup(message) {
    uiPopup.textContent = message;
    uiPopup.classList.add('show');
    setTimeout(() => uiPopup.classList.remove('show'), 5000);
}

// Create Room
createRoomButton.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const role = document.querySelector('input[name="role"]:checked')?.value;

    if (!username || !role) {
        showPopup('Please provide a name and select a role.');
        return;
    }

    // Request permissions
    await requestPermissions();

    // Create room logic
    try {
        const roomId = Date.now().toString(); // Example room ID
        await database.ref('rooms/' + roomId).set({ host: username, role });
        await auth.signInAnonymously();
        localStorage.setItem('roomId', roomId);
        localStorage.setItem('username', username);
        localStorage.setItem('role', role);
        showGameView();
    } catch (error) {
        console.error('Error creating room:', error);
        showPopup('Error creating room. Please try again.');
    }
});

// Join Room
joinRoomButton.addEventListener('click', async () => {
    const username = document.getElementById('username').value;
    const role = document.querySelector('input[name="role"]:checked')?.value;
    const roomCode = document.getElementById('room-code').value;

    if (!username || !role || !roomCode) {
        showPopup('Please provide a name, select a role, and enter a room code.');
        return;
    }

    // Request permissions
    await requestPermissions();

    // Join room logic
    try {
        const roomRef = database.ref('rooms/' + roomCode);
        const roomSnapshot = await roomRef.once('value');

        if (!roomSnapshot.exists()) {
            showPopup('Invalid room code.');
            return;
        }

        await auth.signInAnonymously();
        localStorage.setItem('roomId', roomCode);
        localStorage.setItem('username', username);
        localStorage.setItem('role', role);
        showGameView();
    } catch (error) {
        console.error('Error joining room:', error);
        showPopup('Error joining room. Please try again.');
    }
});

// Leave Game
leaveGameButton.addEventListener('click', () => {
    // Leave game logic
    mainMenu.style.display = 'block';
    gameView.style.display = 'none';
    localStorage.clear();
});

// Toggle Leaderboard
toggleLeaderboardButton.addEventListener('click', async () => {
    const roomId = localStorage.getItem('roomId');
    if (!roomId) {
        showPopup('Unable to toggle leaderboard. Please rejoin the game.');
        return;
    }

    try {
        const leaderboardRef = database.ref('rooms/' + roomId + '/leaderboard');
        const leaderboardSnapshot = await leaderboardRef.once('value');

        if (leaderboardSnapshot.exists()) {
            const leaderboardData = leaderboardSnapshot.val();
            displayLeaderboard(leaderboardData);
        } else {
            showPopup('No leaderboard data available.');
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        showPopup('Error fetching leaderboard. Please try again.');
    }
});

// Display Leaderboard
function displayLeaderboard(data) {
    const role = localStorage.getItem('role');
    let leaderboardHtml = '<h2>Leaderboard</h2>';

    if (role === 'seeker') {
        // Display seekers sorted by number of catches
        const seekers = Object.entries(data).filter(([id, stats]) => stats.role === 'seeker');
        seekers.sort((a, b) => b[1].catches - a[1].catches);
        leaderboardHtml += '<h3>Seekers</h3><ul>';
        seekers.forEach(([id, stats]) => {
            leaderboardHtml += `<li>${stats.username}: ${stats.catches} catches</li>`;
        });
        leaderboardHtml += '</ul>';
    }

    if (role === 'hider') {
        // Display hiders with close calls
        const hiders = Object.entries(data).filter(([id, stats]) => stats.role === 'hider');
        leaderboardHtml += '<h3>Hiders</h3><ul>';
        hiders.forEach(([id, stats]) => {
            leaderboardHtml += `<li>${stats.username}: ${stats.closeCalls} close calls</li>`;
        });
        leaderboardHtml += '</ul>';
    }

    document.getElementById('ui-popup').innerHTML = leaderboardHtml;
    document.getElementById('ui-popup').classList.add('show');
    setTimeout(() => document.getElementById('ui-popup').classList.remove('show'), 10000);
}

// Show Game View
function showGameView() {
    mainMenu.style.display = 'none';
    gameView.style.display = 'block';

    const role = localStorage.getItem('role');
    document.getElementById('dock').style.backgroundColor = role === 'seeker' ? 'red' : 'blue';

    // Set user data
    const username = localStorage.getItem('username');
    const roomId = localStorage.getItem('roomId');

    userNameDisplay.textContent = username;
    roomIdDisplay.textContent = roomId;

    // Setup AR
    setupAR();
}

// Setup AR
function setupAR() {
    console.log('AR setup initialized');
    // AR.js and A-Frame initialization
}

// Check Permissions on Load
document.addEventListener('DOMContentLoaded', async () => {
    await requestPermissions();
});
