const express = require('express');
const path = require('path');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('trust proxy', 1);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Rate Limit mais leve
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 100, // 30 requisições por minuto
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
app.use(limiter);

// Configurações simples
const STEP_TIME_MS = 15000; // 15 segundos
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hora (bem generoso)

const linksData = { links: require('./data/links.js') };

// Armazenamento simples de sessões (em produção, use Redis)
const sessions = new Map();

// Limpeza de sessões antigas a cada 10 minutos
setInterval(() => {
    const now = Date.now();
    for (const [token, session] of sessions.entries()) {
        if (now > session.expires) {
            sessions.delete(token);
        }
    }
}, 10 * 60 * 1000);

// --- FUNÇÃO SIMPLES DE TOKEN (SEM IP) ---
function createToken(alias, step) {
    const token = crypto.randomBytes(32).toString('hex');
    const session = {
        alias: alias,
        step: step,
        createdAt: Date.now(),
        expires: Date.now() + TOKEN_EXPIRATION_MS
    };
    sessions.set(token, session);
    return token;
}

function verifyToken(token) {
    if (!token) return null;
    const session = sessions.get(token);
    if (!session) return null;
    if (Date.now() > session.expires) {
        sessions.delete(token);
        return null;
    }
    return session;
}

function deleteToken(token) {
    sessions.delete(token);
}

// Middleware para arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// --- Rota Home ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Rota das Páginas de Etapa (SEM VALIDAÇÃO COMPLEXA) ---
app.get('/page:step', (req, res) => {
    const step = parseInt(req.params.step);
    const token = req.query.token;

    console.log(`📄 Acessando page${step}, token: ${token ? token.substring(0, 10)+'...' : 'ausente'}`);

    // Se não tem token, manda para home
    if (!token) {
        console.log('❌ Sem token, redirecionando para home');
        return res.redirect('/');
    }

    // Verifica sessão
    const session = verifyToken(token);
    if (!session) {
        console.log('❌ Token inválido/expirado, redirecionando para home');
        // Mostra mensagem amigável antes de redirecionar
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Sessão Expirada</title>
                <style>
                    body {
                        font-family: system-ui, -apple-system, sans-serif;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        min-height: 100vh;
                        margin: 0;
                        padding: 20px;
                        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    }
                    .card {
                        background: white;
                        border-radius: 20px;
                        padding: 40px;
                        text-align: center;
                        max-width: 400px;
                        box-shadow: 0 20px 60px rgba(0,0,0,0.3);
                    }
                    h2 { color: #e74c3c; margin-bottom: 20px; }
                    p { color: #666; margin-bottom: 20px; line-height: 1.6; }
                    button {
                        background: #6a5af9;
                        color: white;
                        border: none;
                        padding: 15px 40px;
                        border-radius: 50px;
                        font-size: 16px;
                        cursor: pointer;
                        font-weight: bold;
                    }
                    button:hover { background: #5a4ae9; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>Sessão Expirada</h2>
                    <p>Sua sessão expirou ou o link é inválido.</p>
                    <p>Isso pode acontecer se você:<br>
                    • Ficou muito tempo sem avançar<br>
                    • Abriu em outro navegador<br>
                    • Usou modo anônimo</p>
                    <button onclick="window.location.href='/'">Recomeçar</button>
                </div>
            </body>
            </html>
        `);
    }

    // Verifica se o step está correto
    if (step !== session.step) {
        console.log(`⚠️ Step incorreto: esperado ${session.step}, recebido ${step}`);
        // Se o step for menor, avança automaticamente
        if (step < session.step) {
            return res.redirect(`/page${session.step}?token=${token}`);
        }
    }

    // Busca o link
    const link = linksData.links.find(l => l.alias === session.alias);
    if (!link) {
        console.log('❌ Link não encontrado');
        return res.redirect('/');
    }

    // Define qual HTML servir
    const htmlFile = path.join(__dirname, 'public', 'step1.html'); // Use sempre o mesmo HTML
    
    res.sendFile(htmlFile, (err) => {
        if (err) {
            console.error('Erro ao enviar HTML:', err);
            res.status(500).send('Erro ao carregar página. <a href="/">Voltar</a>');
        }
    });
});

// --- API: Avançar Etapa (SIMPLIFICADA) ---
app.get('/api/next-step', (req, res) => {
    const token = req.query.token;
    const clientStep = parseInt(req.query.currentStep);

    console.log(`🔄 Next-step: step=${clientStep}, token=${token ? token.substring(0,10)+'...' : 'ausente'}`);

    if (!token || isNaN(clientStep)) {
        return res.status(400).json({ error: 'Dados inválidos', redirect: '/' });
    }

    const session = verifyToken(token);
    if (!session) {
        return res.status(403).json({ error: 'Sessão inválida', redirect: '/' });
    }

    const link = linksData.links.find(l => l.alias === session.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }

    const TOTAL_STEPS = link.steps || 3;

    // Verifica tempo (mais flexível)
    const timeElapsed = Date.now() - session.createdAt;
    const stepTimeElapsed = timeElapsed - ((clientStep - 1) * STEP_TIME_MS);
    
    if (stepTimeElapsed < STEP_TIME_MS - 3000) { // 3 segundos de tolerância
        const remainingTime = Math.max(0, STEP_TIME_MS - stepTimeElapsed);
        return res.status(429).json({ 
            error: `Aguarde ${Math.ceil(remainingTime/1000)} segundos`,
            resetTimer: true,
            remainingTime: remainingTime
        });
    }

    // Verifica sequência
    if (session.step !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida. Recomece.', redirect: '/' });
    }

    // Finaliza ou avança
    if (clientStep >= TOTAL_STEPS) {
        deleteToken(token);
        console.log(`✅ Finalizado! Redirecionando para: ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    } else {
        const nextStep = clientStep + 1;
        
        // Atualiza a sessão
        session.step = nextStep;
        session.createdAt = Date.now(); // Reset do timer
        sessions.set(token, session);
        
        console.log(`✅ Avançando para etapa ${nextStep}`);
        return res.json({ 
            redirect: `/page${nextStep}?token=${token}`,
            total: TOTAL_STEPS
        });
    }
});

// --- API: Obter Total de Etapas ---
app.get('/api/get-total', (req, res) => {
    const token = req.query.token;

    if (!token) {
        return res.status(400).json({ error: 'Token ausente' });
    }

    const session = verifyToken(token);
    if (!session) {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const link = linksData.links.find(l => l.alias === session.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado' });
    }

    res.json({ total: link.steps || 3 });
});

// --- Rota de Entrada ---
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);
    
    if (link) {
        const token = createToken(alias, 1);
        console.log(`🚀 Iniciando: ${alias} -> token: ${token.substring(0,10)}...`);
        res.redirect(`/page1?token=${token}`);
    } else {
        console.log(`❌ Alias não encontrado: ${alias}`);
        res.redirect('/');
    }
});

// Middleware de erro global
app.use((err, req, res, next) => {
    console.error('Erro global:', err);
    res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erro</title>
        <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}</style>
        </head>
        <body>
            <div style="text-align:center;background:white;border-radius:20px;padding:40px">
                <h2>⚠️ Erro no servidor</h2>
                <p>Tente novamente em alguns segundos.</p>
                <a href="/" style="background:#6a5af9;color:white;padding:12px 30px;border-radius:50px;text-decoration:none">Voltar</a>
            </div>
        </body>
        </html>
    `);
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`✅ SEM validação de IP`);
    console.log(`✅ Tokens simples (apenas random)`);
    console.log(`✅ 1 hora de expiração`);
    console.log(`✅ Tolerância de 3 segundos\n`);
});