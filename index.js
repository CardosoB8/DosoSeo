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
const TOKEN_EXPIRATION_MS = 60 * 60 * 1000;
const SECRET_KEY = process.env.TOKEN_SECRET || crypto.randomBytes(64).toString('hex');

// Carregar links
let linksData = [];
try {
    linksData = require('./data/links.js');
    console.log('✅ Links carregados:', linksData.map(l => `${l.alias} (${l.steps || 6} etapas)`).join(', '));
} catch (error) {
    console.error('❌ Erro ao carregar links.js:', error.message);
    linksData = [];
}

// ============================================================
// CONFIGURAÇÃO BASE DAS ETAPAS (Template para qualquer número)
// ============================================================
const BASE_STEP_CONFIGS = {
    // Etapas ímpares: CPA (sem banner)
    impar: { temAnuncio: false, timer: 10, titulo: 'Verificação de Acesso', subtitulo: 'Confirmando que você não é um robô...', tipoBotao: 'cpa' },
    // Etapas pares: Banner (com anúncios)
    par: { temAnuncio: true, timer: 15, titulo: 'Processando Link', subtitulo: 'Estabelecendo conexão segura...', tipoBotao: 'normal' },
    // Última etapa (independente de par/ímpar)
    final: { temAnuncio: true, timer: 15, titulo: 'Link Pronto!', subtitulo: 'Seu conteúdo está disponível', tipoBotao: 'final' }
};

// Função para obter configuração de uma etapa específica
function getStepConfig(etapa, totalSteps) {
    if (etapa === totalSteps) {
        return { ...BASE_STEP_CONFIGS.final };
    }
    
    const isImpar = etapa % 2 === 1;
    const baseConfig = isImpar ? BASE_STEP_CONFIGS.impar : BASE_STEP_CONFIGS.par;
    
    // Personaliza títulos conforme a etapa
    const titulos = {
        1: 'Verificação Inicial',
        2: 'Conexão Segura',
        3: 'Confirmação Adicional', 
        4: 'Otimização de Rede',
        5: 'Verificação Final',
        6: 'Preparando Conteúdo'
    };
    
    const subtitulos = {
        1: 'Confirmando que você não é um robô...',
        2: 'Estabelecendo túnel criptografado...',
        3: 'Última verificação de segurança...',
        4: 'Acelerando conexão com o servidor...',
        5: 'Quase pronto! Última confirmação...',
        6: 'Descriptografando link de destino...'
    };
    
    return {
        ...baseConfig,
        titulo: titulos[etapa] || baseConfig.titulo,
        subtitulo: subtitulos[etapa] || baseConfig.subtitulo
    };
}

// Links CPA
const CPA_LINKS = [
    'https://omg10.com/4/10420694',
    'https://www.effectivegatecpm.com/ki4e3ftt5h?key=99415bf2c750643bbcc7c1380848fee9',
    'https://pertlouv.com/pZ0Ob1Vxs8U=?',
    'https://record.elephantbet.com/_rhoOOvBxBOAWqcfzuvZcQGNd7ZgqdRLk/1/',
    'https://media1.placard.co.mz/redirect.aspx?pid=5905&bid=1690',
    'https://affiliates.bantubet.co.mz/links/?btag=2307928',
    'https://bony-teaching.com/KUN7HR'
];

