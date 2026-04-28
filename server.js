// filepath: App-thauhieu/server.js
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// In-memory storage (in production, use a database)
const couples = new Map();
const users = new Map();

// Generate unique couple code
function generateCoupleCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Generate user ID
function generateUserId() {
  return 'user_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
}

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  let currentUser = null;
  let currentCouple = null;

  // Create or join a couple
  socket.on('createCouple', (data, callback) => {
    const { userName, partnerName } = data;
    const coupleCode = generateCoupleCode();
    const userId = generateUserId();
    const partnerId = generateUserId();

    const couple = {
      code: coupleCode,
      createdAt: Date.now(),
      users: [
        { id: userId, name: userName, role: 'user1', socketId: socket.id },
        { id: partnerId, name: partnerName, role: 'user2', socketId: null }
      ],
      data: {
        vault: null,
        mood: null,
        moodHistory: [],
        cycleData: null,
        messages: [],
        signals: []
      }
    };

    couples.set(coupleCode, couple);
    users.set(socket.id, { coupleCode, userId, role: 'user1' });
    currentUser = { id: userId, name: userName, role: 'user1' };
    currentCouple = coupleCode;

    socket.join(coupleCode);
    
    callback({ 
      success: true, 
      coupleCode,
      userId,
      partnerId,
      role: 'user1',
      partnerName
    });
    
    console.log(`Couple created: ${coupleCode} by ${userName}`);
  });

  socket.on('joinCouple', (data, callback) => {
    const { coupleCode, userName } = data;
    const couple = couples.get(coupleCode.toUpperCase());

    if (!couple) {
      callback({ success: false, error: 'Mã cặp đôi không tồn tại' });
      return;
    }

    const userId = generateUserId();
    const emptySlot = couple.users.find(u => !u.socketId);
    
    if (!emptySlot) {
      callback({ success: false, error: 'Cặp đôi đã đầy' });
      return;
    }

    emptySlot.socketId = socket.id;
    emptySlot.id = userId;
    emptySlot.name = userName;

    users.set(socket.id, { coupleCode: coupleCode.toUpperCase(), userId, role: emptySlot.role });
    currentUser = { id: userId, name: userName, role: emptySlot.role };
    currentCouple = coupleCode.toUpperCase();

    socket.join(coupleCode.toUpperCase());

    // Notify the other user
    socket.to(coupleCode.toUpperCase()).emit('partnerJoined', {
      userName,
      role: emptySlot.role
    });

    callback({ 
      success: true, 
      coupleCode: coupleCode.toUpperCase(),
      userId,
      role: emptySlot.role,
      partnerName: couple.users.find(u => u.role === (emptySlot.role === 'user1' ? 'user2' : 'user1'))?.name
    });

    console.log(`${userName} joined couple ${coupleCode}`);
  });

  // Sync data
  socket.on('syncData', (data) => {
    if (!currentCouple) return;
    
    const couple = couples.get(currentCouple);
    if (!couple) return;

    // Update data
    if (data.vault) couple.data.vault = data.vault;
    if (data.mood) couple.data.mood = data.mood;
    if (data.moodHistory) couple.data.moodHistory = data.moodHistory;
    if (data.cycleData) couple.data.cycleData = data.cycleData;

    // Broadcast to partner
    socket.to(currentCouple).emit('dataUpdated', {
      type: data.type,
      data: data.data,
      from: currentUser.name,
      timestamp: Date.now()
    });
  });

  // Send signal/nudge
  socket.on('sendSignal', (signal) => {
    if (!currentCouple) return;
    
    const couple = couples.get(currentCouple);
    if (!couple) return;

    couple.data.signals.push({
      ...signal,
      from: currentUser.name,
      fromRole: currentUser.role,
      timestamp: Date.now()
    });

    // Send to partner
    socket.to(currentCouple).emit('receiveSignal', {
      ...signal,
      from: currentUser.name,
      timestamp: Date.now()
    });

    console.log(`Signal sent in ${currentCouple}:`, signal.type);
  });

  // Send message
  socket.on('sendMessage', (message) => {
    if (!currentCouple) return;
    
    const couple = couples.get(currentCouple);
    if (!couple) return;

    const msg = {
      id: Date.now(),
      text: message,
      from: currentUser.name,
      fromRole: currentUser.role,
      timestamp: Date.now()
    };

    couple.data.messages.push(msg);

    // Broadcast to partner
    io.to(currentCouple).emit('newMessage', msg);
  });

  // Get couple info
  socket.on('getCoupleInfo', (callback) => {
    if (!currentCouple) {
      callback(null);
      return;
    }
    
    const couple = couples.get(currentCouple);
    if (!couple) {
      callback(null);
      return;
    }

    callback({
      code: couple.code,
      users: couple.users.map(u => ({ name: u.name, role: u.role })),
      data: couple.data
    });
  });

  // Disconnect
  socket.on('disconnect', () => {
    if (currentCouple && currentUser) {
      const couple = couples.get(currentCouple);
      if (couple) {
        const user = couple.users.find(u => u.id === currentUser.id);
        if (user) {
          user.socketId = null;
          
          // Notify partner
          socket.to(currentCouple).emit('partnerLeft', {
            name: currentUser.name,
            role: currentUser.role
          });
        }
      }
    }
    users.delete(socket.id);
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`❤️ HeartSync Server running on http://localhost:${PORT}`);
});