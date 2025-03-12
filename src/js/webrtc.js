// webrtc.js - Logica WebRTC e data channel

import {addLog} from './ui.js';

// Configurazione WebRTC
const config = {
  iceServers: [{urls: 'stun:stun.l.google.com:19302'}]
};

class WebRTCManager {
  constructor(socket, gameState) {
    this.socket = socket;
    this.gameState = gameState;
    this.peerConnection = null;
    this.dataChannel = null;
    this.localStream = null;
    this.remoteStream = null;
  }
  async createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(config);

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.socket.emit(
            'webrtc_ice_candidate', event.candidate, this.gameState.roomId);
      }
    };

    // Gestione dello stream remoto
    this.peerConnection.ontrack = (event) => {
      const remoteVideo = document.getElementById('remoteVideo');
      if (remoteVideo.srcObject !== event.streams[0]) {
        remoteVideo.srcObject = event.streams[0];
        this.remoteStream = event.streams[0];
      }
    };

    // Richiedi accesso alla webcam con audio
    try {
      this.localStream =
          await navigator.mediaDevices.getUserMedia({video: true, audio: true});
      const localVideo = document.getElementById('localVideo');
      localVideo.srcObject = this.localStream;

      // Aggiungi le tracce allo peer connection
      this.localStream.getTracks().forEach(track => {
        this.peerConnection.addTrack(track, this.localStream);
      });
    } catch (err) {
      console.error('Errore nell\'accesso alla webcam:', err);
      addLog('Errore nell\'accesso alla webcam: ' + err.message);
    }

    if (this.gameState.role === 'host') {
      this.dataChannel = this.peerConnection.createDataChannel('game');
      this.setupDataChannel();
      const offer = await this.peerConnection.createOffer();
      await this.peerConnection.setLocalDescription(offer);
      this.socket.emit('webrtc_offer', offer, this.gameState.roomId);
    } else {
      this.peerConnection.ondatachannel = (event) => {
        this.dataChannel = event.channel;
        this.setupDataChannel();
      };
    }
  }

  setupDataChannel() {
    this.dataChannel.onopen = () => {
      addLog('Data channel aperto.');
      if (this.gameState.role === 'host') {
        Module.ccall('set_role', null, ['number'], [1]);
      } else {
        Module.ccall('set_role', null, ['number'], [0]);
        window.sendPaddleInput = (direction) => {
          const msg = JSON.stringify({type: 'paddle', direction: direction});
          this.dataChannel.send(msg);
        };
      }
      Module.ccall('start_game', null, [], []);
    };

    this.dataChannel.onmessage = (event) => {
      addLog('Messaggio ricevuto: ' + event.data);
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'gameState') {
          Module.ccall(
              'update_remote_state', null,
              ['number', 'number', 'number', 'number', 'number', 'number'], [
                data.ballX, data.ballY, data.leftPaddleY, data.rightPaddleY,
                data.scoreLeft, data.scoreRight
              ]);
        } else if (data.type === 'paddle') {
          const current = Module.ccall('get_remote_paddle', 'number', [], []);
          let newY = current;
          const PADDLE_SPEED = 7; // Usa la stessa velocità definita in C++
          
          if (data.direction === 'up') {
            newY = current - PADDLE_SPEED;
          } else if (data.direction === 'down') {
            newY = current + PADDLE_SPEED;
          }
          
          if (newY < 0) newY = 0;
          if (newY + 100 > 600) newY = 600 - 100;
          Module.ccall('set_remote_paddle', null, ['number'], [newY]);
        } else if (data.type === 'gameOver') {
          window.showWinner(data.message);
        }
      } catch (e) {
        console.error('Errore nel parsing del messaggio:', e);
      }
    };
  }

  async handleOffer(offer) {
    await this.createPeerConnection();
    await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.socket.emit('webrtc_answer', answer, this.gameState.roomId);
  }

  async handleAnswer(answer) {
    await this.peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer));
  }
  async addIceCandidate(candidate) {
    try {
      await this.peerConnection.addIceCandidate(candidate);
      addLog('Candidate ICE aggiunto.');

    } catch (e) {
      console.error('Errore nell\'aggiunta del candidate ICE', e);
    }
  }

  sendGameState(
      ballX, ballY, leftPaddleY, rightPaddleY, scoreLeft, scoreRight) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const state = {
        type: 'gameState',
        ballX: ballX,
        ballY: ballY,
        leftPaddleY: leftPaddleY,
        rightPaddleY: rightPaddleY,
        scoreLeft: scoreLeft,
        scoreRight: scoreRight
      };
      this.dataChannel.send(JSON.stringify(state));
    }
  }

  sendGameOver(message) {
    if (this.dataChannel && this.dataChannel.readyState === 'open') {
      const gameOverData = {type: 'gameOver', message: message};
      this.dataChannel.send(JSON.stringify(gameOverData));
    }
  }
  cleanup() {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }
    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach(track => track.stop());
      this.remoteStream = null;
    }
    if (this.peerConnection) {
      this.peerConnection.close();
      this.peerConnection = null;
    }
  }
}

export {WebRTCManager};