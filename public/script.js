// public/script.js

/**
 * Retorna o valor de um parâmetro da URL.
 * @param {string} name - O nome do parâmetro.
 * @returns {string|null} O valor do parâmetro ou null se não for encontrado.
 */
function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

/**
 * Exibe um pop-up personalizado na tela.
 * @param {string} title - O título do pop-up.
 * @param {string} message - A mensagem a ser exibida no pop-up.
 * @param {boolean} [isError=false] - Se true, aplica estilos de erro (opcional).
 */
function showCustomAlert(title, message, isError = false) {
    const overlay = document.getElementById('customAlertOverlay');
    const box = overlay.querySelector('.custom-alert-box');
    const titleElement = document.getElementById('customAlertTitle');
    const messageElement = document.getElementById('customAlertMessage');
    const closeBtn = document.getElementById('customAlertCloseBtn');

    titleElement.textContent = title;
    messageElement.textContent = message;

    if (isError) {
        box.classList.add('error');
    } else {
        box.classList.remove('error');
    }

    overlay.classList.add('show'); // Adiciona a classe para exibir o pop-up

    // Impede a rolagem do corpo enquanto o pop-up está ativo
    document.body.style.overflow = 'hidden';

    // Fecha o pop-up ao clicar no botão "OK"
    closeBtn.onclick = () => {
        overlay.classList.remove('show');
        document.body.style.overflow = ''; // Restaura a rolagem do corpo
    };

    // Opcional: Fecha o pop-up ao clicar fora da caixa de diálogo
    overlay.onclick = (event) => {
        if (event.target === overlay) {
            overlay.classList.remove('show');
            document.body.style.overflow = ''; // Restaura a rolagem do corpo
        }
    };
}


/**
 * Inicia o contador regressivo e gerencia o progresso da barra.
 * Exibe a dica de rolagem e o botão de continuar ao final.
 * @param {number} currentPageStep - O número da etapa atual (1, 2 ou 3).
 */
function initCountdown(currentPageStep) {
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progressBar');
    const nextStepBtn = document.getElementById('nextStepBtn');
    const scrollHint = document.getElementById('scrollHint');
    let timeLeft = 15; // Duração do contador em segundos

    if (!countdownElement || !progressBar || !nextStepBtn || !scrollHint) {
        console.error('Erro: Um ou mais elementos do contador ou da dica de rolagem não foram encontrados no HTML.');
        showCustomAlert('Erro Crítico', 'Um problema na inicialização da página impede a contagem. Por favor, tente novamente.', true);
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
        return;
    }

    scrollHint.style.opacity = '0'; // Define a opacidade para 0 para ser animado pelo CSS

    // Inicia o contador regressivo
    const timer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;

        // Atualiza a barra de progresso
        const progress = ((15 - timeLeft) / 15) * 100;
        progressBar.style.width = `${progress}%`;

        // Mostrar dica de scroll quando faltar 5 segundos
        if (timeLeft === 5) {
            scrollHint.style.opacity = '1';
        }

        // Quando o contador chega a zero
        if (timeLeft <= 0) {
            clearInterval(timer); // Para o contador
            countdownElement.textContent = "0"; // Garante que o texto seja zero
            progressBar.style.width = '100%'; // Completa a barra de progresso

            // Exibe o botão de continuar e oculta a dica de rolagem
            nextStepBtn.classList.add('show'); // Adiciona classe para tornar visível e ativo
            scrollHint.style.opacity = '0'; // Oculta a dica de rolagem

            // Define o texto do botão com base na etapa atual
            nextStepBtn.innerHTML = `<i class="fas fa-arrow-right"></i> ${(currentPageStep === 3) ? 'Obter Link Final' : 'Continuar'}`;
            // Adiciona o evento de clique ao botão
            nextStepBtn.onclick = () => advanceToNextStep(currentPageStep);
        }
    }, 1000); // Executa a cada 1 segundo
}

