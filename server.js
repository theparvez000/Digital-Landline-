
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const fs = require('fs');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const DB_FILE = path.join(__dirname, 'hospital_db.json');

function readDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            staff: [
                { id: 1, name: "Admin Officer", department: "Administration", extension: "100", username: "admin", password: "admin123", role: "Admin" },
                { id: 2, name: "Md Parvez", department: "Emergency", extension: "101", username: "parvez", password: "123", role: "Staff" }
            ],
            messages: [],
            notices: [],
            meetings: [],
            medicineRequests: [],
            callHistory: [],
            attendance: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
    return JSON.parse(fs.readFileSync(DB_FILE, 'utf8'));
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const db = readDB();
    const user = db.staff.find(s => s.username === username && s.password === password);
    if (user) {
        res.json({ success: true, user });
    } else {
        res.status(401).json({ error: "Invalid username or password" });
    }
});

app.post('/api/register', (req, res) => {
    const { name, department, extension, username, password } = req.body;
    const db = readDB();
    if (db.staff.find(s => s.extension === extension || s.username === username)) {
        return res.status(400).json({ error: "Extension or Username already exists!" });
    }
    const newUser = { id: Date.now(), name, department, extension, username, password, role: "Staff" };
    db.staff.push(newUser);
    writeDB(db);
    res.json({ success: true, message: "Registration successful!" });
});

app.get('/api/staff', (req, res) => {
    const db = readDB();
    res.json(db.staff);
});

app.get('/api/messages', (req, res) => {
    const db = readDB();
    res.json(db.messages);
});

app.post('/api/messages', (req, res) => {
    const { sender, extension, text } = req.body;
    const db = readDB();
    const msg = { id: Date.now(), sender, extension, text, time: new Date().toLocaleTimeString() };
    db.messages.push(msg);
    writeDB(db);
    io.emit('new-message', msg);
    res.json({ success: true });
});
app.post('/api/emergency/trigger', (req, res) => {
    const { sender, extension, location, note } = req.body;
    const db = readDB();
    const alertData = { id: Date.now(), sender, extension, location, note, time: new Date().toLocaleTimeString() };
    db.callHistory.push({ callerExt: extension, receiverExt: 'ALL', status: 'EMERGENCY', time: alertData.time });
    writeDB(db);
    io.emit('hospital-emergency', alertData);
    res.json({ success: true, message: "Emergency broadcasted successfully!" });
});

app.get('/api/notices', (req, res) => {
    const db = readDB();
    res.json(db.notices);
});

app.post('/api/notices', (req, res) => {
    const { title, content, sender } = req.body;
    const db = readDB();
    const notice = { id: Date.now(), title, content, sender, time: new Date().toLocaleDateString() };
    db.notices.push(notice);
    writeDB(db);
    io.emit('new-notice', notice);
    res.json({ success: true });
});

app.get('/api/meetings', (req, res) => {
    const db = readDB();
    res.json(db.meetings);
});

app.post('/api/meetings/create', (req, res) => {
    const { title, host, extension } = req.body;
    const db = readDB();
    const meeting = { id: Date.now().toString(), title, host, extension };
    db.meetings.push(meeting);
    writeDB(db);
    io.emit('new-meeting-alert', meeting);
    res.json({ success: true, meeting });
});

app.get('/api/medicine-requests', (req, res) => {
    const db = readDB();
    res.json(db.medicineRequests);
});

app.post('/api/medicine-requests', (req, res) => {
    const { item, qty, sender, extension } = req.body;
    const db = readDB();
    const reqItem = { id: Date.now(), item, qty, sender, extension, status: 'Pending' };
    db.medicineRequests.push(reqItem);
    writeDB(db);
    io.emit('new-med-request', reqItem);
    res.json({ success: true });
});

app.get('/api/calls/history/:ext', (req, res) => {
    const db = readDB();
    const ext = req.params.ext;
    const history = db.callHistory.filter(c => c.callerExt === ext || c.receiverExt === ext);
    res.json(history);
});

app.post('/api/calls/log', (req, res) => {
    const { callerExt, receiverExt, status } = req.body;
    const db = readDB();
    db.callHistory.push({ callerExt, receiverExt, status, time: new Date().toLocaleTimeString() });
    writeDB(db);
    res.json({ success: true });
});

app.post('/api/attendance', (req, res) => {
    const { name, extension, department } = req.body;
    const db = readDB();
    const today = new Date().toLocaleDateString();
    const existing = db.attendance.find(a => a.extension === extension && a.date === today);
    if (existing) {
        return res.status(400).json({ error: "Attendance already marked for today!" });
    }
    db.attendance.push({ id: Date.now(), name, extension, department, date: today, time: new Date().toLocaleTimeString() });
    writeDB(db);
    res.json({ success: true, message: "Attendance marked successfully!" });
});

app.get('/api/attendance-list', (req, res) => {
    const db = readDB();
    const today = new Date().toLocaleDateString();
    const list = db.attendance.filter(a => a.date === today);
    res.json(list);
});

app.post('/api/admin/remove-staff', (req, res) => {
    const { userId } = req.body;
    const db = readDB();
    db.staff = db.staff.filter(s => s.id !== userId);
    writeDB(db);
    res.json({ success: true });
});

io.on('connection', (socket) => {
    socket.on('register-extension', (ext) => {
        socket.join('ext-' + ext);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Digital Landline Server running on port ${PORT}`);
});
