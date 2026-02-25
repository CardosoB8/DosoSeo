const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Configurações de Segurança
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

// Rate Limit mais agressivo
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições. Tente novamente mais tarde.' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

const SESSION_SECRET_KEY = process.env.SESSION_SECRET_KEY || crypto.randomBytes(64).toString('hex');
if (!process.env.SESSION_SECRET_KEY) {
    console.warn('AVISO: Usando SESSION_SECRET_KEY gerada automaticamente. Configure uma variável de ambiente para produção.');
}

const STEP_TIME_MS = 15000; // 15 segundos por etapa
const MIN_TIME_TOLERANCE = 2000;
const TOKEN_EXPIRATION_MS = 10 * 60 * 1000;

const linksData = { links: require('./data/links.js') };

// Cache para tokens usados
const usedTokens = new Map();
const TOKEN_CLEANUP_INTERVAL = 5 * 60 * 1000;

// Limpeza periódica de tokens usados
setInterval(() => {
    const now = Date.now();
    for (const [token, expiry] of usedTokens.entries()) {
        if (now > expiry) {
            usedTokens.delete(token);
        }
    }
}, TOKEN_CLEANUP_INTERVAL);

// --- Criptografia Melhorada ---
function signToken(payload, ip) {
    const payloadSec = {
        ...payload,
        ip: ip,
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

function verifyToken(token, reqIp) {
    try {
        if (usedTokens.has(token)) {
            return null;
        }

        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;

        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const payload = JSON.parse(data);

        if (Date.now() > payload.exp) {
            return null;
        }

        if (payload.ip !== reqIp) {
            return null;
        }

        const hmac = crypto.createHmac('sha384', SESSION_SECRET_KEY);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');

        if (!crypto.timingSafeEqual(
            Buffer.from(signature), 
            Buffer.from(expectedSignature)
        )) {
            return null;
        }

        return payload;
    } catch (e) {
        return null;
    }
}

function markTokenUsed(token) {
    const [encodedData] = token.split('.');
    const data = Buffer.from(encodedData, 'base64url').toString('utf8');
    const payload = JSON.parse(data);
    usedTokens.set(token, payload.exp);
}

// Middleware para arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// --- Rota Home ---
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- Rota das Páginas de Etapa ---
app.get('/page:step', (req, res) => {
    const step = parseInt(req.params.step);
    const token = req.query.token;

    console.log(`Acessando etapa ${step} com token:`, token ? 'presente' : 'ausente');

    if (isNaN(step) || !token) {
        console.log('Redirecionando: step inválido ou token ausente');
        return res.redirect('/');
    }

    const payload = verifyToken(token, req.ip);
    if (!payload) {
        console.log('Redirecionando: token inválido');
        return res.redirect('/');
    }

    // Validar consistência do passo
    const link = linksData.links.find(l => l.alias === payload.alias);
    if (!link) {
        console.log('Redirecionando: link não encontrado');
        return res.redirect('/');
    }

    // Validar sequência de passos
    if (step !== payload.step) {
        console.log(`Redirecionando: step esperado ${payload.step}, recebido ${step}`);
        return res.redirect('/');
    }

    // ===== LÓGICA PARA ALTERNAR ENTRE OS 2 ARQUIVOS =====
    // Define qual arquivo HTML servir baseado no número da etapa
    let htmlFile;
    if (step % 2 === 1) {
        // Etapas ímpares: 1, 3, 5, 7... usam step1.html
        htmlFile = path.join(__dirname, 'public', 'step1.html');
        console.log(`✅ Etapa ${step} (ímpar) -> servindo step1.html`);
    } else {
        // Etapas pares: 2, 4, 6, 8... usam step2.html
        htmlFile = path.join(__dirname, 'public', 'step2.html');
        console.log(`✅ Etapa ${step} (par) -> servindo step2.html`);
    }

    // Verifica se o arquivo existe antes de enviar
    res.sendFile(htmlFile, (err) => {
        if (err) {
            console.error(`Erro ao enviar ${htmlFile}:`, err);
            res.status(500).send('Erro ao carregar página');
        }
    });
});

// --- API: Avançar Etapa ---
app.get('/api/next-step', (req, res) => {
    const sessionToken = req.query.token;
    const clientStep = parseInt(req.query.currentStep);
    const clientIp = req.ip;

    console.log(`API next-step: step=${clientStep}, token=${sessionToken ? 'presente' : 'ausente'}`);

    if (!sessionToken || isNaN(clientStep)) {
        return res.status(400).json({ error: 'Dados inválidos', redirect: '/' });
    }

    const payload = verifyToken(sessionToken, clientIp);
    if (!payload) {
        return res.status(403).json({ error: 'Sessão inválida ou expirada', redirect: '/' });
    }

    const link = linksData.links.find(l => l.alias === payload.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }

    const TOTAL_STEPS_FOR_LINK = link.steps || 3;

    const timeElapsed = Date.now() - payload.iat;
    
    if (timeElapsed < (STEP_TIME_MS - MIN_TIME_TOLERANCE)) {
        const remainingTime = Math.max(0, STEP_TIME_MS - timeElapsed);
        return res.status(429).json({ 
            error: `Aguarde mais ${Math.ceil(remainingTime/1000)} segundos`, 
            resetTimer: true,
            remainingTime: remainingTime
        });
    }

    // Validar sequência
    if (payload.step !== clientStep) {
        markTokenUsed(sessionToken);
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }

    // Lógica de decisão
    if (clientStep >= TOTAL_STEPS_FOR_LINK) {
        markTokenUsed(sessionToken);
        console.log(`✅ Finalizando: redirecionando para link original: ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    } else {
        const nextStep = clientStep + 1;
        const newToken = signToken({ 
            alias: payload.alias, 
            step: nextStep
        }, clientIp);

        markTokenUsed(sessionToken);
        
        console.log(`✅ Avançando: etapa ${clientStep} -> ${nextStep}, usará ${nextStep % 2 === 1 ? 'step1.html' : 'step2.html'}`);
        
        return res.json({ 
            redirect: `/page${nextStep}?token=${newToken}`,
            total: TOTAL_STEPS_FOR_LINK
        });
    }
});

// --- API: Obter Total de Etapas ---
app.get('/api/get-total', (req, res) => {
    const token = req.query.token;
    const clientIp = req.ip;

    if (!token) {
        return res.status(400).json({ error: 'Token ausente' });
    }

    const payload = verifyToken(token, clientIp);
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

// --- Rota de Entrada (Start) ---
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);
    
    if (link) {
        const totalSteps = link.steps || 3;
        const token = signToken({ 
            alias: alias, 
            step: 1 
        }, req.ip);
        
        console.log(`🚀 Iniciando: alias=${alias}, totalSteps=${totalSteps}, primeira etapa usará step1.html`);
        res.redirect(`/page1?token=${token}`);
    } else {
        res.redirect('/');
    }
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Erro:', err);
    res.status(500).redirect('/');
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Alternando entre:`);
    console.log(`   - Etapas ÍMPARES (1,3,5,7...): step1.html`);
    console.log(`   - Etapas PARES (2,4,6,8...): step2.html`);
    console.log(`⏱️  Tempo por etapa: ${STEP_TIME_MS/1000} segundos\n`);
});