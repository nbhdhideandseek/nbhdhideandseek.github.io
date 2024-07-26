// Initialize Firebase
var firebaseConfig = {
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

let playerMarkers = {};
let playerId = null;
let currentRoom = null;
let playerName = null;
let playerRole = null;
let userPosition = { lat: 0, lng: 0 };
let proximityAlertSent = {};

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
}

// Show Geolocation Error
function showError(error) {
  alert("Error in getting geolocation: " + error.message);
}

// Start Geolocation
function startGeolocation() {
  if (navigator.geolocation) {
    navigator.geolocation.watchPosition(updatePosition, showError, { enableHighAccuracy: true });
  } else {
    alert("Geolocation is not supported by this browser.");
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

  database.ref('rooms/' + roomCode).once('value').then((snapshot) => {
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
        document.querySelector('a-scene').style.display = 'block';
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
  const roomCode = Math.floor(10000 + Math.random() * 90000).toString();
  currentRoom = roomCode;

  database.ref('rooms/' + roomCode).set({
    createdAt: firebase.database.ServerValue.TIMESTAMP
  }).then(() => {
    playerId = `player_${Math.floor(Math.random() * 10000)}`;
    database.ref('rooms/' + roomCode + '/players/' + playerId).set({
      name: playerName,
      lat: 0,
      lng: 0,
      speed: 0,
      direction: 0,
      role: playerRole,
      catches: 0
    });

    document.getElementById('auth-box').style.display = 'none';
    document.querySelector('a-scene').style.display = 'block';
    document.getElementById('leaderboard').style.display = 'block';
    document.getElementById('leave-game-button').style.display = 'block';
    startGeolocation();
    alert("Room created! Share this code with your friends: " + roomCode);
    updateLeaderboard();
  }).catch(error => {
    document.getElementById('room-message').innerText = "Error: " + error.message;
  });
}

// Leave Game
function leaveGame() {
  if (!currentRoom || !playerId) return;

  database.ref('rooms/' + currentRoom + '/players/' + playerId).remove().then(() => {
    document.getElementById('auth-box').style.display = 'block';
    document.querySelector('a-scene').style.display = 'none';
    document.getElementById('leaderboard').style.display = 'none';
    document.getElementById('leave-game-button').style.display = 'none';
    document.getElementById('leaderboard-content').innerHTML = '';
    playerMarkers = {};
    currentRoom = null;
    playerId = null;
    playerName = null;
    playerRole = null;
    userPosition = { lat: 0, lng: 0 };
    proximityAlertSent = {};
  });
}

// Update Leaderboard
function updateLeaderboard() {
  if (!currentRoom) return;

  database.ref('rooms/' + currentRoom + '/players').on('value', (snapshot) => {
    const players = snapshot.val();
    const leaderboardContent = document.getElementById('leaderboard-content');
    leaderboardContent.innerHTML = '';

    if (players) {
      const seekers = [];
      const hiders = [];

      for (const id in players) {
        if (players[id].role === 'seeker') {
          seekers.push(players[id]);
        } else {
          hiders.push(players[id]);
        }
      }

      seekers.sort((a, b) => b.catches - a.catches);

      const seekerList = seekers.map(player => `<p>${player.name} (Seeker) - Catches: ${player.catches || 0}</p>`).join('');
      const hiderList = hiders.map(player => `<p>${player.name} (Hider)</p>`).join('');

      leaderboardContent.innerHTML = `<h3>Seekers</h3>${seekerList}<h3>Hiders</h3>${hiderList}`;
    }
  });
}

// Toggle Leaderboard
function toggleLeaderboard() {
  const leaderboardContent = document.getElementById('leaderboard-content');
  leaderboardContent.style.display = leaderboardContent.style.display === 'none' ? 'block' : 'none';
}

// Watch Player Position
database.ref('rooms/' + currentRoom + '/players').on('value', (snapshot) => {
  const players = snapshot.val();
  if (players) {
    for (const id in players) {
      if (id !== playerId) {
        const player = players[id];
        const distance = calculateDistance(userPosition.lat, userPosition.lng, player.lat, player.lng);

        // Update AR elements
        const playerInfoElement = document.getElementById('player-info');
        if (distance <= 15) {
          playerInfoElement.setAttribute('text', `value: ${player.name}\nDistance: ${distance.toFixed(1)} ft; color: ${player.role === 'seeker' ? 'red' : 'blue'};`);
          playerInfoElement.setAttribute('visible', true);

          if (distance <= 1 && playerRole === 'seeker' && player.role === 'hider') {
            // Auto-tagging within 1 foot
            database.ref('rooms/' + currentRoom + '/players/' + id + '/role').set('seeker');
            database.ref('rooms/' + currentRoom + '/players/' + playerId + '/catches').transaction(catches => (catches || 0) + 1);
            catchSound.play();
            displayPopup(`${player.name} caught!`);
            updateLeaderboard();
          }

          if (!proximityAlertSent[id]) {
            proximitySound.play();
            displayPopup(`Proximity alert: ${player.name} is ${distance.toFixed(1)} ft away.\nSpeed: ${(player.speed || 0).toFixed(1)} ft/s`);
            proximityAlertSent[id] = true;
          }
        } else {
          playerInfoElement.setAttribute('visible', false);
          proximityAlertSent[id] = false;
        }
      }
    }
  }
});

function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371e3; // metres
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lng2 - lng1) * Math.PI / 180;

  const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) *
            Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  const distance = R * c * 3.28084; // Convert to feet
  return distance;
}

function displayPopup(message) {
  const popup = document.createElement('div');
  popup.className = 'popup';
  popup.innerText = message;
  document.body.appendChild(popup);
  setTimeout(() => {
    popup.remove();
  }, 3000);
}
