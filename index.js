const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const bcrypt = require('bcrypt');

const app = express();

// =================================================================
// CONFIGURAÇÕES DIRETAS (sem .env)
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
    url: CONFIG.REDIS_URL
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Conectado ao Redis Cloud!'));

(async () => {
    await redisClient.connect();
    console.log('🚀 Redis pronto para uso!');
    
    // Inicializar admin se não existir
    const adminExists = await redisClient.exists('admin:config');
    if (!adminExists) {
        const hashedPassword = await bcrypt.hash(CONFIG.ADMIN_PASSWORD, 10);
        await redisClient.hSet('admin:config', {
            password: hashedPassword,
            criado_em: new Date().toISOString()
        });
        console.log('✅ Admin inicializado');
    }
})();

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

// Sessão para o painel admin (APENAS UMA VEZ)
app.use(session({
    secret: CONFIG.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: false,
        httpOnly: true,
        maxAge: 3600000 // 1 hora
    }
}));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// Rate limit mais agressivo para o painel admin
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
    1: {
        titulo: 'Verificação Inicial',
        subtitulo: 'Preparando seu link seguro...',
        timer: 20,
        temAdsterra: true,
        temCPA: false,
        icone: 'fa-shield-alt',
        botaoTexto: 'Continuar'
    },
    2: {
        titulo: 'Confirmação de Acesso',
        subtitulo: 'Confirme que você não é um robô',
        timer: 20,
        temAdsterra: false,
        temCPA: true,
        icone: 'fa-user-check',
        botaoTexto: 'Verificar Acesso'
    },
    3: {
        titulo: 'Link Pronto!',
        subtitulo: 'Seu conteúdo está disponível',
        timer: 20,
        temAdsterra: false,
        temCPA: true,
        icone: 'fa-check-circle',
        botaoTexto: 'Acessar Conteúdo'
    }
};

// =================================================================
// FUNÇÕES AUXILIARES
// =================================================================
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function getClientFingerprint(req) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    return crypto.createHash('sha256').update(ip + userAgent).digest('hex').substring(0, 16);
}

function getRandomCpaLink() {
    return CPA_LINKS[Math.floor(Math.random() * CPA_LINKS.length)];
}

async function createSession(itemId, req) {
    const sessionId = generateSessionId();
    const fingerprint = getClientFingerprint(req);
    
    const sessionData = {
        id: sessionId,
        itemId: itemId,
        etapa_atual: 1,
        fingerprint: fingerprint,
        criado_em: Date.now(),
        ultima_acao: Date.now(),
        cpa_aberto_etapa2: false,
        ip: req.ip
    };
    
    await redisClient.setEx(`session:${sessionId}`, SESSION_EXPIRATION, JSON.stringify(sessionData));
    await redisClient.setEx(`fingerprint:${fingerprint}`, SESSION_EXPIRATION, sessionId);
    
    return sessionData;
}

async function getSession(sessionId) {
    if (!sessionId) return null;
    try {
        const data = await redisClient.get(`session:${sessionId}`);
        if (!data) return null;
        const session = JSON.parse(data);
        session.ultima_acao = Date.now();
        await redisClient.setEx(`session:${sessionId}`, SESSION_EXPIRATION, JSON.stringify(session));
        return session;
    } catch (e) {
        return null;
    }
}

async function updateSession(sessionId, etapa, cpaAberto = null) {
    const session = await getSession(sessionId);
    if (!session) return null;
    session.etapa_atual = etapa;
    session.ultima_acao = Date.now();
    if (cpaAberto !== null) {
        session.cpa_aberto_etapa2 = cpaAberto;
    }
    await redisClient.setEx(`session:${sessionId}`, SESSION_EXPIRATION, JSON.stringify(session));
    return session;
}

async function recoverSession(req) {
    const sessionId = req.cookies?.sessionId || req.headers['x-session-id'];
    if (sessionId) {
        const session = await getSession(sessionId);
        if (session) return session;
    }
    const fingerprint = getClientFingerprint(req);
    const recoveredId = await redisClient.get(`fingerprint:${fingerprint}`);
    if (recoveredId) {
        const session = await getSession(recoveredId);
        if (session) return session;
    }
    return null;
}

// =================================================================
// MIDDLEWARE DE AUTENTICAÇÃO ADMIN
// =================================================================
async function requireAdmin(req, res, next) {
    if (!req.session.isAdmin) {
        return res.redirect('/admin/login');
    }
    next();
}

// =================================================================
// MIDDLEWARE DE SESSÃO DE DOWNLOAD
// =================================================================
app.use(async (req, res, next) => {
    if (req.path.startsWith('/admin') || req.path === '/' || req.path.startsWith('/public') || req.path === '/favicon.ico') {
        return next();
    }
    
    const session = await recoverSession(req);
    req.session = session;
    
    if (session && !req.cookies?.sessionId) {
        res.cookie('sessionId', session.id, {
            maxAge: SESSION_EXPIRATION * 1000,
            httpOnly: true,
            secure: false,
            sameSite: 'lax'
        });
    }
    
    next();
});

// =================================================================
// ROTAS PÚBLICAS
// =================================================================

// Página inicial - Hub de Links
app.get('/', async (req, res) => {
    const theme = req.cookies.theme || 'dark';
    const html = await gerarHomePage(theme);
    res.send(html);
});

// API para buscar itens (para carregamento dinâmico)
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

// API para incrementar visualização
app.post('/api/item/:id/view', async (req, res) => {
    try {
        const itemId = req.params.id;
        const today = new Date().toISOString().split('T')[0];
        
        await redisClient.hIncrBy(`item:${itemId}`, 'visualizacoes', 1);
        await redisClient.zIncrBy('itens:populares', 1, itemId);
        await redisClient.hIncrBy(`stats:daily:${today}`, 'visualizacoes_total', 1);
        await redisClient.hIncrBy(`stats:item:${itemId}:daily:${today}`, 'visualizacoes', 1);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao registrar visualização' });
    }
});

// Página de detalhes do item
app.get('/item/:id', async (req, res) => {
    const itemId = req.params.id;
    const item = await redisClient.hGetAll(`item:${itemId}`);
    
    if (!item || item.ativo !== 'true') {
        return res.redirect('/');
    }
    
    const theme = req.cookies.theme || 'dark';
    const html = await gerarItemPage(itemId, item, theme);
    res.send(html);
});

// Iniciar download (redireciona para etapa 1)
app.get('/download/:id', async (req, res) => {
    const itemId = req.params.id;
    const item = await redisClient.hGetAll(`item:${itemId}`);
    
    if (!item || item.ativo !== 'true') {
        return res.redirect('/');
    }
    
    const session = await createSession(itemId, req);
    
    res.cookie('sessionId', session.id, {
        maxAge: SESSION_EXPIRATION * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });
    
    res.redirect('/page1');
});

// Páginas das etapas
app.get('/page:step', async (req, res) => {
    const step = parseInt(req.params.step);
    
    if (!req.session) {
        return res.redirect('/');
    }
    
    const session = req.session;
    
    if (step !== session.etapa_atual) {
        return res.redirect(`/page${session.etapa_atual}`);
    }
    
    if (step > TOTAL_STEPS) {
        return res.redirect('/');
    }
    
    const item = await redisClient.hGetAll(`item:${session.itemId}`);
    if (!item || item.ativo !== 'true') {
        return res.redirect('/');
    }
    
    const config = STEP_CONFIGS[step];
    const cpaLink = config.temCPA ? getRandomCpaLink() : null;
    const theme = req.cookies.theme || 'dark';
    
    res.send(await gerarPaginaEtapa(step, config, session.id, cpaLink, item.url_original, session.cpa_aberto_etapa2, theme));
});

