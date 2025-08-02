// index.js

const express = require('express');
const path = require('path');
const crypto = require('crypto'); // Biblioteca nativa do Node.js para criptografia

const app = express();
const PORT = process.env.PORT || 3000;

// *** IMPORTANTE: CHAVE SECRETA! ***
// Esta chave DEVE ser uma string aleatória longa e única.
// NUNCA compartilhe esta chave!
// Em produção, use uma variável de ambiente da Vercel: process.env.SESSION_SECRET_KEY
// Por exemplo, você pode gerar uma string como "sua_chave_secreta_muito_longa_e_aleatoria_123abcDEF456..."
const SESSION_SECRET_KEY = process.env.SESSION_SECRET_KEY || 'uma_chave_secreta_super_segura_e_longa_para_desenvolvimento_apenas_nunca_use_esta_em_producao_mude_isso_agora';

// Carrega seus links do arquivo data/links.js
const allLinks = require('./data/links.js');
const linksData = { links: allLinks };

console.log(`Servidor iniciando. Total de links carregados: ${linksData.links.length}`);
if (linksData.links.length === 0) {
    console.warn('AVISO: Nenhum link foi carregado de data/links.js. Verifique o arquivo e o caminho.');
}

// Funções para assinar e verificar o token
// Este é um método simplificado para evitar dependências JWT.
function signToken(payload) {
    const data = JSON.stringify(payload);
    const hmac = crypto.createHmac('sha256', SESSION_SECRET_KEY);
    hmac.update(data);
    const signature = hmac.digest('hex');
    return `${Buffer.from(data).toString('base64url')}.${signature}`;
}

function verifyToken(token) {
    try {
        const [encodedData, signature] = token.split('.');
        if (!encodedData || !signature) return null;

        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const hmac = crypto.createHmac('sha256', SESSION_SECRET_KEY);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');

        if (signature === expectedSignature) {
            return JSON.parse(data);
        }
        return null; // Assinatura inválida
    } catch (e) {
        console.error("Erro ao verificar token:", e);
        return null; // Erro na decodificação ou parsing
    }
}

// Configura o Express para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Rota principal de redirecionamento: captura aliases como /meu-apk-exemplo
 * Gera um token assinado para a sessão.
 */
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        // Cria o payload do token: alias e a etapa inicial (1)
        const tokenPayload = {
            alias: alias,
            step: 1, // Começa na etapa 1
            exp: Date.now() + (60 * 60 * 1000) // Token expira em 1 hora (para evitar tokens órfãos)
        };
        const sessionToken = signToken(tokenPayload);

        // Redireciona para page1, passando o token assinado
        res.redirect(`/page1?token=${sessionToken}`);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
        console.warn(`Alias '${alias}' não encontrado. Redirecionando para a home.`);
    }
});

/**
 * Rota para avançar para a próxima etapa do redirecionamento.
 * Verifica o token assinado para garantir a integridade da sessão e o fluxo.
 */
app.get('/next-step', (req, res) => {
    const sessionToken = req.query.token; // Pega o token da URL
    const currentStepClient = parseInt(req.query.currentStep); // Etapa que o cliente afirma estar

    console.log(`[NEXT-STEP] Requisição recebida. Token: ${sessionToken}, Etapa Cliente: ${currentStepClient}`);

    // 1. Verifica e decodifica o token
    const tokenPayload = verifyToken(sessionToken);

    if (!tokenPayload) {
        console.error('[NEXT-STEP] ERRO: Token inválido ou manipulado.');
        return res.status(401).json({ error: 'Sessão inválida ou expirada. Por favor, recomece o processo.', redirect: '/' });
    }

    // 2. Verifica a validade do token (expiração)
    if (Date.now() > tokenPayload.exp) {
        console.error('[NEXT-STEP] ERRO: Token expirado.');
        return res.status(401).json({ error: 'Sessão expirada. Por favor, recomece o processo.', redirect: '/' });
    }

    // 3. Verifica a consistência da etapa
    // A etapa no token (tokenPayload.step) deve ser igual à etapa que o cliente afirma estar.
    if (tokenPayload.step !== currentStepClient) {
        console.error(`[NEXT-STEP] ERRO: Desalinhamento de etapa. Token: ${tokenPayload.step}, Cliente: ${currentStepClient}.`);
        return res.status(400).json({ error: 'Fluxo de sessão inválido. Por favor, recomece o processo.', redirect: '/' });
    }

    // 4. Re-encontra a originalUrl usando o alias do token (não do cliente)
    const link = linksData.links.find(l => l.alias === tokenPayload.alias);

    if (!link) {
        console.error(`[NEXT-STEP] ERRO: Link não encontrado para o alias no token: ${tokenPayload.alias}`);
        return res.status(400).json({ error: 'Link associado não encontrado. Por favor, recomece o processo.', redirect: '/' });
    }

    console.log(`[NEXT-STEP] Token e link válidos. Alias: ${tokenPayload.alias}. Etapa no token: ${tokenPayload.step}`);

    // Se a etapa atual for a 3 (última página de espera), então a próxima é a URL final.
    if (currentStepClient === 3) {
        console.log(`[NEXT-STEP] Última etapa (${currentStepClient}). Redirecionando para URL final: ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    } else {
        // Avança para a próxima etapa no token e gera um NOVO token
        const nextStepServer = currentStepClient + 1;
        const newTokenPayload = {
            alias: tokenPayload.alias,
            step: nextStepServer, // Atualiza a etapa para a próxima
            exp: Date.now() + (60 * 60 * 1000) // Renova a expiração
        };
        const newSessionToken = signToken(newTokenPayload);

        console.log(`[NEXT-STEP] Avançando para a próxima etapa (${nextStepServer}). Redirecionando para: /page${nextStepServer}`);
        return res.json({ redirect: `/page${nextStepServer}?token=${newSessionToken}` });
    }
});


// Inicia o servidor na porta especificada
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('---');
    console.log('URLs de exemplo para teste local:');
    linksData.links.forEach(link => {
        if (!['youtube-canal', 'grupo-whatsapp', 'contato-email'].includes(link.alias)) {
            console.log(`http://localhost:${PORT}/${link.alias}`);
        }
    });
    console.log('---');
});
