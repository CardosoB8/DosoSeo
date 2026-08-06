const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const bcrypt = require('bcrypt');

const app = express();

// =================================================================
// CONFIGURAÇÕES DIRETAS
// =================================================================
const CONFIG = {
    REDIS_URL: 'redis://default:JyefUsxHJljfdvs8HACumEyLE7XNgLvG@redis-19242.c266.us-east-1-3.ec2.cloud.redislabs.com:19242',
    ADMIN_PASSWORD: 'MrDoso2026@Admin',
    SESSION_SECRET: 'mr-doso-secret-key-2026'
};

const PORT = process.env.PORT || 3000;

// =================================================================
// MÓDULO DE CRIPTOGRAFIA (DENTRO DO SERVER)
// =================================================================
const CRYPTO_CONFIG = {
    FIXED_USERNAME: 'MrDoso',
    FIXED_MSISDN: '865446574',
    FIXED_SECRET: 'mCotB+*f>SYyO@8Em',
    MASTER_PASSWORD: 'MovTV@2026#SecureKey!',
    SALT: Buffer.from([0x4A, 0x8F, 0x2C, 0x11, 0x7E, 0x3B, 0x9D, 0x5A, 0x1F, 0x6C, 0x8E, 0x2D, 0x4B, 0x7A, 0x3F, 0x9C]),
    ITERATIONS: 10000,
    KEY_SIZE: 32
};

function generatePassword(expiryHours = 48) {
    try {
        console.log('🔐 Gerando senha com validade de', expiryHours, 'horas');
        
        const expiryDate = new Date();
        expiryDate.setHours(expiryDate.getHours() + expiryHours);
        
        // MESMO FORMATO do frontend para compatibilidade
        const plainText = `${CRYPTO_CONFIG.FIXED_USERNAME}|${expiryDate.getTime()}|${CRYPTO_CONFIG.FIXED_MSISDN}|${CRYPTO_CONFIG.FIXED_SECRET}`;
        
        console.log('📝 Dados para criptografar:', plainText.substring(0, 50) + '...');
        
        const key = crypto.pbkdf2Sync(
            CRYPTO_CONFIG.MASTER_PASSWORD, 
            CRYPTO_CONFIG.SALT, 
            CRYPTO_CONFIG.ITERATIONS, 
            CRYPTO_CONFIG.KEY_SIZE, 
            'sha256'
        );
        
        const iv = crypto.randomBytes(16);
        
        const cipher = crypto.createCipheriv('aes-256-cbc', key, iv);
        let encrypted = cipher.update(plainText, 'utf8', 'base64');
        encrypted += cipher.final('base64');
        
        const combined = Buffer.concat([iv, Buffer.from(encrypted, 'base64')]);
        const password = combined.toString('base64');
        
        console.log('✅ Senha gerada com sucesso! Tamanho:', password.length);
        
        return {
            password,
            expiryDate,
            expiryHours,
            username: CRYPTO_CONFIG.FIXED_USERNAME,
            msisdn: CRYPTO_CONFIG.FIXED_MSISDN
        };
    } catch (error) {
        console.error('❌ Erro ao gerar senha:', error);
        console.error('❌ Stack:', error.stack);
        return null;
    }
}

// =================================================================
// CONFIGURAÇÃO DO REDIS
// =================================================================
const redisClient = redis.createClient({
    url: CONFIG.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
    }
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('✅ Redis conectado'));

let redisConnected = false;

async function connectRedis() {
    try {
        await redisClient.connect();
        redisConnected = true;
        console.log('🚀 Redis pronto para uso!');
        
        const adminExists = await redisClient.exists('admin:config');
        if (!adminExists) {
            const hashedPassword = await bcrypt.hash(CONFIG.ADMIN_PASSWORD, 10);
            await redisClient.hSet('admin:config', {
                password: hashedPassword,
                criado_em: new Date().toISOString()
            });
            console.log('✅ Admin inicializado');
        }
    } catch (err) {
        console.error('Falha ao conectar Redis:', err);
        redisConnected = false;
    }
}

connectRedis();

// Reconexão automática do Redis
setInterval(async () => {
    if (!redisConnected) {
        console.log('🔄 Tentando reconectar Redis...');
        await connectRedis();
    }
}, 5000);

// =================================================================
// CONFIGURAÇÕES DE SEGURANÇA
// =================================================================
app.set('trust proxy', 1);

app.use(helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

// Sessão para o painel admin
app.use(session({
    store: new RedisStore({ 
        client: redisClient,
        prefix: 'sess:',
        ttl: 3600
    }),
    secret: CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    rolling: true,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 3600000
    }
}));

// Rate limits
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 500,
    message: { error: 'Muitas requisições' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: { error: 'Muitas tentativas' }
});

// Rate limit específico para geração de senha
const passwordLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 5,
    message: { error: 'Muitas tentativas de gerar senha' }
});

// =================================================================
// CONFIGURAÇÕES DO SISTEMA
// =================================================================
const SESSION_EXPIRATION = 72 * 60 * 60; // 72 horas
const TOTAL_STEPS = 3;

const CPA_LINKS = [
    'https://omg10.com/4/10420694',
    'https://app.sscashout.online/?pid=5905&bid=1712',
    'https://eminentpercentvandalism.com/ub1ha7zr?key=d8d02483a91be089cb0ea712c656ca8a'
];

