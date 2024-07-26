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

// Global Variables
let playerId = null;
let currentRoom = null;
let playerRole = 'hider'; // Default role

// Request Permissions
function requestPermissions() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(startGeolocation, handleLocationError);
    } else {
        displayPopup("Geolocation is not supported by this browser.");
    }
}

// Start Geolocation
function startGeolocation(position) {
    if (navigator.geolocation) {
        navigator.geolocation.watchPosition(updatePosition, handleLocationError, {
            enableHighAccuracy: true,
            maximumAge: 10000,
            timeout: 5000
        });
    }
}

// Update Position
function updatePosition(position) {
    if (playerId && currentRoom) {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const speed = position.coords.speed || 0;
        const direction = 0; // Use device orientation if needed

        database.ref('rooms/' + currentRoom + '/players/' + playerId).update({
            lat,
            lng,
            speed,
            direction
        });

        checkProximity();
    }
}

// Handle Location Error
function handleLocationError(error) {
    console.error("Geolocation error: " + error.message);
}

// Create Room
function createRoom() {
    const playerName = document.getElementById('player-name').value;
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
        requestPermissions();
        updateLeaderboard();
        displayPopup(`Room created! Your room code is ${currentRoom}.`);
    }).catch(error => {
        document.getElementById('room-message').innerText = "Error: " + error.message;
    });
}

// Join Room
function joinRoom() {
    const roomCode = document.getElementById('room-code').value;
    const playerName = document.getElementById('player-name').value;
    playerRole = document.querySelector('input[name="role"]:checked').value;

    playerId = `player_${Math.floor(Math.random() * 10000)}`;
    currentRoom = roomCode;

    database.ref('rooms/' + currentRoom + '/players/' + playerId).set({
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
        requestPermissions();
        updateLeaderboard();
        displayPopup(`Joined room ${currentRoom}.`);
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
}

// Update Leaderboard
function updateLeaderboard() {
    if (!currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
        const leaderboard = document.getElementById('leaderboard');
        leaderboard.innerHTML = '';
        let seekers = [];
        let hiders = [];

        snapshot.forEach(playerSnapshot => {
            const player = playerSnapshot.val();
            const playerElement = document.createElement('div');
            playerElement.classList.add('player');
            playerElement.classList.add(player.role);
            playerElement.innerHTML = `${player.name} (${player.role}) - Caught: ${player.catches}`;
            if (player.role === 'seeker') {
                seekers.push(playerElement);
            } else {
                hiders.push(playerElement);
            }
        });

        seekers.sort((a, b) => b.innerText.split(':')[1] - a.innerText.split(':')[1]);
        seekers.forEach(seeker => leaderboard.appendChild(seeker));
        hiders.forEach(hider => leaderboard.appendChild(hider));
    });
}

// Update AR
function updateAR() {
    // Implement AR logic
}

// Check Proximity
function checkProximity() {
    if (!playerId || !currentRoom) return;

    database.ref('rooms/' + currentRoom + '/players').once('value').then(snapshot => {
        const currentPlayerData = snapshot.child(playerId).val();
        snapshot.forEach(otherPlayerSnapshot => {
            if (otherPlayerSnapshot.key !== playerId) {
                const otherPlayerData = otherPlayerSnapshot.val();
                const distance = calculateDistance(currentPlayerData.lat, currentPlayerData.lng, otherPlayerData.lat, otherPlayerData.lng);
                if (distance < 1) {
                    // Update the caught player
                    database.ref('rooms/' + currentRoom + '/players/' + otherPlayerSnapshot.key).update({
                        role: 'seeker'
                    });
                    // Update the catching player
                    database.ref('rooms/' + currentRoom + '/players/' + playerId).update({
                        catches: currentPlayerData.catches + 1
                    });
                    // Notify the players
                    displayPopup(`${otherPlayerData.name} has been caught and is now a seeker.`);
                } else if (distance < 15) {
                    // Proximity alert
                    displayPopup(`Proximity alert: ${otherPlayerData.name} is ${Math.round(distance)} feet away. Speed: ${Math.round(otherPlayerData.speed)} ft/s`);
                }
            }
        });
    });
}

// Calculate Distance
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 3958.8; // Radius of the Earth in miles
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c; // Distance in miles
    return distance * 5280; // Convert miles to feet
}

function toRad(value) {
    return value * Math.PI / 180;
}

// Display Popup
function displayPopup(message) {
    const popupContainer = document.getElementById('popup-container');
    const popup = document.createElement('div');
    popup.classList.add('popup');
    popup.innerText = message;
    popupContainer.appendChild(popup);
    setTimeout(() => {
        popupContainer.removeChild(popup);
    }, 5000);
}

// Event Listeners
document.getElementById('create-room-button').addEventListener('click', createRoom);
document.getElementById('join-room-button').addEventListener('click', joinRoom);
document.getElementById('leave-game-button').addEventListener('click', leaveGame);
document.getElementById('toggle-leaderboard-button').addEventListener('click', toggleLeaderboard);

// Start AR and Geolocation
requestPermissions();
setInterval(updateAR, 1000);
