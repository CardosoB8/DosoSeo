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
    const scrollHint = document.getElementById('scrollHint'); // Elemento da dica de rolagem
    let timeLeft = 15; // Duração do contador em segundos

    // Verifica se todos os elementos necessários estão presentes no HTML
    if (!countdownElement || !progressBar || !nextStepBtn || !scrollHint) {
        console.error('Erro: Um ou mais elementos do contador ou da dica de rolagem não foram encontrados no HTML.');
        // Usando o pop-up personalizado para este erro também
        showCustomAlert('Erro Crítico', 'Um problema na inicialização da página impede a contagem. Por favor, tente novamente.', true);
        setTimeout(() => {
            window.location.href = '/'; 
        }, 3000); 
        return; 
    }

    // Oculta o botão de continuar e a dica de rolagem no início
    nextStepBtn.style.display = 'none';
    scrollHint.style.display = 'none';

    // Inicia o contador regressivo
    const timer = setInterval(() => {
        timeLeft--;
        countdownElement.textContent = timeLeft;

        // Atualiza a barra de progresso
        const progress = ((15 - timeLeft) / 15) * 100;
        progressBar.style.width = `${progress}%`;

        // Quando o contador chega a zero
        if (timeLeft <= 0) {
            clearInterval(timer); // Para o contador
            countdownElement.textContent = "0"; // Garante que o texto seja zero
            progressBar.style.width = '100%'; // Completa a barra de progresso

            // Exibe o botão de continuar e a dica de rolagem
            nextStepBtn.style.display = 'block';
            scrollHint.style.display = 'block';

            // Define o texto do botão com base na etapa atual
            nextStepBtn.textContent = (currentPageStep === 3) ? 'Obter Link Final' : 'Continuar';
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

    // Se o token não for encontrado, alerta o usuário e redireciona
    if (!sessionToken) {
        showCustomAlert('Token Ausente', 'Token de sessão não encontrado. Por favor, recomece o processo.', true);
        setTimeout(() => {
            window.location.href = '/'; // Redireciona para a página inicial
        }, 3000); 
        return;
    }

    try {
        // Envia o token e a etapa atual para o endpoint do servidor '/next-step'
        const response = await fetch(`/next-step?token=${sessionToken}&currentStep=${currentStep}`);
        const data = await response.json(); // Tenta parsear a resposta como JSON

        // Se a resposta for bem-sucedida e contiver uma URL de redirecionamento
        if (response.ok && data.redirect) {
            // Se o conteúdo foi liberado com sucesso, exibe um pop-up de sucesso
            if (currentStep === 3) { // Supondo que 3 é a última etapa
                showCustomAlert('Sucesso!', 'Conteúdo liberado com sucesso! Redirecionando...');
                setTimeout(() => {
                    window.location.href = data.redirect; // Redireciona o navegador após o pop-up
                }, 2000); // Dá um tempo para o usuário ler o pop-up de sucesso
            } else {
                // Para outras etapas, redireciona diretamente
                window.location.href = data.redirect;
            }
        } else {
            // Caso contrário, exibe uma mensagem de erro do servidor ou uma genérica
            showCustomAlert('Erro no Servidor', data.error || 'Ocorreu um erro ao avançar. Por favor, tente novamente.', true);
            setTimeout(() => {
                window.location.href = '/'; // Redireciona para a página inicial em caso de erro
            }, 3000); 
        }
    } catch (error) {
        // Captura erros de rede ou outros erros inesperados durante a requisição
        console.error('Erro de rede ou servidor:', error);
        showCustomAlert('Erro de Conexão', 'Ocorreu um erro inesperado na comunicação com o servidor. Por favor, verifique sua conexão e tente novamente.', true);
        setTimeout(() => {
            window.location.href = '/'; // Redireciona para a página inicial
        }, 3000); 
    }
}