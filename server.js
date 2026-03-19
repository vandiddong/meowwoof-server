const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// --- 전역 데이터 저장소 ---
let players = {}; // 실시간 접속 유저 위치 정보
let globalRanks = [
    { name: "상연_King", level: 10 },
    { name: "Empty", level: 0 },
    { name: "Empty", level: 0 },
    { name: "Empty", level: 0 },
    { name: "Empty", level: 0 }
];

io.on('connection', (socket) => {
    console.log('새 유저 접속:', socket.id);

    // 1. 유저가 게임 시작 버튼을 눌렀을 때
    socket.on('start_game', (data) => {
        players[socket.id] = {
            id: socket.id,
            x: data.x,
            y: data.y,
            name: data.name,
            type: data.type,
            level: data.level,
            aimAng: 0,
            isDashing: false
        };
        // 현재 랭킹 전송
        socket.emit('update_ranks', globalRanks);
    });

    // 2. 유저가 움직일 때마다 위치 정보 수신
    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].aimAng = data.aimAng;
            players[socket.id].level = data.level;
            players[socket.id].isDashing = data.isDashing;
        }
    });

    // 3. 죽었을 때 랭킹 업데이트
    socket.on('submit_score', (data) => {
        globalRanks.push({ name: data.name, level: data.level });
        globalRanks.sort((a, b) => b.level - a.level);
        globalRanks = globalRanks.slice(0, 5);
        io.emit('update_ranks', globalRanks); // 모든 유저에게 랭킹 방송
    });

    // 4. 나갔을 때 정보 삭제
    socket.on('disconnect', () => {
        console.log('유저 나감:', socket.id);
        delete players[socket.id];
    });
});

// 5. 핵심: 1초에 30번 모든 플레이어에게 "서로의 위치"를 방송 (Tick Rate)
setInterval(() => {
    io.emit('world_state', players);
}, 1000 / 30); 

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`서버 가동 중! 포트: ${PORT}`);
});
