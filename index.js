const express = require('express');
const path = require('path');
const crypto = require('crypto');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const redis = require('redis');
const cors = require('cors');
const cookieParser = require('cookie-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// =================================================================
// CONFIGURAÇÕES DE SEGURANÇA (SEM RESTRIÇÕES!)
// =================================================================
app.set('trust proxy', 1);

// ✅ HELMET SEM CSP - Sem restrições de domínio!
app.use(helmet({
    contentSecurityPolicy: false,  // Desabilita CSP completamente
    crossOriginEmbedderPolicy: false,
    crossOriginOpenerPolicy: false,
    crossOriginResourcePolicy: false
}));

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Muitas requisições' },
    standardHeaders: true,
    legacyHeaders: false
});
app.use(limiter);

// =================================================================
// CONFIGURAÇÃO DO REDIS
// =================================================================
const redisClient = redis.createClient({
    url: 'redis://default:JyefUsxHJljfdvs8HACumEyLE7XNgLvG@redis-19242.c266.us-east-1-3.ec2.cloud.redislabs.com:19242'
});

redisClient.on('error', (err) => console.log('Redis Client Error', err));
redisClient.on('connect', () => console.log('✅ Conectado ao Redis Cloud!'));

(async () => {
    await redisClient.connect();
    console.log('🚀 Redis pronto para uso!');
})();

// =================================================================
// CONFIGURAÇÕES DO SISTEMA
// =================================================================
const SESSION_EXPIRATION = 24 * 60 * 60;

let linksData = [];
try {
    linksData = require('./data/links.js');
    console.log(`✅ Links carregados: ${linksData.length} links`);
} catch (error) {
    console.error('❌ Erro ao carregar links.js:', error.message);
    linksData = [];
}

const BASE_STEP_CONFIGS = {
    impar: { temAnuncio: false, timer: 10, titulo: 'Verificação de Acesso', subtitulo: 'Confirmando que você não é um robô...', tipoBotao: 'cpa', icone: 'fa-shield-alt' },
    par: { temAnuncio: true, timer: 15, titulo: 'Processando Link', subtitulo: 'Estabelecendo conexão segura...', tipoBotao: 'normal', icone: 'fa-lock' },
    final: { temAnuncio: true, timer: 15, titulo: 'Link Pronto!', subtitulo: 'Seu conteúdo está disponível', tipoBotao: 'final', icone: 'fa-check-circle' }
};

const CPA_LINKS = [
    'https://omg10.com/4/10420694',
    'https://www.effectivegatecpm.com/ki4e3ftt5h?key=99415bf2c750643bbcc7c1380848fee9',
    'https://pertlouv.com/pZ0Ob1Vxs8U=?',
    'https://record.elephantbet.com/_rhoOOvBxBOAWqcfzuvZcQGNd7ZgqdRLk/1/',
    'https://media1.placard.co.mz/redirect.aspx?pid=5905&bid=1690',
    'https://affiliates.bantubet.co.mz/links/?btag=2307928',
    'https://bony-teaching.com/KUN7HR'
];

// =================================================================
// FUNÇÕES DE SESSÃO
// =================================================================
function generateSessionId() {
    return crypto.randomBytes(32).toString('hex');
}

function getClientFingerprint(req) {
    const ip = req.ip || req.connection.remoteAddress;
    const userAgent = req.headers['user-agent'] || '';
    return crypto.createHash('sha256').update(ip + userAgent).digest('hex').substring(0, 16);
}

