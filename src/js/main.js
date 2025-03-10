// main.js - File principale che inizializza tutto

import {initGameFunctions} from './game.js';
import {initSocketHandlers} from './socket-handler.js';
import {initUIEventListeners, showScreen} from './ui.js';
import {WebRTCManager} from './webrtc.js';

document.addEventListener('DOMContentLoaded', () => {
  // Inizializza socket.io
  const socket = io();

  // Stato del gioco
  const gameState = {
    role: null,  // "host" o "client"
    roomId: null,
    gameStarted: false
  };

  // Inizializza il gestore WebRTC
  const webRTCManager = new WebRTCManager(socket, gameState);

  // Inizializza le funzioni globali del gioco
  initGameFunctions(webRTCManager);

  // Callback per gli eventi UI
  const uiCallbacks = {
    onRoomCreated: (roomId) => {
      gameState.roomId = roomId;
    },
    onCleanup: () => {
      webRTCManager.cleanup();
    }
  };

  // Callback per gli eventi socket
  const socketCallbacks = {
    onStartGame: async () => {
      gameState.gameStarted = true;
      await webRTCManager.createPeerConnection();
    },
    onWebRTCOffer: async (offer) => {
      await webRTCManager.handleOffer(offer);
    },
    onWebRTCAnswer: async (answer) => {
      await webRTCManager.handleAnswer(answer);
    },
    onICECandidate: async (candidate) => {
      await webRTCManager.addIceCandidate(candidate);
    }
  };

  // Inizializza gli event listener UI
  initUIEventListeners(socket, uiCallbacks);

  // Inizializza gli handler socket.io
  initSocketHandlers(socket, gameState, socketCallbacks);

  // Mostra la schermata iniziale
  showScreen(document.getElementById('homeScreen'));
});