const STEP_CONFIGS = {
    1: { 
        titulo: 'Verificação Inicial', 
        subtitulo: 'Preparando seu link seguro...', 
        timer: 20, 
        temAdsterra: true, 
        temCPA: true, 
        icone: 'fa-shield-alt', 
        botaoTexto: 'Continuar' 
    },
    2: { 
        titulo: 'Confirmação de Acesso', 
        subtitulo: 'Confirme que você não é um robô', 
        timer: 20, 
        temAdsterra: false, 
        temCPA: false, 
        icone: 'fa-user-check', 
        botaoTexto: 'Verificar Acesso' 
    },
    3: { 
        titulo: 'Link Pronto!', 
        subtitulo: 'Seu conteúdo está disponível', 
        timer: 25, 
        temAdsterra: true, 
        temCPA: true, 
        icone: 'fa-check-circle', 
        botaoTexto: 'Acessar Conteúdo' 
    }
};

// =================================================================
// CARREGAR LINKS ANTIGOS (compatibilidade)
// =================================================================
let linksData = [];
try {
    linksData = require('./data/links.js');
    console.log(`✅ Links antigos carregados: ${linksData.length} links`);
} catch (error) {
    console.log('ℹ️ Nenhum links.js encontrado, usando apenas Redis');
}

// =================================================================
// FUNÇÕES AUXILIARES
// =================================================================
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function getClientFingerprint(req) {
    const ip = req.ip || req.connection?.remoteAddress || req.headers['x-forwarded-for']?.split(',')[0] || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    const acceptLanguage = req.headers['accept-language'] || '';
    return crypto.createHash('sha256').update(ip + userAgent + acceptLanguage).digest('hex').substring(0, 20);
}

function getRandomCpaLink() {
    return CPA_LINKS[Math.floor(Math.random() * CPA_LINKS.length)];
}

// =================================================================
// FUNÇÕES DE SESSÃO DE DOWNLOAD
// =================================================================
async function createDownloadSession(itemId, req) {
    const sessionId = generateSessionId();
    const fingerprint = getClientFingerprint(req);
    
    const sessionData = {
        id: sessionId,
        itemId: itemId,
        etapa_atual: 1,
        fingerprint: fingerprint,
        criado_em: Date.now(),
        ultima_acao: Date.now(),
        cpa_aberto_etapa1: false,
        cpa_aberto_etapa2: false,
        cpa_aberto_etapa3: false,
        timer_restante: 20,
        timer_iniciado_em: null
    };
    
    await redisClient.setEx(`dsess:${sessionId}`, SESSION_EXPIRATION, JSON.stringify(sessionData));
    await redisClient.setEx(`fp:${fingerprint}`, SESSION_EXPIRATION, sessionId);
    
    console.log(`✅ Sessão criada: ${sessionId.substring(0, 8)}... fp: ${fingerprint.substring(0, 8)}`);
    return sessionData;
}

async function getDownloadSession(sessionId) {
    if (!sessionId) return null;
    try {
        const data = await redisClient.get(`dsess:${sessionId}`);
        if (!data) return null;
        const session = JSON.parse(data);
        session.ultima_acao = Date.now();
        await redisClient.expire(`dsess:${sessionId}`, SESSION_EXPIRATION);
        return session;
    } catch (e) {
        return null;
    }
}

async function recoverDownloadSession(req) {
    const fingerprint = getClientFingerprint(req);
    
    let sessionId = await redisClient.get(`fp:${fingerprint}`);
    
    if (!sessionId) {
        sessionId = req.cookies?.dsessId;
    }
    
    if (!sessionId) {
        sessionId = req.headers['x-session-id'];
    }
    
    if (!sessionId && req.query.sid) {
        sessionId = req.query.sid;
    }
    
    if (!sessionId && req.body?.sessionId) {
        sessionId = req.body.sessionId;
    }
    
    if (!sessionId) return null;
    
    const session = await getDownloadSession(sessionId);
    
    if (session) {
        await redisClient.setEx(`fp:${fingerprint}`, SESSION_EXPIRATION, sessionId);
    }
    
    return session;
}

// =================================================================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN
// =================================================================
function requireAdmin(req, res, next) {
    if (!req.session || !req.session.isAdmin) {
        if (req.path.startsWith('/admin/api/')) {
            return res.status(401).json({ error: 'Não autorizado' });
        }
        return res.redirect('/admin-login');
    }
    next();
}

// =================================================================
// MIDDLEWARE DE SESSÃO DE DOWNLOAD
// =================================================================
const publicPaths = [
    '/admin-login', '/admin-panel', '/item', '/api/items', '/api/item', 
    '/api/start-download', '/api/step-config', '/api/next-step',
    '/page1', '/page2', '/page3', '/generate-password'
];

app.use(async (req, res, next) => {
    const isPublic = publicPaths.some(p => req.path.startsWith(p)) || 
                     req.path === '/' ||
                     req.path.startsWith('/css') || 
                     req.path.startsWith('/js') ||
                     req.path.startsWith('/admin');
    
    if (isPublic) {
        return next();
    }
    
    const session = await recoverDownloadSession(req);
    req.downloadSession = session;
    
    if (session && !req.cookies?.dsessId) {
        res.cookie('dsessId', session.id, {
            maxAge: SESSION_EXPIRATION * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
    }
    
    next();
});

// =================================================================
// ROTAS DE PÁGINAS ESTÁTICAS
// =================================================================
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/item/:id', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'item.html'));
});

app.get('/admin-login', (req, res) => {
    if (req.session.isAdmin) return res.redirect('/admin-panel');
    res.sendFile(path.join(__dirname, 'public', 'admin-login.html'));
});

app.get('/admin-panel', requireAdmin, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'admin-panel.html'));
});

