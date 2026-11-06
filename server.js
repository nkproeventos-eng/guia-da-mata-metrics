const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());
// Servindo arquivos estáticos diretamente da raiz
app.use(express.static(__dirname));

// Caminho do banco SQLite na raiz
const dbPath = path.join(__dirname, 'metrics.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Erro ao abrir o banco de dados SQLite:', err.message);
    } else {
        console.log('Conectado ao banco de dados SQLite com sucesso.');
    }
});

// Inicialização de tabelas
db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS whatsapp_clicks (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        comercio_id TEXT NOT NULL,
        comercio_nome TEXT NOT NULL,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS user_sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id TEXT NOT NULL,
        user_agent TEXT,
        timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);
});

// Rota para registrar clique no WhatsApp
app.post('/api/metrics/whatsapp-click', (req, res) => {
    const { comercio_id, comercio_nome } = req.body;
    if (!comercio_id || !comercio_nome) {
        return res.status(400).json({ error: 'comercio_id e comercio_nome são obrigatórios' });
    }

    const stmt = db.prepare('INSERT INTO whatsapp_clicks (comercio_id, comercio_nome) VALUES (?, ?)');
    stmt.run([comercio_id, comercio_nome], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Clique registrado com sucesso', id: this.lastID });
    });
    stmt.finalize();
});

// Rota para registrar sessão/acesso
app.post('/api/metrics/session', (req, res) => {
    const { session_id } = req.body;
    const userAgent = req.headers['user-agent'] || 'Desconhecido';

    const stmt = db.prepare('INSERT INTO user_sessions (session_id, user_agent) VALUES (?, ?)');
    stmt.run([session_id || 'anonymous', userAgent], function (err) {
        if (err) {
            return res.status(500).json({ error: err.message });
        }
        res.json({ success: true, message: 'Sessão registrada', id: this.lastID });
    });
    stmt.finalize();
});

// Rota de resumo para o Painel Administrativo (admin.html)
app.get('/api/metrics/summary', (req, res) => {
    const summary = {
        total_whatsapp_clicks: 0,
        total_sessions: 0,
        unique_users: 0,
        clicks_by_commerce: []
    };

    db.get('SELECT COUNT(*) AS total FROM whatsapp_clicks', [], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        summary.total_whatsapp_clicks = row ? row.total : 0;

        db.get('SELECT COUNT(*) AS total FROM user_sessions', [], (err, row) => {
            if (err) return res.status(500).json({ error: err.message });
            summary.total_sessions = row ? row.total : 0;

            db.get('SELECT COUNT(DISTINCT session_id) AS total FROM user_sessions', [], (err, row) => {
                if (err) return res.status(500).json({ error: err.message });
                summary.unique_users = row ? row.total : 0;

                db.all(`SELECT comercio_id, comercio_nome, COUNT(*) AS clicks 
                        FROM whatsapp_clicks 
                        GROUP BY comercio_id, comercio_nome 
                        ORDER BY clicks DESC`, [], (err, rows) => {
                    if (err) return res.status(500).json({ error: err.message });
                    summary.clicks_by_commerce = rows || [];
                    res.json(summary);
                });
            });
        });
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor de Métricas rodando na porta ${PORT}`);
});
