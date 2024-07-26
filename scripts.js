// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyB6uVxF8NjNY4GpODW1h9Ha26zhhxs4Irw",
    authDomain: "nbhdhideandseek-9aa19.firebaseapp.com",
    databaseURL: "https://nbhdhideandseek-9aa19-default-rtdb.firebaseio.com",
    projectId: "nbhdhideandseek-9aa19",
    storageBucket: "nbhdhideandseek-9aa19.appspot.com",
    messagingSenderId: "628281251970",
    appId: "1:628281251970:web:312b19439a29156353bc9b"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const database = firebase.database();

let playerId = null;
let currentRoom = null;
let playerName = null;
let playerRole = null;
let userPosition = { lat: 0, lng: 0 };
let proximityAlertSent = {};
const playerMarkers = {};

// Sounds
const catchSound = new Audio('catch_sound.mp3');
const proximitySound = new Audio('proximity_sound.mp3');

// Update Position
function updatePosition(position) {
    if (!currentRoom || !playerId) return;

    const lat = position.coords.latitude;
    const lng = position.coords.longitude;
    userPosition = { lat, lng };

    const playerData = {
        lat: lat,
        lng: lng,
        speed: position.coords.speed || 0,
        direction: position.coords.heading || 0,
        role: playerRole,
        name: playerName,
        catches: playerRole === 'seeker' ? (playerMarkers[playerId] ? playerMarkers[playerId].catches || 0 : 0) : 0
    };

    database.ref('rooms/' + currentRoom + '/players/' + playerId).set(playerData);
    checkProximity();
}

// Check Proximity
function checkProximity() {
    if (!currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
        snapshot.forEach(playerSnapshot => {
            const player = playerSnapshot.val();
            if (playerId !== playerSnapshot.key) {
                const distance = calculateDistance(userPosition, { lat: player.lat, lng: player.lng });
                if (playerRole === 'seeker' && distance <= 1) {
                    if (!playerMarkers[playerSnapshot.key]) {
                        playerMarkers[playerSnapshot.key] = { catches: 0 };
                    }
                    playerMarkers[playerSnapshot.key].catches++;
                    catchSound.play();
                    displayPopup(`Caught ${player.name}!`);
                    database.ref('rooms/' + currentRoom + '/players/' + playerSnapshot.key).update({ role: 'seeker' });
                } else if (playerRole === 'hider' && distance <= 15 && !proximityAlertSent[playerSnapshot.key]) {
                    proximityAlertSent[playerSnapshot.key] = true;
                    proximitySound.play();
                    displayPopup(`Proximity alert: ${player.name} is ${Math.round(distance)} feet away.`);
                }
            }
        });
    }).catch(error => {
        console.error("Error checking proximity: " + error.message);
    });
}

// Calculate Distance
function calculateDistance(pos1, pos2) {
    const R = 6371e3; // Earth radius in meters
    const lat1 = pos1.lat * Math.PI / 180;
    const lat2 = pos2.lat * Math.PI / 180;
    const deltaLat = (pos2.lat - pos1.lat) * Math.PI / 180;
    const deltaLng = (pos2.lng - pos1.lng) * Math.PI / 180;

    const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng / 2) * Math.sin(deltaLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c * 3.28084; // Convert to feet
}

// Show Geolocation Error
function showError(error) {
    displayPopup("Error in getting geolocation: " + error.message);
}

// Start Geolocation
function startGeolocation() {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(updatePosition, showError, { enableHighAccuracy: true });
    } else {
        displayPopup("Geolocation is not supported by this browser.");
    }
}

