const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http);
const path = require('path');

// Serve static files from the current directory
app.use(express.static(__dirname));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/doctor', (req, res) => {
    res.sendFile(path.join(__dirname, 'doctor.html'));
});

app.get('/doctor.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'doctor.html'));
});

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle call request from patient
    socket.on('patient-request-call', (patientInfo) => {
        socket.broadcast.emit('patient-calling', patientInfo);
    });

    // Handle call accepted by doctor
    socket.on('call-accepted', () => {
        socket.broadcast.emit('call-accepted');
    });

    // Handle call declined by doctor
    socket.on('call-declined', () => {
        socket.broadcast.emit('call-declined');
    });

    // Handle call ended by either party
    socket.on('call-ended', () => {
        socket.broadcast.emit('call-ended');
    });

    // Handle WebRTC signaling
    socket.on('offer', (offer) => {
        socket.broadcast.emit('offer', offer);
    });

    socket.on('answer', (answer) => {
        socket.broadcast.emit('answer', answer);
    });

    socket.on('ice-candidate', (candidate) => {
        socket.broadcast.emit('ice-candidate', candidate);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected');
    });
});


// Start server
const PORT = process.env.PORT || 4000;
http.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});