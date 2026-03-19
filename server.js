const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

const MAP_SIZE = 8000;

// --- 서버가 결정하는 공유 환경 (Map Data) ---
let mapData = {
    stones: [],
    crates: [],
    bushes: []
};

// 서버 켜질 때 딱 한 번 맵 생성
function initMap() {
    for (let i = 0; i < 8; i++) mapData.stones.push({ x: Math.random() * (MAP_SIZE - 600) + 300, y: Math.random() * (MAP_SIZE - 600) + 300 });
    for (let i = 0; i < 20; i++) mapData.crates.push({ id: i, x: Math.random() * (MAP_SIZE - 400) + 200, y: Math.random() * (MAP_SIZE - 400) + 200, hp: 250 });
    for (let i = 0; i < 40; i++) mapData.bushes.push({ x: Math.random() * (MAP_SIZE - 400) + 200, y: Math.random() * (MAP_SIZE - 400) + 200 });
}
initMap();

let players = {};
let globalRanks = [{ name: "King_Sangyeon", level: 1 }];

io.on('connection', (socket) => {
    console.log('유저 접속:', socket.id);

    // 1. 접속하자마자 서버가 정한 맵 데이터를 유저에게 전송
    socket.emit('init_world', mapData);

    socket.on('start_game', (data) => {
        players[socket.id] = {
            id: socket.id,
            name: data.name,
            type: data.type,
            x: Math.random() * 7000 + 500,
            y: Math.random() * 7000 + 500,
            level: data.level,
            hp: 100,
            aimAng: 0,
            isDashing: false
        };
        socket.emit('update_ranks', globalRanks);
    });

    // 2. 위치 업데이트 및 타격 판정 로직
    socket.on('player_move', (data) => {
        if (players[socket.id]) {
            players[socket.id].x = data.x;
            players[socket.id].y = data.y;
            players[socket.id].aimAng = data.aimAng;
            players[socket.id].level = data.level;
            players[socket.id].isDashing = data.isDashing;
        }
    });

    // 3. [핵심] 공격 신호 받으면 서버가 거리 계산해서 데미지 입힘
    socket.on('attack', () => {
        const attacker = players[socket.id];
        if (!attacker) return;

        // 다른 유저들 중 사거리 안에 있는 사람 찾기
        Object.values(players).forEach(target => {
            if (target.id === socket.id) return; // 나 자신은 제외

            const dist = Math.hypot(attacker.x - target.x, attacker.y - target.y);
            const range = attacker.type === 'knight' ? 300 : 800; // 사거리

            if (dist < range) {
                target.hp -= (attacker.type === 'knight' ? 15 : 10); // 데미지
                if (target.hp <= 0) {
                    target.hp = 0;
                    // 죽은 유저에게 알림
                    io.to(target.id).emit('you_died', { killer: attacker.name });
                }
            }
        });
    });

    socket.on('submit_score', (data) => {
        globalRanks.push({ name: data.name, level: data.level });
        globalRanks.sort((a, b) => b.level - a.level);
        globalRanks = globalRanks.slice(0, 5);
        io.emit('update_ranks', globalRanks);
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

// 1초에 30번 동기화
setInterval(() => {
    io.emit('world_state', { players });
}, 1000 / 30);

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`Server running on port ${PORT}`));