app.get('/page:step', async (req, res) => {
    const step = parseInt(req.params.step);
    
    let session = req.downloadSession;
    
    if (!session && req.query.sid) {
        session = await getDownloadSession(req.query.sid);
        if (session) {
            res.cookie('dsessId', session.id, {
                maxAge: SESSION_EXPIRATION * 1000,
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/'
            });
            req.downloadSession = session;
        }
    }
    
    if (!session) {
        session = await recoverDownloadSession(req);
    }
    
    if (!session) {
        console.log('❌ Page: Sem sessão');
        return res.redirect('/');
    }
    
    if (step !== session.etapa_atual) {
        console.log(`⚠️ Redirecionando page: ${step} → ${session.etapa_atual}`);
        return res.redirect(`/page${session.etapa_atual}?sid=${session.id}`);
    }
    
    if (step > TOTAL_STEPS) {
        return res.redirect('/');
    }
    
    res.sendFile(path.join(__dirname, 'public', 'steps.html'));
});

// =================================================================
// API PÚBLICA
// =================================================================

app.get('/api/items', async (req, res) => {
    try {
        const categoria = req.query.categoria || 'todos';
        const page = parseInt(req.query.page) || 1;
        const limit = 24;
        const start = (page - 1) * limit;
        
        let itemIds;
        if (categoria === 'todos') {
            itemIds = await redisClient.zRange('itens:ativos', start, start + limit - 1, { REV: true });
        } else {
            itemIds = await redisClient.sMembers(`categoria:${categoria}`);
            itemIds = itemIds.slice(start, start + limit);
        }
        
        const items = [];
        for (const id of itemIds) {
            const item = await redisClient.hGetAll(`item:${id}`);
            if (item && item.ativo === 'true') {
                items.push({
                    id,
                    titulo: item.titulo,
                    descricao: item.descricao,
                    imagem: item.imagem,
                    categoria: item.categoria,
                    downloads: parseInt(item.downloads) || 0,
                    criado_em: item.criado_em
                });
            }
        }
        
        res.json({ items, hasMore: itemIds.length === limit });
    } catch (error) {
        console.error('Erro /api/items:', error);
        res.status(500).json({ error: 'Erro ao buscar itens' });
    }
});

app.get('/api/item/:id', async (req, res) => {
    try {
        const item = await redisClient.hGetAll(`item:${req.params.id}`);
        
        if (!item || Object.keys(item).length === 0) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        const today = new Date().toISOString().split('T')[0];
        await redisClient.hIncrBy(`item:${req.params.id}`, 'visualizacoes', 1);
        await redisClient.hIncrBy(`stats:daily:${today}`, 'visualizacoes_total', 1);
        
        res.json({
            id: req.params.id,
            ...item,
            downloads: parseInt(item.downloads) || 0,
            visualizacoes: (parseInt(item.visualizacoes) || 0) + 1
        });
    } catch (error) {
        console.error('Erro /api/item:', error);
        res.status(500).json({ error: 'Erro ao buscar item' });
    }
});

app.post('/api/start-download/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        
        const redisItem = await redisClient.hGetAll(`item:${itemId}`);
        const oldLink = linksData.find(l => l.alias === itemId);
        
        if ((!redisItem || Object.keys(redisItem).length === 0) && !oldLink) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        const session = await createDownloadSession(itemId, req);
        
        res.cookie('dsessId', session.id, {
            maxAge: SESSION_EXPIRATION * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        
        console.log(`🚀 Download iniciado: ${itemId}, sessão: ${session.id.substring(0, 8)}`);
        
        res.json({ 
            success: true, 
            redirect: `/page1?sid=${session.id}`,
            sessionId: session.id
        });
    } catch (error) {
        console.error('Erro start-download:', error);
        res.status(500).json({ error: 'Erro ao iniciar download' });
    }
});

