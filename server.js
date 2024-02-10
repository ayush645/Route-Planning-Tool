const express = require("express");
const sqlite3 = require("sqlite3");
const cors = require("cors");
const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(
    cors({
        origin: "*",
        credentials: true,
    })
);

const db = new sqlite3.Database("./jobs.db");

db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS jobs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        location TEXT NOT NULL,
        completed BOOLEAN DEFAULT 0
    )`);
});

app.post("/add-location", (req, res) => {
    const { location } = req.body;

    if (!location) {
        return res.status(400).json({ error: "Location is required" });
    }

    db.run("INSERT INTO jobs (location) VALUES (?)", [location], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(201).json({ id: this.lastID, location: location });
    });
});

app.get("/jobs", (req, res) => {
    db.all("SELECT * FROM jobs", (err, rows) => {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json(rows);
    });
});

app.post("/mark-complete", (req, res) => {
    const { locationName } = req.body;

    if (!locationName) {
        return res.status(400).json({ error: "Location name is required" });
    }

    db.run("UPDATE jobs SET completed = ? WHERE location = ?", [true, locationName], function(err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.status(200).json({ message: "Location marked as complete" });
    });
});

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});


