const express = require('express');
const http = require('http');
const socketIO = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIO(server);

// Serviamo i file statici dalla cartella corrente
app.use(express.static(__dirname));

const rooms = {};

io.on('connection', (socket) => {
    console.log('Utente connesso:', socket.id);

    socket.on('create_room', (roomId) => {
        if (!rooms[roomId]) {
            rooms[roomId] = { players: [] };
        }
        rooms[roomId].players.push(socket.id);
        socket.join(roomId);
        socket.emit('room_joined', roomId);
    });

    socket.on('join_room', (roomId) => {
        if (rooms[roomId] && rooms[roomId].players.length < 2) {
            rooms[roomId].players.push(socket.id);
            socket.join(roomId);
            socket.emit('room_joined', roomId);
            io.to(roomId).emit('room_players', rooms[roomId].players);
        } else {
            socket.emit('error', 'Stanza piena o non esistente.');
        }
    });

    socket.on('get_room_players', (roomId) => {
        if (rooms[roomId]) {
            socket.emit('room_players', rooms[roomId].players);
        }
    });

    socket.on('ready', (roomId) => {
        socket.ready = true;
        const players = rooms[roomId].players;
        const allReady = players.every(id => {
            const s = io.sockets.sockets.get(id);
            return s && s.ready;
        });
        if (allReady && players.length === 2) {
            io.to(roomId).emit('start_game');
        }
    });

    socket.on('webrtc_offer', (offer, roomId) => {
        socket.to(roomId).emit('webrtc_offer', offer);
    });

    socket.on('webrtc_answer', (answer, roomId) => {
        socket.to(roomId).emit('webrtc_answer', answer);
    });

    socket.on('webrtc_ice_candidate', (candidate, roomId) => {
        socket.to(roomId).emit('webrtc_ice_candidate', candidate);
    });

    socket.on('disconnect', () => {
        console.log('Utente disconnesso:', socket.id);
        for (const roomId in rooms) {
            const index = rooms[roomId].players.indexOf(socket.id);
            if (index !== -1) {
                rooms[roomId].players.splice(index, 1);
                io.to(roomId).emit('room_players', rooms[roomId].players);
                if (rooms[roomId].players.length === 0) {
                    delete rooms[roomId];
                }
                break;
            }
        }
    });
});

// Ascolta su tutte le interfacce (0.0.0.0) per l'accesso in rete locale
server.listen(3000, () => {
    console.log("Server in ascolto sulla porta 3000");
});
