function getQueryParam(name) {
    const urlParams = new URLSearchParams(window.location.search);
    return urlParams.get(name);
}

function initCountdown(currentPageStep) {
    const countdownElement = document.getElementById('countdown');
    const progressBar = document.getElementById('progressBar');
    const nextStepBtn = document.getElementById('nextStepBtn');
    let timeLeft = 15; // 15 segundos

    const timer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;

        const progress = ((15 - timeLeft) / 15) * 100;
        progressBar.style.width = `${progress}%`;

        if (timeLeft <= 0) {
            clearInterval(timer);
            countdownElement.textContent = "0";
            progressBar.style.width = '100%';
            // Se houver um botão "Continuar", exiba-o, senão, redirecione automaticamente
            if (nextStepBtn) {
                nextStepBtn.style.display = 'block';
                nextStepBtn.textContent = (currentPageStep === 3) ? 'Obter Link Final' : 'Continuar';
                nextStepBtn.onclick = () => advanceToNextStep(currentPageStep);
            } else {
                 // Fallback para auto-redirecionamento se não houver botão
                 advanceToNextStep(currentPageStep);
            }
        }
    }, 1000); // Atualiza a cada 1 segundo
}

async function advanceToNextStep(currentStep) {
    const sessionId = getQueryParam('sessionId');
    if (!sessionId) {
        alert('Erro: ID de sessão não encontrado. Redirecionando para o início.');
        window.location.href = '/'; // Volta para a home
        return;
    }

    try {
        const response = await fetch(`/next-step?sessionId=${sessionId}&currentStep=${currentStep}`);
        const data = await response.json();

        if (response.ok && data.redirect) {
            window.location.href = data.redirect;
        } else {
            alert(data.error || 'Erro ao avançar para a próxima etapa. Por favor, tente novamente.');
            window.location.href = '/'; // Volta para a home em caso de erro
        }
    } catch (error) {
        console.error('Erro de rede ou servidor:', error);
        alert('Ocorreu um erro inesperado. Por favor, tente novamente.');
        window.location.href = '/'; // Volta para a home em caso de erro
    }
}

// A função initCountdown será chamada no HTML de cada página de espera.
// Exemplo: <script>initCountdown(1);</script> para page1.html