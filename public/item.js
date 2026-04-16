// Configuração do tema
function initTheme() {
    const theme = localStorage.getItem('theme') || 'dark';
    document.body.setAttribute('data-theme', theme);
    updateThemeButton(theme);
}

function updateThemeButton(theme) {
    const btn = document.getElementById('themeToggle');
    if (btn) {
        btn.innerHTML = theme === 'dark' 
            ? '<i class="fas fa-sun"></i><span>Claro</span>'
            : '<i class="fas fa-moon"></i><span>Escuro</span>';
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    
    const themeToggle = document.getElementById('themeToggle');
    if (themeToggle) {
        themeToggle.addEventListener('click', () => {
            const currentTheme = document.body.getAttribute('data-theme');
            const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
            document.body.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
            updateThemeButton(newTheme);
        });
    }
    
    loadItem();
});

async function loadItem() {
    const itemId = window.location.pathname.split('/').pop();
    const container = document.getElementById('itemDetail');
    
    try {
        const response = await fetch(`/api/item/${itemId}`);
        
        if (!response.ok) {
            window.location.href = '/';
            return;
        }
        
        const item = await response.json();
        
        container.innerHTML = `
            <div class="item-header">
                <img src="${item.imagem || 'https://via.placeholder.com/1000x400/667eea/ffffff?text=' + encodeURIComponent(item.titulo)}" 
                     alt="${item.titulo}"
                     onerror="this.src='https://via.placeholder.com/1000x400/667eea/ffffff?text=Sem+Imagem'">
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
                    <button class="download-btn-large" onclick="startDownload('${itemId}')">
                        <i class="fas fa-download"></i>
                        Baixar Agora
                    </button>
                    
                    <div class="stats">
                        <div class="stat-item">
                            <i class="fas fa-download"></i>
                            <span>${formatNumber(item.downloads || 0)} downloads</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-eye"></i>
                            <span>${formatNumber(item.visualizacoes || 0)} visualizações</span>
                        </div>
                    </div>
                </div>
            </div>
        `;
    } catch (error) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-exclamation-triangle"></i>
                <h3>Erro ao carregar</h3>
                <p>Tente novamente mais tarde</p>
            </div>
        `;
    }
}

async function startDownload(itemId) {
    try {
        const response = await fetch(`/api/start-download/${itemId}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        const data = await response.json();
        
        if (data.redirect) {
            window.location.href = data.redirect;
        } else {
            alert('Erro ao iniciar download');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}

function formatNumber(num) {
    if (num >= 1000) {
        return (num / 1000).toFixed(1) + 'k';
    }
    return num.toString();
}