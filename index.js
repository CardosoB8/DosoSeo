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

// ============================================================
// CONFIGURAÇÕES
// ============================================================
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000; // 1 hora (pode mudar para 5 * 60 * 1000 se quiser 5 minutos)
const SECRET_KEY = process.env.TOKEN_SECRET || crypto.randomBytes(64).toString('hex');

// Carregar links
let linksData = [];
try {
    linksData = require('./data/links.js');
    console.log('✅ Links carregados:', linksData.map(l => l.alias).join(', '));
} catch (error) {
    console.error('❌ Erro ao carregar links.js:', error.message);
    linksData = [];
}

// ============================================================
// FUNÇÕES DO TOKEN (SEM ARMAZENAMENTO)
// ============================================================

// Cria um novo token
function createToken(alias, totalSteps) {
    const payload = {
        alias: alias,
        totalSteps: totalSteps,
        etapa_atual: 1,
        criado_em: Date.now(),
        expira_em: Date.now() + TOKEN_EXPIRATION_MS,
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const data = JSON.stringify(payload);
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex');
    
    return Buffer.from(data).toString('base64url') + '.' + signature;
}

// Verifica token (sem marcar como usado, sem cache)
function verifyToken(token) {
    if (!token) return null;
    
    try {
        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;
        
        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const payload = JSON.parse(data);
        
        // Verifica expiração
        if (Date.now() > payload.expira_em) {
            console.log('⏰ Token expirado');
            return null;
        }
        
        // Verifica assinatura
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

// Avança para próxima etapa (cria NOVO token, sem queimar o antigo)
function avancarEtapa(tokenAntigo) {
    const payload = verifyToken(tokenAntigo);
    if (!payload) return null;
    
    const novaEtapa = payload.etapa_atual + 1;
    
    // Verifica se não passou do total
    if (novaEtapa > payload.totalSteps) return null;
    
    // Cria novo token com etapa atualizada
    const novoPayload = {
        alias: payload.alias,
        totalSteps: payload.totalSteps,
        etapa_atual: novaEtapa,
        criado_em: payload.criado_em,
        expira_em: payload.expira_em,
        nonce: crypto.randomBytes(16).toString('hex')
    };
    
    const data = JSON.stringify(novoPayload);
    const signature = crypto
        .createHmac('sha256', SECRET_KEY)
        .update(data)
        .digest('hex');
    
    return Buffer.from(data).toString('base64url') + '.' + signature;
}

// ============================================================
// ROTAS
// ============================================================

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Página das etapas
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
        console.log('❌ Token inválido ou expirado');
        return res.send(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>Token Expirado</title>
                <style>
                    body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
                    .card{background:white;border-radius:20px;padding:40px;text-align:center;max-width:400px;}
                    button{background:#6a5af9;color:white;border:none;padding:15px 40px;border-radius:50px;font-size:16px;cursor:pointer;}
                    p{color:#666;margin:10px 0;}
                </style>
            </head>
            <body>
                <div class="card">
                    <h2>⏰ Token Expirado</h2>
                    <p>Seu link expirou.</p>
                    <p>O token tem validade de ${TOKEN_EXPIRATION_MS / 60000} minutos.</p>
                    <button onclick="window.location.href='/'">Recomeçar</button>
                </div>
            </body>
            </html>
        `);
    }
    
    // Redireciona se a etapa estiver errada
    if (step !== payload.etapa_atual) {
        console.log(`⚠️ Redirecionando: etapa correta é ${payload.etapa_atual}`);
        return res.redirect(`/page${payload.etapa_atual}?token=${token}`);
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        console.log(`❌ Alias não encontrado: ${payload.alias}`);
        return res.redirect('/');
    }
    
    res.sendFile(path.join(__dirname, 'public', 'step1.html'));
});

// API para avançar etapa
app.get('/api/next-step', (req, res) => {
    const token = req.query.token;
    const clientStep = parseInt(req.query.currentStep);
    
    console.log(`🔄 Next-step: etapa ${clientStep}`);
    
    if (!token || isNaN(clientStep)) {
        return res.status(400).json({ error: 'Dados inválidos', redirect: '/' });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ error: 'Token expirado ou inválido', redirect: '/' });
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }
    
    // Verifica se a etapa está correta
    if (payload.etapa_atual !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }
    
    // Se já está na última etapa, libera o link final
    if (clientStep >= payload.totalSteps) {
        console.log(`✅ Finalizado! Redirecionando para: ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    }
    
    // Avança para próxima etapa
    const novoToken = avancarEtapa(token);
    if (!novoToken) {
        return res.status(500).json({ error: 'Erro ao avançar etapa', redirect: '/' });
    }
    
    const novaEtapa = clientStep + 1;
    console.log(`✅ Avançando: etapa ${clientStep} → ${novaEtapa}`);
    
    return res.json({ 
        redirect: `/page${novaEtapa}?token=${novoToken}`,
        total: payload.totalSteps
    });
});

// API para obter total de etapas
app.get('/api/get-total', (req, res) => {
    const token = req.query.token;
    
    if (!token) {
        return res.status(400).json({ error: 'Token ausente' });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido' });
    }
    
    res.json({ total: payload.totalSteps });
});

// Rota de entrada
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.find(l => l.alias === alias);
    
    console.log(`🔗 Acessando alias: ${alias}`);
    
    if (link) {
        const totalSteps = link.steps || 3;
        const token = createToken(alias, totalSteps);
        console.log(`✅ Token criado para ${alias} (${totalSteps} etapas, expira em ${TOKEN_EXPIRATION_MS / 60000} min)`);
        res.redirect(`/page1?token=${token}`);
    } else {
        console.log(`❌ Alias não encontrado: ${alias}`);
        res.redirect('/');
    }
});

// Middleware de erro
app.use((err, req, res, next) => {
    console.error('Erro global:', err);
    res.status(500).send(`
        <!DOCTYPE html>
        <html>
        <head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Erro</title>
        <style>body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}</style>
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
    console.log(`✅ TOKEN AUTOSSUFICIENTE STATELESS`);
    console.log(`✅ SEM armazenamento (sem Map, sem Redis, sem cache)`);
    console.log(`✅ Token contém: alias, etapa, total, expiração`);
    console.log(`✅ Token pode ser reutilizado quantas vezes quiser`);
    console.log(`✅ Expiração: ${TOKEN_EXPIRATION_MS / 60000} minutos`);
    console.log(`✅ Links: ${linksData.map(l => l.alias).join(', ') || 'nenhum'}\n`);
});