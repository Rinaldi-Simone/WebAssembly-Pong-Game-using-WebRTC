const socket = io();

let role = null; // "host" o "client"
let roomId = null;
let peerConnection = null;
let dataChannel = null;

// Configurazione STUN per WebRTC
const config = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" }
    ]
};

// Gestione della lobby
document.getElementById('createRoom').addEventListener('click', () => {
    roomId = prompt("Inserisci un ID per la stanza:");
    if (roomId) socket.emit('create_room', roomId);
});

document.getElementById('joinRoom').addEventListener('click', () => {
    roomId = prompt("Inserisci l'ID della stanza:");
    if (roomId) socket.emit('join_room', roomId);
});

// Quando il server conferma l'ingresso nella stanza, richiedi l'elenco dei giocatori
socket.on('room_joined', (room) => {
    console.log("Sei entrato nella stanza:", room);
    socket.emit('get_room_players', room);
});

// Il server risponde con l'elenco dei giocatori: il primo diventa host
socket.on('room_players', (players) => {
    if (players[0] === socket.id) {
        role = "host";
    } else {
        role = "client";
    }
    console.log("Ruolo assegnato:", role);
    // Mostra il pulsante "Pronto"
    if (!document.getElementById('readyButton')) {
        const btn = document.createElement('button');
        btn.id = 'readyButton';
        btn.textContent = "Pronto";
        btn.addEventListener('click', () => {
            socket.emit('ready', roomId);
        });
        document.getElementById('lobby').appendChild(btn);
    }
});

// Quando entrambi sono pronti, il server invia 'start_game'
socket.on('start_game', () => {
    console.log("Inizio partita!");
    document.getElementById('lobby').style.display = 'none';
    document.getElementById('pongCanvas').style.display = 'block';
    startWebRTC();
});

// --- SIGNALING WebRTC tramite Socket.io ---

socket.on('webrtc_offer', async (offer) => {
    if (role === "client") {
        await createPeerConnection();
        await peerConnection.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await peerConnection.createAnswer();
        await peerConnection.setLocalDescription(answer);
        socket.emit('webrtc_answer', answer, roomId);
    }
});

socket.on('webrtc_answer', async (answer) => {
    if (role === "host") {
        await peerConnection.setRemoteDescription(new RTCSessionDescription(answer));
    }
});

socket.on('webrtc_ice_candidate', async (candidate) => {
    try {
        await peerConnection.addIceCandidate(candidate);
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
        console.log("Data channel aperto");
        // Imposta il ruolo nel modulo WASM
        if (role === "host") {
            Module.ccall('set_role', null, ['number'], [1]);
        } else {
            Module.ccall('set_role', null, ['number'], [0]);
        }
        // Avvia il gioco
        Module.ccall('start_game', null, [], []);
        // Se sei client, definisci la funzione per inviare l'input della racchetta
        if (role === "client") {
            window.sendPaddleInput = function (direction) {
                const msg = JSON.stringify({ type: "paddle", direction: direction });
                dataChannel.send(msg);
            }
        }
    };

    dataChannel.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === "gameState") {
            // Se sei client: aggiorna lo stato di gioco ricevuto dal host
            Module.ccall('update_remote_state', null,
                ['number', 'number', 'number', 'number', 'number', 'number'],
                [data.ballX, data.ballY, data.leftPaddleY, data.rightPaddleY, data.scoreLeft, data.scoreRight]);
        } else if (data.type === "paddle") {
            // Se sei host: aggiorna la posizione della racchetta remota in base all’input ricevuto
            // Recupera la posizione corrente della racchetta remota tramite get_remote_paddle()
            const current = Module.ccall('get_remote_paddle', 'number', [], []);
            let newY = current;
            if (data.direction === "up") {
                newY = current - 20;
            } else if (data.direction === "down") {
                newY = current + 20;
            }
            // Limita il movimento entro i confini del canvas
            if (newY < 0) newY = 0;
            if (newY + 100 > 600) newY = 600 - 100;
            Module.ccall('set_remote_paddle', null, ['number'], [newY]);
        }
    };
}

async function startWebRTC() {
    await createPeerConnection();
}

// --- Funzione chiamata dal modulo WASM (EM_ASM) per inviare lo stato di gioco ---
window.sendGameState = function (ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight) {
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
        dataChannel.send(JSON.stringify(state));
    }
};
