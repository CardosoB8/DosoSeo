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

const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 60,
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
app.use(limiter);

const STEP_TIME_MS = 15000;
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;
const SECRET_KEY = process.env.TOKEN_SECRET || crypto.randomBytes(64).toString('hex');

// CARREGAR LINKS - Verifique se o caminho está correto
let linksData = [];
try {
    linksData = require('./data/links.js');
    console.log('✅ Links carregados:', linksData.map(l => l.alias).join(', '));
} catch (error) {
    console.error('❌ Erro ao carregar links.js:', error.message);
    linksData = [];
}

// FUNÇÃO SIMPLIFICADA (sem validação de token anterior)
function createToken(alias, step) {
    const payload = {
        alias: alias,
        step: step,
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRATION_MS,
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const data = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex');
    
    return Buffer.from(data).toString('base64url') + '.' + signature;
}

function verifyToken(token) {
    if (!token) return null;
    
    try {
        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;
        
        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const payload = JSON.parse(data);
        
        if (Date.now() > payload.exp) {
            console.log('⏰ Token expirado');
            return null;
        }
        
        const expectedSignature = crypto
            .createHmac('sha256', SECRET_KEY)
            .update(data)
            .digest('hex');
        
        if (signature !== expectedSignature) {
            console.log('🔒 Assinatura inválida');
            return null;
        }
        
        return payload;
    } catch (e) {
        console.error('Erro ao verificar token:', e.message);
        return null;
    }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/page:step', (req, res) => {
    const step = parseInt(req.params.step);
    const token = req.query.token;
    
    console.log(`📄 Acessando page${step}`);
    
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
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Sessão Inválida</title>
            <style>
                body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
                .card{background:white;border-radius:20px;padding:40px;text-align:center;max-width:400px;}
                button{background:#6a5af9;color:white;border:none;padding:15px 40px;border-radius:50px;font-size:16px;cursor:pointer;}
            </style>
            </head>
            <body>
                <div class="card">
                    <h2>🔒 Link Inválido</h2>
                    <p>Este link expirou ou é inválido.</p>
                    <button onclick="window.location.href='/'">Recomeçar</button>
                </div>
            </body>
            </html>
        `);
    }
    
    if (step !== payload.step) {
        return res.redirect(`/page${payload.step}?token=${token}`);
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        console.log(`❌ Alias não encontrado: ${payload.alias}`);
        return res.redirect('/');
    }
    
    const htmlFile = path.join(__dirname, 'public', 'step1.html');
    res.sendFile(htmlFile);
});

app.get('/api/next-step', (req, res) => {
    const token = req.query.token;
    const clientStep = parseInt(req.query.currentStep);
    
    console.log(`🔄 Next-step: etapa ${clientStep}`);
    
    if (!token || isNaN(clientStep)) {
        return res.status(400).json({ error: 'Dados inválidos', redirect: '/' });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido', redirect: '/' });
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        console.log(`❌ Link não encontrado para alias: ${payload.alias}`);
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }
    
    const TOTAL_STEPS = link.steps || 3;
    
    if (payload.step !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }
    
    const timeElapsed = Date.now() - payload.iat;
    if (timeElapsed < STEP_TIME_MS - 3000) {
        const remainingTime = Math.max(0, STEP_TIME_MS - timeElapsed);
        return res.status(429).json({ 
            error: `Aguarde ${Math.ceil(remainingTime/1000)} segundos`,
            resetTimer: true,
            remainingTime: remainingTime
        });
    }
    
    if (clientStep >= TOTAL_STEPS) {
        console.log(`✅ Finalizado! ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    } else {
        const nextStep = clientStep + 1;
        const newToken = createToken(payload.alias, nextStep);
        
        console.log(`✅ Nova etapa ${nextStep} criada`);
        console.log(`   Token: ${newToken.substring(0, 30)}...`);
        
        return res.json({ 
            redirect: `/page${nextStep}?token=${newToken}`,
            total: TOTAL_STEPS
        });
    }
});

app.get('/api/get-total', (req, res) => {
    const token = req.query.token;
    
    if (!token) {
        return res.status(400).json({ error: 'Token ausente' });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido' });
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado' });
    }
    
    res.json({ total: link.steps || 3 });
});

app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.find(l => l.alias === alias);
    
    console.log(`🔗 Acessando alias: ${alias}`);
    
    if (link) {
        const token = createToken(alias, 1);
        console.log(`✅ Token criado para ${alias}`);
        res.redirect(`/page1?token=${token}`);
    } else {
        console.log(`❌ Alias não encontrado: ${alias}`);
        res.redirect('/');
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📁 Links disponíveis: ${linksData.map(l => l.alias).join(', ') || 'nenhum'}`);
    console.log(`✅ Token Progressivo ATIVO\n`);
});