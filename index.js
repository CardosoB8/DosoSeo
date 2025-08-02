// index.js

const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000; // Define a porta do servidor, ou usa a do ambiente (Vercel)

// Carrega seus links do arquivo data/links.js
// Certifique-se de que o caminho './data/links.js' está correto!
const allLinks = require('./data/links.js');
const linksData = { links: allLinks }; // Encapsula o array de links em um objeto

console.log(`Servidor iniciando. Total de links carregados: ${linksData.links.length}`);
if (linksData.links.length === 0) {
    console.warn('AVISO: Nenhum link foi carregado de data/links.js. Verifique o arquivo e o caminho.');
}

// Configura o Express para servir arquivos estáticos da pasta 'public'
app.use(express.static(path.join(__dirname, 'public')));

// Rota para a página inicial
// Se a requisição for para a raiz (/), envia o index.html da pasta public.
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

/**
 * Rota principal de redirecionamento: captura aliases como /meu-apk-exemplo
 * Inicia o fluxo de redirecionamento para a primeira página de espera.
 */
app.get('/:alias', (req, res) => {
    const alias = req.params.alias; // Extrai o alias da URL

    // Procura o alias no seu array de links
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        // Se o alias for encontrado, redireciona para a página 1 de espera,
        // passando o alias e a URL original como parâmetros de query.
        // encodeURIComponent é usado para garantir que a URL seja segura para ser passada em query.
        res.redirect(`/page1?alias=${alias}&originalUrl=${encodeURIComponent(link.original_url)}`);
    } else {
        // Se o alias não for encontrado, envia a página inicial ou uma página 404.
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
        console.warn(`Alias '${alias}' não encontrado. Redirecionando para a home.`);
    }
});

/**
 * Rota para avançar para a próxima etapa do redirecionamento.
 * Chamada pelo JavaScript do frontend após o término de cada contador.
 */
app.get('/next-step', (req, res) => {
    const alias = req.query.alias;
    const originalUrl = decodeURIComponent(req.query.originalUrl); // Decodifica a URL original
    const currentStep = parseInt(req.query.currentStep); // A etapa que acabou de ser concluída

    // Validação básica dos parâmetros recebidos
    if (!alias || !originalUrl || isNaN(currentStep)) {
        return res.status(400).json({ error: 'Parâmetros de link inválidos ou faltando. Por favor, recomece o processo.', redirect: '/' });
    }

    // Se a etapa atual for a 3 (última página de espera), então a próxima é a URL final.
    if (currentStep === 3) {
        return res.json({ redirect: originalUrl }); // Retorna a URL final para o frontend redirecionar
    } else {
        // Caso contrário, calcula a próxima etapa (página de espera)
        const nextStep = currentStep + 1;
        // E instrui o frontend a redirecionar para a próxima página de espera,
        // passando os mesmos parâmetros de link.
        return res.json({ redirect: `/page${nextStep}?alias=${alias}&originalUrl=${encodeURIComponent(originalUrl)}` });
    }
});

// Inicia o servidor na porta especificada
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
    console.log('---');
    console.log('URLs de exemplo para teste local:');
    linksData.links.forEach(link => {
        // Exclui os links da homepage (YouTube, WhatsApp, Contato) para não confundir nos exemplos de aliases
        if (!['youtube-canal', 'grupo-whatsapp', 'contato-email'].includes(link.alias)) {
            console.log(`http://localhost:${PORT}/${link.alias}`);
        }
    });
    console.log('---');
});
