// Este é o cérebro do seu assistente. Ele serve a página do chat e se comunica com a API do Gemini.

// 1. Configuração Inicial
require('dotenv').config();
const express = require('express');
// Removendo multer, pois não faremos upload de arquivos
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

// INSTRUÇÕES PARA O GEMINI (A "Personalidade" do Bot)
const promptDoAssistente = `
Você é o "Assistente Jet", um chatbot amigável e profissional.
Sua única função é guiar o usuário no processo de obter acesso a uma ferramenta chamada "robô Aviator".

O FLUXO É O SEGUINTE:
1. Você se apresenta e pede ao usuário que se cadastre em um site parceiro.
2. Você pede que o usuário **copie e cole o link da página de confirmação de cadastro do navegador**.
3. Se o usuário não souber como copiar o link, você deve guiá-lo passo a passo:
    - "Para copiar o link, basta clicar na barra de endereço (onde o site está escrito, geralmente na parte superior do seu navegador) e depois copiar o texto que aparece lá (Ctrl+C no Windows/Linux ou Cmd+C no Mac). Depois, cole aqui na nossa conversa (Ctrl+V ou Cmd+V)."
4. Você aguarda o envio do link.
5. Após o envio, você irá analisar o link. Se for válido (corresponder a um dos links permitidos), você fornecerá o link do Telegram. Se não, pedirá para tentar novamente.

REGRAS RÍGIDAS:
- Seja sempre educado, natural e paciente. Deixe o usuário confortável.
- NÃO CONVERSE SOBRE NENHUM OUTRO ASSUNTO. Se o usuário perguntar sobre o tempo, futebol, quem te criou, ou qualquer outra coisa, responda de forma educada que sua função é apenas ajudar com o acesso ao robô Aviator. Exemplo de desvio: "Entendo sua curiosidade, mas meu foco aqui é te ajudar a conseguir seu acesso. Você já fez o cadastro e tem o link da página de confirmação?"
- Não use gírias. Mantenha um tom profissional, mas acessível.
- A validação do link é a ÚNICA forma de prosseguir.
`;

// Lista de links de cadastro válidos (APENAS UM EXEMPLO - COLOQUE SEUS LINKS REAIS AQUI)
// O bot vai verificar se o link do usuário é IGUAL a um destes, OU se ele CONTÉM um destes.
const linksValidosCadastro = [
    "https://www.placard.co.mz/thank-you/",
    "https://www.placard.co.mz/thank-you",
    "https://www.placard.co.mz/thank-you/welcome",
    // Adicione mais links conforme necessário
];

// Inicia uma sessão de chat contínua com as instruções
const chat = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings, generationConfig: { temperature: 0.5 } }).startChat({
    history: [{ role: "user", parts: [{ text: promptDoAssistente }] }],
});

// Endpoint para conversas de TEXTO
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;

        // Tentar identificar se a mensagem do usuário é um link
        let isLink = false;
        try {
            // Regex simples para identificar se a mensagem parece ser um URL
            isLink = /^(http|https):\/\/[^ "]+$/.test(userMessage.trim());
        } catch (e) {
            isLink = false;
        }

        // Se a mensagem for um link, tentar validar
        if (isLink) {
            let linkAprovado = false;
            for (const linkPermitido of linksValidosCadastro) {
                // Verifica se o link do usuário é EXATAMENTE IGUAL ou CONTÉM o link permitido
                if (userMessage.trim() === linkPermitido || userMessage.trim().includes(linkPermitido)) {
                    linkAprovado = true;
                    break;
                }
            }

            if (linkAprovado) {
                // !! MUITO IMPORTANTE: COLOQUE SEU LINK REAL DO TELEGRAM AQUI !!
                const seuLinkDoTelegram = "https://t.me/ferramentaaviator";
                const respostaFinal = `Excelente! Verifiquei seu link e está tudo certo. Seu acesso foi liberado! Acesse nosso grupo exclusivo no Telegram através deste link: ${seuLinkDoTelegram}`;
                return res.json({ reply: respostaFinal });
            } else {
                // Se o link não for aprovado, o Gemini dará uma resposta genérica (pedindo para tentar novamente)
                // Poderíamos dar uma resposta mais específica aqui se quisermos que o servidor cuide da resposta de negação de link.
                // Por agora, deixamos o Gemini seguir com o fluxo de "tente novamente".
                 return res.json({ reply: "O link que você forneceu não parece ser de uma página de confirmação de cadastro válida. Por favor, certifique-se de copiar o link correto da página de sucesso após o cadastro e tente novamente. Se precisar de ajuda para copiar, me diga!" });
            }
        }

        // Se não for um link, ou se o link não for aprovado, continua o chat normal com o Gemini
        const result = await chat.sendMessage(userMessage);
        const botResponse = result.response.text();
        res.json({ reply: botResponse });

    } catch (error) {
        console.error("Erro no endpoint /chat:", error);
        res.status(500).json({ reply: "Houve um problema com o assistente. Tente novamente." });
    }
});

// 3. Iniciar o Servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Acesse o chat em http://localhost:${port}/atendimento`); // Ou qualquer outra página HTML em 'public'
});
