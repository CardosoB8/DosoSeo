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
});

// Carregar itens
let currentCategory = 'todos';
let currentPage = 1;
let isLoading = false;
let hasMore = true;

const grid = document.getElementById('itemsGrid');
const searchInput = document.getElementById('searchInput');

async function loadItems(search = '') {
    if (isLoading) return;
    isLoading = true;
    
    try {
        const response = await fetch(`/api/items?categoria=${currentCategory}&page=${currentPage}`);
        const data = await response.json();
        
        if (currentPage === 1) {
            grid.innerHTML = '';
        }
        
        let items = data.items;
        
        if (search) {
            items = items.filter(item => 
                item.titulo.toLowerCase().includes(search.toLowerCase()) ||
                (item.descricao && item.descricao.toLowerCase().includes(search.toLowerCase()))
            );
        }
        
        if (items.length === 0 && currentPage === 1) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-box-open"></i>
                    <h3>Nenhum item encontrado</h3>
                    <p>Tente outra categoria ou busca</p>
                </div>
            `;
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
        if (currentPage === 1) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Erro ao carregar</h3>
                    <p>Tente novamente mais tarde</p>
                </div>
            `;
        }
    } finally {
        isLoading = false;
    }
}

function createItemCard(item) {
    const div = document.createElement('div');
    div.className = 'item-card';
    div.onclick = () => window.location.href = `/item/${item.id}`;
    
    div.innerHTML = `
        <img src="${item.imagem || 'https://via.placeholder.com/300x200/667eea/ffffff?text=' + encodeURIComponent(item.titulo)}" 
             alt="${item.titulo}" 
             class="item-image"
             onerror="this.src='https://via.placeholder.com/300x200/667eea/ffffff?text=Sem+Imagem'">
        <div class="item-info">
            <h3 class="item-title">${item.titulo}</h3>
            <p class="item-description">${item.descricao || 'Clique para ver mais detalhes'}</p>
            <div class="item-meta">
                <span class="item-category">${item.categoria || 'Geral'}</span>
                <span class="item-downloads">
                    <i class="fas fa-download"></i>
                    ${formatNumber(item.downloads || 0)}
                </span>
            </div>
            <button class="download-btn" onclick="event.stopPropagation(); startDownload('${item.id}')">
                <i class="fas fa-download"></i>
                Baixar Agora
            </button>
        </div>
    `;
    
    return div;
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

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
    loadItems();
    
    // Categorias
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
                loadItems(searchInput.value);
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
});