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

// Real Indian cities with detailed Mapbox building data
let outbreaks = [
  { id: 1, lat: 19.0760, lng: 72.8777, severity: 92, disease: 'Dengue', affected: 340, locationName: 'Mumbai' },
  { id: 2, lat: 28.6139, lng: 77.2090, severity: 78, disease: 'Typhoid', affected: 210, locationName: 'New Delhi' },
  { id: 3, lat: 12.9716, lng: 77.5946, severity: 55, disease: 'Malaria', affected: 180, locationName: 'Bengaluru' },
  { id: 4, lat: 17.3850, lng: 78.4867, severity: 85, disease: 'Cholera', affected: 290, locationName: 'Hyderabad' },
  { id: 5, lat: 13.0827, lng: 80.2707, severity: 47, disease: 'Dengue', affected: 120, locationName: 'Chennai' },
  { id: 6, lat: 22.5726, lng: 88.3639, severity: 81, disease: 'Malaria', affected: 260, locationName: 'Kolkata' },
  { id: 7, lat: 18.5204, lng: 73.8567, severity: 63, disease: 'Typhoid', affected: 155, locationName: 'Pune' },
  { id: 8, lat: 23.0225, lng: 72.5714, severity: 38, disease: 'Dengue', affected: 90, locationName: 'Ahmedabad' },
  { id: 9, lat: 26.9124, lng: 75.7873, severity: 70, disease: 'Cholera', affected: 200, locationName: 'Jaipur' },
  { id: 10, lat: 21.1458, lng: 79.0882, severity: 88, disease: 'Malaria', affected: 310, locationName: 'Nagpur' },
  { id: 11, lat: 22.3072, lng: 73.1812, severity: 45, disease: 'Dengue', affected: 105, locationName: 'Vadodara' },
  { id: 12, lat: 11.0168, lng: 76.9558, severity: 58, disease: 'Typhoid', affected: 140, locationName: 'Coimbatore' },
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