async function createSession(alias, totalSteps, req) {
    const sessionId = generateSessionId();
    const fingerprint = getClientFingerprint(req);
    
    const sessionData = {
        id: sessionId,
        alias: alias,
        etapa_atual: 1,
        totalSteps: totalSteps,
        fingerprint: fingerprint,
        criado_em: Date.now(),
        ultima_acao: Date.now(),
        cpas_abertos: 0,
        ip: req.ip
    };
    
    await redisClient.setEx(`session:${sessionId}`, SESSION_EXPIRATION, JSON.stringify(sessionData));
    await redisClient.setEx(`fingerprint:${fingerprint}`, SESSION_EXPIRATION, sessionId);
    
    console.log(`✅ Sessão criada: ${sessionId.substring(0, 8)}... para ${alias} (${totalSteps} etapas)`);
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

async function updateSession(sessionId, etapa) {
    const session = await getSession(sessionId);
    if (!session) return null;
    session.etapa_atual = etapa;
    session.ultima_acao = Date.now();
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
// FUNÇÕES AUXILIARES
// =================================================================
function getStepConfig(etapa, totalSteps) {
    if (etapa === totalSteps) return { ...BASE_STEP_CONFIGS.final };
    
    const isImpar = etapa % 2 === 1;
    const baseConfig = isImpar ? BASE_STEP_CONFIGS.impar : BASE_STEP_CONFIGS.par;
    
    const titulos = {
        1: 'Verificação Inicial', 2: 'Conexão Segura', 3: 'Confirmação Adicional',
        4: 'Otimização de Rede', 5: 'Verificação Final', 6: 'Preparando Conteúdo'
    };
    
    const subtitulos = {
        1: 'Confirmando que você não é um robô...', 2: 'Estabelecendo túnel criptografado...',
        3: 'Última verificação de segurança...', 4: 'Acelerando conexão com o servidor...',
        5: 'Quase pronto! Última confirmação...', 6: 'Descriptografando link de destino...'
    };
    
    return {
        ...baseConfig,
        titulo: titulos[etapa] || baseConfig.titulo,
        subtitulo: subtitulos[etapa] || baseConfig.subtitulo
    };
}

function getRandomCpaLink() {
    return CPA_LINKS[Math.floor(Math.random() * CPA_LINKS.length)];
}

// =================================================================
// MIDDLEWARE DE SESSÃO
// =================================================================
app.use(async (req, res, next) => {
    if (req.path === '/' || req.path.startsWith('/public') || req.path === '/favicon.ico') {
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
// ROTAS FIXAS (ANTES DA ROTA CORINGA!)
// =================================================================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/page:step', async (req, res) => {
    const step = parseInt(req.params.step);
    
    console.log(`📄 Acessando page${step}`);
    
    if (!req.session) {
        console.log('❌ Sem sessão');
        return res.redirect('/');
    }
    
    const session = req.session;
    
    if (step !== session.etapa_atual) {
        console.log(`⚠️ Redirecionando: etapa correta é ${session.etapa_atual}`);
        return res.redirect(`/page${session.etapa_atual}`);
    }
    
    if (step > session.totalSteps) {
        return res.redirect('/');
    }
    
    const link = linksData.find(l => l.alias === session.alias);
    if (!link) {
        return res.redirect('/');
    }
    
    const config = getStepConfig(step, session.totalSteps);
    const cpaLink = (!config.temAnuncio && step < session.totalSteps) ? getRandomCpaLink() : null;
    
    res.send(gerarHTMLPagina(step, session.totalSteps, config, session.id, cpaLink, link.original_url));
});

app.post('/api/next-step', async (req, res) => {
    const { currentStep, sessionId } = req.body;
    
    console.log(`🔄 Next-step: etapa ${currentStep}`);
    
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
    
    const link = linksData.find(l => l.alias === session.alias);
    if (!link) {
        return res.status(404).json({ error: 'Link não encontrado', redirect: '/' });
    }
    
    if (clientStep >= session.totalSteps) {
        console.log(`✅ Finalizado! Redirecionando para: ${link.original_url}`);
        return res.json({ redirect: link.original_url, final: true });
    }
    
    const novaEtapa = clientStep + 1;
    await updateSession(sessionId, novaEtapa);
    
    console.log(`✅ Avançando: etapa ${clientStep} → ${novaEtapa} (total: ${session.totalSteps})`);
    
    return res.json({ redirect: `/page${novaEtapa}`, final: false });
});

app.get('/api/step-config', async (req, res) => {
    const sessionId = req.headers['x-session-id'] || req.query.sessionId;
    
    if (!sessionId) {
        return res.status(403).json({ error: 'Sessão inválida' });
    }
    
    const session = await getSession(sessionId);
    if (!session) {
        return res.status(403).json({ error: 'Sessão expirada' });
    }
    
    const config = getStepConfig(session.etapa_atual, session.totalSteps);
    const cpaLink = (!config.temAnuncio && session.etapa_atual < session.totalSteps) ? getRandomCpaLink() : null;
    
    res.json({
        etapa: session.etapa_atual,
        totalSteps: session.totalSteps,
        ...config,
        cpaLink: cpaLink
    });
});

// =================================================================
// ROTA CORINGA (DEVE SER A ÚLTIMA!)
// =================================================================
app.get('/:alias', async (req, res) => {
    const alias = req.params.alias;
    const link = linksData.find(l => l.alias === alias);
    
    console.log(`🔗 Acessando alias: ${alias}`);
    
    if (!link) {
        console.log(`❌ Alias não encontrado: ${alias}`);
        return res.redirect('/');
    }
    
    const totalSteps = link.steps || 6;
    const session = await createSession(alias, totalSteps, req);
    
    res.cookie('sessionId', session.id, {
        maxAge: SESSION_EXPIRATION * 1000,
        httpOnly: true,
        secure: false,
        sameSite: 'lax'
    });
    
    res.redirect('/page1');
});

// =================================================================
// FUNÇÃO: Gerar HTML da página (COM SEU DESIGN!)
// =================================================================
function gerarHTMLPagina(etapa, totalSteps, config, sessionId, cpaLink, linkFinal) {
    const isCpaStep = !config.temAnuncio && etapa < totalSteps;
    const isFinalStep = etapa === totalSteps;
    
    // Determina o ícone
    let icone = 'fa-shield-alt';
    if (isFinalStep) icone = 'fa-trophy';
    else if (!isCpaStep) icone = 'fa-clock';
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Mr Doso - ${config.titulo}</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        /* ===== SEU CSS APRIMORADO ===== */
        :root {
            --primary: #6a5af9;
            --secondary: #d66efd;
            --accent: #4ce0b3;
            --dark: #2d2b55;
            --light: #f8f9ff;
            --text: #33334d;
            --text-light: #6c757d;
            --success: #2ecc71;
            --warning: #f39c12;
            --error: #e74c3c;
            --space-xs: 5px;
            --space-sm: 10px;
            --space-md: 20px;
            --space-lg: 25px;
            --space-xl: 30px;
            --radius-sm: 10px;
            --radius-md: 15px;
            --radius-lg: 20px;
            --shadow-sm: 0 5px 15px rgba(106, 90, 249, 0.3);
            --shadow-md: 0 10px 30px rgba(0, 0, 0, 0.08);
            --shadow-lg: 0 15px 35px rgba(0, 0, 0, 0.12);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Quicksand', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%);
            color: var(--text);
            line-height: 1.6;
            min-height: 100vh;
            padding: var(--space-md);
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            position: relative;
            overflow-x: hidden;
            -webkit-user-select: none;
            user-select: none;
        }

        body::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: 
                radial-gradient(circle at 20% 20%, rgba(106, 90, 249, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 80% 80%, rgba(214, 110, 253, 0.12) 0%, transparent 50%),
                radial-gradient(circle at 50% 50%, rgba(76, 224, 179, 0.12) 0%, transparent 50%);
            opacity: 0.6;
            z-index: -1;
        }

        .container {
            background: rgba(255, 255, 255, 0.92);
            backdrop-filter: blur(10px);
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-md);
            width: 100%;
            max-width: 580px;
            padding: var(--space-xl) var(--space-lg);
            text-align: center;
            position: relative;
            overflow: hidden;
            transition: all 0.3s ease;
            display: flex;
            flex-direction: column;
            align-items: center;
            margin-bottom: var(--space-md);
        }

        .container:hover {
            transform: translateY(-3px);
            box-shadow: var(--shadow-lg);
        }

        .container::before {
            content: '';
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 5px;
            background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
            border-radius: var(--radius-lg) var(--radius-lg) 0 0;
        }

        .step-badge {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            padding: 6px 18px;
            border-radius: 50px;
            font-size: 0.85rem;
            font-weight: 600;
            letter-spacing: 0.5px;
            margin-bottom: var(--space-md);
            box-shadow: var(--shadow-sm);
        }

        h1 {
            color: var(--dark);
            margin-bottom: 8px;
            font-weight: 700;
            font-size: 1.8rem;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
        }

        h1 i {
            color: var(--primary);
            font-size: 1.6rem;
        }

        .subtitle {
            color: var(--text-light);
            font-size: 0.95rem;
            margin-bottom: var(--space-md);
        }

        .timer-section {
            background: linear-gradient(135deg, rgba(248, 249, 255, 0.9), rgba(255, 255, 255, 0.9));
            border-radius: var(--radius-md);
            padding: var(--space-lg) var(--space-md);
            margin-bottom: var(--space-md);
            border: 1px solid rgba(106, 90, 249, 0.1);
            width: 100%;
        }

        #countdown {
            font-size: 3rem;
            font-weight: 700;
            color: var(--primary);
            display: inline-block;
            font-variant-numeric: tabular-nums;
            line-height: 1;
            margin-bottom: var(--space-xs);
        }

        .countdown-label {
            color: var(--text-light);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 2px;
            margin-bottom: var(--space-md);
        }

        .loading-bar {
            width: 100%;
            height: 10px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: var(--radius-sm);
            overflow: hidden;
        }

        .progress {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            border-radius: var(--radius-sm);
            transition: width 1s linear;
        }

        .ad-container {
            width: 100%;
            margin: var(--space-sm) 0;
            display: flex;
            justify-content: center;
            min-height: 100px;
            background: rgba(248, 249, 255, 0.5);
            border-radius: var(--radius-md);
            border: 1px solid rgba(106, 90, 249, 0.1);
            padding: 8px;
            position: relative;
        }

        .ad-container.ad-sticky {
            position: sticky;
            top: 10px;
            z-index: 100;
            min-height: 200px;
        }

        .ad-container.ad-footer {
            min-height: 200px;
        }

        .content-area {
            width: 100%;
            background: rgba(248, 249, 255, 0.6);
            border-radius: var(--radius-md);
            padding: var(--space-lg);
            margin-top: var(--space-md);
            border: 1px solid rgba(106, 90, 249, 0.1);
        }

        .info-box {
            display: flex;
            align-items: flex-start;
            gap: 12px;
            background: ${isCpaStep ? '#fff3e0' : '#e8f5e9'};
            border-left: 4px solid ${isCpaStep ? 'var(--warning)' : 'var(--success)'};
            padding: 14px 16px;
            border-radius: 8px;
            margin-bottom: var(--space-lg);
            text-align: left;
        }

        .info-box i {
            font-size: 1.3rem;
            color: ${isCpaStep ? 'var(--warning)' : 'var(--success)'};
        }

        .info-box-content strong {
            display: block;
            color: var(--dark);
            margin-bottom: 4px;
        }

        .info-box-content p {
            color: var(--text);
            font-size: 0.9rem;
        }

        .button-container {
            display: flex;
            justify-content: center;
        }

        .action-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: var(--space-sm);
            width: 100%;
            max-width: 280px;
            padding: 14px 28px;
            border-radius: 40px;
            font: 600 1rem 'Quicksand', sans-serif;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border: none;
            cursor: pointer;
            color: white;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            box-shadow: var(--shadow-sm);
            transition: all 0.3s ease;
            position: relative;
            overflow: hidden;
        }

        .action-button::before {
            content: '';
            position: absolute;
            top: 0;
            left: -100%;
            width: 100%;
            height: 100%;
            background: linear-gradient(90deg, transparent, rgba(255,255,255,0.3), transparent);
            transition: left 0.5s;
        }

        .action-button.cpa-button {
            background: linear-gradient(135deg, var(--success), #27ae60);
            box-shadow: 0 5px 15px rgba(46, 204, 113, 0.3);
        }

        .action-button.final-button {
            background: linear-gradient(135deg, var(--warning), #e67e22);
            box-shadow: 0 5px 15px rgba(243, 156, 18, 0.3);
        }

        .action-button:not(:disabled):hover {
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(106, 90, 249, 0.4);
        }

        .action-button:not(:disabled):hover::before {
            left: 100%;
        }

        .action-button:disabled {
            opacity: 0.6;
            cursor: not-allowed;
            box-shadow: none;
            transform: none;
        }

        .back-hint {
            text-align: center;
            margin-top: var(--space-md);
            padding: 12px;
            background: #e3f2fd;
            border-radius: 10px;
            display: none;
            animation: subtle-pulse 1.5s infinite;
        }

        .back-hint.show {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
        }

        .back-hint i {
            color: var(--success);
        }

        .force-advance {
            margin-top: var(--space-sm);
            font-size: 0.85rem;
            color: var(--text-light);
            cursor: pointer;
            text-decoration: underline;
            opacity: 0.7;
        }

        .force-advance:hover {
            opacity: 1;
        }

        footer {
            margin-top: var(--space-md);
            color: rgba(0,0,0,0.5);
            font-size: 0.8rem;
        }

        /* Modal */
        .modal-overlay {
            position: fixed;
            top: 0; left: 0; width: 100%; height: 100%;
            background: rgba(0,0,0,0.7);
            backdrop-filter: blur(5px);
            display: flex;
            justify-content: center;
            align-items: center;
            z-index: 10000;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s;
        }

        .modal-overlay.active {
            opacity: 1;
            visibility: visible;
        }

        .modal-box {
            background: white;
            padding: var(--space-lg);
            border-radius: var(--radius-lg);
            max-width: 360px;
            width: 90%;
            text-align: center;
            box-shadow: 0 20px 60px rgba(0,0,0,0.3);
            transform: scale(0.9);
            transition: all 0.3s ease;
        }

        .modal-overlay.active .modal-box {
            transform: scale(1);
        }

        .modal-box h3 {
            color: var(--error);
            margin-bottom: var(--space-sm);
        }

        .modal-close {
            margin-top: var(--space-md);
            padding: 10px 28px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 25px;
            cursor: pointer;
            font-weight: 600;
        }

        @keyframes subtle-pulse {
            0%, 100% { opacity: 0.7; }
            50% { opacity: 1; }
        }

        @media (max-width: 640px) {
            body { padding: var(--space-sm); }
            .container { padding: var(--space-lg) var(--space-md); }
            h1 { font-size: 1.5rem; }
            #countdown { font-size: 2.5rem; }
            .ad-container.ad-sticky, .ad-container.ad-footer { min-height: 150px; }
        }

        @media (max-width: 480px) {
            #countdown { font-size: 2rem; }
        }

        @media (prefers-reduced-motion: reduce) {
            * { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="step-badge">
            <i class="fas ${icone}"></i>
            <span>ETAPA ${etapa}/${totalSteps}</span>
        </div>
        
        <h1>
            <i class="fas ${icone}"></i>
            ${config.titulo}
        </h1>
        <p class="subtitle">${config.subtitulo}</p>
        
        <div class="timer-section">
            <div id="countdown">${config.timer}</div>
            <div class="countdown-label">SEGUNDOS RESTANTES</div>
            <div class="loading-bar">
                <div id="progressBar" class="progress"></div>
            </div>
        </div>
        
        ${config.temAnuncio ? `
        <div class="ad-container ad-sticky">
            <div id="container-57af132f9a89824d027d70445ba09a9a"></div>
        </div>
        <div class="ad-container ad-middle">
            <div id="container-57af132f9a89824d027d70445ba09a9a-2"></div>
        </div>
        <div class="ad-container ad-footer">
            <div id="container-57af132f9a89824d027d70445ba09a9a-3"></div>
        </div>
        ` : ''}
        
        <div class="content-area">
            <div class="info-box">
                <i class="fas ${isCpaStep ? 'fa-external-link-alt' : isFinalStep ? 'fa-trophy' : 'fa-clock'}"></i>
                <div class="info-box-content">
                    <strong>${isCpaStep ? 'Verificação necessária' : isFinalStep ? 'Pronto!' : 'Aguarde'}</strong>
                    <p>${isCpaStep ? 'Clique no botão para confirmar acesso' : isFinalStep ? 'Clique para acessar seu conteúdo' : 'O botão será liberado em breve'}</p>
                </div>
            </div>
            
            <div class="button-container">
                <button id="mainActionBtn" class="action-button ${isCpaStep ? 'cpa-button' : isFinalStep ? 'final-button' : ''}" disabled>
                    <i class="fas fa-hourglass-half"></i>
                    <span>Aguarde...</span>
                </button>
            </div>
            
            <div id="backHint" class="back-hint">
                <i class="fas fa-check-circle"></i>
                <strong>Já voltou? Clique para avançar!</strong>
            </div>
            
            <div class="force-advance" id="forceAdvance" style="display: none;">
                <i class="fas fa-arrow-right"></i> Avançar manualmente
            </div>
        </div>
        
        <footer>© 2026 Mr Doso Web</footer>
    </div>
    
    <div id="alertModal" class="modal-overlay">
        <div class="modal-box">
            <h3 id="alertTitle">Aviso</h3>
            <p id="alertMessage"></p>
            <button class="modal-close" onclick="closeModal()">OK</button>
        </div>
    </div>
    
    ${config.temAnuncio ? `
    <script>
        (function() {
            if (!window.adsterraLoaded) {
                window.adsterraLoaded = true;
                const script = document.createElement('script');
                script.src = '//pl27551656.revenuecpmgate.com/57af132f9a89824d027d70445ba09a9a/invoke.js';
                script.async = true;
                script.setAttribute('data-cfasync', 'false');
                document.head.appendChild(script);
                
                // Fallback Monetag se Adsterra falhar
                script.onerror = function() {
                    const monetag = document.createElement('script');
                    monetag.src = 'https://quge5.com/88/tag.min.js';
                    monetag.setAttribute('data-zone', '203209');
                    monetag.async = true;
                    document.head.appendChild(monetag);
                };
            }
        })();
    </script>
    ` : ''}
    
    <script>
        const CONFIG = {
            etapa: ${etapa},
            totalSteps: ${totalSteps},
            timer: ${config.timer},
            cpaLink: ${cpaLink ? JSON.stringify(cpaLink) : 'null'},
            sessionId: '${sessionId}',
            isCpaStep: ${isCpaStep},
            isFinalStep: ${isFinalStep},
            linkFinal: ${isFinalStep ? JSON.stringify(linkFinal) : 'null'}
        };
        
        let timeLeft = CONFIG.timer;
        let cpaOpened = false;
        let isProcessing = false;
        
        const countdownEl = document.getElementById('countdown');
        const progressBar = document.getElementById('progressBar');
        const mainBtn = document.getElementById('mainActionBtn');
        const backHint = document.getElementById('backHint');
        const forceAdvance = document.getElementById('forceAdvance');
        
        window.addEventListener('focus', () => {
            if (CONFIG.isCpaStep && cpaOpened && !isProcessing) {
                backHint.classList.add('show');
                forceAdvance.style.display = 'block';
            }
        });
        
        function startTimer() {
            if (CONFIG.timer === 0) {
                enableButton();
                return;
            }
            
            const totalTime = CONFIG.timer;
            countdownEl.textContent = timeLeft;
            progressBar.style.width = '0%';
            
            const interval = setInterval(() => {
                if (timeLeft > 0) {
                    timeLeft--;
                    countdownEl.textContent = timeLeft;
                    progressBar.style.width = ((totalTime - timeLeft) / totalTime) * 100 + '%';
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
                mainBtn.innerHTML = '<i class="fas fa-external-link-alt"></i><span>Acessar Conteúdo</span>';
                mainBtn.className = 'action-button final-button';
            } else if (CONFIG.isCpaStep) {
                if (!cpaOpened) {
                    mainBtn.innerHTML = '<i class="fas fa-external-link-alt"></i><span>Verificar Acesso</span>';
                    mainBtn.className = 'action-button cpa-button';
                } else {
                    mainBtn.innerHTML = '<i class="fas fa-arrow-right"></i><span>Continuar</span>';
                    mainBtn.className = 'action-button';
                }
            } else {
                mainBtn.innerHTML = '<i class="fas fa-arrow-right"></i><span>Continuar</span>';
                mainBtn.className = 'action-button';
            }
        }
        
        forceAdvance.addEventListener('click', () => {
            if (CONFIG.isCpaStep && !cpaOpened) {
                cpaOpened = true;
                enableButton();
                backHint.classList.add('show');
            }
        });
        
        mainBtn.addEventListener('click', async () => {
            if (isProcessing) return;
            if (timeLeft > 0 && CONFIG.timer > 0) {
                showModal('Aguarde', 'Faltam ' + timeLeft + ' segundos.');
                return;
            }
            
            isProcessing = true;
            
            if (CONFIG.isFinalStep) {
                window.location.href = CONFIG.linkFinal;
                return;
            }
            
            if (CONFIG.isCpaStep && !cpaOpened && CONFIG.cpaLink) {
                mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Abrindo...</span>';
                window.open(CONFIG.cpaLink, '_blank');
                cpaOpened = true;
                enableButton();
                backHint.classList.add('show');
                forceAdvance.style.display = 'block';
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
                        sessionId: CONFIG.sessionId 
                    })
                });
                
                const data = await response.json();
                
                if (data.redirect) {
                    window.location.href = data.redirect;
                } else {
                    showModal('Erro', data.error || 'Falha ao avançar');
                    mainBtn.disabled = false;
                    enableButton();
                }
            } catch (e) {
                showModal('Erro', 'Falha na conexão');
                mainBtn.disabled = false;
                enableButton();
            } finally {
                isProcessing = false;
            }
        });
        
        function showModal(title, msg) {
            document.getElementById('alertTitle').textContent = title;
            document.getElementById('alertMessage').textContent = msg;
            document.getElementById('alertModal').classList.add('active');
        }
        
        function closeModal() {
            document.getElementById('alertModal').classList.remove('active');
        }
        
        startTimer();
    </script>
</body>
</html>`;
}

// =================================================================
// INICIAR SERVIDOR
// =================================================================
app.listen(PORT, () => {
    console.log(`
    🚀 SERVIDOR RODANDO NA PORTA ${PORT}
    
    ✅ REDIS CLOUD CONECTADO!
    ✅ HELMET SEM RESTRIÇÕES - ADS FUNCIONANDO!
    🎨 DESIGN PREMIUM - SEU CSS APRIMORADO!
    📋 ${linksData.length} links carregados
    🔗 URLs LIMPAS - Sem tokens!
    `);
});