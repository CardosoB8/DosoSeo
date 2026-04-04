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
    max: 100,
    message: { error: 'Muitas requisições. Aguarde um momento.' }
});
app.use(limiter);

const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 horas
const SECRET_KEY = process.env.TOKEN_SECRET || crypto.randomBytes(64).toString('hex');

// SEM CACHE - apenas verificação direta
// Usamos um Set para tokens já usados (queimados)
const usedTokens = new Set();

// Limpeza de tokens usados a cada hora
setInterval(() => {
    usedTokens.clear();
}, 60 * 60 * 1000);

function createToken(alias, totalSteps) {
    const payload = {
        alias: alias,
        rota: Array.from({ length: totalSteps }, (_, i) => i + 1),
        etapa_atual: 1,
        iat: Date.now(),
        exp: Date.now() + TOKEN_EXPIRATION_MS,
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const data = JSON.stringify(payload);
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
    return Buffer.from(data).toString('base64url') + '.' + signature;
}

function verifyToken(token, checkUsed = true) {
    if (!token) return null;
    
    // Verifica se token já foi usado (queimado)
    if (checkUsed && usedTokens.has(token)) {
        console.log('🔥 Token já foi usado/queimado');
        return null;
    }
    
    try {
        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;
        
        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const payload = JSON.parse(data);
        
        const TOLERANCIA_MS = 5 * 60 * 1000;
        if (Date.now() > payload.exp + TOLERANCIA_MS) {
            console.log('⏰ Token expirado');
            return null;
        }
        
        const expectedSignature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
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

function avancarEtapa(tokenAntigo) {
    const payload = verifyToken(tokenAntigo, true);
    if (!payload) return null;
    
    const novaEtapa = payload.etapa_atual + 1;
    if (!payload.rota.includes(novaEtapa)) return null;
    
    // Marca o token antigo como usado (queima)
    usedTokens.add(tokenAntigo);
    
    const novoPayload = {
        alias: payload.alias,
        rota: payload.rota,
        etapa_atual: novaEtapa,
        iat: payload.iat,
        exp: payload.exp,
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const data = JSON.stringify(novoPayload);
    const signature = crypto.createHmac('sha256', SECRET_KEY).update(data).digest('hex');
    const novoToken = Buffer.from(data).toString('base64url') + '.' + signature;
    
    return novoToken;
}

let linksData = [];
try {
    linksData = require('./data/links.js');
    console.log('✅ Links carregados:', linksData.map(l => l.alias).join(', '));
} catch (error) {
    console.error('❌ Erro ao carregar links.js:', error.message);
    linksData = [];
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
    
    const payload = verifyToken(token, true);
    if (!payload) {
        console.log('❌ Token inválido ou queimado');
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Token Inválido</title>
            <style>
                body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
                .card{background:white;border-radius:20px;padding:40px;text-align:center;max-width:400px;}
                button{background:#6a5af9;color:white;border:none;padding:15px 40px;border-radius:50px;font-size:16px;cursor:pointer;}
            </style>
            </head>
            <body>
                <div class="card">
                    <h2>🔒 Token Inválido</h2>
                    <p>Seu link expirou ou já foi usado.</p>
                    <p>Isso pode acontecer se você:</p>
                    <p>• Clicou em "Continuar" duas vezes<br>
                    • Um anúncio recarregou a página<br>
                    • Tentou voltar para uma etapa anterior</p>
                    <button onclick="window.location.href='/'">Recomeçar</button>
                </div>
            </body>
            </html>
        `);
    }
    
    if (step !== payload.etapa_atual) {
        console.log(`⚠️ Redirecionando: etapa ${payload.etapa_atual}`);
        return res.redirect(`/page${payload.etapa_atual}?token=${token}`);
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) return res.redirect('/');
    
    res.sendFile(path.join(__dirname, 'public', 'step1.html'));
});

app.get('/api/next-step', (req, res) => {
    const token = req.query.token;
    const clientStep = parseInt(req.query.currentStep);
    
    console.log(`🔄 Next-step: etapa ${clientStep}`);
    
    if (!token || isNaN(clientStep)) {
        return res.status(400).json({ error: 'Dados inválidos', redirect: '/' });
    }
    
    const payload = verifyToken(token, true);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido', redirect: '/' });
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }
    
    const TOTAL_STEPS = link.steps || 3;
    
    if (payload.etapa_atual !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }
    
    // Finaliza
    if (clientStep >= TOTAL_STEPS) {
        usedTokens.add(token); // Queima o token
        console.log(`✅ Finalizado! ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    }
    
    // Avança
    const novoToken = avancarEtapa(token);
    if (!novoToken) {
        return res.status(500).json({ error: 'Erro ao avançar', redirect: '/' });
    }
    
    const novaEtapa = clientStep + 1;
    console.log(`✅ Avançando: etapa ${clientStep} → ${novaEtapa}`);
    return res.json({ redirect: `/page${novaEtapa}?token=${novoToken}`, total: TOTAL_STEPS });
});

app.get('/api/get-total', (req, res) => {
    const token = req.query.token;
    if (!token) return res.status(400).json({ error: 'Token ausente' });
    
    const payload = verifyToken(token, false); // Não verifica se foi usado
    if (!payload) return res.status(403).json({ error: 'Token inválido' });
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) return res.status(404).json({ error: 'Link não encontrado' });
    
    res.json({ total: link.steps || 3 });
});

app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.find(l => l.alias === alias);
    
    if (link) {
        const token = createToken(alias, link.steps || 3);
        console.log(`🚀 Iniciando: ${alias}`);
        res.redirect(`/page1?token=${token}`);
    } else {
        res.redirect('/');
    }
});

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`✅ SEM cache (problema resolvido)`);
    console.log(`✅ Tokens queimados são rastreados em Set`);
    console.log(`✅ Tokens expiram em 24 horas`);
    console.log(`✅ Limpeza do Set a cada hora\n`);
});