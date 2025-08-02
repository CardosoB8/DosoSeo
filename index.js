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

/**
 * Rota principal de redirecionamento: captura aliases como /meu-apk-exemplo
 * Inicia o fluxo de redirecionamento para a primeira página de espera.
 * NOTA: Não passa a originalUrl aqui.
 */
app.get('/:alias', (req, res) => {
    const alias = req.params.alias;
    const link = linksData.links.find(l => l.alias === alias);

    if (link) {
        // Redireciona para page1, passando apenas o alias como parâmetro de query
        res.redirect(`/page1?alias=${alias}`);
    } else {
        res.status(404).sendFile(path.join(__dirname, 'public', 'index.html'));
        console.warn(`Alias '${alias}' não encontrado. Redirecionando para a home.`);
    }
});

/**
 * Rota para avançar para a próxima etapa do redirecionamento.
 * Chamada pelo JavaScript do frontend. A originalUrl é re-encontrada aqui.
 */
app.get('/next-step', (req, res) => {
    const alias = req.query.alias; // Pega o alias da URL
    const currentStep = parseInt(req.query.currentStep); // A etapa que acabou de ser concluída

    // Re-encontra a originalUrl usando o alias
    const link = linksData.links.find(l => l.alias === alias);

    // Validação dos parâmetros e do link
    if (!alias || isNaN(currentStep) || !link) {
        return res.status(400).json({ error: 'Parâmetros de link inválidos ou link não encontrado. Por favor, recomece o processo.', redirect: '/' });
    }

    // Se a etapa atual for a 3 (última página de espera), então a próxima é a URL final.
    if (currentStep === 3) {
        return res.json({ redirect: link.original_url }); // Retorna a URL final para o frontend
    } else {
        // Caso contrário, calcula a próxima etapa (página de espera)
        const nextStep = currentStep + 1;
        // E instrui o frontend a redirecionar para a próxima página de espera,
        // passando apenas o alias novamente.
        return res.json({ redirect: `/page${nextStep}?alias=${alias}` });
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