// ============================================================
// FUNÇÕES DO TOKEN (CORRIGIDAS - Agora com totalSteps do link)
// ============================================================
function createToken(alias, totalSteps) {
    const payload = {
        alias: alias,
        totalSteps: totalSteps,  // ← AGORA VEM DO LINK
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
    
    // Codificação segura para URL (substitui caracteres problemáticos)
    const base64Data = Buffer.from(data).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    return base64Data + '.' + signature;
}

function verifyToken(token) {
    if (!token) return null;
    
    try {
        const parts = token.split('.');
        if (parts.length !== 2) {
            console.log('❌ Token malformado (não tem 2 partes)');
            return null;
        }
        
        const [encodedData, signature] = parts;
        
        // Decodificação segura (reverte substituições)
        let base64Data = encodedData
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        
        // Adiciona padding se necessário
        while (base64Data.length % 4) {
            base64Data += '=';
        }
        
        const data = Buffer.from(base64Data, 'base64').toString('utf8');
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
        console.error('❌ Erro ao verificar token:', e.message);
        return null;
    }
}

function avancarEtapa(tokenAntigo) {
    const payload = verifyToken(tokenAntigo);
    if (!payload) return null;
    
    const novaEtapa = payload.etapa_atual + 1;
    
    // AGORA USA O TOTAL STEPS DO TOKEN (que veio do link)
    if (novaEtapa > payload.totalSteps) {
        console.log(`⚠️ Tentativa de avançar além da última etapa (${payload.totalSteps})`);
        return null;
    }
    
    const novoPayload = {
        alias: payload.alias,
        totalSteps: payload.totalSteps,  // ← MANTÉM O MESMO TOTAL
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
    
    const base64Data = Buffer.from(data).toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
    
    return base64Data + '.' + signature;
}

function getRandomCpaLink() {
    return CPA_LINKS[Math.floor(Math.random() * CPA_LINKS.length)];
}

// ============================================================
// ROTAS
// ============================================================
app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Rota das etapas - AGORA USA O TOTAL STEPS DO TOKEN
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
        return res.send(tokenExpiradoHTML());
    }
    
    // Verifica se a etapa solicitada é a correta
    if (step !== payload.etapa_atual) {
        console.log(`⚠️ Redirecionando: etapa correta é ${payload.etapa_atual}`);
        return res.redirect(`/page${payload.etapa_atual}?token=${token}`);
    }
    
    // Verifica se a etapa está dentro do total
    if (step > payload.totalSteps) {
        console.log(`❌ Etapa ${step} maior que total ${payload.totalSteps}`);
        return res.redirect('/');
    }
    
    const link = linksData.find(l => l.alias === payload.alias);
    if (!link) {
        console.log(`❌ Alias não encontrado: ${payload.alias}`);
        return res.redirect('/');
    }
    
    // Obtém configuração DINÂMICA baseada na etapa e total
    const config = getStepConfig(step, payload.totalSteps);
    
    // Gera link CPA apenas para etapas ímpares (exceto a última)
    const cpaLink = (!config.temAnuncio && step < payload.totalSteps) ? getRandomCpaLink() : null;
    
    res.send(gerarHTMLPagina(step, payload.totalSteps, config, token, cpaLink, link.original_url));
});

// API para avançar etapa - CORRIGIDA
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
    
    if (payload.etapa_atual !== clientStep) {
        return res.status(400).json({ error: 'Sequência inválida', redirect: '/' });
    }
    
    // VERIFICAÇÃO CORRETA: Usa o totalSteps do token
    if (clientStep >= payload.totalSteps) {
        console.log(`✅ Finalizado! Redirecionando para: ${link.original_url}`);
        return res.json({ 
            redirect: link.original_url,
            final: true
        });
    }
    
    const novoToken = avancarEtapa(token);
    if (!novoToken) {
        return res.status(500).json({ error: 'Erro ao avançar etapa', redirect: '/' });
    }
    
    const novaEtapa = clientStep + 1;
    console.log(`✅ Avançando: etapa ${clientStep} → ${novaEtapa} (total: ${payload.totalSteps})`);
    
    return res.json({ 
        redirect: `/page${novaEtapa}?token=${novoToken}`,
        final: false
    });
});

