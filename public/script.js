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
 * Inicia o contador regressivo e gerencia o progresso da barra.
 * @param {number} currentPageStep - O número da etapa atual (1, 2 ou 3).
 */
function initCountdown(currentPageStep) {
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progressBar');
    const nextStepBtn = document.getElementById('nextStepBtn');
    let timeLeft = 15; // Duração do contador em segundos

    if (!countdownElement || !progressBar || !nextStepBtn) {
        console.error('Elementos do contador não encontrados. Verifique o HTML.');
        return;
    }

    // Garante que o botão esteja oculto no início
    nextStepBtn.style.display = 'none';

    const timer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;

        const progress = ((15 - timeLeft) / 15) * 100;
        progressBar.style.width = `${progress}%`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            countdownElement.textContent = "0";
            progressBar.style.width = '100%'; // Completa a barra de progresso

            // Exibe e configura o botão "Continuar" ou "Obter Link Final"
            nextStepBtn.style.display = 'block';
            nextStepBtn.textContent = (currentPageStep === 3) ? 'Obter Link Final' : 'Continuar';
            nextStepBtn.onclick = () => advanceToNextStep(currentPageStep);
        }
    }, 1000); // Atualiza a cada 1 segundo
}

/**
 * Avança para a próxima etapa do redirecionamento, comunicando-se com o servidor.
 * @param {number} currentStep - A etapa que acabou de ser concluída.
 */
async function advanceToNextStep(currentStep) {
    const alias = getQueryParam('alias');
    const originalUrl = getQueryParam('originalUrl');

    if (!alias || !originalUrl) {
        alert('Erro: Parâmetros de link não encontrados. Por favor, recomece o processo.');
        window.location.href = '/'; // Redireciona para a home
        return;
    }

    try {
        // Envia os parâmetros necessários ao servidor para a próxima etapa
        const response = await fetch(`/next-step?alias=${alias}&originalUrl=${originalUrl}&currentStep=${currentStep}`);
        const data = await response.json();

        if (response.ok && data.redirect) {
            // Redireciona o navegador para a URL fornecida pelo servidor
            window.location.href = data.redirect;
        } else {
            // Lida com erros do servidor ou redireciona para a home
            alert(data.error || 'Ocorreu um erro ao avançar. Por favor, tente novamente.');
            window.location.href = '/';
        }
    } catch (error) {
        // Lida com erros de rede
        console.error('Erro de rede ou servidor:', error);
        alert('Ocorreu um erro inesperado na comunicação. Por favor, tente novamente.');
        window.location.href = '/';
    }
}
