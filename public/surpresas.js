// surpresas.js
// ESTE ARQUIVO CONTÉM APENAS OS TEXTOS E DADOS DAS SURPRESAS.

const surprisesDatabase = {
    // ----------------------------------------------------
    // FRASES MOTIVACIONAIS (Total de 10)
    // ----------------------------------------------------
    motivacionais: [
        {
            type: "frase",
            content: "A persistência é o caminho do êxito. - Charles Chaplin",
            category: "motivacao",
            icon: "💪"
        },
        {
            type: "frase", 
            content: "Cada dia é uma nova oportunidade para recomeçar e fazer melhor.",
            category: "motivacao",
            icon: "🌟"
        },
        {
            type: "frase",
            content: "Que hoje seja um dia de pequenas vitórias e grandes aprendizados!",
            category: "motivacao", 
            icon: "🎯"
        },
        {
            type: "frase",
            content: "Você é mais forte do que imagina e capaz de superar qualquer desafio.",
            category: "motivacao",
            icon: "🔥"
        },
        {
            type: "frase",
            content: "O crescimento acontece fora da zona de conforto. Arrisque!",
            category: "motivacao",
            icon: "🚀"
        },
        // --- Novas Adições ---
        {
            type: "frase",
            content: "Não espere por oportunidades extraordinárias. Agarre as ocasiões comuns e as torne grandes.",
            category: "motivacao",
            icon: "💡"
        },
        {
            type: "frase",
            content: "A felicidade não é algo pronto. Ela vem de suas próprias ações. - Dalai Lama",
            category: "motivacao",
            icon: "😊"
        },
        {
            type: "frase",
            content: "O sucesso é a soma de pequenos esforços repetidos dia após dia.",
            category: "motivacao",
            icon: "⚙️"
        },
        {
            type: "frase",
            content: "Acredite na magia dos recomeços. Ela acontece a cada manhã.",
            category: "motivacao",
            icon: "💫"
        },
        {
            type: "frase",
            content: "Comece onde você está. Use o que você tem. Faça o que você pode. - Arthur Ashe",
            category: "motivacao",
            icon: "🌱"
        }
    ],

    // ----------------------------------------------------
    // DESAFIOS (Total de 10)
    // ----------------------------------------------------
    desafios: [
        {
            type: "desafio",
            content: "Desafio do dia: Elogie 3 pessoas genuinamente",
            category: "social",
            icon: "❤️",
            extra: "Isso vai fazer o dia delas - e o seu - melhor!"
        },
        {
            type: "desafio",
            content: "Aprenda uma palavra nova em outro idioma hoje",
            category: "aprendizado", 
            icon: "🧠",
            extra: "Sugestão: 'Resilience' (inglês) = Capacidade de se recuperar rapidamente"
        },
        {
            type: "desafio", 
            content: "Faça algo que estava adiando há mais de uma semana",
            category: "produtividade",
            icon: "✅",
            extra: "Aquele email, aquela ligação... hoje é o dia!"
        },
        {
            type: "desafio",
            content: "Desconecte-se das redes sociais por 1 hora e faça algo que goste",
            category: "bem-estar",
            icon: "📵",
            extra: "Leia um livro, ouça música, medite ou simplesmente relaxe"
        },
        {
            type: "desafio",
            content: "Escreva 3 coisas pelas quais você é grato(a) hoje",
            category: "gratidao",
            icon: "🙏",
            extra: "A gratidão transforma o que temos em suficiente"
        },
        // --- Novas Adições ---
        {
            type: "desafio",
            content: "Beba 8 copos de água hoje e anote sua energia ao final do dia",
            category: "saude",
            icon: "💧",
            extra: "A hidratação faz maravilhas pelo seu foco e disposição!"
        },
        {
            type: "desafio",
            content: "Organize uma gaveta ou armário pequeno em 10 minutos",
            category: "organizacao",
            icon: "🧹",
            extra: "Uma pequena organização traz uma grande sensação de controle."
        },
        {
            type: "desafio",
            content: "Ligue ou mande uma mensagem para alguém que você não fala há 6 meses",
            category: "social",
            icon: "📞",
            extra: "Reconecte-se! Pequenos gestos constroem grandes laços."
        },
        {
            type: "desafio",
            content: "Passe 15 minutos em silêncio observando o ambiente ao seu redor",
            category: "mindfulness",
            icon: "🧘",
            extra: "Um momento de pausa para a mente e os sentidos."
        },
        {
            type: "desafio",
            content: "Cozinhe ou prepare uma refeição totalmente nova hoje",
            category: "culinaria",
            icon: "🍳",
            extra: "Experimente um novo tempero ou ingrediente!"
        }
    ],

    // ----------------------------------------------------
    // REFLEXÕES (Total de 8)
    // ----------------------------------------------------
    reflexoes: [
        {
            type: "reflexao",
            content: "Pergunta para reflexão: O que você aprendeu com seus erros recentes?",
            category: "autoconhecimento",
            icon: "🤔",
            extra: "Os erros são oportunidades de crescimento disfarçadas"
        },
        {
            type: "reflexao",
            content: "Exercício de gratidão: Liste 3 coisas simples que te fazem feliz",
            category: "mindfulness",
            icon: "🙏",
            extra: "Pode ser o cheiro de café, um abraço, o sol da manhã..."
        },
        {
            type: "reflexao",
            content: "Reflita: Quem você foi hoje fez a pessoa de ontem orgulhosa?",
            category: "crescimento",
            icon: "💭",
            extra: "Cada dia é uma chance de ser uma versão melhor de si mesmo"
        },
        {
            type: "reflexao",
            content: "Pense em uma qualidade sua que outras pessoas admiram",
            category: "autoestima",
            icon: "⭐",
            extra: "Reconhecer suas qualidades é um ato de autocuidado"
        },
        // --- Novas Adições ---
        {
            type: "reflexao",
            content: "Pense em uma pequena atitude que você pode tomar hoje para ajudar o planeta",
            category: "sustentabilidade",
            icon: "🌎",
            extra: "Pode ser reciclar, economizar água, ou evitar o plástico descartável."
        },
        {
            type: "reflexao",
            content: "O que você está evitando ou procrastinando por medo, e qual é o próximo passo?",
            category: "acao",
            icon: "🚧",
            extra: "Identificar o medo é o primeiro passo para superá-lo."
        },
        {
            type: "reflexao",
            content: "Se o seu 'eu' de 5 anos pudesse te ver agora, o que ele diria?",
            category: "perspectiva",
            icon: "👶",
            extra: "Lembre-se da sua essência e dos seus sonhos originais."
        },
        {
            type: "reflexao",
            content: "Existe alguém que você precisa perdoar (ou perdoar a si mesmo)?",
            category: "saude-mental",
            icon: "🕊️",
            extra: "O perdão é um presente que você dá a si mesmo, liberando o passado."
        }
    ],

    // ----------------------------------------------------
    // CRIATIVOS (Total de 8)
    // ----------------------------------------------------
    criativos: [
        {
            type: "criativo",
            content: "Prompt criativo: Escreva sobre uma memória de infância relacionada a cheiro de chuva",
            category: "escrita",
            icon: "✍️",
            extra: "Use todos os sentidos na descrição!"
        },
        {
            type: "criativo",
            content: "Desafio de observação: Encontre e fotografe 3 coisas azuis de forma criativa",
            category: "fotografia",
            icon: "📸",
            extra: "Compartilhe o resultado se quiser!"
        },
        {
            type: "criativo",
            content: "Que tal desenhar algo sem olhar para o papel?",
            category: "arte",
            icon: "🎨",
            extra: "O processo é mais importante que o resultado - divirta-se!"
        },
        {
            type: "criativo",
            content: "Cante uma música como se estivesse no palco de um grande show",
            category: "musica",
            icon: "🎤",
            extra: "Não importa se canta bem, importa se canta com alegria!"
        },
        // --- Novas Adições ---
        {
            type: "criativo",
            content: "Crie uma receita de bebida nova misturando 3 ingredientes inusitados",
            category: "gastronomia",
            icon: "🥤",
            extra: "Pode ser um chá gelado, um suco ou um coquetel sem álcool. Inove!"
        },
        {
            type: "criativo",
            content: "Transforme um objeto comum (como um clip ou lápis) em um personagem de história",
            category: "escrita",
            icon: "📖",
            extra: "Qual é o nome dele? Qual é a sua missão?"
        },
        {
            type: "criativo",
            content: "Grave um vídeo de 15 segundos ensinando algo muito simples",
            category: "video",
            icon: "🎬",
            extra: "Pode ser amarrar o cadarço ou fazer café. Foco na clareza e diversão."
        },
        {
            type: "criativo",
            content: "Pinte ou decore uma pedra que encontrar na rua para deixar em um jardim público",
            category: "arte-publica",
            icon: "✨",
            extra: "Um pequeno presente anônimo para alegrar o dia de alguém."
        }
    ]
};