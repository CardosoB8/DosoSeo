const express = require('express');
const path = require('path');
const fs = require('fs'); // Para ler o arquivo post.json

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_DURATION = 15 * 1000; // 15 segundos (15 * 1000 milissegundos)

// Armazenamento temporário para controlar o fluxo de cada usuário
// Em um sistema real, você usaria um banco de dados ou um cache como Redis
const userSessions = {}; // { sessionId: { alias: '...', step: 1, expiresAt: timestamp } }

// Carregar os links do post.json
let linksData = { links: [] };
try {
    const data = fs.readFileSync(path.join(__dirname, 'post.json'), 'utf8');
    linksData = JSON.parse(data);
    console.log('Links carregados com sucesso de post.json');
} catch (error) {
    console.error('Erro ao carregar post.json:', error);
}

// Servir arquivos estáticos (CSS, JS do frontend, imagens, etc.)
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para gerar um ID de sessão simples para cada visita
app.use((req, res, next) => {
    if (!req.query.sessionId && !req.body.sessionId && !req.headers['x-session-id']) {
        const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        req.sessionId = sessionId; // Anexa o ID de sessão à requisição
        console.log(`Nova sessão criada: ${sessionId} para ${req.path}`);
    } else {
        req.sessionId = req.query.sessionId || req.body.sessionId || req.headers['x-session-id'];
        // console.log(`Sessão existente: ${req.sessionId} para ${req.path}`);
    }
    next();
});

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Rota principal de redirecionamento - meusite.com/alias
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        const sessionId = req.sessionId;
        userSessions[sessionId] = {
            alias: alias,
            original_url: link.original_url,
            step: 1, // Inicia no passo 1
            expiresAt: Date.now() + SESSION_DURATION
        };
        console.log(`Sessão ${sessionId} iniciada para alias: ${alias}`);
        // Redireciona para page1, passando o ID da sessão
        res.redirect(`/page1.html?sessionId=${sessionId}`);
    } else {
        res.status(404).send('Link não encontrado.');
    }
});

// Rotas para as páginas de espera (page1, page2, page3)
// Acessadas pelo navegador através de redirecionamento ou JS
app.get('/page:step.html', (req, res) => {
    const step = parseInt(req.params.step);
    const sessionId = req.query.sessionId;

    const session = userSessions[sessionId];

    if (!session || session.step !== step || Date.now() > session.expiresAt) {
        console.warn(`Tentativa de acesso inválida à page${step}.html para sessão ${sessionId}. Redirecionando para o início.`);
        delete userSessions[sessionId]; // Limpa sessão inválida
        return res.redirect('/'); // Redireciona para a home se o fluxo for quebrado
    }

    // Atualiza o tempo de expiração da sessão para a próxima etapa
    session.expiresAt = Date.now() + SESSION_DURATION;

    // Envia a página correta
    res.sendFile(path.join(__dirname, `page${step}.html`));
});

// Rota para avançar para a próxima etapa (chamada via JavaScript do frontend)
app.get('/next-step', (req, res) => {
    const sessionId = req.query.sessionId;
    const currentStep = parseInt(req.query.currentStep);
    const session = userSessions[sessionId];

    if (!session || session.step !== currentStep || Date.now() > session.expiresAt) {
        console.warn(`Tentativa inválida de avançar etapa para sessão ${sessionId}. Current Step: ${currentStep}.`);
        delete userSessions[sessionId];
        return res.status(400).json({ error: 'Sessão inválida ou expirada. Recomece.' });
    }

    session.step++; // Avança a etapa

    if (session.step === 4) { // Após page3 (step 3), a próxima é a final
        console.log(`Sessão ${sessionId} completou o fluxo. Redirecionando para: ${session.original_url}`);
        const finalUrl = session.original_url;
        delete userSessions[sessionId]; // Limpa a sessão após o uso
        return res.json({ redirect: finalUrl }); // Informa ao frontend para redirecionar
    } else {
        console.log(`Sessão ${sessionId} avançou para step ${session.step}.`);
        return res.json({ redirect: `/page${session.step}.html?sessionId=${sessionId}` });
    }
});

// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('---');
    console.log('URLs de exemplo:');
    linksData.links.forEach(link => {
        if (link.alias !== 'youtube-canal' && link.alias !== 'grupo-whatsapp' && link.alias !== 'contato-email') {
            console.log(`http://localhost:${PORT}/${link.alias}`);
        }
    });
    console.log('---');
});