// API para obter configuração da etapa
app.get('/api/step-config', (req, res) => {
    const token = req.query.token;
    
    if (!token) {
        return res.status(400).json({ error: 'Token ausente' });
    }
    
    const payload = verifyToken(token);
    if (!payload) {
        return res.status(403).json({ error: 'Token inválido' });
    }
    
    const config = getStepConfig(payload.etapa_atual, payload.totalSteps);
    const cpaLink = (!config.temAnuncio && payload.etapa_atual < payload.totalSteps) ? getRandomCpaLink() : null;
    
    res.json({
        etapa: payload.etapa_atual,
        totalSteps: payload.totalSteps,
        ...config,
        cpaLink: cpaLink
    });
});

// Rota de entrada (encurtador) - AGORA PASSA O STEPS DO LINK
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.find(l => l.alias === alias);
    
    console.log(`🔗 Acessando alias: ${alias}`);
    
    if (link) {
        const totalSteps = link.steps || 4;  // ← USA O VALOR DO LINK (default 4)
        const token = createToken(alias, totalSteps);
        console.log(`✅ Token criado para ${alias} (${totalSteps} etapas)`);
        res.redirect(`/page1?token=${token}`);
    } else {
        console.log(`❌ Alias não encontrado: ${alias}`);
        res.redirect('/');
    }
});

