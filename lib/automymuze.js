<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=yes">
    <title>Painel Admin - Mr Doso</title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Quicksand:wght@400;500;600;700&display=swap" rel="stylesheet">
    <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
    <style>
        :root {
            --primary: #7c3aed;
            --primary-light: #a78bfa;
            --secondary: #ec4899;
            --accent: #06b6d4;
            --success: #10b981;
            --warning: #f59e0b;
            --danger: #ef4444;
        }

        [data-theme="dark"] {
            --bg-primary: #0f0f1a;
            --bg-secondary: #1a1a2e;
            --bg-card: #16213e;
            --text-primary: #f1f5f9;
            --text-secondary: #94a3b8;
            --text-muted: #64748b;
            --border-color: #1e293b;
            --input-bg: #0f172a;
            --shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.3);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.4);
            --header-bg: #0f172a;
        }

        [data-theme="light"] {
            --bg-primary: #f8fafc;
            --bg-secondary: #f1f5f9;
            --bg-card: #ffffff;
            --text-primary: #1e293b;
            --text-secondary: #475569;
            --text-muted: #94a3b8;
            --border-color: #e2e8f0;
            --input-bg: #ffffff;
            --shadow: 0 1px 3px 0 rgba(0, 0, 0, 0.1);
            --shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
            --header-bg: #7c3aed;
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }

        body {
            font-family: 'Quicksand', sans-serif;
            background: var(--bg-primary);
            color: var(--text-primary);
            min-height: 100vh;
            transition: background 0.3s, color 0.3s;
        }

        .admin-header {
            background: var(--header-bg);
            padding: 14px 20px;
            position: sticky;
            top: 0;
            z-index: 100;
            box-shadow: var(--shadow);
        }

        .header-content {
            display: flex;
            align-items: center;
            justify-content: space-between;
            max-width: 1400px;
            margin: 0 auto;
            gap: 12px;
        }

        .logo-area { display: flex; align-items: center; gap: 12px; color: white; }
        .logo-area i { font-size: 1.5rem; color: var(--accent); }
        .logo-area h1 { font-size: 1.3rem; font-weight: 700; }

        .header-actions { display: flex; align-items: center; gap: 8px; }

        .header-btn {
            background: rgba(255, 255, 255, 0.1);
            border: none;
            color: white;
            padding: 10px 16px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-family: 'Quicksand', sans-serif;
            font-weight: 500;
            font-size: 0.85rem;
            transition: all 0.2s;
            text-decoration: none;
            backdrop-filter: blur(10px);
            white-space: nowrap;
        }
        .header-btn i { font-size: 1rem; }
        .header-btn:hover { background: rgba(255, 255, 255, 0.2); }
        .header-btn.icon-only { padding: 10px; }
        .header-btn.icon-only span { display: none; }

        .dashboard-container { max-width: 1400px; margin: 0 auto; padding: 20px; }

        .admin-tabs {
            display: flex;
            gap: 4px;
            background: var(--bg-card);
            border-radius: 16px;
            padding: 4px;
            margin-bottom: 24px;
            border: 1px solid var(--border-color);
            overflow-x: auto;
        }

        .admin-tab {
            flex: 1;
            padding: 12px 16px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            font-size: 0.9rem;
            cursor: pointer;
            border-radius: 12px;
            transition: all 0.3s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            white-space: nowrap;
            min-width: 80px;
        }
        .admin-tab i { font-size: 1rem; }
        .admin-tab.active {
            background: var(--primary);
            color: white;
            box-shadow: 0 5px 15px rgba(124, 58, 237, 0.3);
        }
        .admin-tab:hover:not(.active) { background: var(--bg-secondary); }

        .section { display: none; }
        .section.active { display: block; }

        .stats-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 12px;
            margin-bottom: 24px;
        }

        .stat-card {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 18px 14px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
        }

        .stat-header {
            display: flex;
            align-items: center;
            gap: 8px;
            color: var(--text-muted);
            font-size: 0.8rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            margin-bottom: 10px;
        }
        .stat-header i { color: var(--primary); font-size: 1rem; }

        .stat-value { font-size: 2rem; font-weight: 700; color: var(--text-primary); line-height: 1.2; }

        .stat-change { font-size: 0.75rem; margin-top: 6px; display: flex; align-items: center; gap: 4px; }
        .stat-change.positive { color: var(--success); }
        .stat-change.negative { color: var(--danger); }

        .chart-card {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 20px 16px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
            margin-bottom: 24px;
        }
        .chart-header { display: flex; align-items: center; gap: 8px; margin-bottom: 16px; }
        .chart-header i { color: var(--primary); font-size: 1.2rem; }
        .chart-header h2 { font-size: 1.1rem; font-weight: 600; color: var(--text-primary); }
        .chart-container { position: relative; height: 200px; }

        .section-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 16px;
            flex-wrap: wrap;
            gap: 8px;
        }
        .section-header h2 {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 1.1rem;
            font-weight: 600;
            color: var(--text-primary);
        }
        .section-header h2 i { color: var(--primary); }

        .add-btn {
            background: linear-gradient(135deg, var(--primary), var(--secondary));
            border: none;
            color: white;
            padding: 12px 20px;
            border-radius: 30px;
            display: flex;
            align-items: center;
            gap: 8px;
            cursor: pointer;
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            font-size: 0.9rem;
            transition: all 0.2s;
            box-shadow: 0 5px 15px rgba(124, 58, 237, 0.3);
        }
        .add-btn:active { transform: scale(0.95); }
        .add-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .table-wrapper {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 4px 0;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
            overflow-x: auto;
            margin-bottom: 24px;
        }
        .table-wrapper table { width: 100%; border-collapse: collapse; min-width: 700px; }
        .table-wrapper th {
            text-align: left;
            padding: 16px 12px;
            color: var(--text-muted);
            font-weight: 600;
            font-size: 0.75rem;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            border-bottom: 1px solid var(--border-color);
        }
        .table-wrapper td {
            padding: 14px 12px;
            color: var(--text-primary);
            font-size: 0.9rem;
            border-bottom: 1px solid var(--border-color);
        }
        .table-wrapper tr:last-child td { border-bottom: none; }

        .item-status {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 4px 8px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
        }
        .item-status.active { background: rgba(16, 185, 129, 0.15); color: var(--success); }
        .item-status.inactive { background: rgba(239, 68, 68, 0.15); color: var(--danger); }

        .item-actions { display: flex; gap: 6px; }
        .action-btn {
            background: var(--bg-secondary);
            border: none;
            color: var(--text-secondary);
            width: 32px;
            height: 32px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s;
            font-size: 0.9rem;
        }
        .action-btn:hover { background: var(--primary); color: white; }
        .action-btn.duplicate:hover { background: var(--accent); color: white; }
        .action-btn.delete:hover { background: var(--danger); }

        .summary-card {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 20px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
        }
        .summary-item {
            display: flex;
            justify-content: space-between;
            align-items: center;
            padding: 14px 0;
            border-bottom: 1px solid var(--border-color);
        }
        .summary-item:last-child { border-bottom: none; }
        .summary-label {
            display: flex;
            align-items: center;
            gap: 10px;
            color: var(--text-secondary);
            font-size: 0.9rem;
        }
        .summary-label i { color: var(--primary); width: 20px; }
        .summary-value { font-weight: 700; font-size: 1.1rem; color: var(--text-primary); }

        .search-bar {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 16px;
            flex-wrap: wrap;
        }
        .search-bar input {
            flex: 1;
            min-width: 200px;
            padding: 10px 16px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            background: var(--input-bg);
            color: var(--text-primary);
            font-family: 'Quicksand', sans-serif;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .search-bar input:focus { border-color: var(--primary); }
        .search-bar .count { color: var(--text-muted); font-size: 0.85rem; white-space: nowrap; }

        .thumb-preview {
            width: 50px;
            height: 28px;
            object-fit: cover;
            border-radius: 4px;
            background: var(--bg-secondary);
        }

        .modal-overlay {
            display: none;
            position: fixed;
            top: 0; left: 0;
            width: 100%; height: 100%;
            background: rgba(0, 0, 0, 0.7);
            backdrop-filter: blur(5px);
            z-index: 1000;
            align-items: center;
            justify-content: center;
            padding: 16px;
        }
        .modal-overlay.active { display: flex; }

        .modal {
            background: var(--bg-card);
            border-radius: 24px;
            max-width: 550px;
            width: 100%;
            max-height: 85vh;
            overflow-y: auto;
            box-shadow: var(--shadow-lg);
            border: 1px solid var(--border-color);
        }
        .modal-header {
            padding: 24px 24px 16px;
            display: flex;
            align-items: center;
            justify-content: space-between;
            border-bottom: 1px solid var(--border-color);
            position: sticky;
            top: 0;
            background: var(--bg-card);
            z-index: 10;
        }
        .modal-header h3 { font-size: 1.3rem; font-weight: 700; color: var(--text-primary); }
        .modal-close {
            background: none;
            border: none;
            color: var(--text-muted);
            font-size: 1.5rem;
            cursor: pointer;
            padding: 4px;
            transition: color 0.2s;
        }
        .modal-close:hover { color: var(--danger); }
        .modal-body { padding: 24px; }

        .clone-area {
            background: var(--bg-secondary);
            border-radius: 12px;
            padding: 16px;
            margin-bottom: 20px;
            border: 1px dashed var(--border-color);
        }
        .clone-area label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            font-weight: 600;
            font-size: 0.85rem;
            color: var(--accent);
        }
        .clone-area label i { color: var(--accent); }
        .clone-select-wrapper { display: flex; gap: 8px; }
        .clone-select-wrapper select {
            flex: 1;
            padding: 12px;
            border: 2px solid var(--border-color);
            border-radius: 10px;
            background: var(--input-bg);
            color: var(--text-primary);
            font-family: 'Quicksand', sans-serif;
            font-size: 0.9rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .clone-select-wrapper select:focus { border-color: var(--accent); }
        .clone-btn {
            background: var(--accent);
            border: none;
            color: white;
            padding: 12px 16px;
            border-radius: 10px;
            cursor: pointer;
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            font-size: 0.85rem;
            transition: all 0.2s;
            white-space: nowrap;
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .clone-btn:active { transform: scale(0.95); }

        .form-group { margin-bottom: 20px; }
        .form-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            font-size: 0.9rem;
            color: var(--text-secondary);
        }
        .form-group label i { color: var(--primary); }
        .form-group input,
        .form-group textarea,
        .form-group select {
            width: 100%;
            padding: 14px 16px;
            border: 2px solid var(--border-color);
            border-radius: 14px;
            background: var(--input-bg);
            color: var(--text-primary);
            font-family: 'Quicksand', sans-serif;
            font-size: 0.95rem;
            outline: none;
            transition: border-color 0.2s;
        }
        .form-group input:focus,
        .form-group textarea:focus,
        .form-group select:focus { border-color: var(--primary); }
        .form-group textarea { resize: vertical; min-height: 100px; }

        .form-row { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }

        .image-tabs {
            display: flex;
            gap: 4px;
            margin-bottom: 16px;
            background: var(--bg-secondary);
            padding: 4px;
            border-radius: 12px;
        }
        .image-tab {
            flex: 1;
            padding: 10px;
            border: none;
            background: transparent;
            color: var(--text-secondary);
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            font-size: 0.85rem;
            cursor: pointer;
            border-radius: 8px;
            transition: all 0.2s;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
        }
        .image-tab.active { background: var(--primary); color: white; }
        .image-tab i { font-size: 0.9rem; }

        .placeholder-preview { display: flex; justify-content: center; margin: 16px 0; }
        .preview-box {
            width: 120px;
            height: 120px;
            border-radius: 8px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.2rem;
            text-transform: uppercase;
            border: 2px solid var(--border-color);
        }

        .color-inputs { display: flex; gap: 12px; }
        .color-input { flex: 1; }
        .color-input label { font-size: 0.8rem; margin-bottom: 4px; }
        .color-input input { padding: 8px; height: 45px; }

        .modal-footer {
            padding: 16px 24px 24px;
            display: flex;
            gap: 12px;
            justify-content: flex-end;
            border-top: 1px solid var(--border-color);
        }
        .modal-btn {
            padding: 12px 24px;
            border-radius: 30px;
            font-family: 'Quicksand', sans-serif;
            font-weight: 600;
            font-size: 0.95rem;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }
        .modal-btn.cancel { background: var(--bg-secondary); color: var(--text-secondary); }
        .modal-btn.save { background: linear-gradient(135deg, var(--primary), var(--secondary)); color: white; }
        .modal-btn:active { transform: scale(0.95); }

        .loading-row td { text-align: center; padding: 40px !important; color: var(--text-muted); }
        .empty-row td { text-align: center; padding: 40px !important; color: var(--text-muted); }

        .toast {
            position: fixed;
            bottom: 20px;
            right: 20px;
            padding: 12px 20px;
            border-radius: 12px;
            color: white;
            font-weight: 600;
            font-size: 0.9rem;
            z-index: 9999;
            animation: slideIn 0.3s ease;
            box-shadow: var(--shadow-lg);
            max-width: 340px;
        }
        .toast.success { background: var(--success); }
        .toast.error { background: var(--danger); }
        .toast.info { background: var(--accent); }
        .toast.warn { background: var(--warning); }

        @keyframes slideIn {
            from { transform: translateX(100px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
        }

        /* =====================================================
           ABA AUTO MYMUZE
           ===================================================== */
        .amz-stat-card {
            background: var(--bg-card);
            border-radius: 16px;
            padding: 18px 14px;
            box-shadow: var(--shadow);
            border: 1px solid var(--border-color);
            position: relative;
            overflow: hidden;
        }
        .amz-stat-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0;
            width: 4px; height: 100%;
            background: var(--amz-accent, var(--primary));
        }
        .amz-stat-card.ok { --amz-accent: var(--success); }
        .amz-stat-card.fail { --amz-accent: var(--danger); }
        .amz-stat-card.queue { --amz-accent: var(--accent); }
        .amz-stat-card.cron { --amz-accent: var(--warning); }

        .amz-badge {
            display: inline-flex;
            align-items: center;
            gap: 4px;
            padding: 3px 8px;
            border-radius: 20px;
            font-size: 0.7rem;
            font-weight: 600;
            white-space: nowrap;
        }
        .amz-badge.ok { background: rgba(16,185,129,.15); color: var(--success); }
        .amz-badge.fail { background: rgba(239,68,68,.15); color: var(--danger); }
        .amz-badge.warn { background: rgba(245,158,11,.15); color: var(--warning); }
        .amz-badge.info { background: rgba(6,182,212,.15); color: var(--accent); }
        .amz-badge.muted { background: var(--bg-secondary); color: var(--text-muted); }

        .amz-key-form {
            display: grid;
            grid-template-columns: 1fr 1fr auto;
            gap: 8px;
            align-items: end;
        }
        .amz-key-form .form-group { margin-bottom: 0; }

        .amz-code {
            font-family: 'Courier New', monospace;
            background: var(--bg-secondary);
            padding: 2px 8px;
            border-radius: 6px;
            font-size: 0.8rem;
            letter-spacing: 1px;
        }
        .amz-code.copyable { cursor: pointer; transition: background 0.2s; }
        .amz-code.copyable:hover { background: var(--primary); color: white; }

        .amz-filter-select {
            padding: 10px 14px;
            border: 2px solid var(--border-color);
            border-radius: 12px;
            background: var(--input-bg);
            color: var(--text-primary);
            font-family: 'Quicksand', sans-serif;
            font-size: 0.9rem;
            outline: none;
            cursor: pointer;
        }
        .amz-filter-select:focus { border-color: var(--primary); }

        @media (max-width: 640px) {
            .amz-key-form { grid-template-columns: 1fr; }
        }

        @media (min-width: 640px) {
            .stats-grid { grid-template-columns: repeat(4, 1fr); gap: 16px; }
            .header-btn.icon-only span { display: inline; }
            .header-btn.icon-only { padding: 10px 16px; }
        }

        @media (max-width: 480px) {
            .dashboard-container { padding: 12px; }
            .stat-value { font-size: 1.5rem; }
            .form-row { grid-template-columns: 1fr; gap: 0; }
            .modal { max-height: 90vh; }
            .logo-area h1 { font-size: 1rem; }
            .color-inputs { flex-direction: column; gap: 8px; }
            .clone-select-wrapper { flex-direction: column; gap: 8px; }
            .admin-tab { font-size: 0.75rem; padding: 10px 12px; min-width: 60px; }
            .admin-tab span { display: none; }
        }
    </style>
</head>
<body data-theme="dark">
    <header class="admin-header">
        <div class="header-content">
            <div class="logo-area">
                <i class="fas fa-crown"></i>
                <h1>Painel Admin</h1>
            </div>
            <div class="header-actions">
                <a href="/" class="header-btn icon-only">
                    <i class="fas fa-eye"></i>
                    <span>Ver Site</span>
                </a>
                <button class="header-btn icon-only" id="themeToggle">
                    <i class="fas fa-sun"></i>
                    <span>Tema</span>
                </button>
                <button class="header-btn icon-only" id="changePasswordBtn">
                    <i class="fas fa-key"></i>
                    <span>Senha</span>
                </button>
                <button class="header-btn icon-only" id="logoutBtn">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sair</span>
                </button>
            </div>
        </div>
    </header>
    
    <div class="dashboard-container">
        <div class="admin-tabs">
            <button class="admin-tab active" data-tab="items" onclick="switchTab('items')">
                <i class="fas fa-box"></i>
                <span>Itens</span>
            </button>
            <button class="admin-tab" data-tab="videos" onclick="switchTab('videos')">
                <i class="fas fa-film"></i>
                <span>Vídeos</span>
            </button>
            <button class="admin-tab" data-tab="automymuze" onclick="switchTab('automymuze')">
                <i class="fas fa-robot"></i>
                <span>Auto MyMuze</span>
            </button>
        </div>

        <!-- SEÇÃO ITENS -->
        <div class="section active" id="itemsSection">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-box"></i><span>Total Itens</span></div>
                    <div class="stat-value" id="totalItems">-</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-eye"></i><span>Views Hoje</span></div>
                    <div class="stat-value" id="todayViews">-</div>
                    <div class="stat-change" id="viewsChange"></div>
                </div>
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-download"></i><span>Downloads Hoje</span></div>
                    <div class="stat-value" id="todayDownloads">-</div>
                    <div class="stat-change" id="downloadsChange"></div>
                </div>
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-percent"></i><span>Conversão</span></div>
                    <div class="stat-value" id="conversionRate">-</div>
                </div>
            </div>
            
            <div class="chart-card">
                <div class="chart-header">
                    <i class="fas fa-chart-line"></i>
                    <h2>Últimos 7 dias</h2>
                </div>
                <div class="chart-container">
                    <canvas id="statsChart"></canvas>
                </div>
            </div>
            
            <div class="section-header">
                <h2><i class="fas fa-list"></i>Itens Cadastrados</h2>
                <button class="add-btn" id="newItemBtn">
                    <i class="fas fa-plus"></i>
                    <span>Novo Item</span>
                </button>
            </div>
            
            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Título</th>
                            <th>Categoria</th>
                            <th>Views</th>
                            <th>Downloads</th>
                            <th>Taxa</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody id="itemsTableBody">
                        <tr><td colspan="7" class="loading-row"><i class="fas fa-spinner fa-pulse"></i> Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
            
            <div class="summary-card">
                <div class="summary-item">
                    <span class="summary-label"><i class="fas fa-eye"></i> Total Visualizações</span>
                    <span class="summary-value" id="totalViews">-</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label"><i class="fas fa-download"></i> Total Downloads</span>
                    <span class="summary-value" id="totalDownloads">-</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label"><i class="fas fa-check-circle"></i> Itens Ativos</span>
                    <span class="summary-value" id="activeItems">-</span>
                </div>
                <div class="summary-item">
                    <span class="summary-label"><i class="fas fa-chart-bar"></i> Média Downloads/Item</span>
                    <span class="summary-value" id="avgDownloads">-</span>
                </div>
            </div>
        </div>

        <!-- SEÇÃO VÍDEOS -->
        <div class="section" id="videosSection">
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-film" style="color:#e50914;"></i><span>Total Vídeos</span></div>
                    <div class="stat-value" id="totalVideos">0</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-eye" style="color:#64b5f6;"></i><span>Views Totais</span></div>
                    <div class="stat-value" id="totalVideoViews">0</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-fire" style="color:#f59e0b;"></i><span>Mais Visto</span></div>
                    <div class="stat-value" id="popularVideo" style="font-size:1.2rem;">—</div>
                </div>
                <div class="stat-card">
                    <div class="stat-header"><i class="fas fa-check-circle" style="color:#10b981;"></i><span>Ativos</span></div>
                    <div class="stat-value" id="activeVideos">0</div>
                </div>
            </div>

            <div class="section-header">
                <h2><i class="fas fa-list" style="color:#e50914;"></i>Vídeos Cadastrados</h2>
                <button class="add-btn" id="newVideoBtn" style="background:linear-gradient(135deg,#e50914,#ff6b6b);">
                    <i class="fas fa-plus"></i>
                    <span>Adicionar Vídeo</span>
                </button>
            </div>

            <div class="search-bar">
                <input type="text" id="videoSearchInput" placeholder="Pesquisar vídeos..." oninput="filterVideos()">
                <span class="count" id="videosCount">0 vídeos</span>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th style="width:50px;">#</th>
                            <th style="width:70px;">Thumb</th>
                            <th>Título</th>
                            <th>Views</th>
                            <th>Status</th>
                            <th style="width:100px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="videosTableBody">
                        <tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-pulse"></i> Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- SEÇÃO AUTO MYMUZE -->
        <div class="section" id="automymuzeSection">
            <div class="stats-grid">
                <div class="amz-stat-card ok">
                    <div class="stat-header"><i class="fas fa-check-circle"></i><span>OK (24h)</span></div>
                    <div class="stat-value" id="amzOk24h">—</div>
                    <div class="stat-change positive" id="amzOkRate"></div>
                </div>
                <div class="amz-stat-card fail">
                    <div class="stat-header"><i class="fas fa-exclamation-triangle"></i><span>Falhas (24h)</span></div>
                    <div class="stat-value" id="amzFail24h">—</div>
                    <div class="stat-change negative" id="amzFailRate"></div>
                </div>
                <div class="amz-stat-card queue">
                    <div class="stat-header"><i class="fas fa-list-ol"></i><span>Fila</span></div>
                    <div class="stat-value" id="amzQueueSize">—</div>
                    <div class="stat-change" style="color:var(--text-muted)" id="amzQueueInfo">aguardando</div>
                </div>
                <div class="amz-stat-card cron">
                    <div class="stat-header"><i class="fas fa-clock"></i><span>Último Tick</span></div>
                    <div class="stat-value" id="amzLastTick" style="font-size:1.2rem;">—</div>
                    <div class="stat-change" style="color:var(--text-muted)" id="amzTodayMz">—</div>
                </div>
            </div>

            <div class="section-header">
                <h2><i class="fas fa-users"></i>Usuários</h2>
                <div style="display:flex;gap:8px;flex-wrap:wrap;">
                    <button class="add-btn" id="amzPurgeFreeBtn" style="background:linear-gradient(135deg,#f59e0b,#ef4444);">
                        <i class="fas fa-broom"></i>
                        <span>Excluir free trials</span>
                    </button>
                    <button class="add-btn" id="amzRefreshUsersBtn" style="background:linear-gradient(135deg,#06b6d4,#7c3aed);">
                        <i class="fas fa-sync-alt"></i>
                        <span>Atualizar</span>
                    </button>
                </div>
            </div>

            <div class="search-bar">
                <input type="text" id="amzUserSearch" placeholder="Buscar por MSISDN..." oninput="amzFilterUsers()">
                <select class="amz-filter-select" id="amzUserStatusFilter" onchange="amzFilterUsers()">
                    <option value="">Todos status</option>
                    <option value="active">Ativos</option>
                    <option value="grace">Grace (expirado, ainda atualiza)</option>
                    <option value="expired">Expirados</option>
                    <option value="otp">OTP pendente</option>
                    <option value="free">Free trial</option>
                    <option value="paused">Pausados (falhas)</option>
                </select>
                <span class="count" id="amzUsersCount">0 usuários</span>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>MSISDN</th>
                            <th>Plano</th>
                            <th>Dias</th>
                            <th>Última att.</th>
                            <th>Status</th>
                            <th style="width:170px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="amzUsersTableBody">
                        <tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-pulse"></i> Carregando...</td></tr>
                    </tbody>
                </table>
            </div>

            <div class="section-header">
                <h2><i class="fas fa-key"></i>Chaves de Ativação</h2>
                <button class="add-btn" id="amzRefreshKeysBtn" style="background:linear-gradient(135deg,#10b981,#06b6d4);">
                    <i class="fas fa-sync-alt"></i>
                    <span>Atualizar</span>
                </button>
            </div>

            <div class="summary-card" style="margin-bottom:16px;">
                <div class="amz-key-form">
                    <div class="form-group">
                        <label><i class="fas fa-phone"></i> MSISDN (destino)</label>
                        <input type="text" id="amzKeyMsisdn" placeholder="258XXXXXXXXX" inputmode="numeric">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-calendar-day"></i> Dias</label>
                        <input type="number" id="amzKeyDays" min="1" max="365" value="30" placeholder="30">
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-layer-group"></i> Qtd</label>
                        <input type="number" id="amzKeyQty" min="1" max="50" value="1" placeholder="1">
                    </div>
                    <button class="add-btn" id="amzGenerateKeyBtn" style="justify-content:center;width:100%;">
                        <i class="fas fa-plus-circle"></i>
                        <span>Gerar</span>
                    </button>
                </div>
            </div>

            <div class="search-bar">
                <input type="text" id="amzKeySearch" placeholder="Buscar por código ou MSISDN..." oninput="amzFilterKeys()">
                <select class="amz-filter-select" id="amzKeyStatusFilter" onchange="amzFilterKeys()">
                    <option value="">Todas</option>
                    <option value="nova">Disponíveis</option>
                    <option value="usada">Resgatadas</option>
                    <option value="cancelada">Canceladas</option>
                </select>
                <span class="count" id="amzKeysCount">0 chaves</span>
            </div>

            <div class="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Código</th>
                            <th>MSISDN</th>
                            <th>Dias</th>
                            <th>Status</th>
                            <th>Criada em</th>
                            <th style="width:60px;">Ações</th>
                        </tr>
                    </thead>
                    <tbody id="amzKeysTableBody">
                        <tr><td colspan="6" class="loading-row"><i class="fas fa-spinner fa-pulse"></i> Carregando...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>

    <!-- MODAL ITEM -->
    <div class="modal-overlay" id="itemModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="modalTitle">Novo Item</h3>
                <button class="modal-close" onclick="closeItemModal()">&times;</button>
            </div>
            <div class="modal-body">
                <div class="clone-area" id="cloneArea">
                    <label><i class="fas fa-clone"></i> Copiar dados de um item existente</label>
                    <div class="clone-select-wrapper">
                        <select id="cloneSource">
                            <option value="">-- Nenhum (começar vazio) --</option>
                        </select>
                        <button type="button" class="clone-btn" onclick="cloneFromSource()">
                            <i class="fas fa-magic"></i> Aplicar
                        </button>
                    </div>
                </div>
                
                <form id="itemForm">
                    <input type="hidden" id="itemId">
                    <div class="form-group">
                        <label><i class="fas fa-heading"></i> Título</label>
                        <input type="text" id="itemTitulo" placeholder="Ex: Filme 1080p Dublado" required>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-align-left"></i> Descrição</label>
                        <textarea id="itemDescricao" placeholder="Descreva o conteúdo..."></textarea>
                    </div>
                    
                    <div class="image-tabs">
                        <button type="button" class="image-tab active" data-tab="url">
                            <i class="fas fa-link"></i> URL
                        </button>
                        <button type="button" class="image-tab" data-tab="placeholder">
                            <i class="fas fa-palette"></i> Placeholder
                        </button>
                    </div>
                    
                    <div class="form-group" id="urlField">
                        <label><i class="fas fa-image"></i> URL da Imagem</label>
                        <input type="url" id="itemImagem" placeholder="https://... (opcional)">
                    </div>
                    
                    <div id="placeholderFields" style="display: none;">
                        <div class="form-group">
                            <label><i class="fas fa-font"></i> Texto do Placeholder</label>
                            <input type="text" id="placeholderText" placeholder="Ex: EM BREVE" maxlength="20" value="BREVE">
                        </div>
                        <div class="color-inputs">
                            <div class="color-input">
                                <label><i class="fas fa-fill-drip"></i> Cor de Fundo</label>
                                <input type="color" id="placeholderBg" value="#7c3aed">
                            </div>
                            <div class="color-input">
                                <label><i class="fas fa-font"></i> Cor do Texto</label>
                                <input type="color" id="placeholderTextColor" value="#ffffff">
                            </div>
                        </div>
                        
                        <div class="placeholder-preview">
                            <div class="preview-box" id="placeholderPreview" style="background: #7c3aed; color: #ffffff;">
                                BREVE
                            </div>
                        </div>
                        <p style="font-size: 0.75rem; color: var(--text-muted); text-align: center;">
                            <i class="fas fa-info-circle"></i> Tamanho: 400x400px (se ajusta automaticamente)
                        </p>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-link"></i> Link Original</label>
                        <input type="url" id="itemUrl" placeholder="https://... (link final)" required>
                    </div>
                    <div class="form-row">
                        <div class="form-group">
                            <label><i class="fas fa-folder"></i> Categoria</label>
                            <select id="itemCategoria">
                                <option value="arquivos">Arquivos</option>
                                <option value="codigos">Códigos / Chaves</option>
                                <option value="apps">Apps</option>
                                <option value="videos">Vídeos</option>
                                <option value="outros">Outros</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label><i class="fas fa-toggle-on"></i> Status</label>
                            <select id="itemAtivo">
                                <option value="true">Ativo</option>
                                <option value="false">Inativo</option>
                            </select>
                        </div>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-calendar-times"></i> Expira em (opcional)</label>
                        <input type="datetime-local" id="itemExpira">
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="modal-btn cancel" onclick="closeItemModal()">Cancelar</button>
                <button class="modal-btn save" onclick="saveItem()">Salvar</button>
            </div>
        </div>
    </div>

    <!-- MODAL VÍDEO -->
    <div class="modal-overlay" id="videoModal">
        <div class="modal">
            <div class="modal-header">
                <h3 id="videoModalTitle">Adicionar Vídeo</h3>
                <button class="modal-close" onclick="closeVideoModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="videoForm">
                    <input type="hidden" id="videoId">
                    
                    <div class="form-group">
                        <label><i class="fas fa-heading"></i> Título do Vídeo *</label>
                        <input type="text" id="videoTitulo" placeholder="Ex: Filme Ação 2024" required>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-align-left"></i> Descrição</label>
                        <textarea id="videoDescricao" rows="3" placeholder="Descrição do vídeo..."></textarea>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-link" style="color:#64b5f6;"></i> URL do Vídeo *</label>
                        <input type="url" id="videoUrl" placeholder="https://www.youtube.com/watch?v=xxxxx ou https://streamable.com/e/xxxxx" required>
                        <small style="color:var(--text-muted);font-size:11px;display:block;margin-top:4px;">
                            <i class="fas fa-info-circle"></i> 
                            <strong>YouTube:</strong> https://www.youtube.com/watch?v=abcd1234 ou https://youtu.be/abcd1234<br>
                            <strong>Streamable:</strong> https://streamable.com/e/abcd1234 ou https://streamable.com/abcd1234
                        </small>
                    </div>
                    
                    <div class="form-group">
                        <label><i class="fas fa-toggle-on"></i> Status</label>
                        <select id="videoAtivo">
                            <option value="true">Ativo</option>
                            <option value="false">Inativo</option>
                        </select>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="modal-btn cancel" onclick="closeVideoModal()">Cancelar</button>
                <button class="modal-btn save" onclick="saveVideo()">Salvar Vídeo</button>
            </div>
        </div>
    </div>

    <!-- MODAL SENHA -->
    <div class="modal-overlay" id="passwordModal">
        <div class="modal">
            <div class="modal-header">
                <h3>Alterar Senha</h3>
                <button class="modal-close" onclick="closePasswordModal()">&times;</button>
            </div>
            <div class="modal-body">
                <form id="passwordForm">
                    <div class="form-group">
                        <label><i class="fas fa-lock"></i> Senha Atual</label>
                        <input type="password" id="currentPassword" placeholder="••••••••" required>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-key"></i> Nova Senha</label>
                        <input type="password" id="newPassword" placeholder="••••••••" required>
                    </div>
                    <div class="form-group">
                        <label><i class="fas fa-check"></i> Confirmar Senha</label>
                        <input type="password" id="confirmPassword" placeholder="••••••••" required>
                    </div>
                </form>
            </div>
            <div class="modal-footer">
                <button class="modal-btn cancel" onclick="closePasswordModal()">Cancelar</button>
                <button class="modal-btn save" onclick="changePassword()">Alterar</button>
            </div>
        </div>
    </div>

    <script>
        // ============================================================
        // ESTADO GLOBAL
        // ============================================================
        let chart = null;
        let currentItems = [];
        let currentVideos = [];
        let filteredVideos = [];
        let currentImageMode = 'url';
        let isEditing = false;
        let isVideoEditing = false;

        let amzUsers = [];
        let amzFilteredUsers = [];
        let amzKeys = [];
        let amzFilteredKeys = [];
        let amzStatsTimer = null;

        // ============================================================
        // TOAST
        // ============================================================
        function showToast(message, type = 'info') {
            const toast = document.createElement('div');
            toast.className = `toast ${type}`;
            toast.textContent = message;
            document.body.appendChild(toast);
            setTimeout(() => toast.remove(), 3500);
        }

        // ============================================================
        // TEMA
        // ============================================================
        function initTheme() {
            const theme = localStorage.getItem('theme') || 'dark';
            document.body.setAttribute('data-theme', theme);
            updateThemeIcon(theme);
        }
        function updateThemeIcon(theme) {
            const icon = document.querySelector('#themeToggle i');
            if (icon) icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        }

        // ============================================================
        // FORMATADORES
        // ============================================================
        function formatNumber(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        }
        function formatViews(num) {
            if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
            if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
            return num.toString();
        }

        // ============================================================
        // TABS
        // ============================================================
        function switchTab(tab) {
            document.querySelectorAll('.section').forEach(el => el.classList.remove('active'));
            document.querySelectorAll('.admin-tab').forEach(el => el.classList.remove('active'));
            
            document.getElementById(tab + 'Section').classList.add('active');
            document.querySelector(`.admin-tab[data-tab="${tab}"]`).classList.add('active');
            
            if (tab === 'videos') loadVideos();
            if (tab === 'automymuze') {
                loadAmzStats();
                loadAmzUsers();
                loadAmzKeys();
                if (!amzStatsTimer) {
                    amzStatsTimer = setInterval(loadAmzStats, 30000);
                }
            } else if (amzStatsTimer) {
                clearInterval(amzStatsTimer);
                amzStatsTimer = null;
            }
        }

        // ============================================================
        // PLACEHOLDER
        // ============================================================
        function parsePlaceholderUrl(url) {
            if (!url || !url.includes('placehold.co')) return null;
            try {
                const match = url.match(/placehold\.co\/400x400\/([^/]+)\/([^/]+)\?text=(.+)/);
                if (match) {
                    return {
                        bg: '#' + match[1],
                        textColor: '#' + match[2],
                        text: decodeURIComponent(match[3])
                    };
                }
            } catch (e) {}
            return null;
        }
        function generatePlaceholderUrl() {
            const text = document.getElementById('placeholderText').value || 'BREVE';
            const bgColor = document.getElementById('placeholderBg').value.replace('#', '');
            const textColor = document.getElementById('placeholderTextColor').value.replace('#', '');
            return `https://placehold.co/400x400/${bgColor}/${textColor}?text=${encodeURIComponent(text)}`;
        }
        function updatePlaceholderPreview() {
            const preview = document.getElementById('placeholderPreview');
            const text = document.getElementById('placeholderText').value || 'BREVE';
            const bgColor = document.getElementById('placeholderBg').value;
            const textColor = document.getElementById('placeholderTextColor').value;
            preview.style.background = bgColor;
            preview.style.color = textColor;
            preview.textContent = text.substring(0, 3).toUpperCase();
        }
        function switchImageMode(mode) {
            currentImageMode = mode;
            document.querySelectorAll('.image-tab').forEach(tab => {
                tab.classList.toggle('active', tab.dataset.tab === mode);
            });
            document.getElementById('urlField').style.display = mode === 'url' ? 'block' : 'none';
            document.getElementById('placeholderFields').style.display = mode === 'placeholder' ? 'block' : 'none';
            if (mode === 'placeholder') updatePlaceholderPreview();
        }

        // ============================================================
        // CLONE
        // ============================================================
        function populateCloneDropdown() {
            const select = document.getElementById('cloneSource');
            select.innerHTML = '<option value="">-- Nenhum (começar vazio) --</option>';
            currentItems.forEach(item => {
                const option = document.createElement('option');
                option.value = item.id;
                option.textContent = item.titulo;
                select.appendChild(option);
            });
        }
        function cloneFromSource() {
            const sourceId = document.getElementById('cloneSource').value;
            if (!sourceId) {
                document.getElementById('itemForm').reset();
                document.getElementById('itemId').value = '';
                document.getElementById('placeholderText').value = 'BREVE';
                document.getElementById('placeholderBg').value = '#7c3aed';
                document.getElementById('placeholderTextColor').value = '#ffffff';
                switchImageMode('url');
                updatePlaceholderPreview();
                document.getElementById('itemAtivo').value = 'true';
                showToast('Campos limpos!', 'info');
                return;
            }
            const sourceItem = currentItems.find(i => i.id === sourceId);
            if (!sourceItem) return;
            document.getElementById('itemTitulo').value = sourceItem.titulo + ' (Cópia)';
            document.getElementById('itemDescricao').value = sourceItem.descricao || '';
            document.getElementById('itemUrl').value = sourceItem.url_original || '';
            document.getElementById('itemCategoria').value = sourceItem.categoria || 'outros';
            document.getElementById('itemAtivo').value = sourceItem.ativo || 'true';
            document.getElementById('itemExpira').value = sourceItem.expira_em ? sourceItem.expira_em.slice(0, 16) : '';
            const placeholderData = parsePlaceholderUrl(sourceItem.imagem);
            if (placeholderData) {
                switchImageMode('placeholder');
                document.getElementById('placeholderText').value = placeholderData.text;
                document.getElementById('placeholderBg').value = placeholderData.bg;
                document.getElementById('placeholderTextColor').value = placeholderData.textColor;
                updatePlaceholderPreview();
            } else {
                switchImageMode('url');
                document.getElementById('itemImagem').value = sourceItem.imagem || '';
            }
            showToast(`Dados copiados de: ${sourceItem.titulo}`, 'success');
        }

        // ============================================================
        // STATS (itens)
        // ============================================================
        async function loadStats() {
            try {
                const res = await fetch('/admin/api/stats');
                const data = await res.json();
                
                document.getElementById('totalItems').textContent = data.totalItems;
                document.getElementById('todayViews').textContent = formatNumber(data.today.views);
                document.getElementById('todayDownloads').textContent = formatNumber(data.today.downloads);
                document.getElementById('conversionRate').textContent = data.conversionRate + '%';
                document.getElementById('totalViews').textContent = formatNumber(data.totalViews);
                document.getElementById('totalDownloads').textContent = formatNumber(data.totalDownloads);
                document.getElementById('activeItems').textContent = data.totalItems;
                
                const avg = data.totalItems > 0 ? Math.round(data.totalDownloads / data.totalItems) : 0;
                document.getElementById('avgDownloads').textContent = formatNumber(avg);
                
                const viewsDiff = data.today.views - data.yesterday.views;
                const viewsChange = document.getElementById('viewsChange');
                if (viewsDiff >= 0) {
                    viewsChange.innerHTML = '<i class="fas fa-arrow-up"></i> +' + viewsDiff;
                    viewsChange.className = 'stat-change positive';
                } else {
                    viewsChange.innerHTML = '<i class="fas fa-arrow-down"></i> ' + viewsDiff;
                    viewsChange.className = 'stat-change negative';
                }
                
                const downloadsDiff = data.today.downloads - data.yesterday.downloads;
                const downloadsChange = document.getElementById('downloadsChange');
                if (downloadsDiff >= 0) {
                    downloadsChange.innerHTML = '<i class="fas fa-arrow-up"></i> +' + downloadsDiff;
                    downloadsChange.className = 'stat-change positive';
                } else {
                    downloadsChange.innerHTML = '<i class="fas fa-arrow-down"></i> ' + downloadsDiff;
                    downloadsChange.className = 'stat-change negative';
                }
                
                const ctx = document.getElementById('statsChart').getContext('2d');
                if (chart) chart.destroy();
                
                const theme = document.body.getAttribute('data-theme');
                const textColor = theme === 'dark' ? '#94a3b8' : '#64748b';
                const gridColor = theme === 'dark' ? '#1e293b' : '#e2e8f0';
                
                chart = new Chart(ctx, {
                    type: 'line',
                    data: {
                        labels: data.last7Days.map(d => new Date(d.date).toLocaleDateString('pt-BR', { weekday: 'short' })),
                        datasets: [{
                            label: 'Visualizações',
                            data: data.last7Days.map(d => d.views),
                            borderColor: '#7c3aed',
                            backgroundColor: 'rgba(124, 58, 237, 0.1)',
                            tension: 0.4,
                            fill: true
                        }, {
                            label: 'Downloads',
                            data: data.last7Days.map(d => d.downloads),
                            borderColor: '#10b981',
                            backgroundColor: 'rgba(16, 185, 129, 0.1)',
                            tension: 0.4,
                            fill: true
                        }]
                    },
                    options: {
                        responsive: true,
                        maintainAspectRatio: false,
                        plugins: {
                            legend: { labels: { color: textColor, font: { family: 'Quicksand' } } }
                        },
                        scales: {
                            y: { beginAtZero: true, grid: { color: gridColor }, ticks: { color: textColor } },
                            x: { grid: { display: false }, ticks: { color: textColor } }
                        }
                    }
                });
            } catch (e) {
                console.error('Erro stats:', e);
            }
        }

        // ============================================================
        // ITEMS
        // ============================================================
        async function loadItems() {
            try {
                const res = await fetch('/admin/api/items');
                const data = await res.json();
                currentItems = data.items;
                
                const tbody = document.getElementById('itemsTableBody');
                if (!data.items.length) {
                    tbody.innerHTML = '<tr><td colspan="7" class="empty-row"><i class="fas fa-box-open"></i> Nenhum item cadastrado</td></tr>';
                    return;
                }
                
                let html = '';
                data.items.forEach(item => {
                    const rate = item.visualizacoes > 0 ? ((item.downloads / item.visualizacoes) * 100).toFixed(1) : '0';
                    const isActive = item.ativo === 'true';
                    html += `
                        <tr>
                            <td>${item.titulo}</td>
                            <td>${item.categoria || 'outros'}</td>
                            <td>${formatNumber(item.visualizacoes)}</td>
                            <td>${formatNumber(item.downloads)}</td>
                            <td>${rate}%</td>
                            <td>
                                <span class="item-status ${isActive ? 'active' : 'inactive'}">
                                    <i class="fas fa-${isActive ? 'check' : 'times'}-circle"></i>
                                    ${isActive ? 'Ativo' : 'Inativo'}
                                </span>
                            </td>
                            <td>
                                <div class="item-actions">
                                    <button class="action-btn duplicate" onclick="duplicateItem('${item.id}')" title="Duplicar">
                                        <i class="fas fa-clone"></i>
                                    </button>
                                    <button class="action-btn" onclick="editItem('${item.id}')" title="Editar">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="action-btn delete" onclick="deleteItem('${item.id}')" title="Excluir">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `;
                });
                tbody.innerHTML = html;
                
                if (document.getElementById('itemModal').classList.contains('active')) {
                    populateCloneDropdown();
                }
            } catch (e) {
                console.error('Erro itens:', e);
            }
        }

        function openItemModal(itemId = null, isDuplicating = false) {
            const modal = document.getElementById('itemModal');
            const title = document.getElementById('modalTitle');
            const cloneArea = document.getElementById('cloneArea');
            
            isEditing = itemId && !isDuplicating;
            cloneArea.style.display = (itemId && !isDuplicating) ? 'none' : 'block';
            if (!itemId || isDuplicating) populateCloneDropdown();
            
            switchImageMode('url');
            
            if (itemId) {
                const item = currentItems.find(i => i.id === itemId);
                if (item) {
                    title.textContent = isDuplicating ? 'Duplicar Item' : 'Editar Item';
                    document.getElementById('itemId').value = isDuplicating ? '' : item.id;
                    document.getElementById('itemTitulo').value = isDuplicating ? item.titulo + ' (Cópia)' : item.titulo;
                    document.getElementById('itemDescricao').value = item.descricao || '';
                    document.getElementById('itemUrl').value = item.url_original || '';
                    document.getElementById('itemCategoria').value = item.categoria || 'outros';
                    document.getElementById('itemAtivo').value = item.ativo || 'true';
                    document.getElementById('itemExpira').value = item.expira_em ? item.expira_em.slice(0, 16) : '';
                    
                    const placeholderData = parsePlaceholderUrl(item.imagem);
                    if (placeholderData) {
                        switchImageMode('placeholder');
                        document.getElementById('placeholderText').value = placeholderData.text;
                        document.getElementById('placeholderBg').value = placeholderData.bg;
                        document.getElementById('placeholderTextColor').value = placeholderData.textColor;
                        updatePlaceholderPreview();
                    } else {
                        document.getElementById('itemImagem').value = item.imagem || '';
                    }
                    
                    if (isDuplicating) document.getElementById('cloneSource').value = item.id;
                }
            } else {
                title.textContent = 'Novo Item';
                document.getElementById('itemForm').reset();
                document.getElementById('itemId').value = '';
                document.getElementById('placeholderText').value = 'BREVE';
                document.getElementById('placeholderBg').value = '#7c3aed';
                document.getElementById('placeholderTextColor').value = '#ffffff';
                document.getElementById('itemAtivo').value = 'true';
                updatePlaceholderPreview();
                document.getElementById('cloneSource').value = '';
            }
            
            modal.classList.add('active');
        }
        function closeItemModal() { document.getElementById('itemModal').classList.remove('active'); }
        function editItem(itemId) { openItemModal(itemId, false); }
        function duplicateItem(itemId) { openItemModal(itemId, true); }

        async function saveItem() {
            const imagemUrl = currentImageMode === 'url' 
                ? document.getElementById('itemImagem').value 
                : generatePlaceholderUrl();
            
            const formData = {
                id: document.getElementById('itemId').value || null,
                titulo: document.getElementById('itemTitulo').value,
                descricao: document.getElementById('itemDescricao').value,
                imagem: imagemUrl,
                url_original: document.getElementById('itemUrl').value,
                categoria: document.getElementById('itemCategoria').value,
                ativo: document.getElementById('itemAtivo').value,
                expira_em: document.getElementById('itemExpira').value || null
            };
            
            if (!formData.titulo || !formData.url_original) {
                showToast('Título e Link Original são obrigatórios', 'error');
                return;
            }
            
            try {
                const res = await fetch('/admin/api/item', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(formData)
                });
                const data = await res.json();
                if (data.success) {
                    closeItemModal();
                    loadItems();
                    loadStats();
                    showToast(isEditing ? 'Item atualizado!' : 'Item criado!', 'success');
                } else {
                    showToast(data.error || 'Erro ao salvar', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        async function deleteItem(itemId) {
            if (!confirm('Tem certeza que deseja excluir este item?')) return;
            try {
                const res = await fetch('/admin/api/item/' + itemId, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    loadItems();
                    loadStats();
                    showToast('Item excluído!', 'success');
                } else {
                    showToast(data.error || 'Erro ao excluir', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        // ============================================================
        // VÍDEOS
        // ============================================================
        async function loadVideos() {
            try {
                const res = await fetch('/admin/api/videos');
                const data = await res.json();
                currentVideos = data.videos || [];
                filteredVideos = [...currentVideos];
                renderVideos();
                updateVideoStats();
            } catch (e) {
                console.error('Erro vídeos:', e);
                document.getElementById('videosTableBody').innerHTML = 
                    '<tr><td colspan="6" class="empty-row"><i class="fas fa-exclamation-circle"></i> Erro ao carregar vídeos</td></tr>';
            }
        }

        function renderVideos() {
            const tbody = document.getElementById('videosTableBody');
            
            if (filteredVideos.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-row"><i class="fas fa-video-slash"></i> Nenhum vídeo cadastrado</td></tr>';
                document.getElementById('videosCount').textContent = '0 vídeos';
                return;
            }
            
            let html = '';
            filteredVideos.forEach((video, index) => {
                let thumb = video.thumbnail || '';
                if (!thumb || thumb.includes('dQw4w9WgXcQ')) {
                    if (video.streamable_url) {
                        thumb = 'https://placehold.co/320x180/1a2d42/64b5f6?text=Streamable';
                    } else if (video.youtube_id) {
                        thumb = `https://img.youtube.com/vi/${video.youtube_id}/hqdefault.jpg`;
                    } else {
                        thumb = 'https://placehold.co/320x180/1a2d42/64b5f6?text=DSO';
                    }
                }
                
                const isActive = video.ativo === 'true';
                const isStreamable = !!video.streamable_url;
                const sourceLabel = isStreamable ? '📹 Streamable' : '▶️ YouTube';
                
                html += `
                    <tr>
                        <td>${index + 1}</td>
                        <td>
                            <img src="${thumb}" alt="${video.titulo}" 
                                 class="thumb-preview"
                                 onerror="this.src='https://placehold.co/50x28/1a2d42/64b5f6?text=?'">
                        </td>
                        <td>
                            <strong style="display:block;max-width:200px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">
                                ${video.titulo || 'Sem título'}
                            </strong>
                            <small style="color:var(--text-muted);font-size:11px;">${sourceLabel}</small>
                        </td>
                        <td>${formatViews(video.views || 0)}</td>
                        <td>
                            <span class="item-status ${isActive ? 'active' : 'inactive'}">
                                <i class="fas fa-${isActive ? 'check' : 'times'}-circle"></i>
                                ${isActive ? 'Ativo' : 'Inativo'}
                            </span>
                        </td>
                        <td>
                            <div class="item-actions">
                                <button class="action-btn" onclick="editVideo('${video.id}')" title="Editar">
                                    <i class="fas fa-edit"></i>
                                </button>
                                <button class="action-btn delete" onclick="deleteVideo('${video.id}')" title="Excluir">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
            document.getElementById('videosCount').textContent = `${filteredVideos.length} vídeos`;
        }

        function updateVideoStats() {
            const active = currentVideos.filter(v => v.ativo === 'true').length;
            document.getElementById('totalVideos').textContent = currentVideos.length;
            document.getElementById('activeVideos').textContent = active;
            
            const totalViews = currentVideos.reduce((sum, v) => sum + (parseInt(v.views) || 0), 0);
            document.getElementById('totalVideoViews').textContent = formatViews(totalViews);
            
            if (currentVideos.length > 0) {
                const sorted = [...currentVideos].sort((a, b) => (parseInt(b.views) || 0) - (parseInt(a.views) || 0));
                const top = sorted[0];
                document.getElementById('popularVideo').textContent = top.titulo ? top.titulo.substring(0, 20) + (top.titulo.length > 20 ? '...' : '') : '—';
            } else {
                document.getElementById('popularVideo').textContent = '—';
            }
        }

        function filterVideos() {
            const search = document.getElementById('videoSearchInput').value.toLowerCase().trim();
            if (!search) {
                filteredVideos = [...currentVideos];
            } else {
                filteredVideos = currentVideos.filter(v => 
                    (v.titulo || '').toLowerCase().includes(search) ||
                    (v.descricao || '').toLowerCase().includes(search) ||
                    (v.youtube_id || '').toLowerCase().includes(search)
                );
            }
            renderVideos();
        }

        function openVideoModal(videoId = null) {
            const modal = document.getElementById('videoModal');
            const title = document.getElementById('videoModalTitle');
            const form = document.getElementById('videoForm');
            isVideoEditing = !!videoId;
            
            if (videoId) {
                const video = currentVideos.find(v => v.id === videoId);
                if (video) {
                    title.textContent = 'Editar Vídeo';
                    document.getElementById('videoId').value = video.id;
                    document.getElementById('videoTitulo').value = video.titulo || '';
                    document.getElementById('videoDescricao').value = video.descricao || '';
                    if (video.streamable_url) {
                        document.getElementById('videoUrl').value = video.streamable_url;
                    } else {
                        document.getElementById('videoUrl').value = video.youtube_url || `https://www.youtube.com/watch?v=${video.youtube_id}`;
                    }
                    document.getElementById('videoAtivo').value = video.ativo || 'true';
                }
            } else {
                title.textContent = 'Adicionar Vídeo';
                form.reset();
                document.getElementById('videoId').value = '';
                document.getElementById('videoAtivo').value = 'true';
            }
            modal.classList.add('active');
        }

        function closeVideoModal() { document.getElementById('videoModal').classList.remove('active'); }
        function editVideo(videoId) { openVideoModal(videoId); }

        async function deleteVideo(videoId) {
            if (!confirm('Tem certeza que deseja excluir este vídeo?')) return;
            try {
                const res = await fetch(`/admin/api/video/${videoId}`, { method: 'DELETE' });
                const data = await res.json();
                if (data.success) {
                    showToast('Vídeo excluído!', 'success');
                    loadVideos();
                } else {
                    showToast(data.error || 'Erro ao excluir', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        async function saveVideo() {
            const videoId = document.getElementById('videoId').value;
            const titulo = document.getElementById('videoTitulo').value.trim();
            const descricao = document.getElementById('videoDescricao').value.trim();
            const videoUrl = document.getElementById('videoUrl').value.trim();
            const ativo = document.getElementById('videoAtivo').value;
            
            if (!titulo) { showToast('O título é obrigatório', 'error'); return; }
            if (!videoUrl) { showToast('A URL do vídeo é obrigatória', 'error'); return; }
            
            const youtubePattern = /(?:youtube\.com\/watch\?v=)([\w-]+)|(?:youtu\.be\/)([\w-]+)/;
            const streamablePattern = /(?:streamable\.com\/e\/)([\w-]+)|(?:streamable\.com\/)([\w-]+)/;
            
            if (!youtubePattern.test(videoUrl) && !streamablePattern.test(videoUrl)) {
                showToast('URL inválida. Use YouTube (watch?v=) ou Streamable (streamable.com/e/)', 'error');
                return;
            }
            
            try {
                const url = videoId ? `/admin/api/video/${videoId}` : '/admin/api/video';
                const method = videoId ? 'PUT' : 'POST';
                
                const res = await fetch(url, {
                    method: method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ titulo, descricao, youtube_url: videoUrl, ativo })
                });
                
                const data = await res.json();
                if (data.success) {
                    closeVideoModal();
                    showToast(videoId ? 'Vídeo atualizado!' : 'Vídeo adicionado!', 'success');
                    loadVideos();
                } else {
                    showToast(data.error || 'Erro ao salvar', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        // ============================================================
        // SENHA
        // ============================================================
        function openPasswordModal() { document.getElementById('passwordModal').classList.add('active'); }
        function closePasswordModal() {
            document.getElementById('passwordModal').classList.remove('active');
            document.getElementById('passwordForm').reset();
        }

        async function changePassword() {
            const current = document.getElementById('currentPassword').value;
            const newPass = document.getElementById('newPassword').value;
            const confirm = document.getElementById('confirmPassword').value;
            
            if (!current || !newPass || !confirm) { showToast('Preencha todos os campos', 'error'); return; }
            if (newPass !== confirm) { showToast('As senhas não coincidem', 'error'); return; }
            if (newPass.length < 6) { showToast('A senha deve ter no mínimo 6 caracteres', 'error'); return; }
            
            try {
                const res = await fetch('/admin/api/change-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ currentPassword: current, newPassword: newPass })
                });
                const data = await res.json();
                if (data.success) {
                    showToast('Senha alterada com sucesso!', 'success');
                    closePasswordModal();
                } else {
                    showToast(data.error || 'Erro ao alterar senha', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        async function logout() {
            try { await fetch('/admin/api/logout', { method: 'POST' }); } catch (e) {}
            window.location.href = '/admin-login';
        }

        // ============================================================
        // AUTO MYMUZE — HELPERS
        // ============================================================
        function amzFmtRelative(ts) {
            if (!ts) return '—';
            const diff = Date.now() - ts;
            if (diff < 0) return 'agora';
            const sec = Math.floor(diff / 1000);
            if (sec < 60) return sec + 's atrás';
            const min = Math.floor(sec / 60);
            if (min < 60) return min + 'min atrás';
            const hr = Math.floor(min / 60);
            if (hr < 24) return hr + 'h atrás';
            const d = Math.floor(hr / 24);
            return d + 'd atrás';
        }

        function amzFmtDate(ts) {
            if (!ts) return '—';
            const d = new Date(ts);
            return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) +
                ' ' + d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
        }

        function amzDaysLeft(u) {
            if (!u) return 0;
            if (typeof u.dias_restantes === 'number') return u.dias_restantes;
            const exp = u.plano_fim || u.expires_at || u.expira_em;
            if (!exp) return 0;
            return Math.max(0, Math.ceil((exp - Date.now()) / (24 * 60 * 60 * 1000)));
        }

        function amzUserStatus(u) {
            const s = u.status;
            if (s === 'otp')     return { key: 'otp',     label: 'OTP pendente',           cls: 'warn' };
            if (s === 'expired') return { key: 'expired', label: 'Expirado',               cls: 'fail' };
            if (s === 'grace')   return { key: 'grace',   label: `Grace (${u.dias_restantes || 0}d)`, cls: 'warn' };
            if (s === 'free')    return { key: 'free',    label: 'Free trial',             cls: 'info' };
            if (s === 'paused')  return { key: 'paused',  label: 'Pausado (falhas)',       cls: 'warn' };
            return { key: 'active', label: 'Ativo', cls: 'ok' };
        }

        // ============================================================
        // AUTO MYMUZE — STATS
        // ============================================================
        async function loadAmzStats() {
            try {
                const res = await fetch('/admin/api/automymuze/stats');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();

                const ok = data.ok_24h || 0;
                const fail = data.fail_24h || 0;
                const queueSize = data.queueSize || 0;
                const lastTick = data.last_cron_run || (data.cron && data.cron.lastRunAt) || null;

                document.getElementById('amzOk24h').textContent = ok;
                document.getElementById('amzFail24h').textContent = fail;
                document.getElementById('amzQueueSize').textContent = queueSize;

                const total = ok + fail;
                const okRate = total > 0 ? Math.round((ok / total) * 100) : 0;
                document.getElementById('amzOkRate').textContent = total > 0 ? okRate + '% de sucesso' : 'sem dados';
                document.getElementById('amzFailRate').textContent = total > 0 ? (100 - okRate) + '% de falha' : '—';

                document.getElementById('amzQueueInfo').textContent = queueSize > 0
                    ? queueSize + ' aguardando processamento'
                    : 'fila vazia';

                document.getElementById('amzLastTick').textContent = lastTick ? amzFmtRelative(lastTick) : '—';
                document.getElementById('amzTodayMz').textContent = 'Hoje MZ: ' + (data.today_mz || '—');

                const cronCard = document.querySelector('.amz-stat-card.cron');
                if (lastTick && Date.now() - lastTick > 30 * 60 * 1000) {
                    cronCard.style.borderColor = 'var(--danger)';
                } else {
                    cronCard.style.borderColor = 'var(--border-color)';
                }
            } catch (e) {
                console.error('Erro amz stats:', e);
            }
        }

        // ============================================================
        // AUTO MYMUZE — USERS
        // ============================================================
        async function loadAmzUsers() {
            try {
                const res = await fetch('/admin/api/automymuze/users');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                amzUsers = Array.isArray(data) ? data : (data.users || []);
                amzFilterUsers();
            } catch (e) {
                console.error('Erro amz users:', e);
                document.getElementById('amzUsersTableBody').innerHTML =
                    '<tr><td colspan="6" class="empty-row"><i class="fas fa-exclamation-circle"></i> Erro ao carregar usuários</td></tr>';
            }
        }

        function amzFilterUsers() {
            const term = (document.getElementById('amzUserSearch').value || '').toLowerCase().trim();
            const status = document.getElementById('amzUserStatusFilter').value;

            amzFilteredUsers = amzUsers.filter(u => {
                const msisdn = (u.msisdn || '').toLowerCase();
                if (term && !msisdn.includes(term)) return false;
                if (status) {
                    const s = amzUserStatus(u);
                    if (s.key !== status) return false;
                }
                return true;
            });

            amzRenderUsers();
            document.getElementById('amzUsersCount').textContent = amzFilteredUsers.length + ' usuários';
        }

        function amzRenderUsers() {
            const tbody = document.getElementById('amzUsersTableBody');
            if (!amzFilteredUsers.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-row"><i class="fas fa-users-slash"></i> Nenhum usuário</td></tr>';
                return;
            }

            let html = '';
            amzFilteredUsers.forEach(u => {
                const msisdn = u.msisdn || '—';
                const plan = u.plano || 'paid';
                const days = amzDaysLeft(u);
                const st = amzUserStatus(u);
                const lastOk = u.last_update_ok || null;

                html += `
                    <tr>
                        <td><strong>${msisdn}</strong></td>
                        <td>${plan}</td>
                        <td>${days}</td>
                        <td>${lastOk ? amzFmtRelative(lastOk) : '—'}</td>
                        <td><span class="amz-badge ${st.cls}">${st.label}</span></td>
                        <td>
                            <div class="item-actions">
                                <button class="action-btn" onclick="amzExtendUser('${msisdn}')" title="Estender">
                                    <i class="fas fa-calendar-plus"></i>
                                </button>
                                <button class="action-btn duplicate" onclick="amzForceUpdate('${msisdn}')" title="Forçar atualização">
                                    <i class="fas fa-bolt"></i>
                                </button>
                                <button class="action-btn delete" onclick="amzCancelUser('${msisdn}')" title="Cancelar (mantém dados)">
                                    <i class="fas fa-ban"></i>
                                </button>
                                <button class="action-btn delete" onclick="amzDeleteUser('${msisdn}')" title="Excluir completamente">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        async function amzExtendUser(msisdn) {
            const days = prompt(`Estender ${msisdn} por quantos dias?`, '30');
            if (!days || isNaN(days) || +days <= 0) return;
            try {
                const res = await fetch(`/admin/api/automymuze/user/${encodeURIComponent(msisdn)}/extend`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ dias: +days, days: +days })
                });
                const data = await res.json();

                if (res.ok && data.ok !== false) {
                    showToast(
                        `${msisdn} estendido por ${data.dias || days} dias (${data.dias_restantes || '?'} restantes)`,
                        'success'
                    );
                    if (data.precisa_otp) {
                        setTimeout(() => {
                            showToast(
                                `⚠️ ${msisdn} está sem sessão — cliente precisa relogar com OTP`,
                                'warn'
                            );
                        }, 1500);
                    }
                    loadAmzUsers();
                    loadAmzStats();
                } else {
                    showToast(data.error || 'Erro ao estender', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        async function amzForceUpdate(msisdn) {
            if (!confirm(`Forçar atualização de ${msisdn} agora?`)) return;
            try {
                const res = await fetch(`/admin/api/automymuze/user/${encodeURIComponent(msisdn)}/force-update`, {
                    method: 'POST'
                });
                const data = await res.json();
                if (data.ok !== false) {
                    showToast(`Atualização forçada para ${msisdn}`, 'success');
                    setTimeout(() => { loadAmzUsers(); loadAmzStats(); }, 1500);
                } else {
                    showToast(data.error || 'Erro ao forçar atualização', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        async function amzCancelUser(msisdn) {
            if (!confirm(`Cancelar plano de ${msisdn}? (não faz hard delete — só para de atualizar)`)) return;
            try {
                const res = await fetch(`/admin/api/automymuze/user/${encodeURIComponent(msisdn)}/cancel`, {
                    method: 'POST'
                });
                const data = await res.json();
                if (data.ok !== false) {
                    showToast(`${msisdn} cancelado`, 'success');
                    loadAmzUsers();
                } else {
                    showToast(data.error || 'Erro ao cancelar', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        // ⭐ Excluir UM usuário manualmente (limpa TUDO, inclusive free trial)
        async function amzDeleteUser(msisdn) {
            if (!confirm(
                `⚠️ EXCLUIR COMPLETAMENTE ${msisdn}?\n\n` +
                `• Apaga plano, sessão, fila, home e profile\n` +
                `• Cliente PODERÁ pedir free trial novamente\n\n` +
                `Essa ação NÃO pode ser desfeita.`
            )) return;

            try {
                const res = await fetch(`/admin/api/automymuze/user/${encodeURIComponent(msisdn)}`, {
                    method: 'DELETE'
                });
                const data = await res.json();
                if (res.ok && data.ok !== false) {
                    showToast(`${msisdn} excluído completamente`, 'success');
                    loadAmzUsers();
                    loadAmzStats();
                } else {
                    showToast(data.error || 'Erro ao excluir', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        // ⭐ Excluir em massa SOMENTE usuários free_trial
        // (mantém flag amz:free_trials_used → não podem pedir free de novo)
        async function amzPurgeFreeTrials() {
            const freeCount = amzUsers.filter(u => u.plano === 'free_trial').length;
            if (freeCount === 0) {
                showToast('Nenhum usuário em free trial', 'info');
                return;
            }

            if (!confirm(
                `⚠️ EXCLUIR ${freeCount} USUÁRIO(S) FREE TRIAL?\n\n` +
                `• Apaga plano, sessão, fila, home e profile\n` +
                `• MAS mantém a flag de free trial usada\n` +
                `• Ou seja: NÃO poderão pedir free trial novamente\n\n` +
                `Contas pagas NÃO são afetadas.`
            )) return;

            const btn = document.getElementById('amzPurgeFreeBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Excluindo...';

            try {
                const res = await fetch('/admin/api/automymuze/users/purge-free', {
                    method: 'POST'
                });
                const data = await res.json();
                if (res.ok && data.ok !== false) {
                    showToast(`${data.deleted || 0} free trial(s) excluído(s)`, 'success');
                    loadAmzUsers();
                    loadAmzStats();
                } else {
                    showToast(data.error || 'Erro ao excluir', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-broom"></i><span>Excluir free trials</span>';
            }
        }

        // ============================================================
        // AUTO MYMUZE — KEYS
        // ============================================================
        async function loadAmzKeys() {
            try {
                const res = await fetch('/admin/api/automymuze/keys');
                if (!res.ok) throw new Error('HTTP ' + res.status);
                const data = await res.json();
                amzKeys = Array.isArray(data) ? data : (data.keys || []);
                amzFilterKeys();
            } catch (e) {
                console.error('Erro amz keys:', e);
                document.getElementById('amzKeysTableBody').innerHTML =
                    '<tr><td colspan="6" class="empty-row"><i class="fas fa-exclamation-circle"></i> Erro ao carregar chaves</td></tr>';
            }
        }

        function amzKeyStatus(k) {
            if (k.status === 'cancelada') return { key: 'cancelada', label: 'Cancelada', cls: 'fail' };
            if (k.status === 'usada')     return { key: 'usada',     label: 'Resgatada', cls: 'info' };
            return { key: 'nova', label: 'Disponível', cls: 'ok' };
        }

        function amzFilterKeys() {
            const term = (document.getElementById('amzKeySearch').value || '').toLowerCase().trim();
            const status = document.getElementById('amzKeyStatusFilter').value;

            amzFilteredKeys = amzKeys.filter(k => {
                const codigo = (k.codigo || '').toLowerCase();
                const dest = (k.msisdn_destino || '').toLowerCase();
                if (term && !codigo.includes(term) && !dest.includes(term)) return false;
                if (status && k.status !== status) return false;
                return true;
            });

            amzRenderKeys();
            document.getElementById('amzKeysCount').textContent = amzFilteredKeys.length + ' chaves';
        }

        function amzRenderKeys() {
            const tbody = document.getElementById('amzKeysTableBody');
            if (!amzFilteredKeys.length) {
                tbody.innerHTML = '<tr><td colspan="6" class="empty-row"><i class="fas fa-key"></i> Nenhuma chave</td></tr>';
                return;
            }

            let html = '';
            amzFilteredKeys.forEach(k => {
                const codigo = k.codigo || '—';
                const dest = k.msisdn_destino || '—';
                const dias = k.dias || '—';
                const st = amzKeyStatus(k);
                const criada = Number(k.criada_em) || null;

                html += `
                    <tr>
                        <td>
                            <span class="amz-code copyable" onclick="amzCopyCode('${codigo}')" title="Clique para copiar">
                                ${codigo}
                            </span>
                        </td>
                        <td>${dest}</td>
                        <td>${dias}</td>
                        <td><span class="amz-badge ${st.cls}">${st.label}</span></td>
                        <td>${criada ? amzFmtDate(criada) : '—'}</td>
                        <td>
                            <div class="item-actions">
                                ${st.key === 'nova' ? `
                                <button class="action-btn delete" onclick="amzCancelKey('${codigo}')" title="Cancelar chave">
                                    <i class="fas fa-ban"></i>
                                </button>` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
            tbody.innerHTML = html;
        }

        function amzCopyCode(codigo) {
            if (!codigo || codigo === '—') return;
            navigator.clipboard?.writeText(codigo).then(() => {
                showToast('Código copiado: ' + codigo, 'success');
            }).catch(() => {
                showToast('Falha ao copiar', 'error');
            });
        }

        async function amzGenerateKey() {
            const msisdn = (document.getElementById('amzKeyMsisdn').value || '').trim();
            const dias = parseInt(document.getElementById('amzKeyDays').value, 10);
            const qty = parseInt(document.getElementById('amzKeyQty').value, 10);

            if (!msisdn || !/^\d{9,15}$/.test(msisdn)) {
                showToast('MSISDN obrigatório (9-15 dígitos)', 'error');
                return;
            }
            if (!dias || dias < 1 || dias > 365) {
                showToast('Dias deve estar entre 1 e 365', 'error');
                return;
            }
            if (!qty || qty < 1 || qty > 50) {
                showToast('Quantidade deve estar entre 1 e 50', 'error');
                return;
            }

            const btn = document.getElementById('amzGenerateKeyBtn');
            btn.disabled = true;
            btn.innerHTML = '<i class="fas fa-spinner fa-pulse"></i> Gerando...';

            try {
                const res = await fetch('/admin/api/automymuze/keys', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ msisdn, dias, days: dias, quantity: qty, qty })
                });
                const data = await res.json();

                if (res.ok && data.ok !== false) {
                    const criadas = data.keys || [];
                    if (criadas.length === 1) {
                        const c = criadas[0].codigo;
                        showToast(`Chave gerada: ${c}`, 'success');
                        amzCopyCode(c);
                    } else if (criadas.length > 1) {
                        showToast(`${criadas.length} chaves geradas`, 'success');
                    } else {
                        showToast('Chave gerada', 'success');
                    }
                    loadAmzKeys();
                } else {
                    showToast(data.error || 'Erro ao gerar chave', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            } finally {
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-plus-circle"></i><span>Gerar</span>';
            }
        }

        async function amzCancelKey(codigo) {
            if (!confirm(`Cancelar a chave ${codigo}?`)) return;
            try {
                const res = await fetch(`/admin/api/automymuze/keys/${encodeURIComponent(codigo)}/cancel`, {
                    method: 'POST'
                });
                const data = await res.json();
                if (data.ok !== false) {
                    showToast('Chave cancelada', 'success');
                    loadAmzKeys();
                } else {
                    showToast(data.error || 'Erro ao cancelar', 'error');
                }
            } catch (e) {
                showToast('Erro de conexão', 'error');
            }
        }

        // ============================================================
        // INICIALIZAÇÃO
        // ============================================================
        document.addEventListener('DOMContentLoaded', () => {
            initTheme();
            loadStats();
            loadItems();
            loadVideos();
            
            document.getElementById('themeToggle').addEventListener('click', () => {
                const current = document.body.getAttribute('data-theme');
                const newTheme = current === 'dark' ? 'light' : 'dark';
                document.body.setAttribute('data-theme', newTheme);
                localStorage.setItem('theme', newTheme);
                updateThemeIcon(newTheme);
                loadStats();
            });
            
            document.getElementById('newItemBtn').addEventListener('click', () => openItemModal());
            document.getElementById('newVideoBtn').addEventListener('click', () => openVideoModal());
            document.getElementById('changePasswordBtn').addEventListener('click', openPasswordModal);
            document.getElementById('logoutBtn').addEventListener('click', logout);
            
            document.querySelectorAll('.image-tab').forEach(tab => {
                tab.addEventListener('click', () => switchImageMode(tab.dataset.tab));
            });
            
            document.getElementById('placeholderText').addEventListener('input', updatePlaceholderPreview);
            document.getElementById('placeholderBg').addEventListener('input', updatePlaceholderPreview);
            document.getElementById('placeholderTextColor').addEventListener('input', updatePlaceholderPreview);
            
            document.getElementById('itemModal').addEventListener('click', function(e) {
                if (e.target === this) closeItemModal();
            });
            document.getElementById('videoModal').addEventListener('click', function(e) {
                if (e.target === this) closeVideoModal();
            });
            document.getElementById('passwordModal').addEventListener('click', function(e) {
                if (e.target === this) closePasswordModal();
            });

            document.getElementById('amzRefreshUsersBtn').addEventListener('click', () => {
                loadAmzUsers();
                loadAmzStats();
            });
            document.getElementById('amzPurgeFreeBtn').addEventListener('click', amzPurgeFreeTrials);
            document.getElementById('amzRefreshKeysBtn').addEventListener('click', loadAmzKeys);
            document.getElementById('amzGenerateKeyBtn').addEventListener('click', amzGenerateKey);
            
            setInterval(loadStats, 30000);
        });
    </script>
</body>
</html>