app.get('/api/step-config', async (req, res) => {
    try {
        let session = req.downloadSession;
        
        if (!session) {
            session = await recoverDownloadSession(req);
        }
        
        if (!session) {
            console.log('❌ Step-config: Sem sessão');
            return res.status(403).json({ error: 'Sessão inválida' });
        }
        
        let urlOriginal;
        
        const redisItem = await redisClient.hGetAll(`item:${session.itemId}`);
        
        if (redisItem && Object.keys(redisItem).length > 0) {
            urlOriginal = redisItem.url_original;
        } else {
            const oldLink = linksData.find(l => l.alias === session.itemId);
            if (oldLink) {
                urlOriginal = oldLink.original_url;
            } else {
                return res.status(404).json({ error: 'Item não encontrado' });
            }
        }
        
        const config = STEP_CONFIGS[session.etapa_atual];
        const cpaLink = config.temCPA ? getRandomCpaLink() : null;
        
        let timerRestante = config.timer;
        if (session.timer_iniciado_em) {
            const decorrido = Math.floor((Date.now() - session.timer_iniciado_em) / 1000);
            timerRestante = Math.max(0, config.timer - decorrido);
            
            if (timerRestante <= 0) {
                timerRestante = 0;
                session.timer_iniciado_em = null;
                await redisClient.setEx(`dsess:${session.id}`, SESSION_EXPIRATION, JSON.stringify(session));
            }
        }
        
        let cpaJaAberto = false;
        if (session.etapa_atual === 1) cpaJaAberto = session.cpa_aberto_etapa1 || false;
        if (session.etapa_atual === 2) cpaJaAberto = session.cpa_aberto_etapa2 || false;
        if (session.etapa_atual === 3) cpaJaAberto = session.cpa_aberto_etapa3 || false;
        
        res.cookie('dsessId', session.id, {
            maxAge: SESSION_EXPIRATION * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        
        res.json({
            etapa: session.etapa_atual,
            totalSteps: TOTAL_STEPS,
            ...config,
            timer: timerRestante,
            cpaLink,
            cpaJaAberto: cpaJaAberto,
            urlOriginal,
            sessionId: session.id
        });
    } catch (error) {
        console.error('Erro step-config:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

app.post('/api/next-step', async (req, res) => {
    try {
        const { currentStep, cpaOpened, sessionId: bodySessionId, timerIniciadoEm } = req.body;
        
        let session = req.downloadSession;
        
        if (!session) {
            session = await recoverDownloadSession(req);
        }
        
        if (!session) {
            console.log('❌ Next-step: Sem sessão');
            return res.status(403).json({ error: 'Sessão inválida' });
        }
        
        const clientStep = parseInt(currentStep);
        
        if (session.etapa_atual !== clientStep) {
            console.log(`⚠️ Etapa incorreta: esperado ${session.etapa_atual}, recebido ${clientStep}`);
            return res.status(400).json({ error: 'Sequência inválida' });
        }
        
        if (timerIniciadoEm && !session.timer_iniciado_em) {
            session.timer_iniciado_em = timerIniciadoEm;
        }
        
        if (cpaOpened) {
            if (session.etapa_atual === 1) session.cpa_aberto_etapa1 = true;
            if (session.etapa_atual === 2) session.cpa_aberto_etapa2 = true;
            if (session.etapa_atual === 3) session.cpa_aberto_etapa3 = true;
        }
        
        let urlOriginal;
        
        const redisItem = await redisClient.hGetAll(`item:${session.itemId}`);
        if (redisItem && Object.keys(redisItem).length > 0) {
            urlOriginal = redisItem.url_original;
        } else {
            const oldLink = linksData.find(l => l.alias === session.itemId);
            if (oldLink) {
                urlOriginal = oldLink.original_url;
            } else {
                return res.status(404).json({ error: 'Item não encontrado' });
            }
        }
        
        if (clientStep >= TOTAL_STEPS) {
            const today = new Date().toISOString().split('T')[0];
            
            if (redisItem && Object.keys(redisItem).length > 0) {
                await redisClient.hIncrBy(`item:${session.itemId}`, 'downloads', 1);
                await redisClient.hIncrBy(`stats:daily:${today}`, 'downloads_total', 1);
            }
            
            console.log(`✅ Download finalizado: ${urlOriginal}`);
            
            res.cookie('dsessId', session.id, {
                maxAge: SESSION_EXPIRATION * 1000,
                httpOnly: true,
                secure: false,
                sameSite: 'lax',
                path: '/'
            });
            
            return res.json({ redirect: urlOriginal, final: true, sessionId: session.id });
        }
        
        const novaEtapa = clientStep + 1;
        session.etapa_atual = novaEtapa;
        session.timer_iniciado_em = null;
        
        await redisClient.setEx(`dsess:${session.id}`, SESSION_EXPIRATION, JSON.stringify(session));
        
        res.cookie('dsessId', session.id, {
            maxAge: SESSION_EXPIRATION * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'lax',
            path: '/'
        });
        
        console.log(`✅ Avançando: etapa ${clientStep} → ${novaEtapa}`);
        res.json({ 
            redirect: `/page${novaEtapa}?sid=${session.id}`, 
            final: false,
            sessionId: session.id
        });
        
    } catch (error) {
        console.error('Erro next-step:', error);
        res.status(500).json({ error: 'Erro interno' });
    }
});

// =================================================================
// ROTA DE SENHA (USAR COMO URL FINAL NO PAINEL ADMIN)
// =================================================================
app.get('/generate-password/:itemId', passwordLimiter, async (req, res) => {
    try {
        console.log('🔑 Gerando senha para item:', req.params.itemId);
        
        const itemId = req.params.itemId;
        
        // 1. VERIFICAR SE O ITEM EXISTE
        const redisItem = await redisClient.hGetAll(`item:${itemId}`);
        const oldLink = linksData.find(l => l.alias === itemId);
        
        console.log('📦 Item encontrado no Redis?', Object.keys(redisItem).length > 0);
        console.log('📦 Item encontrado no linksData?', !!oldLink);
        
        if ((!redisItem || Object.keys(redisItem).length === 0) && !oldLink) {
            console.log('❌ Item não encontrado:', itemId);
            return res.status(404).send(`
                <!DOCTYPE html>
                <html><head><meta charset="UTF-8"><title>Item não encontrado</title>
                <style>body{font-family:Arial;background:#0F1C2E;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;}.card{background:#1A2D42;padding:40px;border-radius:20px;max-width:400px;}.error{color:#E50914;font-size:48px;}h2{color:#E50914;}p{color:#B0BEC5;}.btn{display:inline-block;padding:12px 30px;background:#E50914;color:#fff;border-radius:30px;text-decoration:none;margin-top:20px;}</style>
                </head><body>
                    <div class="card"><div class="error">❌</div><h2>Item não encontrado</h2><p>Este conteúdo não está disponível.</p><a href="/" class="btn">Voltar</a></div>
                </body></html>
            `);
        }
        
        // 2. VERIFICAR SESSÃO DO USUÁRIO
        let session = req.downloadSession;
        if (!session) {
            session = await recoverDownloadSession(req);
        }
        
        console.log('🆔 Sessão encontrada?', !!session);
        if (session) {
            console.log('📊 Etapa atual:', session.etapa_atual);
            console.log('📊 Total de etapas:', TOTAL_STEPS);
        }
        
        if (!session) {
            console.log('❌ Tentativa de acesso sem sessão:', itemId);
            return res.status(403).send(`
                <!DOCTYPE html>
                <html><head><meta charset="UTF-8"><title>Acesso Negado</title>
                <style>body{font-family:Arial;background:#0F1C2E;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;}.card{background:#1A2D42;padding:40px;border-radius:20px;max-width:400px;}.error{color:#E50914;font-size:48px;}h2{color:#E50914;}p{color:#B0BEC5;}.btn{display:inline-block;padding:12px 30px;background:#E50914;color:#fff;border-radius:30px;text-decoration:none;margin-top:20px;}</style>
                </head><body>
                    <div class="card"><div class="error">🔒</div><h2>Acesso Negado</h2><p>Você precisa acessar este conteúdo através do sistema.</p><a href="/" class="btn">Voltar ao Início</a></div>
                </body></html>
            `);
        }
        
        // 3. VERIFICAR SE COMPLETOU AS ETAPAS
        if (session.etapa_atual < TOTAL_STEPS) {
            console.log(`⚠️ Etapas incompletas: ${session.etapa_atual}/${TOTAL_STEPS} - Item: ${itemId}`);
            return res.redirect(`/page${session.etapa_atual}?sid=${session.id}`);
        }
        
        // 4. VERIFICAR FINGERPRINT
        const fingerprint = getClientFingerprint(req);
        if (session.fingerprint !== fingerprint) {
            console.log(`⚠️ Fingerprint inválido: ${itemId}`);
            return res.status(403).send(`
                <!DOCTYPE html>
                <html><head><meta charset="UTF-8"><title>Dispositivo Não Autorizado</title>
                <style>body{font-family:Arial;background:#0F1C2E;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;}.card{background:#1A2D42;padding:40px;border-radius:20px;max-width:400px;}.error{color:#FF9800;font-size:48px;}h2{color:#FF9800;}p{color:#B0BEC5;}.btn{display:inline-block;padding:12px 30px;background:#FF9800;color:#fff;border-radius:30px;text-decoration:none;margin-top:20px;}</style>
                </head><body>
                    <div class="card"><div class="error">⚠️</div><h2>Dispositivo Não Autorizado</h2><p>Esta sessão está vinculada a outro dispositivo.</p><a href="/" class="btn">Voltar ao Início</a></div>
                </body></html>
            `);
        }
        
        // 5. BUSCAR INFORMAÇÕES DO ITEM
        let titulo = 'Conteúdo';
        let descricao = '';
        if (redisItem && Object.keys(redisItem).length > 0) {
            titulo = redisItem.titulo || 'Conteúdo';
            descricao = redisItem.descricao || '';
            console.log('📝 Título do item:', titulo);
        } else if (oldLink) {
            titulo = oldLink.titulo || 'Conteúdo';
            console.log('📝 Título do item (oldLink):', titulo);
        }
        
        // 6. GERAR SENHA (48h - 2 DIAS)
        console.log('🔐 Iniciando geração da senha...');
        const passwordData = generatePassword(48);
        
        if (!passwordData) {
            console.log('❌ Falha ao gerar senha - passwordData é null');
            return res.status(500).send('Erro ao gerar senha');
        }
        
        console.log('✅ Senha gerada com sucesso!');
        
        // 7. SALVAR NO REDIS
        const sessionData = {
            password: passwordData.password,
            itemId: itemId,
            expiryDate: passwordData.expiryDate.toISOString(),
            titulo: titulo,
            gerado_em: new Date().toISOString(),
            fingerprint: session.fingerprint,
            ip: req.ip || req.connection?.remoteAddress
        };
        
        await redisClient.setEx(
            `pass:${session.id}`, 
            48 * 60 * 60,
            JSON.stringify(sessionData)
        );
        
        console.log('💾 Senha salva no Redis');
        
        // 8. INCREMENTAR DOWNLOADS
        const today = new Date().toISOString().split('T')[0];
        if (redisItem && Object.keys(redisItem).length > 0) {
            await redisClient.hIncrBy(`item:${itemId}`, 'downloads', 1);
            await redisClient.hIncrBy(`stats:daily:${today}`, 'downloads_total', 1);
        }
        
        console.log(`✅ Senha gerada: ${itemId} - Sessão: ${session.id.substring(0, 8)}`);
        
        // 9. CALCULAR HORAS RESTANTES
        const horasRestantes = Math.floor((passwordData.expiryDate - new Date()) / (1000 * 60 * 60));
        
        // 10. RENDERIZAR PÁGINA
        res.send(`
            <!DOCTYPE html>
            <html lang="pt">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${titulo} - Acesso Liberado</title>
                <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
                <style>
                    * { margin: 0; padding: 0; box-sizing: border-box; }
                    body {
                        font-family: 'Segoe UI', sans-serif;
                        background: linear-gradient(135deg, #0F1C2E 0%, #1A2D42 100%);
                        min-height: 100vh;
                        display: flex;
                        justify-content: center;
                        align-items: center;
                        padding: 20px;
                    }
                    .container { max-width: 520px; width: 100%; }
                    .card {
                        background: #1A2D42;
                        border-radius: 32px;
                        padding: 35px 28px;
                        box-shadow: 0 25px 45px rgba(0,0,0,0.4);
                        border: 1px solid rgba(100,181,246,0.2);
                    }
                    .header {
                        text-align: center;
                        margin-bottom: 25px;
                    }
                    .header .icon {
                        font-size: 48px;
                        display: block;
                        margin-bottom: 8px;
                    }
                    .header h1 {
                        color: #4CAF50;
                        font-size: 22px;
                    }
                    .header p {
                        color: #64B5F6;
                        font-size: 14px;
                        margin-top: 5px;
                    }
                    .password-box {
                        background: #0F1C2E;
                        border-radius: 16px;
                        padding: 18px;
                        margin: 20px 0;
                        border: 2px solid #4CAF50;
                    }
                    .password-box .label {
                        color: #78909C;
                        font-size: 11px;
                        display: block;
                        margin-bottom: 10px;
                        text-align: center;
                        letter-spacing: 1px;
                    }
                    .password-box .password {
                        font-family: 'Courier New', monospace;
                        font-size: 13px;
                        color: #4CAF50;
                        line-height: 1.8;
                        text-align: center;
                        word-break: break-all;
                        user-select: all;
                    }
                    .info-grid {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 10px;
                        margin: 20px 0;
                    }
                    .info-item {
                        background: rgba(100,181,246,0.05);
                        border-radius: 12px;
                        padding: 12px;
                        text-align: center;
                    }
                    .info-item .label {
                        color: #78909C;
                        font-size: 10px;
                        text-transform: uppercase;
                        letter-spacing: 0.5px;
                    }
                    .info-item .value {
                        color: #B0BEC5;
                        font-size: 13px;
                        font-weight: bold;
                        margin-top: 4px;
                    }
                    .info-item .value.success { color: #4CAF50; }
                    .info-item .value.warning { color: #FF9800; }
                    .btn {
                        display: inline-block;
                        padding: 14px 30px;
                        border: none;
                        border-radius: 40px;
                        color: white;
                        font-weight: bold;
                        cursor: pointer;
                        font-size: 15px;
                        transition: all 0.2s;
                        text-decoration: none;
                        width: 100%;
                        text-align: center;
                        margin-top: 10px;
                    }
                    .btn-copy {
                        background: #2E7D32;
                    }
                    .btn-copy:hover {
                        background: #388E3C;
                        transform: translateY(-2px);
                    }
                    .btn-buy {
                        background: linear-gradient(135deg, #F57C00, #E65100);
                        position: relative;
                        overflow: hidden;
                    }
                    .btn-buy:hover {
                        transform: translateY(-2px);
                        box-shadow: 0 5px 20px rgba(245,124,0,0.4);
                    }
                    .btn-buy .price-tag {
                        display: inline-block;
                        background: rgba(255,255,255,0.2);
                        padding: 2px 12px;
                        border-radius: 20px;
                        margin-left: 8px;
                        font-size: 13px;
                    }
                    .btn-secondary {
                        background: #2A3D5F;
                    }
                    .btn-secondary:hover {
                        background: #3A5D7F;
                        transform: translateY(-2px);
                    }
                    .toast {
                        position: fixed;
                        bottom: 30px;
                        left: 50%;
                        transform: translateX(-50%);
                        background: #4CAF50;
                        color: white;
                        padding: 12px 24px;
                        border-radius: 30px;
                        animation: fade 2.5s ease;
                        z-index: 1000;
                        font-weight: bold;
                        box-shadow: 0 10px 30px rgba(0,0,0,0.5);
                    }
                    @keyframes fade {
                        0% { opacity: 0; transform: translateX(-50%) translateY(20px); }
                        15% { opacity: 1; transform: translateX(-50%) translateY(0); }
                        85% { opacity: 1; }
                        100% { opacity: 0; transform: translateX(-50%) translateY(-20px); }
                    }
                    .tips {
                        background: rgba(255,152,0,0.05);
                        border-radius: 12px;
                        padding: 15px;
                        margin-top: 20px;
                        border-left: 3px solid #FF9800;
                    }
                    .tips h3 {
                        color: #FFB74D;
                        font-size: 13px;
                        margin-bottom: 8px;
                    }
                    .tips ul {
                        list-style: none;
                        padding: 0;
                    }
                    .tips ul li {
                        color: #B0BEC5;
                        font-size: 12px;
                        padding: 4px 0;
                        padding-left: 20px;
                        position: relative;
                    }
                    .tips ul li::before {
                        content: "•";
                        position: absolute;
                        left: 0;
                        color: #FF9800;
                    }
                    .expiry {
                        text-align: center;
                        margin-top: 15px;
                        padding: 10px;
                        background: rgba(255,152,0,0.05);
                        border-radius: 12px;
                    }
                    .expiry span {
                        color: #FFB74D;
                        font-size: 13px;
                    }
                    .button-group {
                        display: flex;
                        gap: 10px;
                        margin-top: 15px;
                    }
                    .button-group .btn {
                        flex: 1;
                        margin-top: 0;
                    }
                    .divider {
                        display: flex;
                        align-items: center;
                        margin: 20px 0;
                        color: #546E7A;
                        font-size: 12px;
                    }
                    .divider::before, .divider::after {
                        content: "";
                        flex: 1;
                        border-bottom: 1px solid rgba(255,255,255,0.1);
                    }
                    .divider::before { margin-right: 15px; }
                    .divider::after { margin-left: 15px; }
                    @media (max-width: 480px) {
                        .info-grid { grid-template-columns: 1fr; }
                        .button-group { flex-direction: column; }
                        .button-group .btn { margin-top: 10px; }
                    }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="card">
                        <div class="header">
                            <span class="icon">✅</span>
                            <h1>${titulo}</h1>
                            <p>Sua chave de acesso foi gerada com sucesso!</p>
                        </div>
                        
                        <div class="password-box">
                            <span class="label">🔑 SENHA DE ACESSO (48h de validade)</span>
                            <div class="password" id="passwordText">${passwordData.password}</div>
                        </div>
                        
                        <div class="info-grid">
                            <div class="info-item">
                                <div class="label">⏱️ Expira em</div>
                                <div class="value">${passwordData.expiryDate.toLocaleString('pt-BR')}</div>
                            </div>
                            <div class="info-item">
                                <div class="label">⏳ Restam</div>
                                <div class="value success">${horasRestantes} horas</div>
                            </div>
                            <div class="info-item">
                                <div class="label">🔒 Criptografia</div>
                                <div class="value success">AES-256-CBC</div>
                            </div>
                            <div class="info-item">
                                <div class="label">📱 Item</div>
                                <div class="value">${itemId.substring(0, 12)}...</div>
                            </div>
                        </div>
                        
                        <button class="btn btn-copy" onclick="copyPassword()">
                            <i class="fas fa-copy"></i> COPIAR SENHA
                        </button>
                        
                        <div class="button-group">
                            <button class="btn btn-secondary" onclick="window.location.href='/'">
                                <i class="fas fa-home"></i> Voltar
                            </button>
                        </div>
                        
                        <div class="divider">🔹 EXTENDAR VALIDADE 🔹</div>
                        
                        <button class="btn btn-buy" onclick="buy30Days()">
                            <i class="fas fa-gem"></i> COMPRAR 30 DIAS 
                            <span class="price-tag">50 MT</span>
                        </button>
                        <p style="color:#78909C;font-size:11px;text-align:center;margin-top:8px;">
                            <i class="fas fa-credit-card"></i> Pagamento via M-Pesa / E-Mola
                        </p>
                        
                        <div class="tips">
                            <h3>💡 Como usar sua senha</h3>
                            <ul>
                                <li>Copie a senha acima e guarde em local seguro</li>
                                <li>Use a senha no sistema de verificação para acessar o conteúdo</li>
                                <li>A senha é <strong>válida por 48 horas</strong> em qualquer dispositivo</li>
                                <li>Não compartilhe esta senha com outras pessoas</li>
                                <li>Para mais tempo, clique em "Comprar 30 Dias"</li>
                            </ul>
                        </div>
                        
                        <div class="expiry">
                            <span>⏰ Expira em ${passwordData.expiryDate.toLocaleString('pt-BR')}</span>
                        </div>
                    </div>
                </div>
                
                <script>
                    function copyPassword() {
                        const password = document.getElementById('passwordText').innerText;
                        navigator.clipboard.writeText(password).then(function() {
                            showToast('✅ Senha copiada com sucesso!');
                        }).catch(function() {
                            const textarea = document.createElement('textarea');
                            textarea.value = password;
                            document.body.appendChild(textarea);
                            textarea.select();
                            document.execCommand('copy');
                            document.body.removeChild(textarea);
                            showToast('✅ Senha copiada com sucesso!');
                        });
                    }
                    
                    function buy30Days() {
                        const paymentLink = 'https://api.whatsapp.com/send?phone=258840000000&text=Olá! Quero comprar 30 dias de acesso por 50 MT. Meu item é: ${itemId}';
                        window.open('${paymentLink}', '_blank');
                        showToast('📱 Redirecionando para pagamento...');
                    }
                    
                    function showToast(msg) {
                        const existingToast = document.querySelector('.toast');
                        if (existingToast) existingToast.remove();
                        
                        const toast = document.createElement('div');
                        toast.className = 'toast';
                        toast.textContent = msg;
                        document.body.appendChild(toast);
                        setTimeout(function() { toast.remove(); }, 2500);
                    }
                </script>
            </body>
            </html>
        `);
        
    } catch (error) {
        console.error('❌ Erro ao gerar senha:', error);
        console.error('❌ Stack:', error.stack);
        res.status(500).send(`
            <!DOCTYPE html>
            <html><head><meta charset="UTF-8"><title>Erro</title>
            <style>body{font-family:Arial;background:#0F1C2E;color:#fff;display:flex;justify-content:center;align-items:center;height:100vh;text-align:center;}.card{background:#1A2D42;padding:40px;border-radius:20px;max-width:400px;}.error{color:#E50914;font-size:48px;}h2{color:#E50914;}p{color:#B0BEC5;}</style>
            </head><body>
                <div class="card"><div class="error">❌</div><h2>Erro Interno</h2><p>Não foi possível gerar sua senha. Tente novamente.</p><a href="/" style="display:inline-block;padding:12px 30px;background:#E50914;color:#fff;border-radius:30px;text-decoration:none;margin-top:20px;">Voltar</a></div>
            </body></html>
        `);
    }
});

// =================================================================
// API ADMIN
// =================================================================

app.post('/admin/api/login', adminLimiter, async (req, res) => {
    try {
        const { password } = req.body;
        const adminData = await redisClient.hGetAll('admin:config');
        const isValid = await bcrypt.compare(password, adminData.password);
        
        if (isValid) {
            req.session.isAdmin = true;
            await req.session.save();
            res.json({ success: true });
        } else {
            res.status(401).json({ error: 'Senha incorreta' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Erro no servidor' });
    }
});

app.post('/admin/api/logout', requireAdmin, (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

app.get('/admin/api/stats', requireAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        const totalItems = await redisClient.zCard('itens:ativos');
        const items = await redisClient.zRange('itens:ativos', 0, -1);
        
        let totalViews = 0, totalDownloads = 0;
        for (const id of items) {
            const item = await redisClient.hGetAll(`item:${id}`);
            totalViews += parseInt(item.visualizacoes) || 0;
            totalDownloads += parseInt(item.downloads) || 0;
        }
        
        const todayStats = await redisClient.hGetAll(`stats:daily:${today}`);
        const yesterdayStats = await redisClient.hGetAll(`stats:daily:${yesterday}`);
        
        const last7Days = [];
        for (let i = 6; i >= 0; i--) {
            const date = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];
            const stats = await redisClient.hGetAll(`stats:daily:${date}`);
            last7Days.push({
                date,
                views: parseInt(stats.visualizacoes_total) || 0,
                downloads: parseInt(stats.downloads_total) || 0
            });
        }
        
        res.json({
            totalItems,
            totalViews,
            totalDownloads,
            conversionRate: totalViews > 0 ? ((totalDownloads / totalViews) * 100).toFixed(1) : 0,
            today: {
                views: parseInt(todayStats.visualizacoes_total) || 0,
                downloads: parseInt(todayStats.downloads_total) || 0
            },
            yesterday: {
                views: parseInt(yesterdayStats.visualizacoes_total) || 0,
                downloads: parseInt(yesterdayStats.downloads_total) || 0
            },
            last7Days
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

app.get('/admin/api/items', requireAdmin, async (req, res) => {
    try {
        const itemIds = await redisClient.zRange('itens:ativos', 0, -1, { REV: true });
        const items = [];
        
        for (const id of itemIds) {
            const item = await redisClient.hGetAll(`item:${id}`);
            items.push({
                id,
                ...item,
                visualizacoes: parseInt(item.visualizacoes) || 0,
                downloads: parseInt(item.downloads) || 0
            });
        }
        
        res.json({ items });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar itens' });
    }
});

app.post('/admin/api/item', requireAdmin, async (req, res) => {
    try {
        const { id, titulo, descricao, imagem, url_original, categoria, expira_em, ativo } = req.body;
        
        const itemId = id || crypto.randomBytes(8).toString('hex');
        const criadoEm = id ? (await redisClient.hGet(`item:${itemId}`, 'criado_em')) || new Date().toISOString() : new Date().toISOString();
        
        const itemData = {
            titulo,
            descricao: descricao || '',
            imagem: imagem || '',
            url_original,
            categoria: categoria || 'outros',
            criado_em: criadoEm,
            expira_em: expira_em || '',
            ativo: ativo === 'true' ? 'true' : 'false',
            visualizacoes: id ? (await redisClient.hGet(`item:${itemId}`, 'visualizacoes')) || '0' : '0',
            downloads: id ? (await redisClient.hGet(`item:${itemId}`, 'downloads')) || '0' : '0'
        };
        
        await redisClient.hSet(`item:${itemId}`, itemData);
        
        if (ativo === 'true') {
            await redisClient.zAdd('itens:ativos', { score: Date.now(), value: itemId });
            await redisClient.sAdd(`categoria:${categoria || 'outros'}`, itemId);
        } else {
            await redisClient.zRem('itens:ativos', itemId);
        }
        
        if (expira_em) {
            const expireTimestamp = new Date(expira_em).getTime();
            await redisClient.expireAt(`item:${itemId}`, Math.floor(expireTimestamp / 1000));
        }
        
        res.json({ success: true, id: itemId });
    } catch (error) {
        console.error('Erro ao salvar item:', error);
        res.status(500).json({ error: 'Erro ao salvar item' });
    }
});

app.delete('/admin/api/item/:id', requireAdmin, async (req, res) => {
    try {
        const itemId = req.params.id;
        const item = await redisClient.hGetAll(`item:${itemId}`);
        
        await redisClient.del(`item:${itemId}`);
        await redisClient.zRem('itens:ativos', itemId);
        if (item.categoria) {
            await redisClient.sRem(`categoria:${item.categoria}`, itemId);
        }
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar item' });
    }
});

app.post('/admin/api/change-password', requireAdmin, async (req, res) => {
    try {
        const { currentPassword, newPassword } = req.body;
        const adminData = await redisClient.hGetAll('admin:config');
        const isValid = await bcrypt.compare(currentPassword, adminData.password);
        
        if (!isValid) {
            return res.status(401).json({ error: 'Senha atual incorreta' });
        }
        
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await redisClient.hSet('admin:config', 'password', hashedPassword);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao alterar senha' });
    }
});

// =================================================================
// ROTA CORINGA PARA LINKS ANTIGOS (DEVE SER A ÚLTIMA)
// =================================================================
app.get('/:alias', async (req, res) => {
    const alias = req.params.alias;
    
    const reservedRoutes = ['page1', 'page2', 'page3', 'admin', 'admin-login', 'admin-panel', 'item', 'api', 'css', 'js', 'favicon.ico', 'generate-password'];
    if (reservedRoutes.includes(alias) || alias.includes('.')) {
        return res.status(404).send('Not found');
    }
    
    const link = linksData.find(l => l.alias === alias);
    
    if (!link) {
        console.log(`❌ Alias não encontrado: ${alias}`);
        return res.redirect('/');
    }
    
    console.log(`🔗 Link antigo acessado: ${alias}`);
    
    const session = await createDownloadSession(alias, req);
    
    res.cookie('dsessId', session.id, {
        maxAge: SESSION_EXPIRATION * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax',
        path: '/'
    });
    
    res.redirect(`/page1?sid=${session.id}`);
});

// =================================================================
// INICIAR SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`
    🚀 MR DOSO HUB RODANDO NA PORTA ${PORT}
    
    ✅ REDIS: ${redisConnected ? 'CONECTADO' : 'FALHA'}
    ✅ LINKS ANTIGOS: ${linksData.length} carregados
    ✅ SESSÃO VIA FINGERPRINT (À PROVA DE CPA)
    ✅ TIMER PERSISTENTE (NÃO REINICIA APÓS CPA)
    ✅ SENHA DE 48H COM BOTÃO DE COMPRA
    `);
});

module.exports = app;
