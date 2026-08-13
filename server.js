const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.static(__dirname));

let rooms = {};

io.on('connection', (socket) => {
    // Tworzenie pokoju przez hosta
    socket.on('createRoom', ({ roomCode, nickname }) => {
        if (rooms[roomCode]) {
            socket.emit('errorMsg', 'Taki pokój już istnieje! Spróbuj ponownie.');
            return;
        }
        
        rooms[roomCode] = {
            players: [{ id: socket.id, name: nickname, lives: 3 }],
            status: 'lobby',
            currentPlayerIndex: 0
        };

        socket.join(roomCode);
        socket.emit('roomCreated', roomCode);
        io.to(roomCode).emit('updatePlayers', rooms[roomCode].players);
    });

    // Dołączanie do istniejącego pokoju
    socket.on('joinRoom', ({ roomCode, nickname }) => {
        let room = rooms[roomCode];
        if (!room) {
            socket.emit('errorMsg', 'Nie znaleziono pokoju o takim ID!');
            return;
        }
        if (room.status !== 'lobby') {
            socket.emit('errorMsg', 'Gra w tym pokoju już się rozpoczęła!');
            return;
        }
        if (room.players.length >= 5) {
            socket.emit('errorMsg', 'Pokój jest pełny (maks. 5 osób)!');
            return;
        }
        if (room.players.some(p => p.name === nickname)) {
            socket.emit('errorMsg', 'Ten nick jest już zajęty w tym pokoju!');
            return;
        }

        room.players.push({ id: socket.id, name: nickname, lives: 3 });
        socket.join(roomCode);

        // Informujemy gracza, że dołączył i aktualizujemy listę dla wszystkich w pokoju
        socket.emit('roomJoined', roomCode);
        io.to(roomCode).emit('updatePlayers', room.players);
    });

    socket.on('disconnect', () => {
        for (let code in rooms) {
            let room = rooms[code];
            room.players = room.players.filter(p => p.id !== socket.id);
            if (room.players.length === 0) {
                delete rooms[code];
            } else {
                io.to(code).emit('updatePlayers', room.players);
            }
        }
    });
});

server.listen(3000, () => {
    console.log('Serwer działa na porcie 3000');
});