// API para próximo passo
app.post('/api/next-step', async (req, res) => {
    const { currentStep, sessionId, cpaOpened } = req.body;
    
    if (!sessionId) {
        return res.status(403).json({ error: 'Sessão inválida', redirect: '/' });
    }
    
    const session = await getSession(sessionId);
    if (!session) {
        return res.status(403).json({ error: 'Sessão expirada', redirect: '/' });
    }
    
    const clientStep = parseInt(currentStep);
    
    if (session.etapa_atual !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }
    
    const item = await redisClient.hGetAll(`item:${session.itemId}`);
    if (!item) {
        return res.status(404).json({ error: 'Item não encontrado', redirect: '/' });
    }
    
    // Se for etapa final, registra download
    if (clientStep >= TOTAL_STEPS) {
        const today = new Date().toISOString().split('T')[0];
        
        await redisClient.hIncrBy(`item:${session.itemId}`, 'downloads', 1);
        await redisClient.hIncrBy(`stats:daily:${today}`, 'downloads_total', 1);
        await redisClient.hIncrBy(`stats:item:${session.itemId}:daily:${today}`, 'downloads', 1);
        
        return res.json({ redirect: item.url_original, final: true });
    }
    
    const novaEtapa = clientStep + 1;
    
    if (clientStep === 2 && cpaOpened) {
        await updateSession(sessionId, novaEtapa, true);
    } else {
        await updateSession(sessionId, novaEtapa);
    }
    
    return res.json({ redirect: `/page${novaEtapa}`, final: false });
});

// Alternar tema
app.get('/toggle-theme', (req, res) => {
    const currentTheme = req.cookies.theme || 'dark';
    const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
    res.cookie('theme', newTheme, { maxAge: 365 * 24 * 60 * 60 * 1000 });
    res.redirect(req.get('referer') || '/');
});

// =================================================================
// ROTAS DO PAINEL ADMIN
// =================================================================

// Página de login
app.get('/admin/login', (req, res) => {
    if (req.session.isAdmin) {
        return res.redirect('/admin');
    }
    const theme = req.cookies.theme || 'dark';
    res.send(gerarLoginPage(theme));
});

// API de login
app.post('/admin/api/login', adminLimiter, async (req, res) => {
    const { password } = req.body;
    
    const adminData = await redisClient.hGetAll('admin:config');
    const isValid = await bcrypt.compare(password, adminData.password);
    
    if (isValid) {
        req.session.isAdmin = true;
        res.json({ success: true });
    } else {
        res.status(401).json({ error: 'Senha incorreta' });
    }
});

// Logout
app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Painel principal
app.get('/admin', requireAdmin, async (req, res) => {
    const theme = req.cookies.theme || 'dark';
    const html = await gerarAdminPage(theme);
    res.send(html);
});

// API para dados do dashboard
app.get('/admin/api/stats', requireAdmin, async (req, res) => {
    try {
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        // Totais gerais
        const totalItems = await redisClient.zCard('itens:ativos');
        const items = await redisClient.zRange('itens:ativos', 0, -1);
        
        let totalViews = 0;
        let totalDownloads = 0;
        
        for (const id of items) {
            const item = await redisClient.hGetAll(`item:${id}`);
            totalViews += parseInt(item.visualizacoes) || 0;
            totalDownloads += parseInt(item.downloads) || 0;
        }
        
        // Stats de hoje
        const todayStats = await redisClient.hGetAll(`stats:daily:${today}`);
        const yesterdayStats = await redisClient.hGetAll(`stats:daily:${yesterday}`);
        
        // Últimos 7 dias
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
        
        // Itens populares
        const popularItems = await redisClient.zRangeWithScores('itens:populares', 0, 4, { REV: true });
        const topItems = [];
        
        for (const item of popularItems) {
            const data = await redisClient.hGetAll(`item:${item.value}`);
            topItems.push({
                id: item.value,
                titulo: data.titulo,
                views: parseInt(data.visualizacoes) || 0,
                downloads: parseInt(data.downloads) || 0,
                score: item.score
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
            last7Days,
            topItems
        });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao buscar estatísticas' });
    }
});

// API para listar itens (admin)
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

// API para criar/editar item
app.post('/admin/api/item', requireAdmin, async (req, res) => {
    try {
        const { id, titulo, descricao, imagem, url_original, categoria, expira_em, ativo } = req.body;
        
        const itemId = id || crypto.randomBytes(8).toString('hex');
        const criadoEm = id ? (await redisClient.hGet(`item:${itemId}`, 'criado_em')) || new Date().toISOString() : new Date().toISOString();
        
        const itemData = {
            titulo,
            descricao,
            imagem,
            url_original,
            categoria,
            criado_em: criadoEm,
            expira_em: expira_em || null,
            ativo: ativo === 'true' ? 'true' : 'false',
            visualizacoes: id ? (await redisClient.hGet(`item:${itemId}`, 'visualizacoes')) || '0' : '0',
            downloads: id ? (await redisClient.hGet(`item:${itemId}`, 'downloads')) || '0' : '0'
        };
        
        await redisClient.hSet(`item:${itemId}`, itemData);
        
        if (ativo === 'true') {
            await redisClient.zAdd('itens:ativos', { score: Date.now(), value: itemId });
            await redisClient.sAdd(`categoria:${categoria}`, itemId);
        } else {
            await redisClient.zRem('itens:ativos', itemId);
            await redisClient.sRem(`categoria:${categoria}`, itemId);
        }
        
        if (expira_em) {
            const expireTimestamp = new Date(expira_em).getTime();
            await redisClient.expireAt(`item:${itemId}`, Math.floor(expireTimestamp / 1000));
        }
        
        res.json({ success: true, id: itemId });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao salvar item' });
    }
});

// API para deletar item
app.delete('/admin/api/item/:id', requireAdmin, async (req, res) => {
    try {
        const itemId = req.params.id;
        const item = await redisClient.hGetAll(`item:${itemId}`);
        
        await redisClient.del(`item:${itemId}`);
        await redisClient.zRem('itens:ativos', itemId);
        await redisClient.zRem('itens:populares', itemId);
        await redisClient.sRem(`categoria:${item.categoria}`, itemId);
        
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: 'Erro ao deletar item' });
    }
});

// API para mudar senha
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
// FUNÇÕES GERADORAS DE HTML
// =================================================================