// Join Room
function joinRoom() {
    const name = document.getElementById('player-name').value.trim();
    const roomCode = document.getElementById('room-code').value.trim();
    if (name === '' || roomCode === '') {
        document.getElementById('room-message').innerText = "Please enter your name and room code.";
        return;
    }

    playerName = name;
    currentRoom = roomCode;
    playerRole = document.querySelector('input[name="role"]:checked').value;

    database.ref('rooms/' + roomCode).once('value').then(snapshot => {
        if (snapshot.exists()) {
            playerId = `player_${Math.floor(Math.random() * 10000)}`;
            database.ref('rooms/' + roomCode + '/players/' + playerId).set({
                name: playerName,
                lat: 0,
                lng: 0,
                speed: 0,
                direction: 0,
                role: playerRole,
                catches: 0
            }).then(() => {
                document.getElementById('auth-box').style.display = 'none';
                document.getElementById('game-area').style.display = 'block';
                document.getElementById('leaderboard').style.display = 'block';
                document.getElementById('leave-game-button').style.display = 'block';
                startGeolocation();
                updateLeaderboard();
            });
        } else {
            document.getElementById('room-message').innerText = "Room does not exist.";
        }
    }).catch(error => {
        document.getElementById('room-message').innerText = "Error: " + error.message;
    });
}

// Create Room
function createRoom() {
    const name = document.getElementById('player-name').value.trim();
    if (name === '') {
        document.getElementById('room-message').innerText = "Please enter your name.";
        return;
    }

    playerName = name;
    playerRole = document.querySelector('input[name="role"]:checked').value;

    playerId = `player_${Math.floor(Math.random() * 10000)}`;
    currentRoom = `room_${Math.floor(Math.random() * 10000)}`;

    database.ref('rooms/' + currentRoom).set({
        players: {
            [playerId]: {
                name: playerName,
                lat: 0,
                lng: 0,
                speed: 0,
                direction: 0,
                role: playerRole,
                catches: 0
            }
        }
    }).then(() => {
        document.getElementById('auth-box').style.display = 'none';
        document.getElementById('game-area').style.display = 'block';
        document.getElementById('leaderboard').style.display = 'block';
        document.getElementById('leave-game-button').style.display = 'block';
        startGeolocation();
        updateLeaderboard();
        displayPopup(`Room created! Your room code is ${currentRoom}.`);
    }).catch(error => {
        document.getElementById('room-message').innerText = "Error: " + error.message;
    });
}

// Leave Game
function leaveGame() {
    if (!playerId || !currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players/' + playerId).remove().then(() => {
        database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
            let activeSeekers = 0;
            snapshot.forEach(playerSnapshot => {
                const player = playerSnapshot.val();
                if (player.role === 'seeker') {
                    activeSeekers++;
                }
            });
            if (activeSeekers === 0) {
                database.ref('rooms/' + currentRoom).remove();
            }
        });
        document.getElementById('auth-box').style.display = 'block';
        document.getElementById('game-area').style.display = 'none';
        document.getElementById('leaderboard').style.display = 'none';
        document.getElementById('leave-game-button').style.display = 'none';
        currentRoom = null;
        playerId = null;
    }).catch(error => {
        displayPopup("Error leaving game: " + error.message);
    });
}

// Toggle Leaderboard
function toggleLeaderboard() {
    const leaderboard = document.getElementById('leaderboard');
    leaderboard.style.display = leaderboard.style.display === 'none' ? 'block' : 'none';
    updateLeaderboard();
}

// Update Leaderboard
function updateLeaderboard() {
    if (!currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
        let leaderboardHtml = '';
        const players = snapshot.val();
        if (players) {
            const seekers = [];
            const hiders = [];
            for (const key in players) {
                const player = players[key];
                if (player.role === 'seeker') {
                    seekers.push({
                        name: player.name,
                        catches: player.catches || 0
                    });
                } else {
                    hiders.push({
                        name: player.name
                    });
                }
            }

            seekers.sort((a, b) => b.catches - a.catches);
            hiders.forEach(hider => {
                leaderboardHtml += `<div>${hider.name} (Hider)</div>`;
            });
            seekers.forEach(seeker => {
                leaderboardHtml += `<div>${seeker.name} (Seeker) - Caught: ${seeker.catches}</div>`;
            });

            document.getElementById('leaderboard').innerHTML = leaderboardHtml;
        }
    }).catch(error => {
        console.error("Error updating leaderboard: " + error.message);
    });
}

// Display Popup
function displayPopup(message) {
    const popup = document.createElement('div');
    popup.className = 'popup';
    popup.innerText = message;
    document.body.appendChild(popup);
    setTimeout(() => popup.remove(), 3000);
}

// Initialize Game
document.addEventListener('DOMContentLoaded', () => {
    // Additional initialization if needed
});
