const express = require('express')
const session = require('express-session');
const app = express()
const ejs = require('ejs')
const bcrypt = require('bcrypt')
const port = 3000
const mysql = require('mysql2/promise');

app.set('view engine', 'ejs')
app.use(express.static('public'))
app.use(express.urlencoded({ extended: true }));
// Session Middleware
app.use(session({
    secret: 'dein-geheimer-schluessel',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false } // Achtung: in Produktion "true" bei HTTPS
}));

// Middleware: Prüft ob der Benutzer eingeloggt ist
function checkAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.status(401).render('login');
    }
}
app.get("/login", (req, res) => {
    res.render("login");
});
// MySQL-Verbindung
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: 'w209.Kompressor',
    database: 'time_tracking'
};

// Login-Route
app.post('/login', async (req, res) => {
    const { email, password } = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.execute(
            'SELECT * FROM employee WHERE email = ?',
            [email]
        );


        if (rows.length === 0) {
            return res.redirect('/login?error=Benutzer+nicht+gefunden');
        }

        const user = rows[0];
        const firstname = user.firstname;
        const lastname = user.lastname;
        const userEmail = user.email;
        const department = user.department;

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return res.redirect('/login?error=Falsches+Passwort');
        }

        // Session setzen
        req.session.userId = user.id;
        req.session.firstname = user.firstname;
        req.session.lastname = user.lastname;
        req.session.lastname = user.lastname;
        req.session.department = user.department;
        req.session.email = user.email;


        res.redirect("/"); // Weiterleitung nach erfolgreichem Login
    } catch (error) {
        console.error('Login-Fehler:', error);
        res.status(500).send('Interner Serverfehler');
    }
});


// Logout
app.get('/logout', (req, res) => {
    req.session.destroy(err => {
        if (err) {
            return res.status(500).send('Logout fehlgeschlagen');
        }
        res.redirect("/login");
    });
});

app.post("/stamp", checkAuth, async (req, res) => {
    const userId = req.session.userId;
    const userOperation = req.body?.operation;

    if (!userId) {
        return res.status(400).send("Kein Benutzer angemeldet.");
    }

    if (!["start", "stop"].includes(userOperation)) {
        return res.status(400).send("Ungültige Operation.");
    }

    try {
        const connection = await mysql.createConnection(dbConfig);

        const now = new Date();
        const currentTimestamp = now.toISOString().slice(0, 19).replace('T', ' ');
        const operation = userOperation === "start" ? "in" : "out";

        // Letzte Aktion holen
        const [rows] = await connection.execute(
            `SELECT operation FROM stamps WHERE employee_id = ? ORDER BY timestamp DESC LIMIT 1`,
            [userId]
        );

        const lastOp = rows[0]?.operation;

        if (operation === "in" && lastOp === "in") {
            return res.status(400).send("Du bist bereits eingestempelt.");
        }

        if (operation === "out" && lastOp !== "in") {
            return res.status(400).send("Du musst dich zuerst einstempeln.");
        }

        // Sicherstellen: keine undefined-Werte
        const values = [
            userId ?? null,
            operation ?? null,
            currentTimestamp ?? null
        ];

        await connection.execute(
            `INSERT INTO stamps (employee_id, operation, timestamp)
             VALUES (?, ?, ?)`,
            values
        );

    } catch (e) {
        console.error("Fehler beim Stempeln:", e);
        return res.status(500).send("Interner Serverfehler");
    }
});

app.post("/update-data", checkAuth, async (req, res) => {
    const userId = req.session.userId;
    const {firstname, lastname, email, department} = req.body;

    try {
        const connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.execute(
            `UPDATE employee SET firstname = ?, lastname = ?, email = ?, department = ? WHERE id = ?`,
            [firstname, lastname, email, department, userId]
        );

        if(rows.length === 0) {
            res.status(404).send('Daten konnten nicht aktualisiert werden.');
        } else {
            res.status(200).send('Daten erfolgreich aktualisiert.')
        }
    } catch(error) {
        console.error("Fehler beim aktualisieren:", error);
    }
})

app.get('/dashboard', async (req, res) => {
    const userId = req.session.userId;
    try {
        const connection = await mysql.createConnection(dbConfig);

        const [rows] = await connection.execute(
            `SELECT * FROM stamps WHERE employee_id = ?`,
            [userId]
        );

        if(rows.length === 0) {
            res.status(404).send('Daten konnten ausgelesen werden.');
        } else {
            res.render('dashboard', {rows: rows});
        }
    } catch(error) {
        console.error("Fehler beim aktualisieren:", error);
    }
})


app.get('/', checkAuth, async (req, res) => {
    const {firstname, lastname, department, email} = req.session;


    res.render('index', {firstname, lastname, department, email});
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})

