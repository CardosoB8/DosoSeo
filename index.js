// index.js

const express = require('express');
const path = require('path');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;

// *** IMPORTANTE: CHAVE SECRETA! ***
// Esta chave DEVE ser uma string aleatória longa e única.
// NUNCA compartilhe esta chave!
// Em produção, use uma variável de ambiente da Vercel: process.env.SESSION_SECRET_KEY
// Exemplo: process.env.SESSION_SECRET_KEY ou uma string de fallback para desenvolvimento local (NÃO PARA PRODUÇÃO)
const SESSION_SECRET_KEY = process.env.SESSION_SECRET_KEY || 'sua_chave_secreta_deve_ser_definida_nas_variaveis_de_ambiente_do_vercel_e_ser_unica_para_producao';

if (SESSION_SECRET_KEY === 'sua_chave_secreta_deve_ser_definida_nas_variaveis_de_ambiente_do_vercel_e_ser_unica_para_producao') {
    console.warn("AVISO: A chave secreta SESSION_SECRET_KEY não foi definida como variável de ambiente! Usando uma chave padrão insegura para desenvolvimento.");
}

// Carrega seus links do arquivo data/links.js
const allLinks = require('./data/links.js');
const linksData = { links: allLinks };

console.log(`Servidor iniciando. Total de links carregados: ${linksData.links.length}`);
if (linksData.links.length === 0) {
    console.warn('AVISO: Nenhum link foi carregado de data/links.js. Verifique o arquivo e o caminho.');
}

// Funções para assinar e verificar o token
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
        if (!encodedData || !signature) {
            console.error("verifyToken: Token sem formato esperado (missing dot or parts).");
            return null;
        }

        const data = Buffer.from(encodedData, 'base64url').toString('utf8');
        const hmac = crypto.createHmac('sha256', SESSION_SECRET_KEY);
        hmac.update(data);
        const expectedSignature = hmac.digest('hex');

        if (signature === expectedSignature) {
            return JSON.parse(data);
        }
        console.error("verifyToken: Assinatura do token inválida.");
        return null; // Assinatura inválida
    } catch (e) {
        console.error("verifyToken: Erro na decodificação ou parsing do token:", e);
        return null; // Erro na decodificação ou parsing
    }
}

// Configura o Express para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ATENÇÃO: ORDEM DAS ROTAS É CRÍTICA AQUI ---

/**
 * Rota específica para avançar para a próxima etapa do redirecionamento.
 * ESTA ROTA DEVE VIR ANTES de QUALQUER rota genérica como /:alias.
 */
app.get('/next-step', (req, res) => {
    const sessionToken = req.query.token;
    const currentStepClient = parseInt(req.query.currentStep);

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
    if (tokenPayload.step !== currentStepClient) {
        console.error(`[NEXT-STEP] ERRO: Desalinhamento de etapa. Token: ${tokenPayload.step}, Cliente: ${currentStepClient}.`);
        return res.status(400).json({ error: 'Fluxo de sessão inválido. Por favor, recomece o processo.', redirect: '/' });
    }

    // 4. Re-encontra a originalUrl usando o alias do token (garante que é o alias correto)
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
            step: nextStepServer,
            exp: Date.now() + (60 * 60 * 1000) // Renova a expiração do token
        };
        const newSessionToken = signToken(newTokenPayload);

        console.log(`[NEXT-STEP] Avançando para a próxima etapa (${nextStepServer}). Redirecionando para: /page${nextStepServer}`);
        return res.json({ redirect: `/page${nextStepServer}?token=${newSessionToken}` });
    }
});

/**
 * Rota genérica de redirecionamento para aliases (ex: /youtube-canal).
 * ESTA ROTA DEVE VIR DEPOIS de rotas mais específicas como /next-step.
 */
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        // Cria o payload do token: alias e a etapa inicial (1)
        const tokenPayload = {
            alias: alias,
            step: 1, // Começa na etapa 1
            exp: Date.now() + (60 * 60 * 1000) // Token expira em 1 hora
        };
        const sessionToken = signToken(tokenPayload);

        console.log(`[ALIAS_REDIRECT] Alias '${alias}' encontrado. Gerado token. Redirecionando para page1.`);
        res.redirect(`/page1?token=${sessionToken}`);
    } else {
        console.warn(`[ALIAS_REDIRECT] Alias '${alias}' não encontrado. Redirecionando para a home.`);
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
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
