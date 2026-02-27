const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');

const app = express();
app.use(cors());

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Mock Initial Data
let outbreaks = [
  { id: 1, lat: 17.385, lng: 78.486, severity: 85, disease: 'Dengue', affected: 120, locationName: 'Village A' },
  { id: 2, lat: 19.076, lng: 72.877, severity: 60, disease: 'Malaria', affected: 45, locationName: 'Village B' },
  { id: 3, lat: 28.704, lng: 77.102, severity: 30, disease: 'Cholera', affected: 12, locationName: 'Village C' },
];

let idCounter = 4;

app.get('/api/outbreaks', (req, res) => {
  res.json(outbreaks);
});

io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);

  socket.emit('initial_data', outbreaks);

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Simulate Realtime Outbreaks every 10 seconds
/* setInterval(() => {
  const newOutbreak = {
    id: idCounter++,
    lat: (Math.random() * 20) + 10, // Rough bounds for India demo
    lng: (Math.random() * 20) + 68,
    severity: Math.floor(Math.random() * 100),
    disease: ['Dengue', 'Malaria', 'Cholera', 'Typhoid'][Math.floor(Math.random() * 4)],
    affected: Math.floor(Math.random() * 200) + 10,
    locationName: `Village ${String.fromCharCode(65 + (idCounter % 26))}`
  };

  outbreaks.push(newOutbreak);

  // keep only the latest 50 outbreaks to avoid cluttering memory
  if (outbreaks.length > 50) {
    outbreaks.shift();
  }

  io.emit('NEW_OUTBREAK', newOutbreak);
  console.log('Emitted NEW_OUTBREAK:', newOutbreak.id);
}, 10000); */

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
