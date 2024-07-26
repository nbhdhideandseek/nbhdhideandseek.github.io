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
        await navigator.mediaDevices.getUserMedia({ video: true });
        await navigator.geolocation.getCurrentPosition(() => { });
        // Additional sensor permissions can be requested through device-specific APIs or user prompts.
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
            const leaderboard = leaderboardSnapshot.val();
            displayLeaderboard(leaderboard);
        } else {
            showPopup('No leaderboard data available.');
        }
    } catch (error) {
        console.error('Error fetching leaderboard:', error);
        showPopup('Error fetching leaderboard. Please try again.');
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

    // Initialize game state
    catchesDisplay.textContent = 'Catches: 0';
    closeCallsDisplay.textContent = 'Close Calls: 0';

    // Start updating player's location and handling game logic
    startGameLogic();
}

function startGameLogic() {
    const roomId = localStorage.getItem('roomId');
    const username = localStorage.getItem('username');
    const role = localStorage.getItem('role');

    if (!roomId || !username || !role) return;

    // Start listening to player's geolocation
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

    // Listen for changes in the game state
    database.ref('rooms/' + roomId + '/players').on('value', (snapshot) => {
        const players = snapshot.val();
        updatePlayerPositions(players);
    });
}

function updatePlayerPositions(players) {
    const username = localStorage.getItem('username');
    const userCoords = players[username];

    if (!userCoords) return;

    const { latitude: userLat, longitude: userLon } = userCoords;

    Object.keys(players).forEach((playerName) => {
        if (playerName === username) return;

        const playerCoords = players[playerName];
        const { latitude, longitude, role } = playerCoords;

        const distance = calculateDistance(userLat, userLon, latitude, longitude);

        // Update AR elements based on distance and role
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
    const circle = document.createElement('div');
    circle.className = 'ar-circle';
    circle.textContent = `${playerName} (${distance.toFixed(1)}m)`;

    if (role === 'seeker') {
        circle.style.backgroundColor = 'red';
    } else {
        circle.style.backgroundColor = 'blue';
    }

    // Place the circle in the AR scene based on the player's relative position
    // This can be done using A-Frame entities and setting their position
    // according to the calculated distance and direction.

    // Example:
    // const playerEntity = document.createElement('a-entity');
    // playerEntity.setAttribute('geometry', { primitive: 'circle', radius: 1 });
    // playerEntity.setAttribute('material', { color: role === 'seeker' ? 'red' : 'blue' });
    // playerEntity.setAttribute('position', calculatePositionFromDistance(distance));
    // document.querySelector('a-scene').appendChild(playerEntity);
}

// Add additional game logic for proximity alerts, catches, and close calls here

// Example of proximity alert and catch logic
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
            // Proximity alert
            if (role === 'seeker' || playerRole === 'seeker') {
                playSound('proximity');
                showPopup(`Proximity alert with ${playerName}`);
            }
        } else if (distance <= 1) {
            // Catch logic
            if (role === 'seeker' && playerRole === 'hider') {
                // Update Firebase
                database.ref('rooms/' + roomId + '/players/' + playerName).update({ role: 'seeker' });
                updateCatchCount();
                playSound('catch');
                showPopup(`Caught ${playerName}`);
            }
        } else if (distance <= 5) {
            // Close call logic
            if (role === 'hider' && playerRole === 'seeker') {
                updateCloseCallCount();
                playSound('close-call');
                showPopup(`Close call with ${playerName}`);
            }
        }
    });
}

// Functions to play sound and update stats
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
