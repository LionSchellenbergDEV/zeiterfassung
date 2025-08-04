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

        res.redirect('/'); // Weiterleitung nach erfolgreichem Login
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
        res.render("/login");
    });
});

app.get('/', checkAuth, (req, res) => {
    const { firstname, lastname, department, email } = req.query;
    res.render('index', {firstname, lastname, department, email});
})

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})