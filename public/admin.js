let chart = null;
let currentItems = [];

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

// Verificar se está na página de login
function isLoginPage() {
    return window.location.pathname === '/admin-login';
}

// Verificar se está no painel admin
function isAdminPanel() {
    return window.location.pathname === '/admin-panel';
}

// Login
if (isLoginPage()) {
    document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        
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
                    window.location.href = '/admin-panel';
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
    });
}

// Painel Admin
if (isAdminPanel()) {
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
        
        loadStats();
        loadItems();
        
        document.getElementById('newItemBtn').addEventListener('click', () => openItemModal());
        document.getElementById('logoutBtn').addEventListener('click', logout);
        document.getElementById('changePasswordBtn').addEventListener('click', openPasswordModal);
        document.getElementById('itemForm').addEventListener('submit', saveItem);
        document.getElementById('passwordForm').addEventListener('submit', changePassword);
        
        setInterval(loadStats, 30000);
    });
}

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
            viewsChange.innerHTML = `<i class="fas fa-arrow-up"></i> +${viewsDiff} vs ontem`;
            viewsChange.className = 'stat-change';
        } else {
            viewsChange.innerHTML = `<i class="fas fa-arrow-down"></i> ${viewsDiff} vs ontem`;
            viewsChange.className = 'stat-change negative';
        }
        
        const downloadsDiff = data.today.downloads - data.yesterday.downloads;
        const downloadsChange = document.getElementById('downloadsChange');
        if (downloadsDiff >= 0) {
            downloadsChange.innerHTML = `<i class="fas fa-arrow-up"></i> +${downloadsDiff} vs ontem`;
            downloadsChange.className = 'stat-change';
        } else {
            downloadsChange.innerHTML = `<i class="fas fa-arrow-down"></i> ${downloadsDiff} vs ontem`;
            downloadsChange.className = 'stat-change negative';
        }
        
        // Gráfico
        const ctx = document.getElementById('statsChart').getContext('2d');
        if (chart) chart.destroy();
        
        const theme = document.body.getAttribute('data-theme');
        const textColor = theme === 'dark' ? '#a0a0a0' : '#6c757d';
        const gridColor = theme === 'dark' ? '#0f3460' : '#e0e0e0';
        
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
                    legend: { labels: { color: textColor } }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: { color: gridColor },
                        ticks: { color: textColor }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor }
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
        
        if (data.items.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center;">Nenhum item cadastrado</td></tr>';
            return;
        }
        
        data.items.forEach(item => {
            const conversionRate = item.visualizacoes > 0 
                ? ((item.downloads / item.visualizacoes) * 100).toFixed(1) 
                : '0';
            
            tbody.innerHTML += `
                <tr>
                    <td>${item.titulo}</td>
                    <td>${item.categoria || 'outros'}</td>
                    <td>${item.visualizacoes}</td>
                    <td>${item.downloads}</td>
                    <td>${conversionRate}%</td>
                    <td>${item.ativo === 'true' ? '✅ Ativo' : '❌ Inativo'}</td>
                    <td class="item-actions">
                        <button class="action-btn" onclick="editItem('${item.id}')">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="action-btn delete" onclick="deleteItem('${item.id}')">
                            <i class="fas fa-trash"></i>
                        </button>
                    </td>
                </tr>
            `;
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
            document.getElementById('itemCategoria').value = item.categoria || 'outros';
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
        const response = await fetch(`/admin/api/item/${itemId}`, { method: 'DELETE' });
        const data = await response.json();
        
        if (data.success) {
            loadItems();
            loadStats();
        }
    } catch (error) {
        alert('Erro ao excluir item');
    }
}

async function saveItem(e) {
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
        } else {
            alert(data.error || 'Erro ao salvar item');
        }
    } catch (error) {
        alert('Erro de conexão');
    }
}

function openPasswordModal() {
    document.getElementById('passwordModal').classList.add('active');
}

function closePasswordModal() {
    document.getElementById('passwordModal').classList.remove('active');
    document.getElementById('passwordForm').reset();
}

async function changePassword(e) {
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
}

async function logout() {
    try {
        await fetch('/admin/api/logout', { method: 'POST' });
        window.location.href = '/admin-login';
    } catch (error) {
        window.location.href = '/admin-login';
    }
}