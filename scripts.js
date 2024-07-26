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
const leaderboardPopup = document.getElementById('leaderboard');

// Request Permissions
async function requestPermissions() {
    try {
        await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
        await navigator.geolocation.getCurrentPosition(() => { });
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

    await requestPermissions();

    try {
        const roomId = Math.random().toString(36).substring(2, 8).toUpperCase(); // Example room ID
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

    await requestPermissions();

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
    localStorage.removeItem('roomId');
    localStorage.removeItem('username');
    localStorage.removeItem('role');
    gameView.style.display = 'none';
    mainMenu.style.display = 'flex';
});

// Toggle Leaderboard
toggleLeaderboardButton.addEventListener('click', async () => {
    leaderboardPopup.classList.toggle('show');
    if (leaderboardPopup.classList.contains('show')) {
        try {
            const roomId = localStorage.getItem('roomId');
            const leaderboardRef = database.ref('rooms/' + roomId + '/leaderboard');
            const leaderboardSnapshot = await leaderboardRef.once('value');

            if (leaderboardSnapshot.exists()) {
                const leaderboard = leaderboardSnapshot.val();
                displayLeaderboard(leaderboard);
            } else {
                showPopup('No leaderboard data available.');
            }
        } catch (error) {
            console.error('Error fetching leaderboard:', error);
            showPopup('Error fetching leaderboard. Please try again.');
        }
    }
});

function showGameView() {
    mainMenu.style.display = 'none';
    gameView.style.display = 'block';
    updateDockInfo();
}

function updateDockInfo() {
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');
    const roomId = localStorage.getItem('roomId');

    userNameDisplay.textContent = username;
    roomIdDisplay.textContent = roomId;

    if (role === 'seeker') {
        document.getElementById('dock').classList.add('red');
        document.getElementById('dock').classList.remove('blue');
    } else {
        document.getElementById('dock').classList.add('blue');
        document.getElementById('dock').classList.remove('red');
    }

    catchesDisplay.textContent = 'Catches: 0';
    closeCallsDisplay.textContent = 'Close Calls: 0';

    startGameLogic();
}

function startGameLogic() {
    const roomId = localStorage.getItem('roomId');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (!roomId || !username || !role) return;

    navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        database.ref('rooms/' + roomId + '/players/' + username).set({
            latitude,
            longitude,
            role
        });
    }, (error) => {
        console.error('Error watching position:', error);
        showPopup('Error watching position. Please enable location services.');
    });

    database.ref('rooms/' + roomId + '/players').on('value', (snapshot) => {
        const players = snapshot.val();
        updatePlayerPositions(players);
        handleProximityAndCatches(players);
    });
}

function updatePlayerPositions(players) {
    const username = localStorage.getItem('username');
    const userCoords = players[username];

    if (!userCoords) return;

    const { latitude: userLat, longitude: userLon } = userCoords;

    Object.keys(players).forEach((playerName) => {
        const playerCoords = players[playerName];
        const { latitude, longitude, role } = playerCoords;

        const distance = calculateDistance(userLat, userLon, latitude, longitude);

        updateARElements(playerName, distance, role);
    });
}

function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3; // Earth radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
}

function updateARElements(playerName, distance, role) {
    const existingCircles = document.querySelectorAll('.ar-circle');
    existingCircles.forEach(circle => circle.remove());

    const circle = document.createElement('div');
    circle.className = 'ar-circle';
    circle.textContent = `${playerName} (${distance.toFixed(1)}m)`;

    if (role === 'seeker') {
        circle.style.backgroundColor = 'red';
    } else {
        circle.style.backgroundColor = 'blue';
    }

    // Position the circle in the AR scene
    const playerEntity = document.createElement('a-entity');
    playerEntity.setAttribute('geometry', { primitive: 'circle', radius: 1 });
    playerEntity.setAttribute('material', { color: role === 'seeker' ? 'red' : 'blue' });
    playerEntity.setAttribute('position', { x: distance, y: 0, z: 0 });
    document.querySelector('a-scene').appendChild(playerEntity);
}

function handleProximityAndCatches(players) {
    const username = localStorage.getItem('username');
    const userCoords = players[username];
    const role = localStorage.getItem('role');

    if (!userCoords) return;

    const { latitude: userLat, longitude: userLon } = userCoords;

    Object.keys(players).forEach((playerName) => {
        if (playerName === username) return;

        const playerCoords = players[playerName];
        const { latitude, longitude, role: playerRole } = playerCoords;

        const distance = calculateDistance(userLat, userLon, latitude, longitude);

        if (distance <= 15 && distance > 1) {
            if (role === 'seeker' || playerRole === 'seeker') {
                playSound('proximity');
                showPopup(`Proximity alert with ${playerName}`);
            }
        } else if (distance <= 1) {
            if (role === 'seeker' && playerRole === 'hider') {
                database.ref('rooms/' + roomId + '/players/' + playerName).update({ role: 'seeker' });
                updateCatchCount();
                playSound('catch');
                showPopup(`Caught ${playerName}`);
            }
        } else if (distance <= 5) {
            if (role === 'hider' && playerRole === 'seeker') {
                updateCloseCallCount();
                playSound('close-call');
                showPopup(`Close call with ${playerName}`);
            }
        }
    });
}

function playSound(type) {
    const audio = new Audio(`sounds/${type}.mp3`);
    audio.play();
}

function updateCatchCount() {
    const count = parseInt(catchesDisplay.textContent.split(': ')[1], 10) + 1;
    catchesDisplay.textContent = `Catches: ${count}`;
}

function updateCloseCallCount() {
    const count = parseInt(closeCallsDisplay.textContent.split(': ')[1], 10) + 1;
    closeCallsDisplay.textContent = `Close Calls: ${count}`;
}

function displayLeaderboard(leaderboard) {
    leaderboardPopup.innerHTML = '<h2>Leaderboard</h2>';
    const sortedLeaderboard = Object.entries(leaderboard).sort((a, b) => b[1].catches - a[1].catches);
    sortedLeaderboard.forEach(([playerName, stats]) => {
        leaderboardPopup.innerHTML += `<p>${playerName}: ${stats.catches} catches, ${stats.closeCalls} close calls</p>`;
    });
    leaderboardPopup.classList.add('show');
    setTimeout(() => leaderboardPopup.classList.remove('show'), 10000);
}
