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
// CONFIGURAÇÕES
// =================================================================
const CONFIG = {
    REDIS_URL: 'redis://default:JyefUsxHJljfdvs8HACumEyLE7XNgLvG@redis-19242.c266.us-east-1-3.ec2.cloud.redislabs.com:19242',
    ADMIN_PASSWORD: 'MrDoso2026@Admin',
    SESSION_SECRET: 'mr-doso-secret-key-2026'
};

// =================================================================
// REDIS CLIENT
// =================================================================
const redisClient = redis.createClient({
    url: CONFIG.REDIS_URL,
    socket: {
        reconnectStrategy: (retries) => Math.min(retries * 100, 3000)
    }
});

redisClient.on('error', (err) => console.error('Redis Error:', err));
redisClient.on('connect', () => console.log('✅ Redis conectado'));

// Conectar ao Redis (com retry)
let redisConnected = false;
async function connectRedis() {
    try {
        await redisClient.connect();
        redisConnected = true;
        console.log('🚀 Redis pronto!');
        
        // Inicializar admin
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
    }
}
connectRedis();

// =================================================================
// MIDDLEWARES
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

// Sessão com Redis Store
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
app.use(rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições' }
}));

const adminLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 30,
    message: { error: 'Muitas tentativas' }
});

// =================================================================
// CONFIGURAÇÕES DO SISTEMA
// =================================================================
const SESSION_EXPIRATION = 24 * 60 * 60;
const TOTAL_STEPS = 3;

const CPA_LINKS = [
    'https://omg10.com/4/10420694',
    'https://www.effectivegatecpm.com/ki4e3ftt5h?key=99415bf2c750643bbcc7c1380848fee9',
    'https://pertlouv.com/pZ0Ob1Vxs8U=?',
    'https://record.elephantbet.com/_rhoOOvBxBOAWqcfzuvZcQGNd7ZgqdRLk/1/',
    'https://media1.placard.co.mz/redirect.aspx?pid=5905&bid=1690',
    'https://affiliates.bantubet.co.mz/links/?btag=2307928',
    'https://bony-teaching.com/KUN7HR'
];

const STEP_CONFIGS = {
    1: { titulo: 'Verificação Inicial', subtitulo: 'Preparando seu link seguro...', timer: 20, temAdsterra: true, temCPA: false, icone: 'fa-shield-alt', botaoTexto: 'Continuar' },
    2: { titulo: 'Confirmação de Acesso', subtitulo: 'Confirme que você não é um robô', timer: 20, temAdsterra: false, temCPA: true, icone: 'fa-user-check', botaoTexto: 'Verificar Acesso' },
    3: { titulo: 'Link Pronto!', subtitulo: 'Seu conteúdo está disponível', timer: 20, temAdsterra: false, temCPA: true, icone: 'fa-check-circle', botaoTexto: 'Acessar Conteúdo' }
};

// =================================================================
// FUNÇÕES AUXILIARES
// =================================================================
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function getClientFingerprint(req) {
    const ip = req.ip || req.connection?.remoteAddress || '0.0.0.0';
    const userAgent = req.headers['user-agent'] || '';
    return crypto.createHash('sha256').update(ip + userAgent).digest('hex').substring(0, 16);
}

function getRandomCpaLink() {
    return CPA_LINKS[Math.floor(Math.random() * CPA_LINKS.length)];
}

// =================================================================
// FUNÇÕES DE SESSÃO DE DOWNLOAD (separada da sessão admin)
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
    
    return sessionData;
}

async function getDownloadSession(sessionId) {
    if (!sessionId) return null;
    try {
        const data = await redisClient.get(`dsess:${sessionId}`);
        if (!data) return null;
        const session = JSON.parse(data);
        session.ultima_acao = Date.now();
        await redisClient.setEx(`dsess:${sessionId}`, SESSION_EXPIRATION, JSON.stringify(session));
        return session;
    } catch (e) {
        return null;
    }
}

async function updateDownloadSession(sessionId, etapa, cpaAberto = null) {
    const session = await getDownloadSession(sessionId);
    if (!session) return null;
    session.etapa_atual = etapa;
    session.ultima_acao = Date.now();
    if (cpaAberto !== null) session.cpa_aberto_etapa2 = cpaAberto;
    await redisClient.setEx(`dsess:${sessionId}`, SESSION_EXPIRATION, JSON.stringify(session));
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

app.get('/page:step', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'steps.html'));
});

