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

// =================================================================
// CONFIGURAÇÕES DO SISTEMA
// =================================================================
const SESSION_EXPIRATION = 72 * 60 * 60; // 72 horas
const TOTAL_STEPS = 3;

const CPA_LINKS = [
    'https://omg10.com/4/10420694',
    'https://t.mbjms.com/411401/3785/0?bo=2753,2754,2755,2756&target=videouploads&po=6456&aff_sub5=SF_006OG000004lmDN',
    'https://app.sscashout.online/?pid=5905&bid=1712',
    'https://t.ajrkmx1.com/411401/6224/27794?bo=2779,2778,2777,2776,2775&po=6533&aff_sub5=SF_006OG000004lmDN',
    'https://t.amyfc.link/411401/779/0?bo=2779,2778,2777,2776,2775&po=6533&aff_sub5=SF_006OG000004lmDN',
    'https://t.ajrkmx1.com/411401/6224/0?bo=2779,2778,2777,2776,2775&po=6533&aff_sub5=SF_006OG000004lmDN',
    'https://eminentpercentvandalism.com/ub1ha7zr?key=d8d02483a91be089cb0ea712c656ca8a'
];

const STEP_CONFIGS = {
    1: { titulo: 'Verificação Inicial', subtitulo: 'Preparando seu link seguro...', timer: 20, temAdsterra: true, temCPA: true, icone: 'fa-shield-alt', botaoTexto: 'Continuar' },
    2: { titulo: 'Confirmação de Acesso', subtitulo: 'Confirme que você não é um robô', timer: 20, temAdsterra: false, temCPA: false, icone: 'fa-user-check', botaoTexto: 'Verificar Acesso' },
    3: { titulo: 'Link Pronto!', subtitulo: 'Seu conteúdo está disponível', timer: 25, temAdsterra: true, temCPA: true, icone: 'fa-check-circle', botaoTexto: 'Acessar Conteúdo' }
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

// Fingerprint ROBUSTO - não muda com CPA
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
        cpa_aberto_etapa2: false
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
        // Renovar TTL
        await redisClient.expire(`dsess:${sessionId}`, SESSION_EXPIRATION);
        return session;
    } catch (e) {
        return null;
    }
}

// Recuperar sessão - FINGERPRINT COMO FONTE PRINCIPAL
async function recoverDownloadSession(req) {
    const fingerprint = getClientFingerprint(req);
    
    // 1. Tentar via fingerprint (MAIS CONFIÁVEL - SOBREVIVE A TUDO)
    let sessionId = await redisClient.get(`fp:${fingerprint}`);
    
    // 2. Se não achou, tentar cookie
    if (!sessionId) {
        sessionId = req.cookies?.dsessId;
    }
    
    // 3. Tentar header
    if (!sessionId) {
        sessionId = req.headers['x-session-id'];
    }
    
    // 4. Tentar query param
    if (!sessionId && req.query.sid) {
        sessionId = req.query.sid;
    }
    
    // 5. Tentar body
    if (!sessionId && req.body?.sessionId) {
        sessionId = req.body.sessionId;
    }
    
    if (!sessionId) return null;
    
    const session = await getDownloadSession(sessionId);
    
    // Se achou sessão, atualizar fingerprint e renovar TTL
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
    '/page1', '/page2', '/page3'
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
    
    // Se ainda não tem sessão, tentar recuperar via fingerprint
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
        
        // Se não tem sessão, tentar recuperar via fingerprint
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
        
        // Reenviar cookie
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
            cpaLink,
            cpaJaAberto: session.cpa_aberto_etapa2 || false,
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
        const { currentStep, cpaOpened, sessionId: bodySessionId } = req.body;
        
        let session = req.downloadSession;
        
        // Se não tem sessão, tentar recuperar via fingerprint
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
        
        if (clientStep === 2 && cpaOpened) {
            session.cpa_aberto_etapa2 = true;
        }
        
        await redisClient.setEx(`dsess:${session.id}`, SESSION_EXPIRATION, JSON.stringify(session));
        
        // Reenviar cookie - ESSENCIAL
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
    
    const reservedRoutes = ['page1', 'page2', 'page3', 'admin', 'admin-login', 'admin-panel', 'item', 'api', 'css', 'js', 'favicon.ico'];
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
// Adicione isso temporariamente no index.js, antes do app.listen()
setInterval(async () => {
    if (!redisConnected) {
        console.log('🔄 Tentando reconectar Redis...');
        await connectRedis();
    }
}, 5000);

// =================================================================
// INICIAR SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`
    🚀 MR DOSO HUB RODANDO NA PORTA ${PORT}
    
    ✅ REDIS: ${redisConnected ? 'CONECTADO' : 'FALHA'}
    ✅ LINKS ANTIGOS: ${linksData.length} carregados
    ✅ SESSÃO VIA FINGERPRINT (À PROVA DE CPA)
    `);
});

module.exports = app;