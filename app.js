const socket = io();
let role = null; // "host" o "client"
let roomId = null;
let peerConnection = null;
let dataChannel = null;
let gameStarted = false;

// Riferimenti agli elementi delle varie schermate
const homeScreen = document.getElementById('homeScreen');
const roomListScreen = document.getElementById('roomListScreen');
const lobbyScreen = document.getElementById('lobbyScreen');
const gameScreen = document.getElementById('gameScreen');
const roomListUl = document.getElementById('roomList');
const lobbyStatus = document.getElementById('lobbyStatus');
const lobbyControls = document.getElementById('lobbyControls');
const logDiv = document.getElementById('log');
const winnerOverlay = document.getElementById('winnerOverlay');
const winnerMessage = document.getElementById('winnerMessage');

// Helper: aggiunge un messaggio al log
function addLog(message) {
  const p = document.createElement('p');
  p.textContent = message;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
  console.log(message);
}

// Aggiorna lo stato nella lobby o nelle altre sezioni
function updateStatus(message) {
  if (lobbyScreen.style.display === "block") {
    lobbyStatus.textContent = message;
  }
}

// Funzione per mostrare una schermata e nascondere le altre
function showScreen(screen) {
  homeScreen.style.display = "none";
  roomListScreen.style.display = "none";
  lobbyScreen.style.display = "none";
  gameScreen.style.display = "none";
  screen.style.display = "block";
}

// --- Gestione della navigazione delle schermate ---
// Home Screen
document.getElementById('btnCreateRoom').addEventListener('click', () => {
  roomId = prompt("Inserisci un ID per la stanza:");
  if (roomId) {
    socket.emit('create_room', roomId);
    addLog("Stanza creata: " + roomId);
    showScreen(lobbyScreen);
    updateStatus("Attesa dell'altro giocatore...");
  }
});

document.getElementById('btnJoinRoom').addEventListener('click', () => {
  socket.emit('list_rooms');
  showScreen(roomListScreen);
});

document.getElementById('btnRefreshRooms').addEventListener('click', () => {
  socket.emit('list_rooms');
});

document.getElementById('btnBackHomeFromRooms').addEventListener('click', () => {
  showScreen(homeScreen);
});

// Lobby: mostra il pulsante "Pronto"
function showReadyButton() {
  if (!document.getElementById('readyButton')) {
    const btn = document.createElement('button');
    btn.id = 'readyButton';
    btn.textContent = "Pronto";
    btn.addEventListener('click', () => {
      socket.emit('ready', roomId);
      updateStatus("Pronto! In attesa che l'altro giocatore sia pronto...");
      addLog("Hai premuto 'Pronto'. In attesa dell'altro giocatore...");
      btn.disabled = true;
    });
    lobbyControls.appendChild(btn);
  }
}

// In Game Screen: pulsante per tornare alla lobby (per semplicità ricarica la pagina)
document.getElementById('btnBackToLobby').addEventListener('click', () => {
  location.reload();
});

// Overlay: gestione dei pulsanti di ripartenza o ritorno al menu
document.getElementById('btnRestartGame').addEventListener('click', () => {
  location.reload();
});
document.getElementById('btnReturnHome').addEventListener('click', () => {
  location.reload();
});

// --- Socket.io events ---
// Quando il server conferma l'ingresso in una stanza
socket.on('room_joined', (room) => {
  addLog("Sei entrato nella stanza: " + room);
  roomId = room;
  showScreen(lobbyScreen);
  updateStatus("Attesa degli altri giocatori...");
  socket.emit('get_room_players', room);
});

// Ricezione dell'elenco dei giocatori in stanza
socket.on('room_players', (players) => {
  if (players[0] === socket.id) {
    role = "host";
    addLog("Sei l'host della stanza.");
  } else {
    role = "client";
    addLog("Sei il client della stanza.");
  }
  showReadyButton();
});

// Evento "room_list": il server restituisce le stanze disponibili (con 1 solo giocatore)
socket.on('room_list', (rooms) => {
  roomListUl.innerHTML = "";
  if (rooms.length === 0) {
    const li = document.createElement('li');
    li.textContent = "Nessuna stanza disponibile";
    roomListUl.appendChild(li);
  } else {
    rooms.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r;
      li.addEventListener('click', () => {
        socket.emit('join_room', r);
        addLog("Richiesta per entrare nella stanza: " + r);
      });
      roomListUl.appendChild(li);
    });
  }
});