/**
 * Avança para a próxima etapa do redirecionamento, comunicando-se com o servidor.
 * Envia o token de sessão e a etapa atual para o servidor para validação.
 * @param {number} currentStep - A etapa que acabou de ser concluída.
 */
async function advanceToNextStep(currentStep) {
    const sessionToken = getQueryParam('token'); // Pega o token de sessão da URL

    if (!sessionToken) {
        showCustomAlert('Token Ausente', 'Token de sessão não encontrado. Por favor, recomece o processo.', true);
        setTimeout(() => {
            window.location.href = '/'; // Redireciona para a página inicial
        }, 3000);
        return;
    }

    try {
        // Altera o texto do botão enquanto carrega
        const nextStepBtn = document.getElementById('nextStepBtn');
        nextStepBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Carregando...';
        nextStepBtn.disabled = true; // Desabilita o botão para evitar múltiplos cliques
        nextStepBtn.classList.remove('show'); // Opcional: Esconder durante o carregamento, mas o spinner já indica.

        const response = await fetch(`/next-step?token=${sessionToken}&currentStep=${currentStep}`);
        const data = await response.json();

        if (response.ok && data.redirect) {
            if (currentStep === 3) {
                showCustomAlert('Sucesso!', 'Conteúdo liberado com sucesso! Redirecionando...');
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 2000);
            } else {
                window.location.href = data.redirect;
            }
        } else {
            showCustomAlert('Erro no Servidor', data.error || 'Ocorreu um erro ao avançar. Por favor, tente novamente.', true);
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        }
    } catch (error) {
        console.error('Erro de rede ou servidor:', error);
        showCustomAlert('Erro de Conexão', 'Ocorreu um erro inesperado na comunicação com o servidor. Por favor, verifique sua conexão e tente novamente.', true);
        setTimeout(() => {
            window.location.href = '/';
        }, 3000);
    } finally {
        // Restaura o botão se houver erro e não houver redirecionamento imediato
        const nextStepBtn = document.getElementById('nextStepBtn');
        if (nextStepBtn) { // Verifica se o elemento ainda existe
             if (!response || !response.ok || !data.redirect) { // Se não houve redirecionamento bem-sucedido
                nextStepBtn.innerHTML = `<i class="fas fa-arrow-right"></i> ${(currentStep === 3) ? 'Obter Link Final' : 'Continuar'}`;
                nextStepBtn.disabled = false;
                nextStepBtn.classList.add('show'); // Garante que o botão volte a ser visível e ativo após erro
            }
        }
    }
}

// Este bloco de script agora só chama a função initCountdown
document.addEventListener('DOMContentLoaded', () => {
    const pathMatch = window.location.pathname.match(/page(\d+)/);
    const currentPageStep = pathMatch ? parseInt(pathMatch[1], 10) : NaN; // Usar parseInt com radix 10

    // Animação da onda (se for exclusiva desta página)
    const wave = document.querySelector('.wave');
    if (wave) {
        let scrollPosition = 0;
        function moveWave() {
            scrollPosition += 0.5;
            wave.style.backgroundPositionX = -scrollPosition + 'px';
            requestAnimationFrame(moveWave);
        }
        moveWave();
    }

    if (!isNaN(currentPageStep)) {
        initCountdown(currentPageStep);
    } else {
        // Se não conseguir determinar a etapa, e não for a página inicial
        // Isso pode acontecer se for 'index.html' ou outra página sem 'pageX' no nome
        // Para a `page1.html` a regex deve funcionar bem.
        // Se for a página inicial (index.html), talvez não precise de contador.
        if (window.location.pathname === '/' || window.location.pathname.endsWith('/index.html')) {
            // Não faz nada, é a página inicial sem contador.
            console.log("Página inicial, sem contador.");
        } else {
            showCustomAlert('Erro de Navegação', 'Não foi possível determinar a etapa da página. Redirecionando para o início.', true);
            setTimeout(() => {
                window.location.href = '/';
            }, 3000);
        }
    }
});