
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Stan gry
let rooms = {};

io.on('connection', (socket) => {
    socket.on('joinRoom', ({ roomCode, nickname }) => {
        if (!rooms[roomCode]) {
            rooms[roomCode] = { players: [], status: 'lobby', currentPlayerIndex: 0 };
        }
        
        const player = { id: socket.id, name: nickname, lives: 3 };
        rooms[roomCode].players.push(player);
        socket.join(roomCode);
        
        io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    });

    socket.on('startGame', (roomCode) => {
        rooms[roomCode].status = 'playing';
        io.to(roomCode).emit('gameStarted', { players: rooms[roomCode].players });
    });

    socket.on('passBomb', (roomCode) => {
        let room = rooms[roomCode];
        room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
        
        // Pomiń martwych
        while (room.players[room.currentPlayerIndex].lives <= 0) {
            room.currentPlayerIndex = (room.currentPlayerIndex + 1) % room.players.length;
        }
        
        io.to(roomCode).emit('nextTurn', { 
            currentPlayerIndex: room.currentPlayerIndex,
            players: room.players 
        });
    });

    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});

server.listen(3000, () => {
    console.log('Server running on port 3000');
});
