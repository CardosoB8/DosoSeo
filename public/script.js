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
    let timeLeft = 15;

    if (!countdownElement || !progressBar || !nextStepBtn) {
        console.error('Elementos do contador não encontrados. Verifique o HTML.');
        return;
    }

    nextStepBtn.style.display = 'none';

    const timer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;

        const progress = ((15 - timeLeft) / 15) * 100;
        progressBar.style.width = `${progress}%`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            countdownElement.textContent = "0";
            progressBar.style.width = '100%';

            nextStepBtn.style.display = 'block';
            nextStepBtn.textContent = (currentPageStep === 3) ? 'Obter Link Final' : 'Continuar';
            nextStepBtn.onclick = () => advanceToNextStep(currentPageStep);
        }
    }, 1000);
}

/**
 * Avança para a próxima etapa do redirecionamento, comunicando-se com o servidor.
 * Envia o token de sessão e a etapa atual para o servidor.
 * @param {number} currentStep - A etapa que acabou de ser concluída.
 */
async function advanceToNextStep(currentStep) {
    const sessionToken = getQueryParam('token'); // Pega o token da URL

    if (!sessionToken) {
        alert('Erro: Token de sessão não encontrado. Redirecionando para o início.');
        window.location.href = '/';
        return;
    }

    try {
        // Envia o token e a etapa atual para o servidor
        const response = await fetch(`/next-step?token=${sessionToken}&currentStep=${currentStep}`);
        const data = await response.json();

        if (response.ok && data.redirect) {
            window.location.href = data.redirect;
        } else {
            alert(data.error || 'Ocorreu um erro ao avançar. Por favor, tente novamente.');
            window.location.href = '/';
        }
    } catch (error) {
        console.error('Erro de rede ou servidor:', error);
        alert('Ocorreu um erro inesperado na comunicação. Por favor, tente novamente.');
        window.location.href = '/';
    }
}