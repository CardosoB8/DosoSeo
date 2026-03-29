const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de Segurança (mais flexível para mobile)
app.set('trust proxy', 1);
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'", "https:", "http:"],
            scriptSrc: ["'self'", "'unsafe-inline'", "https:", "http:"],
            styleSrc: ["'self'", "'unsafe-inline'", "https:"],
            imgSrc: ["'self'", "data:", "https:", "http:"],
            fontSrc: ["'self'", "https:"],
            frameSrc: ["'self'", "https:", "http:"],
            connectSrc: ["'self'", "https:", "http:"]
        }
    }
}));

app.use(cors());

// Rate Limit mais generoso
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200, // Aumentado de 100 para 200
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

const SESSION_SECRET_KEY = process.env.SESSION_SECRET_KEY || crypto.randomBytes(64).toString('hex');

const STEP_TIME_MS = 15000;
const MIN_TIME_TOLERANCE = 3000; // Aumentado para dar margem
const TOKEN_EXPIRATION_MS = 30 * 60 * 1000; // Aumentado para 30 minutos

const linksData = { links: require('./data/links.js') };

const usedTokens = new Map();
const TOKEN_CLEANUP_INTERVAL = 5 * 60 * 1000;

setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of usedTokens.entries()) {
        if (now > expiry) {
            usedTokens.delete(token);
        }
    }
}, TOKEN_CLEANUP_INTERVAL);

// --- Função para obter identificador único do cliente (mais estável que IP) ---
function getClientId(req) {
    // Combina IP + User-Agent + Accept-Language (mais estável para mobile)
    const ip = req.headers['x-forwarded-for']?.split(',')[0] || req.ip || req.socket.remoteAddress;
    const ua = req.headers['user-agent']?.slice(0, 50) || 'unknown';
    const lang = req.headers['accept-language']?.slice(0, 10) || 'unknown';
    
    // Cria um hash estável mesmo se IP mudar um pouco
    const hash = crypto.createHash('md5').update(`${ip}-${ua}-${lang}`).digest('hex');
    return hash.substring(0, 16);
}

