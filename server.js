// Este é o cérebro do seu assistente. Ele serve a página do chat e se comunica com a API do Gemini.

// 1. Configuração Inicial
require('dotenv').config();
const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const app = express();
const port = 3000;

// Configuração para servir arquivos estáticos (HTML, CSS, JS) da pasta 'public'
// A opção 'extensions' permite acessar 'atendimento.html' apenas com '/atendimento'
app.use(express.static('public', { extensions: ['html'] }));
app.use(express.json()); // Permite que o servidor entenda JSON vindo do frontend

// 2. Configuração do Gemini
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

const safetySettings = [ // Configurações de segurança para permitir uma conversa mais fluida
    { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
    { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// !! SEU LINK DE AFILIADO - COLOQUE O LINK REAL AQUI !!
const affiliateLink = "https://tracking.olabet.co.mz/C.ashx?btag=a_969b_12c_&affid=941&siteid=969&adid=12&c="; // EX: "https://minha.plataforma.com/cadastro?affid=123"

// !! SEU LINK DO TELEGRAM - COLOQUE O LINK REAL AQUI !!
const telegramLink = "https://t.me/ferramentaaviator"; // EX: "https://t.me/grupo_exclusivo_aviator"

// Lista de links de cadastro válidos (APENAS EXEMPLOS - COLOQUE SEUS LINKS REAIS AQUI)
// O bot vai verificar se o link do usuário É IGUAL a um destes, OU se ele CONTÉM um destes.
// Para links com parâmetros (ex: ?param=abc), o 'includes' é mais útil.
// Ex: Se o link válido é "https://meusite.com/registro", e o usuário envia "https://meusite.com/registro?ref=123", o 'includes' vai funcionar.
const validRegistrationLinks = [
    "https://seusiteparceiro.com/confirmacao-cadastro",
    "https://outrosite.com/registro-concluido",
    "https://www.placard.co.mz/thank-you/",
    // Adicione todos os URLs base das suas páginas de confirmação de cadastro aqui
    // IMPORTANTE: Inclua também o domínio base do seu link de afiliado, caso a confirmação seja no mesmo domínio.
    "https://seulinkdeafiliado.com/confirmacao", // Exemplo de página de confirmação no seu domínio de afiliado
];

// INSTRUÇÕES PARA O GEMINI (A "Personalidade" do Bot)
const promptDoAssistente = `
Você é o "Assistente Jet", um chatbot amigável e profissional.
Sua única função é guiar o usuário no processo de obter acesso a uma ferramenta chamada "robô Aviator".

O FLUXO É O SEGUINTE:
1. Você se apresenta e pede ao usuário que se cadastre. Ofereça o seguinte link para o cadastro: ${affiliateLink}
   ***ATENÇÃO: O link de cadastro ${affiliateLink} DEVE ESTAR CLARAMENTE NA SUA PRIMEIRA MENSAGEM***
2. Após o cadastro, você pede que o usuário **copie e cole o link COMPLETO da página de confirmação de cadastro do navegador**.
3. Se o usuário não souber como copiar o link, você deve guiá-lo passo a passo, de forma bem didática:
    - "Para copiar o link, basta clicar uma vez na barra de endereço do seu navegador (onde o site está escrito, geralmente no topo da tela). Depois, selecione todo o texto que aparece lá e copie (pode usar Ctrl+C no Windows/Linux ou Cmd+C no Mac). Em seguida, cole aqui na nossa conversa (Ctrl+V ou Cmd+V)."
4. Você aguarda o envio do link.
5. Após o envio, o servidor irá analisar o link. Se o link enviado pelo usuário for válido (ou seja, se ele corresponder ou contiver um dos links de confirmação de cadastro pré-aprovados), o servidor enviará a resposta final com o link do Telegram. Caso contrário, o servidor pedirá para tentar novamente. O Gemini deve estar preparado para essa resposta do servidor.

REGRAS RÍGIDAS:
- Seja sempre educado, natural e paciente. Deixe o usuário confortável.
- Mantenha o foco TOTALMENTE na ajuda para acesso ao robô Aviator.
- Se o usuário perguntar sobre qualquer outro assunto (tempo, futebol, quem te criou, etc.), responda de forma educada que sua função é apenas ajudar com o acesso ao robô Aviator. Por exemplo: "Entendo sua curiosidade, mas meu foco aqui é te ajudar a conseguir seu acesso ao robô Aviator. Você já fez o cadastro e tem o link da página de confirmação para me enviar?"
- Não use gírias. Mantenha um tom profissional, mas acessível.
- A validação do link é a ÚNICA forma de prosseguir.
- Sempre que pedir o link de confirmação, lembre o usuário de copiar o link COMPLETO da barra de endereço.
`;

// Inicia uma sessão de chat contínua com as instruções
const chat = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings, generationConfig: { temperature: 0.5 } }).startChat({
    history: [{ role: "user", parts: [{ text: promptDoAssistente }] }],
});

// Endpoint para conversas de TEXTO
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message.trim(); // Trim para remover espaços em branco

        // Expressão regular mais robusta para validar URLs.
        // Aceita http ou https, e valida um formato básico de URL.
        const urlRegex = /^(https?:\/\/[^\s$.?#].[^\s]*)$/i;

        // Tentar identificar se a mensagem do usuário é um link
        const isUserMessageALink = urlRegex.test(userMessage);

        // Se a mensagem for um link, tentar validar
        if (isUserMessageALink) {
            let linkApproved = false;
            // Normaliza o link do usuário para comparação (minúsculas, remove trailing slash se houver)
            const normalizedUserLink = userMessage.toLowerCase().replace(/\/$/, '');

            for (const allowedLink of validRegistrationLinks) {
                // Normaliza o link permitido para comparação
                const normalizedAllowedLink = allowedLink.toLowerCase().replace(/\/$/, '');

                // Verifica se o link do usuário É IGUAL a um dos links permitidos
                // OU se o link do usuário CONTÉM um dos links permitidos
                if (normalizedUserLink === normalizedAllowedLink || normalizedUserLink.includes(normalizedAllowedLink)) {
                    linkApproved = true;
                    break;
                }
            }

            if (linkApproved) {
                const finalResponse = `Excelente! Verifiquei seu link e está tudo certo. Seu acesso foi liberado! Acesse nosso grupo exclusivo no Telegram através deste link: ${telegramLink}`;
                return res.json({ reply: finalResponse });
            } else {
                // Se o link não for aprovado, o servidor envia uma resposta específica
                return res.json({ reply: "O link que você forneceu não parece ser de uma página de confirmação de cadastro válida. Por favor, certifique-se de copiar o link COMPLETO da página de sucesso após o cadastro e tente novamente. Se precisar de ajuda para copiar, me diga!" });
            }
        }

        // Se não for um link, ou se a validação acima não retornou uma resposta,
        // o chat continua o fluxo normal com o Gemini para obter a próxima mensagem do usuário.
        const result = await chat.sendMessage(userMessage);
        const botResponse = result.response.text();
        res.json({ reply: botResponse });

    } catch (error) {
        console.error("Erro no endpoint /chat:", error);
        res.status(500).json({ reply: "Houve um problema com o assistente. Por favor, tente novamente." });
    }
});

// 3. Iniciar o Servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Acesse o chat em http://localhost:${port}/atendimento`); // Ou qualquer outra página HTML em 'public'
});
