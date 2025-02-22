const socket = io();

let role = null; // "host" o "client"
let roomId = null;
let peerConnection = null;
let dataChannel = null;
let gameStarted = false;

// Configurazione STUN per WebRTC
const config = {
  iceServers: [
    { urls: "stun:stun.l.google.com:19302" }
  ]
};

// Helper per aggiungere log
function addLog(message) {
  const logDiv = document.getElementById('log');
  const p = document.createElement('p');
  p.textContent = message;
  logDiv.appendChild(p);
  logDiv.scrollTop = logDiv.scrollHeight;
}

// Aggiorna lo stato
function updateStatus(message) {
  document.getElementById('status').textContent = message;
}

// Definisci sendGameState globalmente (verifica che sia definita PRIMA di start_game)
window.sendGameState = function(ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight) {
  if (role === "host" && dataChannel && dataChannel.readyState === "open") {
    const state = {
      type: "gameState",
      ballX: ballX,
      ballY: ballY,
      leftPaddleY: leftPaddleY,
      rightPaddleY: rightPaddleY,
      scoreLeft: scoreLeft,
      scoreRight: scoreRight
    };
    // Log del messaggio inviato
    addLog("Invio stato di gioco: " + JSON.stringify(state));
    dataChannel.send(JSON.stringify(state));
  }
};

// Gestione della lobby
document.getElementById('createRoom').addEventListener('click', () => {
  roomId = prompt("Inserisci un ID per la stanza:");
  if (roomId) {
    socket.emit('create_room', roomId);
    addLog("Stanza creata: " + roomId);
  }
});

document.getElementById('joinRoom').addEventListener('click', () => {
  roomId = prompt("Inserisci l'ID della stanza:");
  if (roomId) {
    socket.emit('join_room', roomId);
    addLog("Richiesta per entrare nella stanza: " + roomId);
  }
});

// Quando il server conferma l'ingresso nella stanza
socket.on('room_joined', (room) => {
  addLog("Sei entrato nella stanza: " + room);
  updateStatus("In attesa degli altri giocatori...");
  socket.emit('get_room_players', room);
});

// Il server invia l'elenco dei giocatori: il primo diventa host
socket.on('room_players', (players) => {
  if (players[0] === socket.id) {
    role = "host";
    addLog("Sei l'host della stanza.");
  } else {
    role = "client";
    addLog("Sei il client della stanza.");
  }
  // Mostra il pulsante "Pronto"
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
    document.getElementById('controls').appendChild(btn);
  }
});

// Notifica se un giocatore lascia la stanza
socket.on('player_left', (msg) => {
  addLog("Notifica: " + msg);
  updateStatus("Un giocatore ha lasciato la stanza. In attesa di un nuovo giocatore...");
  const readyBtn = document.getElementById('readyButton');
  if (readyBtn) readyBtn.disabled = false;
  const newGameBtn = document.getElementById('newGameButton');
  if (newGameBtn) newGameBtn.remove();
});

// Se il client diventa nuovo host
socket.on('new_host', () => {
  role = "host";
  addLog("Sei diventato il nuovo host.");
  Module.ccall('set_role', null, ['number'], [1]);
});

// Quando entrambi sono pronti, il server invia 'start_game'
socket.on('start_game', () => {
  addLog("Entrambi i giocatori sono pronti. Inizio partita...");
  updateStatus("Gioco in corso...");
  gameStarted = true;
  document.getElementById('lobby').style.display = 'none';
  document.getElementById('pongCanvas').style.display = 'block';
  startWebRTC();
});

// --- SIGNALING WebRTC tramite Socket.io ---
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

// --- Creazione della connessione WebRTC e del data channel ---
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
      window.sendPaddleInput = function(direction) {
        const msg = JSON.stringify({ type: "paddle", direction: direction });
        dataChannel.send(msg);
      };
    }
    // Avvia il gioco WASM
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
        // Se host, applica l'input remoto
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

// Mostra il pulsante "Nuova Partita"
function showNewGameButton() {
  const controlsDiv = document.getElementById('controls');
  let newGameBtn = document.getElementById('newGameButton');
  if (!newGameBtn) {
    newGameBtn = document.createElement('button');
    newGameBtn.id = 'newGameButton';
    newGameBtn.textContent = "Nuova Partita";
    newGameBtn.addEventListener('click', () => {
      location.reload();
    });
    controlsDiv.appendChild(newGameBtn);
  }
}