// --- Criptografia SEM depender do IP (mais mobile-friendly) ---
function signToken(payload, clientId) {
    const payloadSec = {
        ...payload,
        clientId: clientId,
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRATION_MS,
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const data = JSON.stringify(payloadSec);
    const hmac = crypto.createHmac('sha384', SESSION_SECRET_KEY);
    hmac.update(data);
    const signature = hmac.digest('hex');
    
    return `${Buffer.from(data).toString('base64url')}.${signature}`;
}

function verifyToken(token, clientId) {
    try {
        if (usedTokens.has(token)) {
            console.log('Token já usado');
            return null;
        }

        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;

        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const payload = JSON.parse(data);

        if (Date.now() > payload.exp) {
            console.log('Token expirado');
            return null;
        }

        // Verificação mais flexível do clientId
        if (payload.clientId !== clientId) {
            console.log(`ClientId mismatch: ${payload.clientId} vs ${clientId}`);
            // Em mobile, às vezes o clientId muda levemente - damos uma margem
            if (!payload.clientId.startsWith(clientId.substring(0, 8))) {
                return null;
            }
        }

        const hmac = crypto.createHmac('sha384', SESSION_SECRET_KEY);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');

        if (!crypto.timingSafeEqual(
            Buffer.from(signature), 
            Buffer.from(expectedSignature)
        )) {
            console.log('Assinatura inválida');
            return null;
        }

        return payload;
    } catch (e) {
        console.error('Erro ao verificar token:', e.message);
        return null;
    }
}

function markTokenUsed(token) {
    const [encodedData] = token.split('.');
    const data = Buffer.from(encodedData, 'base64url').toString('utf8');
    const payload = JSON.parse(data);
    usedTokens.set(token, payload.exp);
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota das Páginas de Etapa - COM FALLBACK
app.get('/page:step', (req, res) => {
    const step = parseInt(req.params.step);
    const token = req.query.token;
    const clientId = getClientId(req);

    console.log(`📱 Acessando etapa ${step}, ClientId: ${clientId.substring(0, 8)}...`);

    if (isNaN(step) || !token) {
        console.log('❌ Redirecionando: step inválido ou token ausente');
        return res.redirect('/');
    }

    const payload = verifyToken(token, clientId);
    if (!payload) {
        console.log('❌ Redirecionando: token inválido ou expirado');
        // Em vez de redirect, mostra erro amigável
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sessão Expirada</title>
            <style>
                body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px}
                .card{background:white;border-radius:20px;padding:30px;text-align:center;box-shadow:0 10px 40px rgba(0,0,0,0.1);max-width:400px}
                button{background:#6a5af9;color:white;border:none;padding:12px 30px;border-radius:50px;font-size:16px;cursor:pointer}
            </style>
            </head>
            <body>
            <div class="card">
                <h2>🔁 Sessão Expirada</h2>
                <p>Sua sessão expirou ou o token é inválido.</p>
                <p>Clique no botão abaixo para recomeçar:</p>
                <button onclick="window.location.href='/'">Voltar ao início</button>
            </div>
            </body>
            </html>
        `);
    }

    const link = linksData.links.find(l => l.alias === payload.alias);
    if (!link) {
        return res.redirect('/');
    }

    if (step !== payload.step) {
        console.log(`Step mismatch: esperado ${payload.step}, recebido ${step}`);
        return res.redirect('/');
    }

    let htmlFile;
    if (step % 2 === 1) {
        htmlFile = path.join(__dirname, 'public', 'step1.html');
    } else {
        htmlFile = path.join(__dirname, 'public', 'step2.html');
    }

    res.sendFile(htmlFile, (err) => {
        if (err) {
            console.error(`Erro ao enviar ${htmlFile}:`, err);
            res.status(500).send('Erro ao carregar página');
        }
    });
});

// API: Avançar Etapa - MAIS TOLERANTE
app.get('/api/next-step', (req, res) => {
    const sessionToken = req.query.token;
    const clientStep = parseInt(req.query.currentStep);
    const clientId = getClientId(req);

    console.log(`🔄 API next-step: step=${clientStep}, clientId=${clientId.substring(0, 8)}...`);

    if (!sessionToken || isNaN(clientStep)) {
        return res.status(400).json({ error: 'Dados inválidos', redirect: '/' });
    }

    const payload = verifyToken(sessionToken, clientId);
    if (!payload) {
        return res.status(403).json({ error: 'Sessão inválida ou expirada', redirect: '/' });
    }

    const link = linksData.links.find(l => l.alias === payload.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }

    const TOTAL_STEPS_FOR_LINK = link.steps || 3;

    const timeElapsed = Date.now() - payload.iat;
    
    // Mais tolerante com o tempo
    if (timeElapsed < (STEP_TIME_MS - MIN_TIME_TOLERANCE)) {
        const remainingTime = Math.max(0, STEP_TIME_MS - timeElapsed);
        return res.status(429).json({ 
            error: `Aguarde mais ${Math.ceil(remainingTime/1000)} segundos`, 
            resetTimer: true,
            remainingTime: remainingTime
        });
    }

    if (payload.step !== clientStep) {
        markTokenUsed(sessionToken);
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }

    if (clientStep >= TOTAL_STEPS_FOR_LINK) {
        markTokenUsed(sessionToken);
        console.log(`✅ Finalizando: redirecionando para ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    } else {
        const nextStep = clientStep + 1;
        const newToken = signToken({ 
            alias: payload.alias, 
            step: nextStep
        }, clientId);

        markTokenUsed(sessionToken);
        
        return res.json({ 
            redirect: `/page${nextStep}?token=${newToken}`,
            total: TOTAL_STEPS_FOR_LINK
        });
    }
});

app.get('/api/get-total', (req, res) => {
    const token = req.query.token;
    const clientId = getClientId(req);

    if (!token) {
        return res.status(400).json({ error: 'Token ausente' });
    }

    const payload = verifyToken(token, clientId);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido' });
    }

    const link = linksData.links.find(l => l.alias === payload.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado' });
    }

    const totalSteps = link.steps || 3;
    
    res.json({ total: totalSteps });
});

app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);
    
    if (link) {
        const totalSteps = link.steps || 3;
        const clientId = getClientId(req);
        const token = signToken({ 
            alias: alias, 
            step: 1 
        }, clientId);
        
        console.log(`🚀 Iniciando: alias=${alias}, totalSteps=${totalSteps}`);
        res.redirect(`/page1?token=${token}`);
    } else {
        res.redirect('/');
    }
});

app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).redirect('/');
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`⏱️  Tempo por etapa: ${STEP_TIME_MS/1000} segundos`);
    console.log(`📱 Modo mobile-friendly ativado (fallback para token inválido)\n`);
});