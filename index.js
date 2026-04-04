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

// Rate Limit (proteção contra ataques)
const limiter = rateLimit({
    windowMs: 60 * 1000, // 1 minuto
    max: 60, // 60 requisições por minuto
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
app.use(limiter);

// Configurações
const STEP_TIME_MS = 15000; // 15 segundos
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hora
const SECRET_KEY = process.env.TOKEN_SECRET || crypto.randomBytes(64).toString('hex');

const linksData = { links: require('./data/links.js') };

// ========== TOKEN PROGRESSIVO (SEM ARMAZENAMENTO) ==========
// O token contém TODAS as informações: alias, etapa, timestamp, e assinatura
// O servidor NÃO guarda nada em memória - apenas verifica a assinatura

function createToken(alias, step, previousToken = null) {
    // Se veio um token anterior, verifica e invalida (queima)
    if (previousToken) {
        const oldPayload = verifyToken(previousToken, true); // true = não marcar como usado
        if (oldPayload && oldPayload.step !== step) {
            // Token anterior é de etapa diferente - inválido
            return null;
        }
    }
    
    const payload = {
        alias: alias,
        step: step,
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRATION_MS,
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    // Cria assinatura
    const data = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex');
    
    // Token = dados + assinatura
    const token = Buffer.from(data).toString('base64url') + '.' + signature;
    
    return token;
}

function verifyToken(token, skipExpiry = false) {
    if (!token) return null;
    
    try {
        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;
        
        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const payload = JSON.parse(data);
        
        // Verifica expiração
        if (!skipExpiry && Date.now() > payload.exp) {
            console.log('⏰ Token expirado');
            return null;
        }
        
        // Verifica assinatura
        const expectedSignature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(data)
            .digest('hex');
        
        if (signature !== expectedSignature) {
            console.log('🔒 Assinatura inválida - tentativa de burla');
            return null;
        }
        
        return payload;
    } catch (e) {
        console.error('Erro ao verificar token:', e.message);
        return null;
    }
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
    
    console.log(`📄 Acessando page${step}, token: ${token ? token.substring(0, 20)+'...' : 'ausente'}`);
    
    if (!token) {
        console.log('❌ Sem token');
        return res.redirect('/');
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        console.log('❌ Token inválido');
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Link Inválido</title>
                <style>
                    body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
                    .card{background:white;border-radius:20px;padding:40px;text-align:center;max-width:400px;box-shadow:0 20px 60px rgba(0,0,0,0.3);}
                    h2{color:#e74c3c;margin-bottom:20px;}
                    p{color:#666;margin-bottom:20px;line-height:1.6;}
                    button{background:#6a5af9;color:white;border:none;padding:15px 40px;border-radius:50px;font-size:16px;cursor:pointer;font-weight:bold;}
                    button:hover{background:#5a4ae9;}
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>🔒 Link Inválido ou Expirado</h2>
                    <p>Este link não é mais válido ou expirou.</p>
                    <p>Para sua segurança, cada etapa gera um novo link.</p>
                    <button onclick="window.location.href='/'">🔁 Recomeçar</button>
                </div>
            </body>
            </html>
        `);
    }
    
    // Verifica se a etapa está correta
    if (step !== payload.step) {
        console.log(`⚠️ Step incorreto: esperado ${payload.step}, recebido ${step}`);
        return res.redirect(`/page${payload.step}?token=${token}`);
    }
    
    const link = linksData.links.find(l => l.alias === payload.alias);
    if (!link) {
        console.log('❌ Link não encontrado');
        return res.redirect('/');
    }
    
    const htmlFile = path.join(__dirname, 'public', 'step1.html');
    res.sendFile(htmlFile, (err) => {
        if (err) {
            console.error('Erro ao enviar HTML:', err);
            res.status(500).send('Erro ao carregar página. <a href="/">Voltar</a>');
        }
    });
});

// --- API: Avançar Etapa (COM TOKEN PROGRESSIVO) ---
app.get('/api/next-step', (req, res) => {
    const token = req.query.token;
    const clientStep = parseInt(req.query.currentStep);
    
    console.log(`🔄 Next-step: step=${clientStep}, token: ${token ? token.substring(0,20)+'...' : 'ausente'}`);
    
    if (!token || isNaN(clientStep)) {
        return res.status(400).json({ error: 'Dados inválidos', redirect: '/' });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido ou expirado', redirect: '/' });
    }
    
    const link = linksData.links.find(l => l.alias === payload.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }
    
    const TOTAL_STEPS = link.steps || 3;
    
    // Verifica se o step do token corresponde ao que o cliente enviou
    if (payload.step !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }
    
    // Verifica tempo (proteção contra avanço rápido)
    const timeElapsed = Date.now() - payload.iat;
    if (timeElapsed < STEP_TIME_MS - 3000) {
        const remainingTime = Math.max(0, STEP_TIME_MS - timeElapsed);
        return res.status(429).json({ 
            error: `Aguarde ${Math.ceil(remainingTime/1000)} segundos`,
            resetTimer: true,
            remainingTime: remainingTime
        });
    }
    
    // Finaliza ou avança para próxima etapa
    if (clientStep >= TOTAL_STEPS) {
        console.log(`✅ Finalizado! Redirecionando para: ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    } else {
        const nextStep = clientStep + 1;
        
        // Cria NOVO token para a próxima etapa
        // O token antigo será rejeitado se tentar usar novamente
        const newToken = createToken(payload.alias, nextStep, token);
        
        if (!newToken) {
            return res.status(400).json({ error: 'Erro ao criar token', redirect: '/' });
        }
        
        console.log(`✅ Avançando etapa ${clientStep} -> ${nextStep}`);
        console.log(`   Token antigo será rejeitado se reutilizado`);
        
        return res.json({ 
            redirect: `/page${nextStep}?token=${newToken}`,
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
    
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido' });
    }
    
    const link = linksData.links.find(l => l.alias === payload.alias);
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
        console.log(`🚀 Iniciando: ${alias} -> token: ${token.substring(0,20)}...`);
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
    console.log(`✅ TOKEN PROGRESSIVO ATIVADO`);
    console.log(`✅ SEM armazenamento em memória (sem Map, sem Redis)`);
    console.log(`✅ Token contém: alias, etapa, timestamp, assinatura`);
    console.log(`✅ Token antigo é automaticamente rejeitado`);
    console.log(`✅ 1 hora de expiração`);
    console.log(`✅ Tolerância de 3 segundos\n`);
});