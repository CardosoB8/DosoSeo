// index.js

const express = require('express');
const path = require('path');
// const fs = require('fs'); // <--- 'fs' não é mais necessário para carregar os links!

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_DURATION = 15 * 1000; // 15 segundos em milissegundos

// Armazenamento temporário para controlar o fluxo de cada usuário.
// ATENÇÃO: Em produção, isso deve ser um banco de dados ou Redis.
const userSessions = {}; // { sessionId: { alias: '...', original_url: '...', step: 1, expiresAt: timestamp } }

// Carregar os links do data/links.js
// Certifique-se de que o caminho './data/links.js' está correto!
const allLinks = require('./data/links.js');
const linksData = { links: allLinks }; // Encapsula no objeto para manter a estrutura original se outras partes do código esperarem linksData.links

console.log(`Servidor iniciando. Total de links carregados: ${linksData.links.length}`);
if (linksData.links.length === 0) {
    console.warn('AVISO: Nenhum link foi carregado de data/links.js. Verifique o arquivo.');
}

// Servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Middleware para gerar e anexar um ID de sessão simples à requisição
app.use((req, res, next) => {
    // Tenta pegar o sessionId de query params, corpo ou headers. Se não houver, gera um novo.
    if (!req.query.sessionId && !req.body.sessionId && !req.headers['x-session-id']) {
        const sessionId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
        req.sessionId = sessionId;
        console.log(`Nova sessão criada: ${sessionId}`);
    } else {
        req.sessionId = req.query.sessionId || req.body.sessionId || req.headers['x-session-id'];
    }
    next();
});

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota principal de redirecionamento - meusite.com/alias
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        const sessionId = req.sessionId;
        // Inicia ou reinicia a sessão para este alias
        userSessions[sessionId] = {
            alias: alias,
            original_url: link.original_url,
            step: 1, // Inicia no passo 1
            expiresAt: Date.now() + SESSION_DURATION
        };
        console.log(`Sessão ${sessionId} iniciada/redefinida para alias: ${alias}. Próxima página: page1.`);
        // Redireciona para page1, passando o ID da sessão na URL
        res.redirect(`/page1.html?sessionId=${sessionId}`);
    } else {
        // Se o alias não for encontrado, redireciona para a página inicial ou uma página 404
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html')); // Ou uma página de erro 404
        console.warn(`Alias '${alias}' não encontrado. Redirecionando para a home.`);
    }
});

// Rota para avançar para a próxima etapa (chamada via JavaScript do frontend)
app.get('/next-step', (req, res) => {
    const sessionId = req.query.sessionId;
    const currentStep = parseInt(req.query.currentStep);

    const session = userSessions[sessionId];

    // Validação da sessão
    if (!session || session.step !== currentStep || Date.now() > session.expiresAt) {
        console.warn(`Tentativa inválida de avançar etapa para sessão ${sessionId}. Current Step: ${currentStep}. Possível violação de fluxo ou sessão expirada.`);
        delete userSessions[sessionId]; // Limpa sessão inválida
        // Responde com erro e instrui o frontend a recomeçar
        return res.status(400).json({ error: 'Sessão inválida ou expirada. Por favor, recomece o processo.', redirect: '/' });
    }

    // Atualiza o tempo de expiração da sessão para a próxima etapa
    session.expiresAt = Date.now() + SESSION_DURATION;
    session.step++; // Avança a etapa

    if (session.step === 4) { // Após page3 (step 3), a próxima é a final
        console.log(`Sessão ${sessionId} completou o fluxo. Redirecionando para URL final: ${session.original_url}`);
        const finalUrl = session.original_url;
        delete userSessions[sessionId]; // Limpa a sessão após o uso
        return res.json({ redirect: finalUrl }); // Informa ao frontend para redirecionar
    } else {
        console.log(`Sessão ${sessionId} avançou para step ${session.step}. Redirecionando para page${session.step}.`);
        return res.json({ redirect: `/page${session.step}.html?sessionId=${sessionId}` });
    }
});

// As rotas para page1.html, page2.html, page3.html são tratadas pelo express.static
// Se você quer que o servidor valide o acesso a elas diretamente, você pode adicionar:
app.get('/page:step\\.html', (req, res, next) => {
    const step = parseInt(req.params.step);
    const sessionId = req.query.sessionId;
    const session = userSessions[sessionId];

    if (!session || session.step !== step || Date.now() > session.expiresAt) {
        console.warn(`Acesso direto inválido à page${step}.html para sessão ${sessionId}. Redirecionando para o início.`);
        delete userSessions[sessionId];
        return res.redirect('/');
    }
    // Se a sessão for válida e na etapa correta, apenas continua para express.static servir o arquivo
    next();
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('---');
    console.log('URLs de exemplo para teste (após deploy, use seu domínio Vercel):');
    linksData.links.forEach(link => {
        // Exclui os links da homepage para não confundir
        if (!['youtube-canal', 'grupo-whatsapp', 'contato-email'].includes(link.alias)) {
            console.log(`http://localhost:${PORT}/${link.alias}`);
        }
    });
    console.log('---');
});