// Notifica se un giocatore lascia la stanza
socket.on('player_left', (msg) => {
  addLog("Notifica: " + msg);
  updateStatus("Un giocatore ha lasciato la stanza. Attesa di un nuovo giocatore...");
  const readyBtn = document.getElementById('readyButton');
  if (readyBtn) readyBtn.disabled = false;
});

// Se il client diventa nuovo host
socket.on('new_host', () => {
  role = "host";
  addLog("Sei diventato il nuovo host.");
  Module.ccall('set_role', null, ['number'], [1]);
});

// Quando entrambi i giocatori sono pronti, il server invia 'start_game'
socket.on('start_game', () => {
  addLog("Entrambi i giocatori sono pronti. Inizio partita...");
  updateStatus("Gioco in corso...");
  showScreen(gameScreen);
  startWebRTC();
});

window.sendGameState = function(ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight) {
    if (dataChannel && dataChannel.readyState === "open") {
      const state = {
        type: "gameState",
        ballX: ballX,
        ballY: ballY,
        leftPaddleY: leftPaddleY,
        rightPaddleY: rightPaddleY,
        scoreLeft: scoreLeft,
        scoreRight: scoreRight
      };
      addLog("Invio stato di gioco: " + JSON.stringify(state));
      dataChannel.send(JSON.stringify(state));
    }
  };
  

// --- WebRTC signaling tramite Socket.io ---
socket.on('webrtc_offer', async (offer) => {
  if (role === "client") {
    addLog("Ricevuto webrtc_offer.");
    await createPeerConnection();
    await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
    const answer = await peerConnection.createAnswer();
    await peerConnection.setLocalDescription(answer);
    socket.emit('webrtc_answer', answer, roomId);
  }
});

socket.on('webrtc_answer', async (answer) => {
  if (role === "host") {
    addLog("Ricevuto webrtc_answer.");
    await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
  }
});

socket.on('webrtc_ice_candidate', async (candidate) => {
  try {
    await peerConnection.addIceCandidate(candidate);
    addLog("Candidate ICE aggiunto.");
  } catch (e) {
    console.error('Errore nell’aggiunta del candidate ICE', e);
  }
});

// --- Creazione della connessione WebRTC e data channel ---
const config = { iceServers: [{ urls: "stun:stun.l.google.com:19302" }] };

async function createPeerConnection() {
  peerConnection = new RTCPeerConnection(config);
  
  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('webrtc_ice_candidate', event.candidate, roomId);
    }
  };

  if (role === "host") {
    dataChannel = peerConnection.createDataChannel("game");
    setupDataChannel();
    const offer = await peerConnection.createOffer();
    await peerConnection.setLocalDescription(offer);
    socket.emit('webrtc_offer', offer, roomId);
  } else {
    peerConnection.ondatachannel = (event) => {
      dataChannel = event.channel;
      setupDataChannel();
    };
  }
}

function setupDataChannel() {
  dataChannel.onopen = () => {
    addLog("Data channel aperto.");
    if (role === "host") {
      Module.ccall('set_role', null, ['number'], [1]);
    } else {
      Module.ccall('set_role', null, ['number'], [0]);
      // Definisci la funzione per inviare l'input della racchetta
      window.sendPaddleInput = function(direction) {
        const msg = JSON.stringify({ type: "paddle", direction: direction });
        dataChannel.send(msg);
      };
    }
    // Avvia il gioco (la funzione start_game è esportata dal modulo WASM)
    Module.ccall('start_game', null, [], []);
  };

  dataChannel.onmessage = (event) => {
    addLog("Messaggio ricevuto: " + event.data);
    try {
      const data = JSON.parse(event.data);
      if (data.type === "gameState") {
        Module.ccall('update_remote_state', null,
          ['number', 'number', 'number', 'number', 'number', 'number'],
          [data.ballX, data.ballY, data.leftPaddleY, data.rightPaddleY, data.scoreLeft, data.scoreRight]);
      } else if (data.type === "paddle") {
        const current = Module.ccall('get_remote_paddle', 'number', [], []);
        let newY = current;
        if (data.direction === "up") {
          newY = current - 20;
        } else if (data.direction === "down") {
          newY = current + 20;
        }
        if (newY < 0) newY = 0;
        if (newY + 100 > 600) newY = 600 - 100;
        Module.ccall('set_remote_paddle', null, ['number'], [newY]);
      }
    } catch (e) {
      console.error("Errore nel parsing del messaggio:", e);
    }
  };
}

async function startWebRTC() {
  await createPeerConnection();
}

// Definisci una funzione globale per mostrare l'overlay con il messaggio di fine partita
window.showWinner = function(message) {
  winnerMessage.textContent = message;
  winnerOverlay.style.display = "flex";
};


