// server.js (VERSÃO FINAL E COMPLETA)
// Este é o cérebro do seu assistente. Ele serve a página do chat e se comunica com a API do Gemini.

// 1. Configuração Inicial
require('dotenv').config();
const express = require('express');
const multer = require('multer');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');

const app = express();
const port = 3000;

// Configuração para servir arquivos estáticos (HTML, CSS, JS) da pasta 'public'
// A opção 'extensions' permite acessar 'atendimento.html' apenas com '/atendimento'
app.use(express.static('public', { extensions: ['html'] }));
app.use(express.json()); // Permite que o servidor entenda JSON vindo do frontend
const upload = multer({ storage: multer.memoryStorage() }); // Configura upload de arquivos

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
2. Você pede que o usuário envie uma captura de tela (screenshot) da página de confirmação de cadastro.
3. Você aguarda o upload da imagem.
4. Após o upload, você irá analisar a imagem. Se for válida, você fornecerá o link do Telegram. Se não, pedirá para tentar novamente.

REGRAS RÍGIDAS:
- Seja sempre educado, natural e paciente. Deixe o usuário confortável.
- NÃO CONVERSE SOBRE NENHUM OUTRO ASSUNTO. Se o usuário perguntar sobre o tempo, futebol, quem te criou, ou qualquer outra coisa, responda de forma educada que sua função é apenas ajudar com o acesso ao robô Aviator. Exemplo de desvio: "Entendo sua curiosidade, mas meu foco aqui é te ajudar a conseguir seu acesso. Você já fez o cadastro e tem a captura de tela?"
- Não use gírias. Mantenha um tom profissional, mas acessível.
`;

// Inicia uma sessão de chat contínua com as instruções
const chat = genAI.getGenerativeModel({ model: "gemini-1.5-flash", safetySettings, generationConfig: { temperature: 0.5 } }).startChat({
    history: [{ role: "user", parts: [{ text: promptDoAssistente }] }],
});

// Endpoint para conversas de TEXTO
app.post('/chat', async (req, res) => {
    try {
        const userMessage = req.body.message;
        const result = await chat.sendMessage(userMessage);
        const botResponse = result.response.text();
        res.json({ reply: botResponse });
    } catch (error) {
        console.error("Erro no endpoint /chat:", error);
        res.status(500).json({ reply: "Houve um problema com o assistente. Tente novamente." });
    }
});

// Endpoint para UPLOAD E VALIDAÇÃO DE IMAGEM
app.post('/upload', upload.single('screenshot'), async (req, res) => {
    if (!req.file) {
        return res.status(400).json({ reply: "Nenhum arquivo foi enviado." });
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-pro-vision", safetySettings });
        
        // As palavras que você quer que o Gemini procure na imagem.
        // PERSONALIZE ESTA LISTA COM AS PALAVRAS QUE VOCÊ DESEJA!
        const palavrasChave = "'Registado', 'Registro concluído', 'Bem-vindo', 'Sucesso', 'Cadastro realizado', 'Parabéns'";

        const imageValidationPrompt = `
            Analise esta imagem. É uma captura de tela de confirmação de registro de um site?
            Procure por alguma das seguintes palavras-chave: ${palavrasChave}.
            
            - Se você encontrar QUALQUER uma dessas palavras na imagem, responda EXATAMENTE e APENAS com a seguinte frase: APROVADO:LINK_DO_TELEGRAM
            - Se a imagem não contiver nenhuma dessas palavras, ou se for uma imagem aleatória (um gato, uma paisagem, etc.), responda de forma educada, explicando que a imagem não parece ser uma confirmação de cadastro e peça para o usuário tentar novamente com a imagem correta.
        `;

        const imagePart = {
            inlineData: {
                data: req.file.buffer.toString("base64"),
                mimeType: req.file.mimetype,
            },
        };

        const result = await model.generateContent([imageValidationPrompt, imagePart]);
        const botResponseText = result.response.text();

        // Verificando a resposta exata do Gemini
        if (botResponseText.startsWith("APROVADO:")) {
            // !! MUITO IMPORTANTE: COLOQUE SEU LINK REAL DO TELEGRAM AQUI !!
            const seuLinkDoTelegram = "https://t.me/ferramentaaviator"; 
            const respostaFinal = `Excelente! Verifiquei sua imagem e está tudo certo. Seu acesso foi liberado! Acesse nosso grupo exclusivo no Telegram através deste link: ${seuLinkDoTelegram}`;
            res.json({ reply: respostaFinal });
        } else {
            // Se não for aprovado, retorna a explicação educada do próprio Gemini
            res.json({ reply: botResponseText });
        }

    } catch (error) {
        console.error("Erro no endpoint /upload:", error);
        res.status(500).json({ reply: "Não consegui processar sua imagem. Por favor, tente novamente." });
    }
});

// 3. Iniciar o Servidor
app.listen(port, () => {
    console.log(`Servidor rodando em http://localhost:${port}`);
    console.log(`Acesse o chat em http://localhost:${port}/atendimento`);
});
