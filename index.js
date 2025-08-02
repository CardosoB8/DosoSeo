// index.js

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_DURATION = 15 * 1000;

const userSessions = {};

const allLinks = require('./data/links.js');
const linksData = { links: allLinks };

console.log(`Links carregados: ${linksData.links.length}`);

app.use(express.static(path.join(__dirname, 'public')));

app.use((req, res, next) => {
    if (!req.query.sessionId && !req.body.sessionId && !req.headers['x-session-id']) {
        const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        req.sessionId = sessionId;
    } else {
        req.sessionId = req.query.sessionId || req.body.sessionId || req.headers['x-session-id'];
    }
    next();
});

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        const sessionId = req.sessionId;
        userSessions[sessionId] = {
            alias: alias,
            original_url: link.original_url,
            step: 1,
            expiresAt: Date.now() + SESSION_DURATION
        };
        res.redirect(`/page1.html?sessionId=${sessionId}`);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
    }
});

app.get('/next-step', (req, res) => {
    const sessionId = req.query.sessionId;
    const currentStep = parseInt(req.query.currentStep);

    const session = userSessions[sessionId];

    if (!session || session.step !== currentStep || Date.now() > session.expiresAt) {
        delete userSessions[sessionId];
        return res.status(400).json({ error: 'Sessão inválida ou expirada. Recomece.', redirect: '/' });
    }

    session.expiresAt = Date.now() + SESSION_DURATION;
    session.step++;

    if (session.step === 4) {
        const finalUrl = session.original_url;
        delete userSessions[sessionId];
        return res.json({ redirect: finalUrl });
    } else {
        return res.json({ redirect: `/page${session.step}.html?sessionId=${sessionId}` });
    }
});

app.get('/page:step\\.html', (req, res, next) => {
    const step = parseInt(req.params.step);
    const sessionId = req.query.sessionId;
    const session = userSessions[sessionId];

    if (!session || session.step !== step || Date.now() > session.expiresAt) {
        delete userSessions[sessionId];
        return res.redirect('/');
    }
    next();
});

app.listen(PORT, () => {
    console.log(`Servidor rodando na porta ${PORT}`);
});
