// index.js

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Carrega seus links do arquivo data/links.js
const allLinks = require('./data/links.js');
const linksData = { links: allLinks };

console.log(`Servidor iniciando. Total de links carregados: ${linksData.links.length}`);
if (linksData.links.length === 0) {
    console.warn('AVISO: Nenhum link foi carregado de data/links.js. Verifique o arquivo e o caminho.');
}

// Configura o Express para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --- ROTA CORRIGIDA ABAIXO ---

/**
 * Rota para avançar para a próxima etapa do redirecionamento.
 * ESTA ROTA DEVE VIR ANTES DA ROTA GENÉRICA /:alias
 */
app.get('/next-step', (req, res) => {
    const alias = req.query.alias;
    const currentStep = parseInt(req.query.currentStep);

    console.log(`[NEXT-STEP] Requisição recebida. Alias: ${alias}, Etapa Atual: ${currentStep}`);

    const link = linksData.links.find(l => l.alias === alias);

    if (!link) {
        console.error(`[NEXT-STEP] ERRO: Link não encontrado para o alias: ${alias}`);
        return res.status(400).json({ error: 'Link associado não encontrado. Por favor, recomece o processo.', redirect: '/' });
    }

    console.log(`[NEXT-STEP] Link encontrado: ${link.alias}. URL Original: ${link.original_url}`);

    if (!alias || isNaN(currentStep) || !link) {
        console.error(`[NEXT-STEP] ERRO: Validação falhou. Alias: ${alias}, Step: ${currentStep}, Link existe: ${!!link}`);
        return res.status(400).json({ error: 'Parâmetros de link inválidos ou link não encontrado. Por favor, recomece o processo.', redirect: '/' });
    }

    if (currentStep === 3) {
        console.log(`[NEXT-STEP] Última etapa (${currentStep}). Redirecionando para URL final: ${link.original_url}`);
        return res.json({ redirect: link.original_url });
    } else {
        const nextStep = currentStep + 1;
        console.log(`[NEXT-STEP] Avançando para a próxima etapa (${nextStep}). Redirecionando para: /page${nextStep}`);
        return res.json({ redirect: `/page${nextStep}?alias=${alias}` });
    }
});

/**
 * Rota principal de redirecionamento: captura aliases como /meu-apk-exemplo
 * Esta rota genérica DEVE VIR DEPOIS de /next-step.
 */
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        res.redirect(`/page1?alias=${alias}`);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
        console.warn(`Alias '${alias}' não encontrado. Redirecionando para a home.`);
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