// =================================================================
// API PÚBLICA
// =================================================================

// Listar itens
app.get('/api/items', async (req, res) => {
    try {
        const categoria = req.query.categoria || 'todos';
        const page = parseInt(req.query.page) || 1;
        const limit = 12;
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
        res.status(500).json({ error: 'Erro ao buscar itens' });
    }
});

// Detalhes do item
app.get('/api/item/:id', async (req, res) => {
    try {
        const item = await redisClient.hGetAll(`item:${req.params.id}`);
        if (!item || item.ativo !== 'true') {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        // Incrementar visualização
        const today = new Date().toISOString().split('T')[0];
        await redisClient.hIncrBy(`item:${req.params.id}`, 'visualizacoes', 1);
        await redisClient.hIncrBy(`stats:daily:${today}`, 'visualizacoes_total', 1);
        
        res.json({
            id: req.params.id,
            ...item,
            downloads: parseInt(item.downloads) || 0,
            visualizacoes: parseInt(item.visualizacoes) || 0
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar item' });
    }
});

// Iniciar download
app.post('/api/start-download/:id', async (req, res) => {
    try {
        const itemId = req.params.id;
        const item = await redisClient.hGetAll(`item:${itemId}`);
        
        if (!item || item.ativo !== 'true') {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        const session = await createDownloadSession(itemId, req);
        
        res.cookie('dsessId', session.id, {
            maxAge: SESSION_EXPIRATION * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });
        
        res.json({ 
            success: true, 
            redirect: '/page1',
            sessionId: session.id
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao iniciar download' });
    }
});

// Configuração da etapa atual
app.get('/api/step-config', async (req, res) => {
    try {
        const sessionId = req.cookies?.dsessId || req.headers['x-session-id'];
        if (!sessionId) {
            return res.status(403).json({ error: 'Sessão inválida' });
        }
        
        const session = await getDownloadSession(sessionId);
        if (!session) {
            return res.status(403).json({ error: 'Sessão expirada' });
        }
        
        const config = STEP_CONFIGS[session.etapa_atual];
        const cpaLink = config.temCPA ? getRandomCpaLink() : null;
        
        res.json({
            etapa: session.etapa_atual,
            totalSteps: TOTAL_STEPS,
            ...config,
            cpaLink,
            cpaJaAberto: session.cpa_aberto_etapa2 || false
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar configuração' });
    }
});

// Próxima etapa
app.post('/api/next-step', async (req, res) => {
    try {
        const { currentStep, sessionId, cpaOpened } = req.body;
        
        if (!sessionId) {
            return res.status(403).json({ error: 'Sessão inválida' });
        }
        
        const session = await getDownloadSession(sessionId);
        if (!session) {
            return res.status(403).json({ error: 'Sessão expirada' });
        }
        
        const clientStep = parseInt(currentStep);
        
        if (session.etapa_atual !== clientStep) {
            return res.status(400).json({ error: 'Sequência inválida' });
        }
        
        const item = await redisClient.hGetAll(`item:${session.itemId}`);
        if (!item) {
            return res.status(404).json({ error: 'Item não encontrado' });
        }
        
        // Se for etapa final
        if (clientStep >= TOTAL_STEPS) {
            const today = new Date().toISOString().split('T')[0];
            await redisClient.hIncrBy(`item:${session.itemId}`, 'downloads', 1);
            await redisClient.hIncrBy(`stats:daily:${today}`, 'downloads_total', 1);
            
            return res.json({ 
                redirect: item.url_original, 
                final: true 
            });
        }
        
        const novaEtapa = clientStep + 1;
        
        if (clientStep === 2 && cpaOpened) {
            await updateDownloadSession(sessionId, novaEtapa, true);
        } else {
            await updateDownloadSession(sessionId, novaEtapa);
        }
        
        res.json({ 
            redirect: `/page${novaEtapa}`, 
            final: false 
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao processar' });
    }
});

// =================================================================
// API ADMIN
// =================================================================

// Login
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

// Logout
app.post('/admin/api/logout', requireAdmin, (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// Estatísticas
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

// Listar itens (admin)
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

// Criar/Editar item
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

// Deletar item
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

// Alterar senha
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
// INICIAR SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
});

// Exportar para Vercel
module.exports = app;