// ============================================================
// FUNÇÃO: Gerar HTML da página (com múltiplos banners)
// ============================================================
function gerarHTMLPagina(etapa, totalSteps, config, token, cpaLink, linkFinal) {
    const scriptMonetag = config.temAnuncio 
        ? '<script src="https://quge5.com/88/tag.min.js" data-zone="203209" async data-cfasync="false"></script>'
        : '';
    
    const bannersAdsterra = config.temAnuncio
        ? `
        <div class="ad-container ad-sticky">
            <script async="async" data-cfasync="false" src="//pl27551656.revenuecpmgate.com/57af132f9a89824d027d70445ba09a9a/invoke.js"></script>
            <div id="container-57af132f9a89824d027d70445ba09a9a"></div>
        </div>
        <div class="ad-container ad-middle">
            <script async="async" data-cfasync="false" src="//pl27551656.revenuecpmgate.com/57af132f9a89824d027d70445ba09a9a/invoke.js"></script>
            <div id="container-57af132f9a89824d027d70445ba09a9a-2"></div>
        </div>
        <div class="ad-container ad-footer">
            <script async="async" data-cfasync="false" src="//pl27551656.revenuecpmgate.com/57af132f9a89824d027d70445ba09a9a/invoke.js"></script>
            <div id="container-57af132f9a89824d027d70445ba09a9a-3"></div>
        </div>
        `
        : '';
    
    const isCpaStep = !config.temAnuncio && etapa < totalSteps;
    const isFinalStep = etapa === totalSteps;
    
    return `<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, user-scalable=no">
    <title>Mr Doso - ${config.titulo}</title>
    ${scriptMonetag}
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #6a5af9;
            --secondary: #d66efd;
            --accent: #4ce0b3;
            --dark: #2d2b55;
            --text: #33334d;
            --text-light: #6c757d;
            --success: #2ecc71;
            --warning: #f39c12;
            --error: #e74c3c;
            --radius-lg: 20px;
            --radius-xl: 30px;
            --shadow-lg: 0 15px 35px rgba(0, 0, 0, 0.12);
        }
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Quicksand', sans-serif;
            background: linear-gradient(135deg, #f5f7fa 0%, #e4e7f1 100%);
            min-height: 100vh;
            padding: 20px;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        .container {
            background: rgba(255, 255, 255, 0.95);
            backdrop-filter: blur(10px);
            border-radius: var(--radius-xl);
            box-shadow: var(--shadow-lg);
            width: 100%;
            max-width: 750px;
            padding: 30px;
            position: relative;
            overflow: hidden;
        }
        .container::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 100%; height: 5px;
            background: linear-gradient(90deg, var(--primary), var(--secondary), var(--accent));
        }
        .step-badge {
            display: inline-block;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            color: white;
            padding: 8px 20px;
            border-radius: 50px;
            font-size: 0.9rem;
            font-weight: 600;
            margin-bottom: 20px;
        }
        h1 { font-size: 1.8rem; color: var(--dark); margin-bottom: 10px; font-weight: 700; }
        .subtitle { color: var(--text-light); font-size: 1rem; margin-bottom: 20px; }
        .timer-section {
            background: linear-gradient(135deg, rgba(248, 249, 255, 0.9), rgba(255, 255, 255, 0.9));
            border-radius: var(--radius-lg);
            padding: 25px;
            margin-bottom: 20px;
            border: 1px solid rgba(106, 90, 249, 0.1);
        }
        #countdown {
            font-size: 3.5rem;
            font-weight: 700;
            color: var(--primary);
            text-align: center;
            font-variant-numeric: tabular-nums;
        }
        .countdown-label {
            text-align: center;
            color: var(--text-light);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 2px;
        }
        .loading-bar {
            width: 100%;
            height: 12px;
            background: rgba(0, 0, 0, 0.05);
            border-radius: 10px;
            overflow: hidden;
            margin: 20px 0;
        }
        .progress {
            width: 0%;
            height: 100%;
            background: linear-gradient(90deg, var(--primary), var(--accent));
            border-radius: 10px;
            transition: width 1s linear;
        }
        .ad-container {
            width: 100%;
            margin: 15px 0;
            display: flex;
            justify-content: center;
            min-height: 100px;
            background: rgba(248, 249, 255, 0.5);
            border-radius: 15px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.05);
            border: 1px solid rgba(106, 90, 249, 0.1);
            padding: 5px;
            position: relative;
        }
        .ad-container.ad-sticky {
            position: sticky;
            top: 10px;
            z-index: 100;
            min-height: 250px;
        }
        .ad-container.ad-middle { min-height: 120px; }
        .ad-container.ad-footer { min-height: 250px; }
        .ad-container.ad-middle::before {
            content: "Publicidade";
            position: absolute;
            top: -18px;
            left: 0;
            font-size: 10px;
            color: #999;
            text-transform: uppercase;
        }
        .content-area {
            background: rgba(248, 249, 255, 0.7);
            border-radius: var(--radius-lg);
            padding: 25px;
            margin-top: 20px;
            border: 1px solid rgba(106, 90, 249, 0.1);
        }
        .info-box {
            background: ${isCpaStep ? '#fff3e0' : '#e8f5e9'};
            border-left: 4px solid ${isCpaStep ? 'var(--warning)' : 'var(--success)'};
            padding: 15px;
            border-radius: 8px;
            margin-bottom: 20px;
        }
        .button-container { display: flex; justify-content: center; }
        .action-button {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 10px;
            width: 100%;
            max-width: 400px;
            padding: 18px 40px;
            border-radius: 50px;
            font: 700 1.2rem 'Quicksand', sans-serif;
            text-transform: uppercase;
            border: none;
            cursor: pointer;
            color: white;
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            box-shadow: 0 8px 25px rgba(106, 90, 249, 0.4);
            transition: all 0.3s ease;
        }
        .action-button.cpa-button { background: linear-gradient(135deg, var(--success), #27ae60); }
        .action-button.final-button { background: linear-gradient(135deg, var(--warning), #e67e22); }
        .action-button:disabled {
            background: #bdc3c7;
            cursor: not-allowed;
            box-shadow: none;
        }
        .action-button:not(:disabled):hover {
            transform: translateY(-3px);
            box-shadow: 0 12px 30px rgba(106, 90, 249, 0.6);
        }
        .back-hint {
            text-align: center;
            margin-top: 15px;
            padding: 12px;
            background: #e3f2fd;
            border-radius: 10px;
            display: none;
            animation: pulse 1.5s infinite;
        }
        .back-hint.show { display: block; }
        @keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.7} }
        footer {
            margin-top: 30px;
            color: var(--text-light);
            font-size: 0.85rem;
            text-align: center;
        }
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
        .modal-overlay.active { opacity: 1; visibility: visible; }
        .modal-box {
            background: white;
            padding: 30px;
            border-radius: 20px;
            max-width: 400px;
            width: 90%;
            text-align: center;
        }
        .modal-box h3 { color: var(--error); margin-bottom: 10px; }
        .modal-close {
            margin-top: 20px;
            padding: 12px 30px;
            background: var(--primary);
            color: white;
            border: none;
            border-radius: 10px;
            cursor: pointer;
            font-weight: bold;
        }
        .force-advance {
            margin-top: 15px;
            font-size: 0.85rem;
            color: var(--text-light);
            cursor: pointer;
            text-decoration: underline;
            opacity: 0.7;
        }
        .force-advance:hover { opacity: 1; }
        @media (max-width: 768px) {
            .container { padding: 20px; }
            h1 { font-size: 1.5rem; }
            #countdown { font-size: 2.8rem; }
            .ad-container.ad-sticky { min-height: 100px; }
            .ad-container.ad-footer { min-height: 100px; }
        }
        @media (max-width: 480px) {
            #countdown { font-size: 2.3rem; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="step-badge">
            <i class="fas fa-shield-alt"></i> ETAPA ${etapa}/${totalSteps}
        </div>
        <h1>${config.titulo}</h1>
        <p class="subtitle">${config.subtitulo}</p>
        
        <div class="timer-section">
            <div id="countdown">${config.timer}</div>
            <div class="countdown-label">SEGUNDOS RESTANTES</div>
            <div class="loading-bar">
                <div id="progressBar" class="progress"></div>
            </div>
            <p style="text-align: center; color: var(--text-light); margin-top: 10px;">
                <i class="fas fa-arrow-down"></i> Role para continuar
            </p>
        </div>
        
        ${bannersAdsterra}
        
        <div class="content-area">
            <div class="info-box">
                <i class="fas ${isCpaStep ? 'fa-external-link-alt' : isFinalStep ? 'fa-trophy' : 'fa-clock'}"></i> 
                <strong>${isCpaStep ? 'Verificação necessária:' : isFinalStep ? 'Pronto!' : 'Aguarde:'}</strong> 
                ${isCpaStep ? 'Clique no botão para confirmar acesso' : isFinalStep ? 'Clique para acessar seu conteúdo' : 'O botão será liberado em breve'}
            </div>
            
            <div class="button-container">
                <button id="mainActionBtn" class="action-button ${isCpaStep ? 'cpa-button' : isFinalStep ? 'final-button' : ''}" disabled>
                    <i class="fas fa-hourglass-half"></i> Aguarde...
                </button>
            </div>
            
            <div id="backHint" class="back-hint">
                <i class="fas fa-undo-alt"></i> 
                <strong>Já voltou?</strong> Clique no botão acima para avançar!
            </div>
            
            <div class="force-advance" id="forceAdvance" style="display: none;">
                <i class="fas fa-exclamation-triangle"></i> Problemas? Clique aqui para avançar manualmente
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
    
    <script>
        const CONFIG = {
            etapa: ${etapa},
            totalSteps: ${totalSteps},
            timer: ${config.timer},
            cpaLink: ${cpaLink ? JSON.stringify(cpaLink) : 'null'},
            token: '${token}',
            isCpaStep: ${isCpaStep},
            isFinalStep: ${isFinalStep},
            linkFinal: ${isFinalStep ? JSON.stringify(linkFinal) : 'null'}
        };
        
        let timeLeft = CONFIG.timer;
        let cpaOpened = false;
        let isProcessing = false;
        let tabBlurred = false;
        
        const countdownEl = document.getElementById('countdown');
        const progressBar = document.getElementById('progressBar');
        const mainBtn = document.getElementById('mainActionBtn');
        const backHint = document.getElementById('backHint');
        const forceAdvance = document.getElementById('forceAdvance');
        
        window.addEventListener('blur', () => { tabBlurred = true; });
        window.addEventListener('focus', () => {
            if (tabBlurred && CONFIG.isCpaStep && cpaOpened && !isProcessing) {
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
                mainBtn.innerHTML = '<i class="fas fa-download"></i> ACESSAR CONTEÚDO FINAL';
                mainBtn.className = 'action-button final-button';
            } else if (CONFIG.isCpaStep) {
                if (!cpaOpened) {
                    mainBtn.innerHTML = '<i class="fas fa-external-link-alt"></i> VERIFICAR ACESSO';
                    mainBtn.className = 'action-button cpa-button';
                } else {
                    mainBtn.innerHTML = '<i class="fas fa-check"></i> JÁ VERIFIQUEI, AVANÇAR';
                    mainBtn.className = 'action-button';
                }
            } else {
                mainBtn.innerHTML = '<i class="fas fa-arrow-right"></i> CONTINUAR';
                mainBtn.className = 'action-button';
            }
        }
        
        forceAdvance.addEventListener('click', () => {
            if (CONFIG.isCpaStep && !cpaOpened) {
                cpaOpened = true;
                enableButton();
                backHint.classList.add('show');
                showModal('Dica', 'Agora clique no botão "JÁ VERIFIQUEI, AVANÇAR" para continuar.');
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
                try {
                    window.open('https://media1.placard.co.mz/redirect.aspx?pid=5905&bid=1690', '_blank');
                } catch(e) {}
                setTimeout(() => { window.location.href = CONFIG.linkFinal; }, 300);
                return;
            }
            
            if (CONFIG.isCpaStep && !cpaOpened && CONFIG.cpaLink) {
                mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> ABRINDO...';
                window.open(CONFIG.cpaLink, '_blank');
                cpaOpened = true;
                tabBlurred = true;
                
                enableButton();
                backHint.classList.add('show');
                forceAdvance.style.display = 'block';
                
                isProcessing = false;
                return;
            }
            
            mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> PROCESSANDO...';
            mainBtn.disabled = true;
            
            try {
                const response = await fetch('/api/next-step?token=' + CONFIG.token + '&currentStep=' + CONFIG.etapa);
                const data = await response.json();
                
                if (data.redirect) {
                    if (data.final) {
                        try {
                            window.open('https://media1.placard.co.mz/redirect.aspx?pid=5905&bid=1690', '_blank');
                        } catch(e) {}
                        setTimeout(() => { window.location.href = data.redirect; }, 300);
                    } else {
                        window.location.href = data.redirect;
                    }
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

function tokenExpiradoHTML() {
    return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Token Expirado</title>
    <style>
        body{font-family:system-ui;display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0;padding:20px;background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);}
        .card{background:white;border-radius:20px;padding:40px;text-align:center;max-width:400px;}
        button{background:#6a5af9;color:white;border:none;padding:15px 40px;border-radius:50px;font-size:16px;cursor:pointer;}
    </style>
</head>
<body>
    <div class="card">
        <h2>⏰ Token Expirado</h2>
        <p>Seu link expirou. Recomece o processo.</p>
        <button onclick="window.location.href='/'">Recomeçar</button>
    </div>
</body>
</html>`;
}

// ============================================================
// INICIAR SERVIDOR
// ============================================================
app.listen(PORT, () => {
    console.log(`\n🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📋 ESTRATÉGIA: Etapas dinâmicas baseadas no links.js`);
    console.log(`📊 Padrão: Etapas ímpares = CPA | Etapas pares = Banner | Última = Final`);
    console.log(`💰 Configuração carregada para cada link individualmente`);
    console.log(`✅ Links: ${linksData.map(l => `${l.alias} (${l.steps || 4} etapas)`).join(', ')}\n`);
});