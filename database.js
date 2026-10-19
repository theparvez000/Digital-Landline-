const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'hospital_db.json');

// Initialize DB if not exists
function initDB() {
    if (!fs.existsSync(DB_FILE)) {
        const initialData = {
            users: [
                { id: 1, name: "Admin", username: "admin", password: "$2a$10$X.W...", role: "admin", department: "Management", extension: "100" }
            ],
            calls: [],
            messages: [],
            attendance: [],
            notices: [],
            emergency: []
        };
        fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2));
    }
}

function readDB() {
    if (!fs.existsSync(DB_FILE)) initDB();
    const data = fs.readFileSync(DB_FILE, 'utf8');
    return JSON.parse(data);
}

function writeDB(data) {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2));
}

initDB();

module.exports = { readDB, writeDB };

