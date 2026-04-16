let config = {
    etapa: 1,
    totalSteps: 3,
    timer: 20,
    cpaLink: null,
    temAdsterra: false,
    temCPA: false,
    isFinalStep: false,
    cpaJaAberto: false
};

let timeLeft = 20;
let cpaOpened = false;
let isProcessing = false;
let sessionId = '';

// Pegar sessionId do cookie
function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts.pop().split(';').shift();
    return null;
}

// Configuração do tema
function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', theme);
}

// Carregar configuração da etapa
async function loadStepConfig() {
    try {
        sessionId = getCookie('dsessId');
        
        const response = await fetch('/api/step-config', {
            headers: { 'x-session-id': sessionId }
        });
        
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        const data = await response.json();
        config = data;
        timeLeft = config.timer;
        cpaOpened = config.cpaJaAberto || false;
        
        updateUI();
        startTimer();
    } catch (error) {
        console.error('Erro ao carregar configuração:', error);
        window.location.href = '/';
    }
}

function updateUI() {
    // Atualizar etapas
    const progressSteps = document.getElementById('progressSteps');
    progressSteps.innerHTML = '';
    
    for (let i = 1; i <= config.totalSteps; i++) {
        const dot = document.createElement('div');
        dot.className = 'step-dot';
        
        if (i < config.etapa) {
            dot.classList.add('completed');
            dot.innerHTML = '<i class="fas fa-check"></i>';
        } else if (i === config.etapa) {
            dot.classList.add('active');
            dot.textContent = i;
        } else {
            dot.textContent = i;
        }
        
        progressSteps.appendChild(dot);
    }
    
    // Atualizar barra de progresso
    const progressFill = document.getElementById('progressFill');
    progressFill.style.width = `${(config.etapa / config.totalSteps) * 100}%`;
    
    // Atualizar título e subtítulo
    document.getElementById('stepTitle').innerHTML = `
        <i class="fas ${config.icone}"></i>
        <span>${config.titulo}</span>
    `;
    document.getElementById('stepSubtitle').textContent = config.subtitulo;
    
    // Atualizar info box
    const infoTitle = document.getElementById('infoTitle');
    const infoText = document.getElementById('infoText');
    const infoBox = document.getElementById('infoBox');
    const infoIcon = infoBox.querySelector('i');
    
    if (config.temCPA) {
        infoIcon.className = 'fas fa-user-check';
        infoTitle.textContent = 'Verificação de segurança';
        infoText.textContent = 'Clique no botão abaixo para confirmar seu acesso';
    } else if (config.isFinalStep) {
        infoIcon.className = 'fas fa-trophy';
        infoTitle.textContent = 'Pronto para acessar!';
        infoText.textContent = 'Seu conteúdo está pronto';
    } else {
        infoIcon.className = 'fas fa-shield-alt';
        infoTitle.textContent = 'Aguarde um momento';
        infoText.textContent = 'O botão será liberado em breve';
    }
    
    // Mostrar/esconder Adsterra
    const adsterraContainer = document.getElementById('adsterraContainer');
    if (config.temAdsterra) {
        adsterraContainer.style.display = 'flex';
        if (!window.adsterraLoaded) {
            window.adsterraLoaded = true;
            const script = document.createElement('script');
            script.src = '//pl27551656.revenuecpmgate.com/57af132f9a89824d027d70445ba09a9a/invoke.js';
            script.async = true;
            script.setAttribute('data-cfasync', 'false');
            document.head.appendChild(script);
        }
    } else {
        adsterraContainer.style.display = 'none';
    }
    
    // Mostrar oferta bônus na etapa final
    const bonusOffer = document.getElementById('bonusOffer');
    if (config.isFinalStep && config.temCPA) {
        bonusOffer.style.display = 'inline-block';
    } else {
        bonusOffer.style.display = 'none';
    }
    
    // Atualizar contador
    document.getElementById('countdown').textContent = timeLeft;
}

function enableButton() {
    const mainBtn = document.getElementById('mainActionBtn');
    mainBtn.disabled = false;
    
    if (config.isFinalStep) {
        mainBtn.innerHTML = `<i class="fas fa-external-link-alt"></i><span>${config.botaoTexto}</span>`;
        mainBtn.className = 'action-button final-button';
    } else if (config.temCPA) {
        if (!cpaOpened) {
            mainBtn.innerHTML = `<i class="fas fa-external-link-alt"></i><span>${config.botaoTexto}</span>`;
            mainBtn.className = 'action-button cpa-button';
        } else {
            mainBtn.innerHTML = '<i class="fas fa-arrow-right"></i><span>Continuar</span>';
            mainBtn.className = 'action-button';
        }
    } else {
        mainBtn.innerHTML = `<i class="fas fa-arrow-right"></i><span>${config.botaoTexto}</span>`;
        mainBtn.className = 'action-button';
    }
}

function startTimer() {
    if (config.timer === 0) {
        enableButton();
        return;
    }
    
    const countdownEl = document.getElementById('countdown');
    
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

async function nextStep() {
    if (isProcessing) return;
    if (timeLeft > 0 && config.timer > 0) {
        alert(`Aguarde ${timeLeft} segundos.`);
        return;
    }
    
    isProcessing = true;
    const mainBtn = document.getElementById('mainActionBtn');
    
    if (config.isFinalStep) {
        mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Redirecionando...</span>';
        
        try {
            const response = await fetch('/api/next-step', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    currentStep: config.etapa, 
                    sessionId,
                    cpaOpened
                })
            });
            
            const data = await response.json();
            
            if (data.redirect) {
                window.location.href = data.redirect;
            }
        } catch (error) {
            alert('Erro de conexão');
            isProcessing = false;
            enableButton();
        }
        return;
    }
    
    if (config.temCPA && !cpaOpened && config.cpaLink) {
        mainBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i><span>Abrindo...</span>';
        window.open(config.cpaLink, '_blank');
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
                currentStep: config.etapa, 
                sessionId,
                cpaOpened
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
}

// Inicializar
document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    loadStepConfig();
    
    document.getElementById('mainActionBtn').addEventListener('click', nextStep);
    
    const bonusOffer = document.getElementById('bonusOffer');
    if (bonusOffer) {
        bonusOffer.addEventListener('click', () => {
            // CPA bônus (lista fixa)
            const bonusLinks = [
                'https://omg10.com/4/10420694',
                'https://pertlouv.com/pZ0Ob1Vxs8U=?',
                'https://bony-teaching.com/KUN7HR'
            ];
            const randomLink = bonusLinks[Math.floor(Math.random() * bonusLinks.length)];
            window.open(randomLink, '_blank');
        });
    }
});