async function gerarHomePage(theme) {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1a1a2e' : '#f5f7fa';
    const textColor = isDark ? '#ffffff' : '#33334d';
    const cardBg = isDark ? '#16213e' : '#ffffff';
    const textLight = isDark ? '#a0a0a0' : '#6c757d';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Mr Doso - Hub de Links</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Quicksand', sans-serif;
            background: ${bgColor};
            color: ${textColor};
            min-height: 100vh;
            transition: all 0.3s ease;
        }
        
        .header {
            background: ${isDark ? '#0f3460' : '#6a5af9'};
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
            position: sticky;
            top: 0;
            z-index: 1000;
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .header-actions {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .search-bar {
            padding: 10px 15px;
            border-radius: 25px;
            border: none;
            background: rgba(255,255,255,0.1);
            color: white;
            font-family: 'Quicksand', sans-serif;
            width: 300px;
        }
        
        .search-bar::placeholder {
            color: rgba(255,255,255,0.7);
        }
        
        .theme-toggle {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 10px 15px;
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Quicksand', sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
            transition: all 0.3s;
        }
        
        .theme-toggle:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .categories {
            max-width: 1200px;
            margin: 20px auto;
            padding: 0 20px;
            display: flex;
            gap: 10px;
            flex-wrap: wrap;
        }
        
        .category-btn {
            padding: 8px 20px;
            border-radius: 25px;
            border: none;
            background: ${isDark ? '#16213e' : '#e0e0e0'};
            color: ${textColor};
            cursor: pointer;
            font-family: 'Quicksand', sans-serif;
            font-weight: 500;
            transition: all 0.3s;
        }
        
        .category-btn.active {
            background: linear-gradient(135deg, #6a5af9, #d66efd);
            color: white;
        }
        
        .category-btn:hover {
            transform: translateY(-2px);
        }
        
        .items-grid {
            max-width: 1200px;
            margin: 0 auto;
            padding: 20px;
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 25px;
        }
        
        .item-card {
            background: ${cardBg};
            border-radius: 15px;
            overflow: hidden;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            transition: all 0.3s;
            cursor: pointer;
        }
        
        .item-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 10px 30px rgba(106, 90, 249, 0.3);
        }
        
        .item-image {
            width: 100%;
            height: 200px;
            object-fit: cover;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        }
        
        .item-info {
            padding: 20px;
        }
        
        .item-title {
            font-size: 18px;
            font-weight: 600;
            margin-bottom: 10px;
            color: ${textColor};
        }
        
        .item-description {
            font-size: 14px;
            color: ${textLight};
            margin-bottom: 15px;
            line-height: 1.5;
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
        }
        
        .item-meta {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .item-category {
            padding: 4px 12px;
            background: ${isDark ? '#0f3460' : '#e8f5e9'};
            border-radius: 20px;
            font-size: 12px;
            color: ${isDark ? '#4ce0b3' : '#2ecc71'};
        }
        
        .item-downloads {
            display: flex;
            align-items: center;
            gap: 5px;
            color: ${textLight};
            font-size: 14px;
        }
        
        .download-btn {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #6a5af9, #d66efd);
            color: white;
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }
        
        .download-btn:hover {
            transform: scale(1.02);
            box-shadow: 0 5px 15px rgba(106, 90, 249, 0.4);
        }
        
        .loading {
            text-align: center;
            padding: 40px;
            color: ${textLight};
        }
        
        .empty-state {
            text-align: center;
            padding: 60px 20px;
            color: ${textLight};
        }
        
        .empty-state i {
            font-size: 48px;
            margin-bottom: 20px;
            opacity: 0.5;
        }
        
        footer {
            text-align: center;
            padding: 30px;
            color: ${textLight};
            margin-top: 40px;
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            .search-bar {
                width: 100%;
            }
            
            .items-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <a href="/" class="logo">
                <i class="fas fa-cloud-download-alt"></i>
                Mr Doso Hub
            </a>
            <div class="header-actions">
                <input type="text" class="search-bar" placeholder="🔍 Buscar links..." id="searchInput">
                <a href="/toggle-theme" class="theme-toggle">
                    <i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>
                    ${isDark ? 'Claro' : 'Escuro'}
                </a>
            </div>
        </div>
    </header>
    
    <div class="categories">
        <button class="category-btn active" data-category="todos">Todos</button>
        <button class="category-btn" data-category="filmes">🎬 Filmes</button>
        <button class="category-btn" data-category="series">📺 Séries</button>
        <button class="category-btn" data-category="jogos">🎮 Jogos</button>
        <button class="category-btn" data-category="cursos">📚 Cursos</button>
        <button class="category-btn" data-category="apps">📱 Apps</button>
    </div>
    
    <div class="items-grid" id="itemsGrid">
        <div class="loading">
            <i class="fas fa-spinner fa-spin"></i> Carregando...
        </div>
    </div>
    
    <footer>
        <p>© 2026 Mr Doso Web - Todos os direitos reservados</p>
    </footer>
    
    <!-- Monetag -->
    <script>
        (function() {
            if (!window.monetagLoaded) {
                window.monetagLoaded = true;
                const script = document.createElement('script');
                script.src = 'https://quge5.com/88/tag.min.js';
                script.setAttribute('data-zone', '203209');
                script.async = true;
                document.head.appendChild(script);
            }
        })();
    </script>
    
    <script>
        let currentCategory = 'todos';
        let currentPage = 1;
        let isLoading = false;
        let hasMore = true;
        
        const grid = document.getElementById('itemsGrid');
        const searchInput = document.getElementById('searchInput');
        
        // Carregar itens iniciais
        loadItems();
        
        // Event listeners para categorias
        document.querySelectorAll('.category-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.category-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentCategory = btn.dataset.category;
                currentPage = 1;
                grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
                loadItems();
            });
        });
        
        // Infinite scroll
        window.addEventListener('scroll', () => {
            if (window.innerHeight + window.scrollY >= document.body.offsetHeight - 500) {
                if (!isLoading && hasMore) {
                    loadItems();
                }
            }
        });
        
        // Busca
        let searchTimeout;
        searchInput.addEventListener('input', (e) => {
            clearTimeout(searchTimeout);
            searchTimeout = setTimeout(() => {
                currentPage = 1;
                grid.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Carregando...</div>';
                loadItems(e.target.value);
            }, 500);
        });
        
        async function loadItems(search = '') {
            if (isLoading) return;
            isLoading = true;
            
            try {
                const response = await fetch(\`/api/items?categoria=\${currentCategory}&page=\${currentPage}\`);
                const data = await response.json();
                
                if (currentPage === 1) {
                    grid.innerHTML = '';
                }
                
                let items = data.items;
                
                // Filtrar por busca
                if (search) {
                    items = items.filter(item => 
                        item.titulo.toLowerCase().includes(search.toLowerCase()) ||
                        item.descricao.toLowerCase().includes(search.toLowerCase())
                    );
                }
                
                if (items.length === 0 && currentPage === 1) {
                    grid.innerHTML = \`
                        <div class="empty-state">
                            <i class="fas fa-box-open"></i>
                            <h3>Nenhum item encontrado</h3>
                            <p>Tente outra categoria ou busca</p>
                        </div>
                    \`;
                    return;
                }
                
                items.forEach(item => {
                    const card = createItemCard(item);
                    grid.appendChild(card);
                });
                
                hasMore = data.hasMore;
                currentPage++;
            } catch (error) {
                console.error('Erro ao carregar itens:', error);
            } finally {
                isLoading = false;
            }
        }
        
        function createItemCard(item) {
            const div = document.createElement('div');
            div.className = 'item-card';
            div.onclick = () => window.location.href = \`/item/\${item.id}\`;
            
            div.innerHTML = \`
                <img src="\${item.imagem || 'https://via.placeholder.com/300x200/667eea/ffffff?text=' + encodeURIComponent(item.titulo)}" 
                     alt="\${item.titulo}" 
                     class="item-image"
                     onerror="this.src='https://via.placeholder.com/300x200/667eea/ffffff?text=' + encodeURIComponent('\${item.titulo}')">
                <div class="item-info">
                    <h3 class="item-title">\${item.titulo}</h3>
                    <p class="item-description">\${item.descricao || 'Clique para ver mais detalhes'}</p>
                    <div class="item-meta">
                        <span class="item-category">\${item.categoria || 'Geral'}</span>
                        <span class="item-downloads">
                            <i class="fas fa-download"></i>
                            \${formatNumber(item.downloads || 0)}
                        </span>
                    </div>
                    <button class="download-btn" onclick="event.stopPropagation(); window.location.href='/download/\${item.id}'">
                        <i class="fas fa-download"></i>
                        Baixar Agora
                    </button>
                </div>
            \`;
            
            return div;
        }
        
        function formatNumber(num) {
            if (num >= 1000) {
                return (num / 1000).toFixed(1) + 'k';
            }
            return num.toString();
        }
    </script>
</body>
</html>`;
}

async function gerarItemPage(itemId, item, theme) {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1a1a2e' : '#f5f7fa';
    const textColor = isDark ? '#ffffff' : '#33334d';
    const cardBg = isDark ? '#16213e' : '#ffffff';
    const textLight = isDark ? '#a0a0a0' : '#6c757d';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${item.titulo} - Mr Doso</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Quicksand', sans-serif;
            background: ${bgColor};
            color: ${textColor};
            min-height: 100vh;
        }
        
        .header {
            background: ${isDark ? '#0f3460' : '#6a5af9'};
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header-content {
            max-width: 1200px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: white;
            text-decoration: none;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .back-btn {
            background: rgba(255,255,255,0.2);
            border: none;
            color: white;
            padding: 10px 20px;
            border-radius: 25px;
            cursor: pointer;
            font-family: 'Quicksand', sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
        }
        
        .container {
            max-width: 1000px;
            margin: 40px auto;
            padding: 0 20px;
        }
        
        .item-detail {
            background: ${cardBg};
            border-radius: 20px;
            overflow: hidden;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
        }
        
        .item-header {
            position: relative;
            height: 400px;
            overflow: hidden;
        }
        
        .item-header img {
            width: 100%;
            height: 100%;
            object-fit: cover;
        }
        
        .item-header-overlay {
            position: absolute;
            bottom: 0;
            left: 0;
            right: 0;
            padding: 40px;
            background: linear-gradient(to top, ${cardBg}, transparent);
        }
        
        .item-content {
            padding: 40px;
        }
        
        .item-title-large {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 15px;
        }
        
        .item-meta-detail {
            display: flex;
            gap: 20px;
            margin-bottom: 20px;
            color: ${textLight};
        }
        
        .item-description-full {
            font-size: 16px;
            line-height: 1.8;
            color: ${textLight};
            margin-bottom: 30px;
        }
        
        .download-section {
            display: flex;
            gap: 20px;
            align-items: center;
            flex-wrap: wrap;
        }
        
        .download-btn-large {
            padding: 18px 40px;
            border: none;
            border-radius: 15px;
            background: linear-gradient(135deg, #6a5af9, #d66efd);
            color: white;
            font-family: 'Quicksand', sans-serif;
            font-weight: 700;
            font-size: 18px;
            cursor: pointer;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            gap: 12px;
            text-decoration: none;
            flex: 1;
            justify-content: center;
        }
        
        .download-btn-large:hover {
            transform: translateY(-3px);
            box-shadow: 0 10px 30px rgba(106, 90, 249, 0.4);
        }
        
        .stats {
            display: flex;
            gap: 30px;
        }
        
        .stat-item {
            display: flex;
            align-items: center;
            gap: 10px;
            color: ${textLight};
        }
        
        .stat-item i {
            font-size: 20px;
            color: ${isDark ? '#4ce0b3' : '#6a5af9'};
        }
        
        footer {
            text-align: center;
            padding: 30px;
            color: ${textLight};
            margin-top: 40px;
        }
        
        @media (max-width: 768px) {
            .item-header {
                height: 250px;
            }
            
            .item-content {
                padding: 20px;
            }
            
            .item-title-large {
                font-size: 24px;
            }
            
            .download-section {
                flex-direction: column;
            }
            
            .download-btn-large {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <header class="header">
        <div class="header-content">
            <a href="/" class="logo">
                <i class="fas fa-cloud-download-alt"></i>
                Mr Doso Hub
            </a>
            <a href="/" class="back-btn">
                <i class="fas fa-arrow-left"></i>
                Voltar
            </a>
        </div>
    </header>
    
    <div class="container">
        <div class="item-detail">
            <div class="item-header">
                <img src="${item.imagem || 'https://via.placeholder.com/1000x400/667eea/ffffff?text=' + encodeURIComponent(item.titulo)}" 
                     alt="${item.titulo}"
                     onerror="this.src='https://via.placeholder.com/1000x400/667eea/ffffff?text=' + encodeURIComponent('${item.titulo}')">
                <div class="item-header-overlay">
                    <h1 class="item-title-large">${item.titulo}</h1>
                </div>
            </div>
            
            <div class="item-content">
                <div class="item-meta-detail">
                    <span><i class="fas fa-tag"></i> ${item.categoria || 'Geral'}</span>
                    <span><i class="fas fa-calendar"></i> ${new Date(item.criado_em).toLocaleDateString('pt-BR')}</span>
                    ${item.expira_em ? `<span><i class="fas fa-hourglass-half"></i> Expira em ${new Date(item.expira_em).toLocaleDateString('pt-BR')}</span>` : ''}
                </div>
                
                <p class="item-description-full">${item.descricao || 'Nenhuma descrição disponível.'}</p>
                
                <div class="download-section">
                    <a href="/download/${itemId}" class="download-btn-large">
                        <i class="fas fa-download"></i>
                        Baixar Agora
                    </a>
                    
                    <div class="stats">
                        <div class="stat-item">
                            <i class="fas fa-download"></i>
                            <span>${parseInt(item.downloads) || 0} downloads</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <footer>
        <p>© 2026 Mr Doso Web - Todos os direitos reservados</p>
    </footer>
    
    <!-- Monetag -->
    <script>
        (function() {
            if (!window.monetagLoaded) {
                window.monetagLoaded = true;
                const script = document.createElement('script');
                script.src = 'https://quge5.com/88/tag.min.js';
                script.setAttribute('data-zone', '203209');
                script.async = true;
                document.head.appendChild(script);
            }
        })();
    </script>
    
    <script>
        // Registrar visualização
        fetch('/api/item/${itemId}/view', { method: 'POST' });
    </script>
</body>
</html>`;
}

async function gerarPaginaEtapa(etapa, config, sessionId, cpaLink, linkFinal, cpaJaAberto, theme) {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1a1a2e' : '#f5f7fa';
    const textColor = isDark ? '#ffffff' : '#33334d';
    const cardBg = isDark ? '#16213e' : '#ffffff';
    const textLight = isDark ? '#a0a0a0' : '#6c757d';
    const isFinalStep = etapa === 3;
    const progresso = (etapa / TOTAL_STEPS) * 100;
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${config.titulo} - Mr Doso</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6a5af9;
            --secondary: #d66efd;
            --accent: #4ce0b3;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Quicksand', sans-serif;
            background: ${bgColor};
            color: ${textColor};
            min-height: 100vh;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }

        .container {
            background: ${cardBg};
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 580px;
            padding: 40px 30px;
            text-align: center;
            position: relative;
            overflow: hidden;
        }

        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
        }

        .progress-steps {
            display: flex;
            justify-content: space-between;
            margin-bottom: 30px;
        }

        .step-dot {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            background: ${isDark ? '#0f3460' : '#e0e0e0'};
            color: ${textLight};
            font-weight: 700;
        }

        .step-dot.active {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
        }

        .step-dot.completed {
            background: #2ecc71;
            color: white;
        }

        .progress-bar-container {
            width: 100%;
            height: 6px;
            background: rgba(0,0,0,0.1);
            border-radius: 3px;
            overflow: hidden;
            margin: 20px 0;
        }

        .progress-bar-fill {
            width: ${progresso}%;
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            transition: width 0.3s;
        }

        h1 {
            font-size: 28px;
            margin-bottom: 10px;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .subtitle {
            color: ${textLight};
            margin-bottom: 30px;
        }

        .timer-section {
            background: ${isDark ? '#0f3460' : '#f8f9ff'};
            border-radius: 15px;
            padding: 30px;
            margin-bottom: 20px;
        }

        #countdown {
            font-size: 48px;
            font-weight: 700;
            color: var(--primary);
            margin-bottom: 10px;
        }

        .countdown-label {
            color: ${textLight};
            text-transform: uppercase;
            letter-spacing: 2px;
            font-size: 12px;
        }

        .ad-container {
            margin: 20px 0;
            min-height: 250px;
            display: flex;
            justify-content: center;
            align-items: center;
            background: ${isDark ? '#0f3460' : '#f8f9ff'};
            border-radius: 15px;
        }

        .info-box {
            background: ${config.temCPA ? '#fff3e0' : '#e8f5e9'};
            border-left: 4px solid ${config.temCPA ? '#f39c12' : '#2ecc71'};
            padding: 15px;
            border-radius: 8px;
            margin: 20px 0;
            text-align: left;
            color: ${isDark ? '#333' : 'inherit'};
        }

        .action-button {
            width: 100%;
            padding: 16px;
            border: none;
            border-radius: 40px;
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            font-size: 16px;
            text-transform: uppercase;
            cursor: pointer;
            color: white;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
        }

        .action-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
        }

        .action-button.cpa-button {
            background: linear-gradient(135deg, #f39c12, #e67e22);
        }

        .action-button.final-button {
            background: linear-gradient(135deg, #2ecc71, #27ae60);
        }

        .action-button:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(106, 90, 249, 0.3);
        }

        .secondary-link {
            margin-top: 15px;
            color: var(--primary);
            text-decoration: none;
            cursor: pointer;
            display: inline-block;
        }

        footer {
            margin-top: 20px;
            color: ${textLight};
        }

        @media (max-width: 640px) {
            .container { padding: 20px; }
            h1 { font-size: 22px; }
            #countdown { font-size: 36px; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="progress-steps">
            <div class="step-dot ${etapa >= 1 ? 'active' : ''} ${etapa > 1 ? 'completed' : ''}">
                ${etapa > 1 ? '<i class="fas fa-check"></i>' : '1'}
            </div>
            <div class="step-dot ${etapa >= 2 ? 'active' : ''} ${etapa > 2 ? 'completed' : ''}">
                ${etapa > 2 ? '<i class="fas fa-check"></i>' : '2'}
            </div>
            <div class="step-dot ${etapa >= 3 ? 'active' : ''}">
                3
            </div>
        </div>
        <div class="progress-bar-container">
            <div class="progress-bar-fill"></div>
        </div>
        
        <h1>
            <i class="fas ${config.icone}"></i>
            ${config.titulo}
        </h1>
        <p class="subtitle">${config.subtitulo}</p>
        
        <div class="timer-section">
            <div id="countdown">${config.timer}</div>
            <div class="countdown-label">SEGUNDOS RESTANTES</div>
        </div>
        
        ${config.temAdsterra ? `
        <div class="ad-container">
            <div id="container-57af132f9a89824d027d70445ba09a9a"></div>
        </div>
        ` : ''}
        
        <div class="info-box">
            <i class="fas ${config.temCPA ? 'fa-user-check' : isFinalStep ? 'fa-trophy' : 'fa-shield-alt'}"></i>
            <div>
                <strong>${config.temCPA ? 'Verificação de segurança' : isFinalStep ? 'Pronto para acessar!' : 'Aguarde um momento'}</strong>
                <p style="margin-top: 5px;">${config.temCPA ? 'Clique no botão abaixo para confirmar seu acesso' : isFinalStep ? 'Seu conteúdo está pronto' : 'O botão será liberado em breve'}</p>
            </div>
        </div>
        
        <button id="mainActionBtn" class="action-button ${config.temCPA ? 'cpa-button' : isFinalStep ? 'final-button' : ''}" disabled>
            <i class="fas fa-hourglass-half"></i>
            <span>Aguarde...</span>
        </button>
        
        ${isFinalStep && config.temCPA ? `
        <a class="secondary-link" id="bonusOffer">
            <i class="fas fa-gift"></i> Oferta bônus disponível
        </a>
        ` : ''}
        
        <footer>© 2026 Mr Doso Web</footer>
    </div>
    
    <!-- Monetag -->
    <script>
        (function() {
            if (!window.monetagLoaded) {
                window.monetagLoaded = true;
                const script = document.createElement('script');
                script.src = 'https://quge5.com/88/tag.min.js';
                script.setAttribute('data-zone', '203209');
                script.async = true;
                document.head.appendChild(script);
            }
        })();
    </script>
    
    ${config.temAdsterra ? `
    <script>
        (function() {
            if (!window.adsterraLoaded) {
                window.adsterraLoaded = true;
                const script = document.createElement('script');
                script.src = '//pl27551656.revenuecpmgate.com/57af132f9a89824d027d70445ba09a9a/invoke.js';
                script.async = true;
                script.setAttribute('data-cfasync', 'false');
                document.head.appendChild(script);
            }
        })();
    </script>
    ` : ''}
    
    <script>
        const CONFIG = {
            etapa: ${etapa},
            timer: ${config.timer},
            cpaLink: ${cpaLink ? JSON.stringify(cpaLink) : 'null'},
            sessionId: '${sessionId}',
            temCPA: ${config.temCPA},
            isFinalStep: ${isFinalStep},
            linkFinal: ${isFinalStep ? JSON.stringify(linkFinal) : 'null'},
            cpaJaAberto: ${cpaJaAberto || false}
        };
        
        let timeLeft = CONFIG.timer;
        let cpaOpened = CONFIG.cpaJaAberto;
        let isProcessing = false;
        
        const countdownEl = document.getElementById('countdown');
        const mainBtn = document.getElementById('mainActionBtn');
        
        function startTimer() {
            if (CONFIG.timer === 0) {
                enableButton();
                return;
            }
            
            countdownEl.textContent = timeLeft;
            
            const interval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    countdownEl.textContent = timeLeft;
                }
                
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    enableButton();
                }
            }, 1000);
        }
        
        function enableButton() {
            mainBtn.disabled = false;
            
            if (CONFIG.isFinalStep) {
                mainBtn.innerHTML = '<i class="fas fa-external-link-alt"></i><span>${config.botaoTexto}</span>';
                mainBtn.className = 'action-button final-button';
            } else if (CONFIG.temCPA) {
                if (!cpaOpened) {
                    mainBtn.innerHTML = '<i class="fas fa-external-link-alt"></i><span>${config.botaoTexto}</span>';
                    mainBtn.className = 'action-button cpa-button';
                } else {
                    mainBtn.innerHTML = '<i class="fas fa-arrow-right"></i><span>Continuar</span>';
                    mainBtn.className = 'action-button';
                }
            } else {
                mainBtn.innerHTML = '<i class="fas fa-arrow-right"></i><span>${config.botaoTexto}</span>';
                mainBtn.className = 'action-button';
            }
        }
        
        mainBtn.addEventListener('click', async () => {
            if (isProcessing) return;
            if (timeLeft > 0 && CONFIG.timer > 0) {
                alert('Aguarde ' + timeLeft + ' segundos.');
                return;
            }
            
            isProcessing = true;
            
            if (CONFIG.isFinalStep) {
                window.location.href = CONFIG.linkFinal;
                return;
            }
            
            if (CONFIG.temCPA && !cpaOpened && CONFIG.cpaLink) {
                mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Abrindo...</span>';
                window.open(CONFIG.cpaLink, '_blank');
                cpaOpened = true;
                enableButton();
                isProcessing = false;
                return;
            }
            
            mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Processando...</span>';
            mainBtn.disabled = true;
            
            try {
                const response = await fetch('/api/next-step', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ 
                        currentStep: CONFIG.etapa, 
                        sessionId: CONFIG.sessionId,
                        cpaOpened: cpaOpened
                    })
                });
                
                const data = await response.json();
                
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    alert(data.error || 'Erro ao avançar');
                    mainBtn.disabled = false;
                    enableButton();
                }
            } catch (e) {
                alert('Erro de conexão');
                mainBtn.disabled = false;
                enableButton();
            } finally {
                isProcessing = false;
            }
        });
        
        const bonusLink = document.getElementById('bonusOffer');
        if (bonusLink) {
            bonusLink.addEventListener('click', () => {
                const bonusCpa = '${getRandomCpaLink()}';
                window.open(bonusCpa, '_blank');
            });
        }
        
        startTimer();
    </script>
</body>
</html>`;
}

function gerarLoginPage(theme) {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1a1a2e' : '#f5f7fa';
    const textColor = isDark ? '#ffffff' : '#33334d';
    const cardBg = isDark ? '#16213e' : '#ffffff';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login - Mr Doso</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Quicksand', sans-serif;
            background: ${bgColor};
            color: ${textColor};
            min-height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
            padding: 20px;
        }
        
        .login-container {
            background: ${cardBg};
            border-radius: 20px;
            box-shadow: 0 10px 40px rgba(0,0,0,0.2);
            width: 100%;
            max-width: 400px;
            padding: 40px;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-header i {
            font-size: 48px;
            color: #6a5af9;
            margin-bottom: 20px;
        }
        
        .login-header h1 {
            font-size: 24px;
            margin-bottom: 10px;
        }
        
        .login-header p {
            color: ${isDark ? '#a0a0a0' : '#6c757d'};
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px;
            border: 2px solid ${isDark ? '#0f3460' : '#e0e0e0'};
            border-radius: 10px;
            background: ${bgColor};
            color: ${textColor};
            font-family: 'Quicksand', sans-serif;
            font-size: 16px;
            transition: all 0.3s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #6a5af9;
        }
        
        .login-btn {
            width: 100%;
            padding: 14px;
            border: none;
            border-radius: 10px;
            background: linear-gradient(135deg, #6a5af9, #d66efd);
            color: white;
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            font-size: 16px;
            cursor: pointer;
            transition: all 0.3s;
        }
        
        .login-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 5px 15px rgba(106, 90, 249, 0.4);
        }
        
        .error-message {
            color: #e74c3c;
            text-align: center;
            margin-top: 15px;
            display: none;
        }
        
        .back-link {
            text-align: center;
            margin-top: 20px;
        }
        
        .back-link a {
            color: ${isDark ? '#a0a0a0' : '#6c757d'};
            text-decoration: none;
        }
        
        .back-link a:hover {
            color: #6a5af9;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <i class="fas fa-lock"></i>
            <h1>Painel Administrativo</h1>
            <p>Digite a senha para acessar</p>
        </div>
        
        <form id="loginForm">
            <div class="form-group">
                <label>Senha</label>
                <input type="password" id="password" placeholder="••••••••" required>
            </div>
            
            <button type="submit" class="login-btn">
                <i class="fas fa-sign-in-alt"></i> Entrar
            </button>
        </form>
        
        <div class="error-message" id="errorMessage"></div>
        
        <div class="back-link">
            <a href="/"><i class="fas fa-arrow-left"></i> Voltar para o site</a>
        </div>
    </div>
    
    <script>
        document.getElementById('loginForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const password = document.getElementById('password').value;
            const errorEl = document.getElementById('errorMessage');
            const btn = document.querySelector('.login-btn');
            
            btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Entrando...';
            btn.disabled = true;
            errorEl.style.display = 'none';
            
            try {
                const response = await fetch('/admin/api/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    window.location.href = '/admin';
                } else {
                    errorEl.textContent = data.error || 'Senha incorreta';
                    errorEl.style.display = 'block';
                }
            } catch (error) {
                errorEl.textContent = 'Erro de conexão';
                errorEl.style.display = 'block';
            } finally {
                btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
                btn.disabled = false;
            }
        });
    </script>
</body>
</html>`;
}

async function gerarAdminPage(theme) {
    const isDark = theme === 'dark';
    const bgColor = isDark ? '#1a1a2e' : '#f5f7fa';
    const textColor = isDark ? '#ffffff' : '#33334d';
    const cardBg = isDark ? '#16213e' : '#ffffff';
    const textLight = isDark ? '#a0a0a0' : '#6c757d';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Painel Admin - Mr Doso</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Quicksand', sans-serif;
            background: ${bgColor};
            color: ${textColor};
        }
        
        .admin-header {
            background: ${isDark ? '#0f3460' : '#6a5af9'};
            padding: 20px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
        }
        
        .header-content {
            max-width: 1400px;
            margin: 0 auto;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .logo {
            font-size: 24px;
            font-weight: 700;
            color: white;
            display: flex;
            align-items: center;
            gap: 10px;
        }
        
        .header-actions {
            display: flex;
            gap: 15px;
            align-items: center;
        }
        
        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 25px;
            background: rgba(255,255,255,0.2);
            color: white;
            cursor: pointer;
            font-family: 'Quicksand', sans-serif;
            display: flex;
            align-items: center;
            gap: 8px;
            text-decoration: none;
            transition: all 0.3s;
        }
        
        .btn:hover {
            background: rgba(255,255,255,0.3);
        }
        
        .btn-primary {
            background: linear-gradient(135deg, #6a5af9, #d66efd);
        }
        
        .container {
            max-width: 1400px;
            margin: 30px auto;
            padding: 0 20px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: ${cardBg};
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .stat-card h3 {
            color: ${textLight};
            font-size: 14px;
            margin-bottom: 10px;
        }
        
        .stat-value {
            font-size: 32px;
            font-weight: 700;
            margin-bottom: 5px;
        }
        
        .stat-change {
            font-size: 14px;
            color: #2ecc71;
        }
        
        .stat-change.negative {
            color: #e74c3c;
        }
        
        .chart-container {
            background: ${cardBg};
            border-radius: 15px;
            padding: 25px;
            margin-bottom: 30px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
        }
        
        .chart-container h2 {
            margin-bottom: 20px;
        }
        
        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .items-table {
            background: ${cardBg};
            border-radius: 15px;
            padding: 25px;
            box-shadow: 0 5px 20px rgba(0,0,0,0.1);
            overflow-x: auto;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        th, td {
            padding: 15px;
            text-align: left;
            border-bottom: 1px solid ${isDark ? '#0f3460' : '#e0e0e0'};
        }
        
        th {
            color: ${textLight};
            font-weight: 500;
            font-size: 14px;
        }
        
        .item-actions {
            display: flex;
            gap: 10px;
        }
        
        .action-btn {
            padding: 5px 10px;
            border: none;
            border-radius: 5px;
            background: ${isDark ? '#0f3460' : '#e0e0e0'};
            color: ${textColor};
            cursor: pointer;
            font-size: 12px;
            transition: all 0.3s;
        }
        
        .action-btn:hover {
            background: #6a5af9;
            color: white;
        }
        
        .action-btn.delete:hover {
            background: #e74c3c;
        }
        
        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.7);
            z-index: 9999;
            justify-content: center;
            align-items: center;
        }
        
        .modal.active {
            display: flex;
        }
        
        .modal-content {
            background: ${cardBg};
            border-radius: 20px;
            padding: 30px;
            max-width: 600px;
            width: 90%;
            max-height: 80vh;
            overflow-y: auto;
        }
        
        .modal-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }
        
        .modal-header h2 {
            font-size: 20px;
        }
        
        .close-btn {
            background: none;
            border: none;
            color: ${textColor};
            font-size: 24px;
            cursor: pointer;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
        }
        
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 12px;
            border: 2px solid ${isDark ? '#0f3460' : '#e0e0e0'};
            border-radius: 10px;
            background: ${bgColor};
            color: ${textColor};
            font-family: 'Quicksand', sans-serif;
            font-size: 14px;
        }
        
        .form-group textarea {
            min-height: 100px;
            resize: vertical;
        }
        
        .form-actions {
            display: flex;
            gap: 10px;
            justify-content: flex-end;
        }
        
        .top-items {
            margin-top: 20px;
        }
        
        .top-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 10px 0;
            border-bottom: 1px solid ${isDark ? '#0f3460' : '#e0e0e0'};
        }
        
        .top-item:last-child {
            border-bottom: none;
        }
        
        @media (max-width: 768px) {
            .header-content {
                flex-direction: column;
                gap: 15px;
            }
            
            .stats-grid {
                grid-template-columns: 1fr;
            }
        }
    </style>
</head>
<body>
    <header class="admin-header">
        <div class="header-content">
            <div class="logo">
                <i class="fas fa-crown"></i>
                Painel Administrativo
            </div>
            <div class="header-actions">
                <a href="/" class="btn">
                    <i class="fas fa-eye"></i> Ver Site
                </a>
                <a href="/toggle-theme" class="btn">
                    <i class="fas fa-${isDark ? 'sun' : 'moon'}"></i>
                    ${isDark ? 'Claro' : 'Escuro'}
                </a>
                <button class="btn" onclick="openChangePasswordModal()">
                    <i class="fas fa-key"></i> Alterar Senha
                </button>
                <a href="/admin/logout" class="btn">
                    <i class="fas fa-sign-out-alt"></i> Sair
                </a>
            </div>
        </div>
    </header>
    
    <div class="container">
        <div class="stats-grid" id="statsGrid">
            <div class="stat-card">
                <h3><i class="fas fa-box"></i> Total de Itens</h3>
                <div class="stat-value" id="totalItems">-</div>
            </div>
            <div class="stat-card">
                <h3><i class="fas fa-eye"></i> Visualizações Hoje</h3>
                <div class="stat-value" id="todayViews">-</div>
                <div class="stat-change" id="viewsChange">-</div>
            </div>
            <div class="stat-card">
                <h3><i class="fas fa-download"></i> Downloads Hoje</h3>
                <div class="stat-value" id="todayDownloads">-</div>
                <div class="stat-change" id="downloadsChange">-</div>
            </div>
            <div class="stat-card">
                <h3><i class="fas fa-chart-line"></i> Taxa de Conversão</h3>
                <div class="stat-value" id="conversionRate">-</div>
            </div>
        </div>
        
        <div class="chart-container">
            <h2><i class="fas fa-calendar"></i> Últimos 7 dias</h2>
            <canvas id="statsChart"></canvas>
        </div>
        
        <div class="section-header">
            <h2><i class="fas fa-list"></i> Itens Cadastrados</h2>
            <button class="btn btn-primary" onclick="openItemModal()">
                <i class="fas fa-plus"></i> Novo Item
            </button>
        </div>
        
        <div class="items-table">
            <table>
                <thead>
                    <tr>
                        <th>Título</th>
                        <th>Categoria</th>
                        <th>Visualizações</th>
                        <th>Downloads</th>
                        <th>Taxa</th>
                        <th>Status</th>
                        <th>Ações</th>
                    </tr>
                </thead>
                <tbody id="itemsTableBody">
                    <tr><td colspan="7" style="text-align: center;">Carregando...</td></tr>
                </tbody>
            </table>
        </div>
        
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-top: 30px;">
            <div class="chart-container">
                <h2><i class="fas fa-trophy"></i> Itens Mais Populares</h2>
                <div class="top-items" id="topItems"></div>
            </div>
            <div class="chart-container">
                <h2><i class="fas fa-chart-pie"></i> Resumo Geral</h2>
                <div class="top-items">
                    <div class="top-item">
                        <span>Total de Visualizações:</span>
                        <strong id="totalViews">-</strong>
                    </div>
                    <div class="top-item">
                        <span>Total de Downloads:</span>
                        <strong id="totalDownloads">-</strong>
                    </div>
                    <div class="top-item">
                        <span>Itens Ativos:</span>
                        <strong id="activeItems">-</strong>
                    </div>
                    <div class="top-item">
                        <span>Média de Downloads/Item:</span>
                        <strong id="avgDownloads">-</strong>
                    </div>
                </div>
            </div>
        </div>
    </div>
    
    <!-- Modal de Item -->
    <div class="modal" id="itemModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2 id="modalTitle">Novo Item</h2>
                <button class="close-btn" onclick="closeItemModal()">&times;</button>
            </div>
            <form id="itemForm">
                <input type="hidden" id="itemId">
                <div class="form-group">
                    <label>Título</label>
                    <input type="text" id="itemTitulo" required>
                </div>
                <div class="form-group">
                    <label>Descrição</label>
                    <textarea id="itemDescricao"></textarea>
                </div>
                <div class="form-group">
                    <label>URL da Imagem</label>
                    <input type="url" id="itemImagem" placeholder="https://...">
                </div>
                <div class="form-group">
                    <label>URL Original (Link Final)</label>
                    <input type="url" id="itemUrl" required>
                </div>
                <div class="form-group">
                    <label>Categoria</label>
                    <select id="itemCategoria">
                        <option value="filmes">Filmes</option>
                        <option value="series">Séries</option>
                        <option value="jogos">Jogos</option>
                        <option value="cursos">Cursos</option>
                        <option value="apps">Apps</option>
                        <option value="outros">Outros</option>
                    </select>
                </div>
                <div class="form-group">
                    <label>Data de Expiração (opcional)</label>
                    <input type="datetime-local" id="itemExpira">
                </div>
                <div class="form-group">
                    <label>Status</label>
                    <select id="itemAtivo">
                        <option value="true">Ativo</option>
                        <option value="false">Inativo</option>
                    </select>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" onclick="closeItemModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Salvar</button>
                </div>
            </form>
        </div>
    </div>
    
    <!-- Modal de Alterar Senha -->
    <div class="modal" id="passwordModal">
        <div class="modal-content">
            <div class="modal-header">
                <h2>Alterar Senha</h2>
                <button class="close-btn" onclick="closePasswordModal()">&times;</button>
            </div>
            <form id="passwordForm">
                <div class="form-group">
                    <label>Senha Atual</label>
                    <input type="password" id="currentPassword" required>
                </div>
                <div class="form-group">
                    <label>Nova Senha</label>
                    <input type="password" id="newPassword" required>
                </div>
                <div class="form-group">
                    <label>Confirmar Nova Senha</label>
                    <input type="password" id="confirmPassword" required>
                </div>
                <div class="form-actions">
                    <button type="button" class="btn" onclick="closePasswordModal()">Cancelar</button>
                    <button type="submit" class="btn btn-primary">Alterar</button>
                </div>
            </form>
        </div>
    </div>
    
    <script>
        let chart = null;
        let currentItems = [];
        
        // Carregar dados iniciais
        loadStats();
        loadItems();
        
        async function loadStats() {
            try {
                const response = await fetch('/admin/api/stats');
                const data = await response.json();
                
                document.getElementById('totalItems').textContent = data.totalItems;
                document.getElementById('todayViews').textContent = data.today.views;
                document.getElementById('todayDownloads').textContent = data.today.downloads;
                document.getElementById('conversionRate').textContent = data.conversionRate + '%';
                document.getElementById('totalViews').textContent = data.totalViews;
                document.getElementById('totalDownloads').textContent = data.totalDownloads;
                document.getElementById('activeItems').textContent = data.totalItems;
                
                const avgDownloads = data.totalItems > 0 ? (data.totalDownloads / data.totalItems).toFixed(0) : 0;
                document.getElementById('avgDownloads').textContent = avgDownloads;
                
                // Variação vs ontem
                const viewsDiff = data.today.views - data.yesterday.views;
                const viewsChange = document.getElementById('viewsChange');
                if (viewsDiff >= 0) {
                    viewsChange.innerHTML = \`<i class="fas fa-arrow-up"></i> +\${viewsDiff} vs ontem\`;
                    viewsChange.className = 'stat-change';
                } else {
                    viewsChange.innerHTML = \`<i class="fas fa-arrow-down"></i> \${viewsDiff} vs ontem\`;
                    viewsChange.className = 'stat-change negative';
                }
                
                const downloadsDiff = data.today.downloads - data.yesterday.downloads;
                const downloadsChange = document.getElementById('downloadsChange');
                if (downloadsDiff >= 0) {
                    downloadsChange.innerHTML = \`<i class="fas fa-arrow-up"></i> +\${downloadsDiff} vs ontem\`;
                    downloadsChange.className = 'stat-change';
                } else {
                    downloadsChange.innerHTML = \`<i class="fas fa-arrow-down"></i> \${downloadsDiff} vs ontem\`;
                    downloadsChange.className = 'stat-change negative';
                }
                
                // Top items
                const topItemsDiv = document.getElementById('topItems');
                topItemsDiv.innerHTML = '';
                data.topItems.forEach(item => {
                    topItemsDiv.innerHTML += \`
                        <div class="top-item">
                            <span>\${item.titulo}</span>
                            <span>\${item.downloads} ⬇️</span>
                        </div>
                    \`;
                });
                
                // Gráfico
                const ctx = document.getElementById('statsChart').getContext('2d');
                if (chart) chart.destroy();
                
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.last7Days.map(d => new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short' })),
                        datasets: [{
                            label: 'Visualizações',
                            data: data.last7Days.map(d => d.views),
                            borderColor: '#6a5af9',
                            backgroundColor: 'rgba(106, 90, 249, 0.1)',
                            tension: 0.4
                        }, {
                            label: 'Downloads',
                            data: data.last7Days.map(d => d.downloads),
                            borderColor: '#4ce0b3',
                            backgroundColor: 'rgba(76, 224, 179, 0.1)',
                            tension: 0.4
                        }]
                    },
                    options: {
                        responsive: true,
                        plugins: {
                            legend: {
                                labels: { color: '${textColor}' }
                            }
                        },
                        scales: {
                            y: {
                                beginAtZero: true,
                                grid: { color: '${isDark ? '#0f3460' : '#e0e0e0'}' },
                                ticks: { color: '${textLight}' }
                            },
                            x: {
                                grid: { display: false },
                                ticks: { color: '${textLight}' }
                            }
                        }
                    }
                });
            } catch (error) {
                console.error('Erro ao carregar stats:', error);
            }
        }
        
        async function loadItems() {
            try {
                const response = await fetch('/admin/api/items');
                const data = await response.json();
                currentItems = data.items;
                
                const tbody = document.getElementById('itemsTableBody');
                tbody.innerHTML = '';
                
                data.items.forEach(item => {
                    const conversionRate = item.visualizacoes > 0 
                        ? ((item.downloads / item.visualizacoes) * 100).toFixed(1) 
                        : '0';
                    
                    tbody.innerHTML += \`
                        <tr>
                            <td>\${item.titulo}</td>
                            <td>\${item.categoria}</td>
                            <td>\${item.visualizacoes}</td>
                            <td>\${item.downloads}</td>
                            <td>\${conversionRate}%</td>
                            <td>\${item.ativo === 'true' ? '✅ Ativo' : '❌ Inativo'}</td>
                            <td class="item-actions">
                                <button class="action-btn" onclick="editItem('\${item.id}')">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="deleteItem('\${item.id}')">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </td>
                        </tr>
                    \`;
                });
            } catch (error) {
                console.error('Erro ao carregar itens:', error);
            }
        }
        
        function openItemModal(itemId = null) {
            const modal = document.getElementById('itemModal');
            const title = document.getElementById('modalTitle');
            
            if (itemId) {
                title.textContent = 'Editar Item';
                const item = currentItems.find(i => i.id === itemId);
                if (item) {
                    document.getElementById('itemId').value = item.id;
                    document.getElementById('itemTitulo').value = item.titulo;
                    document.getElementById('itemDescricao').value = item.descricao || '';
                    document.getElementById('itemImagem').value = item.imagem || '';
                    document.getElementById('itemUrl').value = item.url_original;
                    document.getElementById('itemCategoria').value = item.categoria;
                    document.getElementById('itemExpira').value = item.expira_em ? item.expira_em.slice(0, 16) : '';
                    document.getElementById('itemAtivo').value = item.ativo;
                }
            } else {
                title.textContent = 'Novo Item';
                document.getElementById('itemForm').reset();
                document.getElementById('itemId').value = '';
            }
            
            modal.classList.add('active');
        }
        
        function closeItemModal() {
            document.getElementById('itemModal').classList.remove('active');
        }
        
        function editItem(itemId) {
            openItemModal(itemId);
        }
        
        async function deleteItem(itemId) {
            if (!confirm('Tem certeza que deseja excluir este item?')) return;
            
            try {
                const response = await fetch(\`/admin/api/item/\${itemId}\`, { method: 'DELETE' });
                const data = await response.json();
                
                if (data.success) {
                    loadItems();
                    loadStats();
                }
            } catch (error) {
                alert('Erro ao excluir item');
            }
        }
        
        document.getElementById('itemForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const formData = {
                id: document.getElementById('itemId').value || null,
                titulo: document.getElementById('itemTitulo').value,
                descricao: document.getElementById('itemDescricao').value,
                imagem: document.getElementById('itemImagem').value,
                url_original: document.getElementById('itemUrl').value,
                categoria: document.getElementById('itemCategoria').value,
                expira_em: document.getElementById('itemExpira').value || null,
                ativo: document.getElementById('itemAtivo').value
            };
            
            try {
                const response = await fetch('/admin/api/item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                
                const data = await response.json();
                
                if (data.success) {
                    closeItemModal();
                    loadItems();
                    loadStats();
                }
            } catch (error) {
                alert('Erro ao salvar item');
            }
        });
        
        function openChangePasswordModal() {
            document.getElementById('passwordModal').classList.add('active');
        }
        
        function closePasswordModal() {
            document.getElementById('passwordModal').classList.remove('active');
            document.getElementById('passwordForm').reset();
        }
        
        document.getElementById('passwordForm').addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const currentPassword = document.getElementById('currentPassword').value;
            const newPassword = document.getElementById('newPassword').value;
            const confirmPassword = document.getElementById('confirmPassword').value;
            
            if (newPassword !== confirmPassword) {
                alert('As senhas não coincidem');
                return;
            }
            
            try {
                const response = await fetch('/admin/api/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword, newPassword })
                });
                
                const data = await response.json();
                
                if (data.success) {
                    alert('Senha alterada com sucesso!');
                    closePasswordModal();
                } else {
                    alert(data.error || 'Erro ao alterar senha');
                }
            } catch (error) {
                alert('Erro de conexão');
            }
        });
        
        // Recarregar stats a cada 30 segundos
        setInterval(loadStats, 30000);
    </script>
</body>
</html>`;
}

// =================================================================
// INICIAR SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`
    🚀 MR DOSO HUB RODANDO NA PORTA ${PORT}
    
    ✅ REDIS CLOUD CONECTADO!
    ✅ PAINEL ADMIN: /admin
    ✅ HUB DE LINKS FUNCIONAL
    ✅ MÉTRICAS DE VISUALIZAÇÕES E DOWNLOADS
    ✅ TEMA CLARO/ESCURO
    ✅ MONETAG EM TODAS AS PÁGINAS
    ✅ ADSTERRA NAS ETAPAS
    ✅ 3 ETAPAS DE 20s
    
    🔑 Senha admin padrão: MrDoso2026@Admin
    ⚠️ Altere a senha no primeiro acesso!
    `);
});