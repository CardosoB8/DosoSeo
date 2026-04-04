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

const STEP_TIME_MS = 15000; // 15 segundos por etapa
const TOKEN_EXPIRATION_MS = 24 * 60 * 60 * 1000; // 24 horas
const SECRET_KEY = process.env.TOKEN_SECRET || crypto.randomBytes(64).toString('hex');

// Cache para tokens recentemente usados (evita problemas com Web Push)
const tokenCache = new Map();

// ============================================================
// TOKEN ÚNICO EVOLUTIVO - Contém rota completa e etapa atual
// ============================================================
function createToken(alias, totalSteps) {
    const payload = {
        alias: alias,
        rota: Array.from({ length: totalSteps }, (_, i) => i + 1), // [1,2,3]
        etapa_atual: 1,
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

function verifyToken(token, allowReuse = true) {
    if (!token) return null;
    
    // Cache para reutilização (Web Push)
    if (allowReuse && tokenCache.has(token)) {
        const cached = tokenCache.get(token);
        if (Date.now() - cached.timestamp < 10000) {
            console.log('♻️ Token reutilizado do cache');
            return cached.payload;
        } else {
            tokenCache.delete(token);
        }
    }
    
    try {
        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;
        
        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const payload = JSON.parse(data);
        
        // Tolerância de 5 minutos para diferença de horário
        const TOLERANCIA_MS = 5 * 60 * 1000;
        if (Date.now() > payload.exp + TOLERANCIA_MS) {
            console.log('⏰ Token expirado');
            return null;
        }
        
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

// Função para avançar a etapa DENTRO do mesmo token
function avancarEtapa(tokenAntigo) {
    const payload = verifyToken(tokenAntigo, false);
    if (!payload) return null;
    
    const novaEtapa = payload.etapa_atual + 1;
    
    // Verifica se a nova etapa existe na rota
    if (!payload.rota.includes(novaEtapa)) {
        console.log('❌ Tentativa de avançar além da rota');
        return null;
    }
    
    // Cria NOVO payload com etapa atualizada
    const novoPayload = {
        alias: payload.alias,
        rota: payload.rota,
        etapa_atual: novaEtapa,
        iat: payload.iat, // Mantém o timestamp original
        exp: payload.exp,  // Mantém a expiração original
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const data = JSON.stringify(novoPayload);
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex');
    
    const novoToken = Buffer.from(data).toString('base64url') + '.' + signature;
    
    // Marca token antigo como usado (cache para Web Push)
    tokenCache.set(tokenAntigo, {
        timestamp: Date.now(),
        payload: payload
    });
    
    setTimeout(() => {
        if (tokenCache.has(tokenAntigo)) {
            tokenCache.delete(tokenAntigo);
        }
    }, 10000);
    
    return novoToken;
}

function markTokenAsUsed(token, payload) {
    tokenCache.set(token, {
        timestamp: Date.now(),
        payload: payload
    });
    
    setTimeout(() => {
        if (tokenCache.has(token)) {
            tokenCache.delete(token);
        }
    }, 10000);
}

// Carregar links
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
                button{background:#6a5af9;color:white;border:none;padding:15px 40px;border-radius:50px;font-size:16px;cursor:pointer;margin:5px;}
                .retry-btn{background:#27ae60;}
            </style>
            </head>
            <body>
                <div class="card">
                    <h2>🔒 Link Inválido ou Expirado</h2>
                    <p>O token expirou ou foi corrompido.</p>
                    <p>Isso pode acontecer se um anúncio foi aberto.</p>
                    <button onclick="window.location.href='/'">Recomeçar</button>
                    <button class="retry-btn" onclick="window.location.reload()">Tentar Novamente</button>
                </div>
            </body>
            </html>
        `);
    }
    
    // Verifica se a etapa está correta
    if (step !== payload.etapa_atual) {
        console.log(`⚠️ Step incorreto: token está na etapa ${payload.etapa_atual}, requisitado ${step}`);
        return res.redirect(`/page${payload.etapa_atual}?token=${token}`);
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        console.log(`❌ Alias não encontrado: ${payload.alias}`);
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
    
    // Verifica se a etapa atual do token corresponde
    if (payload.etapa_atual !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }
    
    // Verifica tempo (proteção contra avanço rápido)
    const timeElapsed = Date.now() - payload.iat;
    const stepTimeElapsed = timeElapsed - ((clientStep - 1) * STEP_TIME_MS);
    
    if (stepTimeElapsed < STEP_TIME_MS - 3000) {
        const remainingTime = Math.max(0, STEP_TIME_MS - stepTimeElapsed);
        return res.status(429).json({ 
            error: `Aguarde ${Math.ceil(remainingTime/1000)} segundos`,
            resetTimer: true,
            remainingTime: remainingTime
        });
    }
    
    // Verifica se já completou todas as etapas
    if (clientStep >= TOTAL_STEPS) {
        console.log(`✅ Finalizado! Redirecionando para: ${link.original_url}`);
        markTokenAsUsed(token, payload);
        return res.json({ redirect: link.original_url });
    }
    
    // AVANÇA PARA PRÓXIMA ETAPA (MESMO TOKEN, APENAS EVOLUI)
    const novoToken = avancarEtapa(token);
    
    if (!novoToken) {
        console.log('❌ Falha ao avançar etapa');
        return res.status(500).json({ error: 'Erro ao avançar', redirect: '/' });
    }
    
    const novaEtapa = clientStep + 1;
    console.log(`✅ Evoluindo: etapa ${clientStep} → ${novaEtapa} (mesmo token, apenas atualizado)`);
    
    return res.json({ 
        redirect: `/page${novaEtapa}?token=${novoToken}`,
        total: TOTAL_STEPS
    });
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
        const totalSteps = link.steps || 3;
        const token = createToken(alias, totalSteps);
        console.log(`✅ Token único criado para ${alias} com rota de ${totalSteps} etapas`);
        console.log(`   Token conterá: rota [1..${totalSteps}], etapa_atual: 1`);
        res.redirect(`/page1?token=${token}`);
    } else {
        console.log(`❌ Alias não encontrado: ${alias}`);
        res.redirect('/');
    }
});

// Limpeza do cache a cada 5 minutos
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of tokenCache.entries()) {
        if (now - data.timestamp > 60000) {
            tokenCache.delete(token);
        }
    }
}, 5 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`✅ TOKEN ÚNICO EVOLUTIVO ATIVADO`);
    console.log(`✅ Token contém: alias, rota completa, etapa_atual`);
    console.log(`✅ NÃO precisa criar múltiplos tokens`);
    console.log(`✅ Token evolui sozinho (mesmo token atualizado)`);
    console.log(`✅ Cache de 10 segundos para Web Push`);
    console.log(`✅ Expiração: 24 horas`);
    console.log(`📁 Links: ${linksData.map(l => l.alias).join(', ') || 'nenhum'}\n`);
});