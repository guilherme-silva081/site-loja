// ========== SISTEMA DE AUTENTICAÇÃO E SINCRONIZAÇÃO ==========

const PLANILHA_URL = 'https://script.google.com/macros/s/AKfycbyo7xPPh1L2Lt4BPxWWuFKRNWa-yFN05wOjlf6u6xqMOVY7bxz0wTiaLoNuCI8Aydyd/exec';

// ========== CONFIGURAÇÃO JSONBIN ==========
const JSONBIN_BIN_ID = '68dd5f7dae596e708f02ae70';
const JSONBIN_API_KEY = '$2a$10$aFREHvW92HywEO4fJDQyXu/R1H/bh1NamGIm9MRbsMKIxIUlZ8PFS';
const SERVER_URL = 'https://api.jsonbin.io/v3/b/' + JSONBIN_BIN_ID;

// ========== CONFIGURAÇÃO JSONBIN PARA DADOS DOS USUÁRIOS ==========
const JSONBIN_DADOS_ID = '68dd7da843b1c97be9570e05';
const JSONBIN_DADOS_URL = 'https://api.jsonbin.io/v3/b/' + JSONBIN_DADOS_ID;

// Variáveis para controle de usuário e sincronização
let currentUser = null;
let isOnline = true;
let syncInterval = null;

// Estrutura para armazenar dados de todos os usuários
let dadosUsuarios = {};

// ========== CONFIGURAÇÃO: CRIAR CONTA APENAS PARA DESENVOLVEDOR ==========
const MODO_CRIAR_CONTA_DESENVOLVEDOR = true;

// ========== VARIÁVEIS GLOBAIS DO SISTEMA ==========
let cart = [];
let nextProductId = 1;
let produtos = [];
let lixeira = [];
let notasFiscais = [];
let nextNotaId = 1;
let relatorioDiario = {
    data: new Date().toLocaleDateString('pt-BR'),
    totalVendas: 0,
    totalNotas: 0,
    vendas: []
};

// ========== PROTEÇÃO CONTRA VAZAMENTO DE DADOS ==========
function protecaoContraVazamento() {
    const usuarioLogado = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!usuarioLogado) {
        console.log('🛡️ Proteção ativada: Nenhum usuário logado, limpando variáveis globais');
        limparVariaveisGlobais();
    } else {
        console.log('🛡️ Proteção: Usuário logado encontrado:', usuarioLogado.email);
    }
}

// ========== LIMPAR VARIÁVEIS GLOBAIS - VERSÃO CORRIGIDA ==========
function limparVariaveisGlobais() {
    console.log('🧹 LIMPEZA COMPLETA de variáveis globais...');
    
    // Limpa arrays
    cart = [];
    produtos = [];
    lixeira = [];
    notasFiscais = [];
    
    // Reinicia contadores
    nextProductId = 1;
    nextNotaId = 1;
    
    // Reinicia relatório diário
    relatorioDiario = {
        data: new Date().toLocaleDateString('pt-BR'),
        totalVendas: 0,
        totalNotas: 0,
        vendas: []
    };
    
    console.log('✅ Variáveis globais resetadas COMPLETAMENTE');
}

// ========== INICIALIZAÇÃO DO SISTEMA ==========
document.addEventListener('DOMContentLoaded', function() {
    protecaoContraVazamento();
    checkAuthStatus();
    setupEventListeners();
    checkOnlineStatus();
    
    setInterval(checkOnlineStatus, 30000);
    
    adicionarCSSMobile();
    adicionarBotaoDesenvolvedor();
    adicionarLinkSecreto();
    
    configurarVisibilidadeRegistro();

    // Configura data atual
    const now = new Date();
    if (document.getElementById('current-date')) {
        document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR');
    }

    // Atualiza a UI (se não estiver logado, mostra vazio)
    atualizarTabelaProdutos();
    atualizarTabelaNotas();
    atualizarTabelaLixeira();
    atualizarRelatorios();

    // Adiciona evento para filtrar produtos enquanto digita
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProdutos);
    }

    // Se usuário estiver logado, carrega dados específicos
    if (currentUser) {
        carregarDadosUsuarioAtual();
    }
});

// ========== CONFIGURAR VISIBILIDADE DO REGISTRO ==========
function configurarVisibilidadeRegistro() {
    const registerForm = document.getElementById('register-form');
    const registerLink = document.querySelector('a[href="#"]');
    const loginContainer = document.getElementById('login-container');
    
    if (MODO_CRIAR_CONTA_DESENVOLVEDOR && loginContainer) {
        if (registerLink) {
            registerLink.innerHTML = '🔒 Criar Conta (Apenas Desenvolvedor)';
            registerLink.style.color = '#ffc107';
            registerLink.style.fontWeight = 'bold';
        }
        
        console.log('🔒 Modo: Criar conta apenas para desenvolvedor');
    }
}

// ========== FUNÇÃO REGISTER MODIFICADA ==========
async function register() {
    if (MODO_CRIAR_CONTA_DESENVOLVEDOR && !verificarSeEDesenvolvedor()) {
        alert('❌ CRIAÇÃO DE CONTA RESTRITA!\n\nApenas o desenvolvedor do sistema pode criar novas contas.\n\n');
        return;
    }

    const name = document.getElementById('register-name').value;
    const email = document.getElementById('register-email').value;
    const password = document.getElementById('register-password').value;
    const confirmPassword = document.getElementById('register-confirm-password').value;
    
    if (password !== confirmPassword) {
        alert('As senhas não coincidem!');
        return;
    }

    if (!name || !email || !password) {
        alert('Preencha todos os campos!');
        return;
    }

    const btn = document.querySelector('#register-form button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Cadastrando...';
    btn.disabled = true;

    try {
        const usuarios = await buscarUsuarios();
        
        if (usuarios.some(user => user.email.toLowerCase() === email.toLowerCase())) {
            alert('❌ Este email já está cadastrado!');
            return;
        }
        
        const novoUsuario = {
            id: Date.now().toString(),
            nome: name,
            email: email,
            senha: password,
            dataCadastro: new Date().toISOString(),
            criadoPor: currentUser ? currentUser.email : 'desenvolvedor'
        };
        
        usuarios.push(novoUsuario);
        
        const sucesso = await salvarUsuarios(usuarios);
        
        if (sucesso) {
            alert('✅ Conta criada com sucesso! Agora você pode fazer login em qualquer dispositivo.');
            showLoginForm();
            
            document.getElementById('register-name').value = '';
            document.getElementById('register-email').value = '';
            document.getElementById('register-password').value = '';
            document.getElementById('register-confirm-password').value = '';
        } else {
            alert('❌ Erro ao salvar conta. Tente novamente.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao criar conta. Tente novamente.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ========== FUNÇÃO SHOW REGISTER FORM MODIFICADA ==========
function showRegisterForm() {
    if (MODO_CRIAR_CONTA_DESENVOLVEDOR && !verificarSeEDesenvolvedor()) {
        alert('🔒 ACESSO RESTRITO!\n\nA criação de novas contas está disponível apenas para o desenvolvedor do sistema.\n\nSe você precisa de uma conta, entre em contato com o administrador.\n\n (81) 98702-3658');
        return;
    }
    
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('register-form').classList.remove('d-none');
}

function showLoginForm() {
    document.getElementById('register-form').classList.add('d-none');
    document.getElementById('login-form').classList.remove('d-none');
}

// Configura os listeners de eventos
function setupEventListeners() {
    const loginForm = document.getElementById('login-form');
    const registerForm = document.getElementById('register-form');
    
    if (loginForm) {
        loginForm.addEventListener('submit', function(e) {
            e.preventDefault();
            login();
        });
    }
    
    if (registerForm) {
        registerForm.addEventListener('submit', function(e) {
            e.preventDefault();
            register();
        });
    }
    
    // Adiciona event listeners para navegação
    const navInicio = document.getElementById('nav-inicio');
    const navNotas = document.getElementById('nav-notas');
    const navRelatorios = document.getElementById('nav-relatorios');
    const navLixeira = document.getElementById('nav-lixeira');
    const navRelatorioDiario = document.getElementById('nav-relatorio-diario');

    if (navInicio) navInicio.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('inicio');
    });

    if (navNotas) navNotas.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('notas');
    });

    if (navRelatorios) navRelatorios.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('relatorios');
    });

    if (navLixeira) navLixeira.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('lixeira');
    });
    
    if (navRelatorioDiario) navRelatorioDiario.addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('relatorio-diario');
    });
}

// ========== SISTEMA DE SINCRONIZAÇÃO DE DADOS POR USUÁRIO ==========

async function buscarDadosUsuarios() {
    try {
        const response = await fetch(JSONBIN_DADOS_URL + '/latest', {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('Criando nova estrutura de dados...');
            return {};
        }
        
        const data = await response.json();
        return data.record || {};
    } catch (error) {
        console.error('Erro ao buscar dados:', error);
        return {};
    }
}

async function salvarDadosUsuarios() {
    try {
        const response = await fetch(JSONBIN_DADOS_URL, {
            method: 'PUT',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(dadosUsuarios)
        });
        
        return response.ok;
    } catch (error) {
        console.error('Erro ao salvar dados:', error);
        return false;
    }
}

// ========== SALVAR DADOS DO USUÁRIO ATUAL ==========
async function salvarDadosUsuarioAtual() {
    if (!currentUser) {
        console.log('❌ Nenhum usuário logado para salvar dados');
        return false;
    }

    console.log('💾 Salvando dados do usuário:', currentUser.id);
    
    try {
        const dadosUsuario = {
            produtos: produtos,
            lixeira: lixeira,
            notasFiscais: notasFiscais,
            relatorioDiario: relatorioDiario,
            nextProductId: nextProductId,
            nextNotaId: nextNotaId,
            lastSync: new Date().toISOString()
        };

        dadosUsuarios[currentUser.id] = dadosUsuario;
        
        console.log('☁️ Enviando para nuvem...');
        const sucesso = await salvarDadosUsuarios();
        
        if (sucesso) {
            console.log('✅ Dados do usuário sincronizados na nuvem!');
            salvarDadosLocais();
        } else {
            console.log('❌ Falha ao salvar na nuvem, salvando localmente...');
            salvarDadosLocais();
        }
        
        return sucesso;
    } catch (error) {
        console.error('❌ Erro ao salvar dados:', error);
        salvarDadosLocais();
        return false;
    }
}

// ========== CARREGAR DADOS DO USUÁRIO ATUAL - VERSÃO CORRIGIDA ==========
async function carregarDadosUsuarioAtual() {
    if (!currentUser) return false;

    console.log('🔄 Carregando dados ESPECÍFICOS do usuário:', currentUser.id);
    
    try {
        // ✅ PRIMEIRO: Tenta carregar dados LOCAIS (backup offline)
        console.log('📱 Tentando carregar dados LOCAIS primeiro...');
        const dadosLocaisExistem = carregarDadosLocais();
        
        // ✅ SEGUNDO: Carrega dados remotos de TODOS os usuários
        console.log('☁️ Tentando carregar dados REMOTOS...');
        await carregarDadosUsuariosRemotos();
        
        // ✅ TERCEIRO: Busca dados ESPECÍFICOS do usuário atual
        const dadosUsuarioRemoto = dadosUsuarios[currentUser.id];
        
        if (dadosUsuarioRemoto && dadosUsuarioRemoto.produtos) {
            console.log('✅ Dados REMOTOS encontrados para o usuário', currentUser.id);
            
            // Verifica qual conjunto de dados é mais recente
            const dadosLocais = JSON.parse(localStorage.getItem(`local_${currentUser.id}_data`) || '{}');
            const lastUpdateLocal = new Date(dadosLocais.lastUpdate || 0);
            const lastUpdateRemoto = new Date(dadosUsuarioRemoto.lastSync || 0);
            
            if (lastUpdateRemoto > lastUpdateLocal) {
                console.log('🔄 Dados REMOTOS são mais recentes, aplicando...');
                aplicarDadosUsuario(dadosUsuarioRemoto);
                salvarDadosLocais();
            } else {
                console.log('✅ Dados LOCAIS são mais recentes, mantendo...');
                // Já temos os dados locais carregados
            }
        } else if (dadosLocaisExistem) {
            console.log('ℹ️ Nenhum dado remoto, mas dados LOCAIS existem para', currentUser.id);
            // Dados locais já estão carregados, sincroniza com nuvem
            await salvarDadosUsuarioAtual();
        } else {
            console.log('🆕 Nenhum dado local ou remoto, inicializando dados VAZIOS...');
            inicializarDadosNovoUsuario();
            await salvarDadosUsuarioAtual();
        }
        
        console.log('📊 Dados finais carregados - Produtos:', produtos.length, 'Notas:', notasFiscais.length);
        return true;
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        // Tenta carregar dados locais como fallback
        console.log('🔄 Tentando fallback para dados locais...');
        const dadosLocaisExistem = carregarDadosLocais();
        
        if (!dadosLocaisExistem) {
            console.log('⚠️ Nenhum dado local encontrado, inicializando vazio');
            inicializarDadosNovoUsuario();
        }
        return false;
    }
}

// Aplica os dados do usuário no sistema
function aplicarDadosUsuario(dados) {
    console.log('🎯 Aplicando dados específicos do usuário:', currentUser.id);
    
    // Garante que cada usuário tem seus próprios dados
    if (dados.produtos) produtos = dados.produtos;
    else produtos = [];

    if (dados.lixeira) lixeira = dados.lixeira;
    else lixeira = [];

    if (dados.notasFiscais) notasFiscais = dados.notasFiscais;
    else notasFiscais = [];

    if (dados.relatorioDiario) relatorioDiario = dados.relatorioDiario;
    else relatorioDiario = {
        data: new Date().toLocaleDateString('pt-BR'),
        totalVendas: 0,
        totalNotas: 0,
        vendas: []
    };

    if (dados.nextProductId) nextProductId = dados.nextProductId;
    else nextProductId = 1;

    if (dados.nextNotaId) nextNotaId = dados.nextNotaId;
    else nextNotaId = 1;
    
    console.log('📊 Dados aplicados - Produtos:', produtos.length, 'Notas:', notasFiscais.length);
    
    atualizarTabelaProdutos();
    atualizarTabelaNotas();
    atualizarTabelaLixeira();
    atualizarRelatorios();
    updateCartDisplay();
}

// Carrega dados remotos de todos os usuários
async function carregarDadosUsuariosRemotos() {
    dadosUsuarios = await buscarDadosUsuarios();
}

// Salva dados localmente como backup - RETORNA se existiam dados
function salvarDadosLocais() {
    if (!currentUser) return false;
    
    const data = {
        produtos,
        lixeira,
        notasFiscais,
        relatorioDiario,
        nextProductId,
        nextNotaId,
        lastUpdate: new Date().toISOString()
    };
    
    localStorage.setItem(`local_${currentUser.id}_data`, JSON.stringify(data));
    return true;
}

// Carrega dados locais (quando offline) - RETORNA se conseguiu carregar
function carregarDadosLocais() {
    if (!currentUser) return false;
    
    const localData = localStorage.getItem(`local_${currentUser.id}_data`);
    
    if (localData) {
        console.log('📱 Dados LOCAIS encontrados para:', currentUser.id);
        try {
            const data = JSON.parse(localData);
            aplicarDadosUsuario(data);
            return true;
        } catch (error) {
            console.error('❌ Erro ao parsear dados locais:', error);
            return false;
        }
    } else {
        console.log('📱 Nenhum dado LOCAL encontrado para:', currentUser.id);
        return false;
    }
}

// Inicializa dados para novo usuário
function inicializarDadosNovoUsuario() {
    console.log('🆕 Inicializando dados VAZIOS para novo usuário:', currentUser.id);
    
    produtos = [];
    lixeira = [];
    notasFiscais = [];
    relatorioDiario = {
        data: new Date().toLocaleDateString('pt-BR'),
        totalVendas: 0,
        totalNotas: 0,
        vendas: []
    };
    nextProductId = 1;
    nextNotaId = 1;
    
    console.log('✅ Dados vazios inicializados para usuário:', currentUser.id);
}

// ========== SISTEMA DE LOGIN GLOBAL COM JSONBIN ==========

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Preencha email e senha!');
        return;
    }

    const btn = document.querySelector('#login-form button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Entrando...';
    btn.disabled = true;

    try {
        const usuarios = await buscarUsuarios();
        const usuario = usuarios.find(user => 
            user.email.toLowerCase() === email.toLowerCase() && 
            user.senha === password
        );

        if (usuario) {
            console.log('🔐 Login bem-sucedido para:', usuario.email);
            
            // ✅ CORREÇÃO CRÍTICA: Sequência CORRETA de limpeza e carregamento
            // 1. PRIMEIRO limpa variáveis globais
            limparVariaveisGlobais();
            
            // 2. DEPOIS define o usuário atual
            currentUser = {
                id: usuario.id,
                name: usuario.nome,
                email: usuario.email
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            localStorage.setItem('rememberMe', 'true');
            
            // 3. FINALMENTE carrega dados ESPECÍFICOS deste usuário
            await carregarDadosUsuarioAtual();
            
            showMainContent();
            
            // ✅ VERIFICAÇÃO EXTRA de isolamento
            console.log('🎯 VERIFICAÇÃO FINAL DE ISOLAMENTO:');
            console.log('   👤 Usuário logado:', currentUser.id);
            console.log('   📊 Produtos carregados:', produtos.length);
            console.log('   📈 Notas fiscais:', notasFiscais.length);
            
            alert(`🎉 Bem-vindo, ${usuario.nome}!`);
        } else {
            alert('❌ Email ou senha incorretos!');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro de conexão. Verifique sua internet.');
    } finally {
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ========== VERIFICAÇÃO DE ISOLAMENTO DE DADOS ==========
function verificarIsolamentoDados() {
    console.log('🔍 VERIFICAÇÃO DE ISOLAMENTO DE DADOS:');
    console.log('   👤 Usuário atual:', currentUser?.id, currentUser?.name);
    console.log('   📦 Produtos carregados:', produtos.length);
    console.log('   📊 Notas fiscais:', notasFiscais.length);
    console.log('   🗑️ Lixeira:', lixeira.length);
    console.log('   🛒 Carrinho:', cart.length);
    
    // Verifica dados no localStorage
    const dadosLocais = Object.keys(localStorage).filter(key => 
        key.includes('local_') || 
        key.includes(currentUser?.id)
    );
    console.log('   💾 Dados no localStorage:', dadosLocais);
    
    if (dadosUsuarios) {
        console.log('   👥 Total de usuários com dados:', Object.keys(dadosUsuarios).length);
        Object.keys(dadosUsuarios).forEach(userId => {
            const userData = dadosUsuarios[userId];
            console.log(`      👤 Usuário ${userId}:`, {
                produtos: userData.produtos?.length || 0,
                notas: userData.notasFiscais?.length || 0,
                lixeira: userData.lixeira?.length || 0
            });
        });
    }
}

// ========== FUNÇÕES JSONBIN ==========
async function buscarUsuarios() {
    try {
        console.log('🔍 Buscando usuários do JSONBin...');
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            console.log('❌ Erro ao buscar usuários, retornando array vazio');
            return [];
        }
        
        const data = await response.json();
        console.log('📦 Dados brutos do JSONBin:', data);
        
        let usuarios = data.record;
        
        // CORREÇÃO MELHORADA - Garante que sempre retorna array
        if (!usuarios) {
            console.log('ℹ️ Nenhum dado encontrado, retornando array vazio');
            return [];
        }
        
        if (!Array.isArray(usuarios)) {
            console.warn('⚠️ Dados não são array, convertendo...', usuarios);
            
            if (typeof usuarios === 'object' && usuarios !== null) {
                if (usuarios.usuarios && Array.isArray(usuarios.usuarios)) {
                    usuarios = usuarios.usuarios;
                } else {
                    usuarios = Object.values(usuarios);
                }
            } else {
                usuarios = [];
            }
        }
        
        // FILTRA: remove entradas inválidas
        usuarios = usuarios.filter(user => 
            user && 
            typeof user === 'object' && 
            user.email && 
            user.senha
        );
        
        console.log(`✅ ${usuarios.length} usuário(s) válido(s) carregado(s)`);
        return usuarios;
        
    } catch (error) {
        console.error('❌ Erro ao buscar usuários:', error);
        return [];
    }
}

async function salvarUsuarios(usuarios) {
    try {
        console.log('💾 Salvando usuários no JSONBin...');
        
        if (!Array.isArray(usuarios)) {
            console.warn('⚠️ Tentativa de salvar não-array, convertendo...');
            usuarios = [];
        }
        
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usuarios)
        });
        
        if (response.ok) {
            console.log(`✅ ${usuarios.length} usuário(s) salvo(s) no JSONBin`);
        } else {
            console.error('❌ Erro ao salvar no JSONBin:', await response.text());
        }
        
        return response.ok;
    } catch (error) {
        console.error('❌ Erro ao salvar usuários:', error);
        return false;
    }
}

// ========== FUNÇÃO PARA SAIR DO MODO DESENVOLVEDOR ==========
function sairModoDesenvolvedor() {
    if (confirm('🚪 Sair do modo desenvolvedor?\n\nIsso irá remover seu acesso especial.')) {
        localStorage.removeItem('senhaDesenvolvedor');
        const usuarioLogado = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (usuarioLogado.email === 'admin') {
            logout();
        } else {
            alert('✅ Modo desenvolvedor desativado! Recarregando página...');
            setTimeout(() => {
                location.reload();
            }, 1000);
        }
    }
}

// ========== BOTÃO DESENVOLVEDOR ==========
function adicionarBotaoDesenvolvedor() {
    setTimeout(() => {
        const isDesenvolvedor = verificarSeEDesenvolvedor();
        
        if (isDesenvolvedor) {
            const botaoExistente = document.getElementById('botao-desenvolvedor');
            const botaoSairExistente = document.getElementById('botao-sair-desenvolvedor');
            if (botaoExistente) botaoExistente.remove();
            if (botaoSairExistente) botaoSairExistente.remove();
            
            const botao = document.createElement('button');
            botao.innerHTML = '👁️ Cadastros';
            botao.className = 'btn btn-warning btn-sm btn-flutuante';
            botao.onclick = verCadastros;
            botao.id = 'botao-desenvolvedor';
            
            botao.style.position = 'fixed';
            botao.style.bottom = '130px';
            botao.style.right = '10px';
            botao.style.zIndex = '10000';
            botao.style.fontSize = '14px';
            botao.style.padding = '10px 14px';
            botao.style.borderRadius = '20px';
            botao.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            botao.style.border = '2px solid #fff';
            botao.style.fontWeight = 'bold';
            
            document.body.appendChild(botao);
            
            const botaoSair = document.createElement('button');
            botaoSair.innerHTML = '🚪 Sair Dev';
            botaoSair.className = 'btn btn-danger btn-sm btn-flutuante';
            botaoSair.onclick = sairModoDesenvolvedor;
            botaoSair.id = 'botao-sair-desenvolvedor';
            
            botaoSair.style.position = 'fixed';
            botaoSair.style.bottom = '180px';
            botaoSair.style.right = '10px';
            botaoSair.style.zIndex = '10000';
            botaoSair.style.fontSize = '12px';
            botaoSair.style.padding = '8px 12px';
            botaoSair.style.borderRadius = '20px';
            botaoSair.style.boxShadow = '0 2px 10px rgba(0,0,0,0.3)';
            botaoSair.style.border = '2px solid #fff';
            botaoSair.style.fontWeight = 'bold';
            
            document.body.appendChild(botaoSair);
            
            console.log('✅ Botões do desenvolvedor adicionados (mobile)!');
        }
    }, 1000);
}

// ========== VERIFICAÇÃO DE DESENVOLVEDOR ==========
function verificarSeEDesenvolvedor() {
    const emailDesenvolvedor = 'admin';
    const usuarioLogado = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (usuarioLogado.email && usuarioLogado.email === emailDesenvolvedor) {
        console.log('✅ Acesso concedido: Email do desenvolvedor');
        return true;
    }
    
    const senhaMestra = '26092005Gui?';
    const senhaInserida = localStorage.getItem('senhaDesenvolvedor');
    
    if (senhaInserida === senhaMestra) {
        console.log('✅ Acesso concedido: Senha mestra');
        return true;
    }
    
    console.log('❌ Acesso negado: Não é desenvolvedor');
    return false;
}

// ========== FUNÇÃO PARA ATIVAR MODO DESENVOLVEDOR ==========
function ativarModoDesenvolvedor() {
    const senha = prompt('🔐 Digite a senha de desenvolvedor:');
    const senhaMestra = '26092005Gui?';
    
    if (senha === senhaMestra) {
        localStorage.setItem('senhaDesenvolvedor', senha);
        alert('✅ Modo desenvolvedor ativado! Recarregando página...');
        setTimeout(() => {
            location.reload();
        }, 1000);
    } else {
        alert('❌ Senha incorreta!');
    }
}

// ========== FUNÇÃO PARA O DESENVOLVEDOR VER OS CADASTROS ==========
async function verCadastros() {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ ACESSO RESTRITO!\n\nEsta função é apenas para o desenvolvedor do sistema.\n\nSe você é o desenvolvedor, use o link "🔧 Acesso Desenvolvedor" na tela de login.');
        return;
    }
    
    try {
        const usuarios = await buscarUsuarios();
        
        if (usuarios.length === 0) {
            alert('📊 Nenhum usuário cadastrado ainda.');
            return;
        }
        
        criarModalUsuarios(usuarios);
        console.log('📋 Usuários cadastrados:', usuarios);
        
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao carregar usuários.');
    }
}

// ========== MODAL PARA VISUALIZAR USUÁRIOS ==========
function criarModalUsuarios(usuarios) {
    const modalExistente = document.getElementById('modalUsuarios');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    const modalHTML = `
    <div class="modal fade" id="modalUsuarios" tabindex="-1" aria-labelledby="modalUsuariosLabel" aria-hidden="true">
        <div class="modal-dialog modal-xl">
            <div class="modal-content">
                <div class="modal-header bg-primary text-white">
                    <h5 class="modal-title" id="modalUsuariosLabel">
                        📊 USUÁRIOS CADASTRADOS - Total: ${usuarios.length}
                    </h5>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
                </div>
                <div class="modal-body" style="max-height: 70vh; overflow-y: auto;">
                    <div class="table-responsive">
                        <table class="table table-striped table-hover">
                            <thead class="table-dark">
                                <tr>
                                    <th>#</th>
                                    <th>Nome</th>
                                    <th>Email</th>
                                    <th>Senha</th>
                                    <th>Data Cadastro</th>
                                    <th>ID</th>
                                    <th>Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${usuarios.map((usuario, index) => `
                                    <tr>
                                        <td><strong>${index + 1}</strong></td>
                                        <td>${usuario.nome || 'N/A'}</td>
                                        <td>${usuario.email || 'N/A'}</td>
                                        <td>
                                            <span class="senha-cell" onclick="copiarSenha('${usuario.senha}')" title="Clique para copiar senha">
                                                ${usuario.senha || 'N/A'}
                                            </span>
                                        </td>
                                        <td>${new Date(usuario.dataCadastro).toLocaleDateString('pt-BR')}</td>
                                        <td><small class="text-muted">${usuario.id}</small></td>
                                        <td>
                                            <button class="btn btn-danger btn-sm" onclick="excluirUsuario('${usuario.id}', '${usuario.nome}', '${usuario.email}')" title="Excluir usuário">
                                                <i class="bi bi-trash"></i>
                                            </button>
                                        </td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="row mt-4">
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">📈 Estatísticas</h6>
                                </div>
                                <div class="card-body">
                                    <p><strong>Total de usuários:</strong> ${usuarios.length}</p>
                                    <p><strong>Primeiro cadastro:</strong> ${usuarios.length > 0 ? new Date(Math.min(...usuarios.map(u => new Date(u.dataCadastro)))).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                    <p><strong>Último cadastro:</strong> ${usuarios.length > 0 ? new Date(Math.max(...usuarios.map(u => new Date(u.dataCadastro)))).toLocaleDateString('pt-BR') : 'N/A'}</p>
                                </div>
                            </div>
                        </div>
                        <div class="col-md-6">
                            <div class="card">
                                <div class="card-header">
                                    <h6 class="mb-0">🔧 Ações</h6>
                                </div>
                                <div class="card-body">
                                    <button class="btn btn-outline-primary btn-sm mb-2" onclick="exportarUsuariosCSV()">
                                        📥 Exportar CSV
                                    </button>
                                    <button class="btn btn-outline-secondary btn-sm mb-2" onclick="copiarListaUsuarios()">
                                        📋 Copiar Lista
                                    </button>
                                    <button class="btn btn-outline-info btn-sm mb-2" onclick="abrirJSONBin()">
                                        🌐 Abrir JSONBin
                                    </button>
                                    <button class="btn btn-outline-warning btn-sm mb-2" onclick="limparDadosUsuarioAtual()">
                                        🔄 Recarregar
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Fechar</button>
                    <button type="button" class="btn btn-danger" onclick="limparTodosUsuarios()">
                        🗑️ Limpar Todos (Cuidado!)
                    </button>
                </div>
            </div>
        </div>
    </div>
    `;
    
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    const estilo = `
        <style>
            .senha-cell {
                cursor: pointer;
                padding: 2px 6px;
                border-radius: 3px;
                background-color: #f8f9fa;
                border: 1px solid #dee2e6;
                font-family: 'Courier New', monospace;
            }
            .senha-cell:hover {
                background-color: #e9ecef;
                border-color: #007bff;
            }
            .senha-cell:active {
                background-color: #007bff;
                color: white;
            }
        </style>
    `;
    document.head.insertAdjacentHTML('beforeend', estilo);
    
    const modal = new bootstrap.Modal(document.getElementById('modalUsuarios'));
    modal.show();
}

// ========== EXCLUIR USUÁRIO INDIVIDUAL ==========
async function excluirUsuario(usuarioId, usuarioNome, usuarioEmail) {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ ACESSO NEGADO!\n\nApenas o desenvolvedor pode excluir usuários.');
        return;
    }
    
    const usuarioAtual = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (usuarioAtual.id === usuarioId) {
        alert('❌ Você não pode excluir sua própria conta enquanto está logado!\n\nFaça logout primeiro ou use outra conta de desenvolvedor.');
        return;
    }
    
    const confirmacao = confirm(`🚨 EXCLUIR USUÁRIO\n\nNome: ${usuarioNome}\nEmail: ${usuarioEmail}\nID: ${usuarioId}\n\n⚠️ Esta ação NÃO PODE ser desfeita!\n\nDeseja continuar?`);
    
    if (!confirmacao) {
        return;
    }
    
    const confirmacaoFinal = confirm(`⚠️ CONFIRMAÇÃO FINAL ⚠️\n\nVocê está excluindo permanentemente:\n\n"${usuarioNome}" (${usuarioEmail})\n\nEsta ação REMOVERÁ TODOS os dados deste usuário!\n\nContinuar?`);
    
    if (!confirmacaoFinal) {
        return;
    }
    
    try {
        const botao = event.target;
        const originalHTML = botao.innerHTML;
        botao.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i>';
        botao.disabled = true;
        
        const usuarios = await buscarUsuarios();
        const usuarioIndex = usuarios.findIndex(u => u.id === usuarioId);
        
        if (usuarioIndex === -1) {
            alert('❌ Usuário não encontrado!');
            botao.innerHTML = originalHTML;
            botao.disabled = false;
            return;
        }
        
        usuarios.splice(usuarioIndex, 1);
        const sucesso = await salvarUsuarios(usuarios);
        
        if (sucesso) {
            alert(`✅ Usuário "${usuarioNome}" excluído com sucesso!`);
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalUsuarios'));
            modal.hide();
            setTimeout(() => {
                verCadastros();
            }, 500);
        } else {
            alert('❌ Erro ao excluir usuário. Tente novamente.');
            botao.innerHTML = originalHTML;
            botao.disabled = false;
        }
        
    } catch (error) {
        console.error('Erro ao excluir usuário:', error);
        alert('❌ Erro ao excluir usuário. Verifique a conexão.');
        const botao = event.target;
        botao.innerHTML = '<i class="bi bi-trash"></i>';
        botao.disabled = false;
    }
}

// ========== FUNÇÕES AUXILIARES PARA USUÁRIOS ==========
function copiarSenha(senha) {
    navigator.clipboard.writeText(senha).then(() => {
        const elemento = event.target;
        const originalText = elemento.textContent;
        elemento.textContent = '✅ Copiado!';
        elemento.style.backgroundColor = '#d4edda';
        elemento.style.borderColor = '#c3e6cb';
        
        setTimeout(() => {
            elemento.textContent = originalText;
            elemento.style.backgroundColor = '';
            elemento.style.borderColor = '';
        }, 1500);
    });
}

function copiarListaUsuarios() {
    const usuarios = JSON.parse(localStorage.getItem('usuariosCache') || '[]');
    let texto = '📊 LISTA DE USUÁRIOS CADASTRADOS\n\n';
    
    usuarios.forEach((usuario, index) => {
        texto += `👤 ${usuario.nome}\n`;
        texto += `   📧 ${usuario.email}\n`;
        texto += `   🔑 ${usuario.senha}\n`;
        texto += `   📅 ${new Date(usuario.dataCadastro).toLocaleDateString('pt-BR')}\n`;
        texto += `   🆔 ${usuario.id}\n\n`;
    });
    
    texto += `✅ Total: ${usuarios.length} usuário(s)`;
    
    navigator.clipboard.writeText(texto).then(() => {
        alert('✅ Lista de usuários copiada para a área de transferência!');
    });
}

function exportarUsuariosCSV() {
    const usuarios = JSON.parse(localStorage.getItem('usuariosCache') || '[]');
    
    let csv = 'Nome,Email,Senha,DataCadastro,ID\n';
    
    usuarios.forEach(usuario => {
        csv += `"${usuario.nome || ''}","${usuario.email || ''}","${usuario.senha || ''}","${new Date(usuario.dataCadastro).toLocaleDateString('pt-BR')}","${usuario.id}"\n`;
    });
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `usuarios_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    
    alert('✅ Arquivo CSV gerado com sucesso!');
}

function abrirJSONBin() {
    window.open(`https://jsonbin.io/${JSONBIN_BIN_ID}`, '_blank');
}

function limparDadosUsuarioAtual() {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ Acesso restrito ao desenvolvedor!');
        return;
    }
    
    if (confirm('🔄 Recarregar lista de usuários?\n\nIsso irá buscar os dados mais recentes do servidor.')) {
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalUsuarios'));
        if (modal) modal.hide();
        setTimeout(() => {
            verCadastros();
        }, 500);
    }
}

async function limparTodosUsuarios() {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ Acesso restrito ao desenvolvedor!');
        return;
    }
    
    const usuarioAtual = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (!confirm('🚨🚨🚨 ATENÇÃO! 🚨🚨🚨\n\nVocê está prestes a APAGAR TODOS OS USUÁRIOS CADASTRADOS!\n\n⚠️  Esta ação NÃO PODE ser desfeita!\n\n⚠️  Você NÃO poderá excluir sua própria conta logada.\n\nContinuar?')) {
        return;
    }
    
    if (!confirm('⚠️ CONFIRMAÇÃO FINAL ⚠️\n\nDigite "CONFIRMAR" para apagar todos os usuários:')) {
        return;
    }
    
    const confirmacao = prompt('Digite "CONFIRMAR" para prosseguir:');
    if (confirmacao !== 'CONFIRMAR') {
        alert('❌ Ação cancelada.');
        return;
    }
    
    try {
        const usuarios = await buscarUsuarios();
        const usuariosParaManter = usuarios.filter(u => u.id === usuarioAtual.id);
        const sucesso = await salvarUsuarios(usuariosParaManter);
        
        if (sucesso) {
            if (usuariosParaManter.length > 0) {
                alert(`✅ Todos os usuários foram removidos, exceto sua conta (${usuarioAtual.name})!`);
            } else {
                alert('✅ Todos os usuários foram removidos!');
            }
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalUsuarios'));
            modal.hide();
        } else {
            alert('❌ Erro ao remover usuários.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao remover usuários.');
    }
}

// ========== LINK SECRETO PARA ATIVAR MODO DESENVOLVEDOR ==========
function adicionarLinkSecreto() {
    const loginContainer = document.getElementById('login-container');
    if (loginContainer && !verificarSeEDesenvolvedor()) {
        const linkSecreto = document.createElement('a');
        linkSecreto.href = '#';
        linkSecreto.innerHTML = '🔧 Acesso Desenvolvedor';
        linkSecreto.style.position = 'fixed';
        linkSecreto.style.top = '10px';
        linkSecreto.style.right = '10px';
        linkSecreto.style.fontSize = '10px';
        linkSecreto.style.color = '#666';
        linkSecreto.style.textDecoration = 'none';
        linkSecreto.onclick = function(e) {
            e.preventDefault();
            ativarModoDesenvolvedor();
        };
        document.body.appendChild(linkSecreto);
    }
}

// ========== FUNÇÕES DE AUTENTICAÇÃO ==========
function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedUser && rememberMe) {
        currentUser = JSON.parse(savedUser);
        showMainContent();
        carregarDadosUsuarioAtual();
    }
}

function checkOnlineStatus() {
    isOnline = navigator.onLine;
    updateOnlineStatusUI();
    
    if (isOnline && currentUser) {
        syncPendingData();
    }
}

function updateOnlineStatusUI() {
    const syncIcon = document.getElementById('sync-icon');
    const syncText = document.getElementById('sync-text');
    
    if (syncIcon && syncText) {
        if (isOnline) {
            syncIcon.className = 'bi bi-cloud-check online';
            syncText.textContent = 'Sincronizado';
        } else {
            syncIcon.className = 'bi bi-cloud-slash offline';
            syncText.textContent = 'Offline';
        }
    }
}

// ========== FUNÇÃO LOGOUT CORRIGIDA ==========
function logout() {
    console.log('🚪 Fazendo logout do usuário:', currentUser?.id);
    
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // ✅ CORREÇÃO: Sequência correta de limpeza
    const usuarioAntigo = currentUser;
    
    // 1. PRIMEIRO limpa variáveis globais
    limparVariaveisGlobais();
    
    // 2. DEPOIS remove usuário
    currentUser = null;
    localStorage.removeItem('currentUser');
    localStorage.removeItem('rememberMe');
    
    console.log('✅ Logout concluído para:', usuarioAntigo?.id);
    
    document.getElementById('main-content').classList.add('d-none');
    document.getElementById('login-container').classList.remove('d-none');
}

function showMessage(message, type) {
    const messageEl = document.getElementById('login-message');
    messageEl.textContent = message;
    messageEl.className = `alert alert-${type} mt-3`;
    messageEl.classList.remove('d-none');
    
    setTimeout(() => {
        messageEl.classList.add('d-none');
    }, 5000);
}

// ========== SHOW MAIN CONTENT CORRIGIDA ==========
function showMainContent() {
    console.log('🎯 Mostrando conteúdo principal para:', currentUser?.id);
    
    document.getElementById('login-container').classList.add('d-none');
    document.getElementById('main-content').classList.remove('d-none');
    
    if (currentUser) {
        const userNameElement = document.getElementById('user-name');
        if (userNameElement) {
            userNameElement.textContent = currentUser.name;
        }
    }
    
    setupPeriodicSync();
    mostrarPagina('inicio');
}

function setupPeriodicSync() {
    syncInterval = setInterval(async () => {
        if (isOnline && currentUser) {
            console.log('🔄 Sincronização periódica...');
            await salvarDadosUsuarioAtual();
        }
    }, 30000);
}

function adicionarCSSMobile() {
    const style = document.createElement('style');
    style.innerHTML = `
        @media (max-width: 768px) {
            #botao-desenvolvedor {
                bottom: 130px !important;
                right: 10px !important;
                font-size: 14px !important;
                padding: 10px 14px !important;
            }
            
            #botao-sair-desenvolvedor {
                bottom: 180px !important;
                right: 10px !important;
                font-size: 12px !important;
                padding: 8px 12px !important;
            }
        }
        
        .btn-flutuante {
            z-index: 10000 !important;
            position: fixed !important;
        }
        
        @media (hover: none) and (pointer: coarse) {
            #botao-desenvolvedor:active,
            #botao-sair-desenvolvedor:active {
                transform: scale(0.95);
                opacity: 0.8;
            }
        }
    `;
    document.head.appendChild(style);
}

function syncPendingData() {
    console.log('🔄 Verificando dados pendentes para sincronização...');
}

// ========== FUNÇÃO PARA MOSTRAR PÁGINAS ==========
function mostrarPagina(pagina) {
    const paginas = [
        'pagina-inicio',
        'pagina-notas', 
        'pagina-relatorios',
        'pagina-lixeira',
        'pagina-relatorio-diario'
    ];
    
    paginas.forEach(p => {
        const elemento = document.getElementById(p);
        if (elemento) {
            elemento.classList.add('d-none');
        }
    });
    
    const paginaElemento = document.getElementById(`pagina-${pagina}`);
    if (paginaElemento) {
        paginaElemento.classList.remove('d-none');
    }
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    const navElement = document.getElementById(`nav-${pagina}`);
    if (navElement) {
        navElement.classList.add('active');
    }
    
    if (pagina === 'notas') {
        atualizarTabelaNotas();
    } else if (pagina === 'relatorios') {
        atualizarRelatorios();
    } else if (pagina === 'lixeira') {
        atualizarTabelaLixeira();
    } else if (pagina === 'relatorio-diario') {
        atualizarRelatorioDiario();
    }
}

// ========== FUNÇÕES DO SISTEMA DE PRODUTOS ==========

// --- helpers para quantidade e parsing seguros ---
function parseNumberInput(str) {
    if (str === undefined || str === null) return 0;
    if (typeof str === 'number') return str;
    return parseFloat(String(str).replace(',', '.')) || 0;
}

function formatQuantity(q) {
    const num = Number(q) || 0;
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(2).replace('.', ',');
}

function addToCart(product, quantity) {
    const existingItem = cart.find(item => item.id === product.id);
    const totalSolicitado = (existingItem ? existingItem.quantity : 0) + quantity;

    if (totalSolicitado > product.estoque) {
        alert(`Quantidade indisponível! Estoque atual: ${product.estoque}`);
        return;
    }

    if (existingItem) {
        existingItem.quantity += quantity;
    } else {
        cart.push({ ...product, quantity });
    }

    updateCartDisplay();
}

function editarItemCarrinho(produtoId, acao) {
    const itemIndex = cart.findIndex(i => i.id === produtoId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    const produtoOriginal = produtos.find(p => p.id === produtoId);

    if (!produtoOriginal) {
        alert('Produto não encontrado!');
        return;
    }

    if (acao === 'aumentar') {
        const estoqueDisponivel = produtoOriginal.quantidade;
        const quantidadeNoCarrinho = item.quantity;
        
        if (quantidadeNoCarrinho < estoqueDisponivel) {
            item.quantity += 1;
        } else {
            alert(`Não há mais estoque disponível para ${item.name}! Estoque atual: ${estoqueDisponivel}`);
        }
    } else if (acao === 'diminuir') {
        if (item.quantity > 1) {
            item.quantity -= 1;
        } else {
            if (confirm('Deseja remover este produto do carrinho?')) {
                cart.splice(itemIndex, 1);
            }
        }
    } else if (acao === 'remover') {
        if (confirm('Tem certeza que deseja remover este produto do carrinho?')) {
            cart.splice(itemIndex, 1);
        }
    }

    updateCartDisplay();
}

function cancelarCompra() {
    if (cart.length === 0) {
        alert('Não há itens no carrinho para cancelar.');
        return;
    }
    
    if (confirm('Tem certeza que deseja cancelar esta compra?')) {
        cart = [];
        updateCartDisplay();
        alert('Compra cancelada com sucesso.');
    }
}

// ========== FUNÇÕES PARA EDITAR PRODUTOS ==========
function editarNomeProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) {
        alert('Produto não encontrado!');
        return;
    }

    const novoNome = prompt('Digite o novo nome do produto:', produto.nome);
    
    if (novoNome && novoNome.trim() !== '') {
        const nomeAntigo = produto.nome;
        produto.nome = novoNome.trim();
        
        cart.forEach(item => {
            if (item.id === produtoId) {
                item.name = novoNome.trim();
            }
        });
        
        notasFiscais.forEach(nota => {
            nota.itens.forEach(item => {
                if (item.id === produtoId) {
                    item.name = novoNome.trim();
                }
            });
        });
        
        salvarProdutos();
        salvarCarrinho();
        salvarNotasFiscais();
        atualizarTabelaProdutos();
        updateCartDisplay();
        
        alert(`✅ Nome do produto alterado de "${nomeAntigo}" para "${novoNome}"`);
        salvarDadosUsuarioAtual();
    } else if (novoNome !== null) {
        alert('❌ O nome do produto não pode ficar vazio!');
    }
}

function editarPrecoProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) {
        alert('Produto não encontrado!');
        return;
    }

    const novoPreco = prompt('Digite o novo preço do produto:', produto.preco);
    const precoNumero = parseNumberInput(novoPreco);
    
    if (novoPreco !== null && !isNaN(precoNumero) && precoNumero > 0) {
        const precoAntigo = produto.preco;
        produto.preco = precoNumero;
        
        cart.forEach(item => {
            if (item.id === produtoId) {
                item.price = precoNumero;
            }
        });
        
        salvarProdutos();
        salvarCarrinho();
        atualizarTabelaProdutos();
        updateCartDisplay();
        
        alert(`✅ Preço do produto alterado de R$ ${precoAntigo.toFixed(2)} para R$ ${precoNumero.toFixed(2)}`);
        salvarDadosUsuarioAtual();
    } else if (novoPreco !== null) {
        alert('❌ Digite um preço válido!');
    }
}

function editarCategoriaProduto(produtoId) {
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) {
        alert('Produto não encontrado!');
        return;
    }

    const categorias = ['Alimentos', 'Limpeza', 'Bebidas', 'Padaria', 'Hortifruti', 'Outros'];
    const novaCategoria = prompt(
        `Digite a nova categoria do produto (${categorias.join(', ')}):`, 
        produto.categoria || 'Outros'
    );
    
    if (novaCategoria && novaCategoria.trim() !== '') {
        const categoriaAntiga = produto.categoria || 'Sem categoria';
        produto.categoria = novaCategoria.trim();
        
        salvarProdutos();
        atualizarTabelaProdutos();
        
        alert(`✅ Categoria do produto alterada de "${categoriaAntiga}" para "${novaCategoria}"`);
        salvarDadosUsuarioAtual();
    } else if (novaCategoria !== null) {
        alert('❌ A categoria não pode ficar vazia!');
    }
}

// ========== FUNÇÕES DE RELATÓRIO DIÁRIO ==========
function atualizarRelatorioDiario() {
    verificarResetDiario();
    
    const dataHojeElement = document.getElementById('data-hoje');
    const totalVendasHojeElement = document.getElementById('total-vendas-hoje');
    const totalNotasHojeElement = document.getElementById('total-notas-hoje');
    const ticketMedioHojeElement = document.getElementById('ticket-medio-hoje');
    const tbody = document.getElementById('vendas-hoje-body');
    
    if (dataHojeElement) dataHojeElement.textContent = relatorioDiario.data;
    if (totalVendasHojeElement) totalVendasHojeElement.textContent = `R$ ${relatorioDiario.totalVendas.toFixed(2)}`;
    if (totalNotasHojeElement) totalNotasHojeElement.textContent = relatorioDiario.totalNotas;
    
    if (ticketMedioHojeElement) {
        const ticketMedio = relatorioDiario.totalNotas > 0 ? relatorioDiario.totalVendas / relatorioDiario.totalNotas : 0;
        ticketMedioHojeElement.textContent = `R$ ${ticketMedio.toFixed(2)}`;
    }
    
    if (tbody) {
        tbody.innerHTML = '';
        
        if (relatorioDiario.vendas.length > 0) {
            relatorioDiario.vendas.slice().reverse().forEach(venda => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>${venda.hora}</td>
                    <td>${venda.id}</td>
                    <td>${venda.itens} itens</td>
                    <td>R$ ${venda.total.toFixed(2)}</td>
                `;
                tbody.appendChild(tr);
            });
        } else {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center py-4">Nenhuma venda hoje</td></tr>';
        }
    }
}

function salvarRelatorioDiario() {
    localStorage.setItem('relatorioDiario', JSON.stringify(relatorioDiario));
    salvarDadosUsuarioAtual();
}

function carregarRelatorioDiario() {
    const relatorioSalvo = localStorage.getItem('relatorioDiario');
    if (relatorioSalvo) {
        const relatorio = JSON.parse(relatorioSalvo);
        const hoje = new Date().toLocaleDateString('pt-BR');
        if (relatorio.data === hoje) {
            relatorioDiario = relatorio;
        } else {
            relatorioDiario = {
                data: hoje,
                totalVendas: 0,
                totalNotas: 0,
                vendas: []
            };
            salvarRelatorioDiario();
        }
    }
}

function verificarResetDiario() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    if (relatorioDiario.data !== hoje) {
        relatorioDiario = {
            data: hoje,
            totalVendas: 0,
            totalNotas: 0,
            vendas: []
        };
        salvarRelatorioDiario();
    }
}

// ========== PERSISTÊNCIA DE DADOS ==========
function salvarProdutos() {
    localStorage.setItem('produtos', JSON.stringify(produtos));
    salvarDadosUsuarioAtual();
}

function carregarProdutos() {
    const produtosSalvos = localStorage.getItem('produtos');
    if (produtosSalvos) {
        produtos = JSON.parse(produtosSalvos);
        nextProductId = produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
    } else {
        produtos = [];
        nextProductId = 1;
        console.log('🆕 Lista de produtos inicializada VAZIA para usuário:', currentUser?.id);
        salvarProdutos();
    }
}

function carregarLixeira() {
    const lixeiraSalva = localStorage.getItem('lixeira');
    if (lixeiraSalva) {
        lixeira = JSON.parse(lixeiraSalva);
    }
}

function carregarNotasFiscais() {
    const notasSalvas = localStorage.getItem('notasFiscais');
    if (notasSalvas) {
        notasFiscais = JSON.parse(notasSalvas);
        renumerarNotasFiscais();
        nextNotaId = notasFiscais.length > 0 ? Math.max(...notasFiscais.map(n => n.id)) + 1 : 1;
        salvarNotasFiscais();
    }
}

function salvarLixeira() {
    localStorage.setItem('lixeira', JSON.stringify(lixeira));
    salvarDadosUsuarioAtual();
}

function salvarNotasFiscais() {
    localStorage.setItem('notasFiscais', JSON.stringify(notasFiscais));
    salvarDadosUsuarioAtual();
}

function salvarCarrinho() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

function carregarCarrinho() {
    const cartSalvo = localStorage.getItem('cart');
    if (cartSalvo) {
        cart = JSON.parse(cartSalvo);
    }
    updateCartDisplay();
}

// ========== ATUALIZAÇÃO DE VISUALIZAÇÕES ==========
function atualizarTabelaProdutos() {
    const tableBody = document.getElementById('products-table-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const produtosAtivos = produtos.filter(p => p.ativo);
    
    if (produtosAtivos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">Nenhum produto cadastrado.</td>
            </tr>
        `;
        return;
    }
    
    produtosAtivos.forEach(produto => {
        const row = document.createElement('tr');
        row.className = 'product-row';
        row.id = `product-${produto.id}`;
        
        let stockClass = 'good-stock';
        if (Number(produto.quantidade) <= 5) stockClass = 'low-stock';
        if (Number(produto.quantidade) > 15) stockClass = 'high-stock';
        
        row.innerHTML = `
            <td>
                <span class="product-name-editable" onclick="editarNomeProduto(${produto.id})" title="Clique para editar nome">
                    ${produto.nome}
                </span>
            </td>
            <td>
                <span class="badge ${produto.categoria === 'Alimentos' ? 'badge-alimentos' : produto.categoria === 'Limpeza' ? 'badge-limpeza' : 'badge-outros'}" onclick="editarCategoriaProduto(${produto.id})" title="Clique para editar categoria">
                    ${produto.categoria || 'Sem categoria'}
                </span>
            </td>
            <td>
                <span class="product-price-editable" onclick="editarPrecoProduto(${produto.id})" title="Clique para editar preço">
                    R$ ${produto.preco.toFixed(2).replace('.', ',')}
                </span>
            </td>
            <td>
                <span class="stock-cell ${stockClass}" id="stock-${produto.id}">${formatQuantity(produto.quantidade)}</span>
            </td>
            <td>
                <div class="input-group input-group-sm" style="width: 120px;">
                    <input type="number" class="form-control quantity-sale" value="0" min="0" step="0.01" max="${produto.quantidade}" data-produto-id="${produto.id}">
                    <button class="btn btn-outline-primary" type="button" onclick="addToCart(${produto.id})">
                        <i class="bi bi-cart-plus"></i>
                    </button>
                </div>
            </td>
            <td>
                <div class="product-actions">
                    <div class="input-group input-group-sm" style="width: 120px;">
                        <input type="number" step="0.01" class="form-control" id="qtd-aumentar-${produto.id}" value="1" min="0.01">
                        <button class="btn btn-outline-success" type="button" onclick="aumentarEstoque(${produto.id})">
                            <i class="bi bi-plus-circle"></i>
                        </button>
                    </div>
                    <div class="input-group input-group-sm" style="width: 120px;">
                        <input type="number" step="0.01" class="form-control" id="qtd-diminuir-${produto.id}" value="1" min="0.01" max="${produto.quantidade}">
                        <button class="btn btn-outline-warning" type="button" onclick="diminuirEstoque(${produto.id})">
                            <i class="bi bi-dash-circle"></i>
                        </button>
                    </div>
                </div>
            </td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-outline-info btn-sm" onclick="editarNomeProduto(${produto.id})" title="Editar Nome">
                        <i class="bi bi-pencil"></i>
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="moverParaLixeira(${produto.id})" title="Mover para Lixeira">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    filtrarProdutos();
}

function atualizarTabelaLixeira() {
    const tbody = document.getElementById('trash-table-body');
    const trashEmpty = document.getElementById('trash-empty');
    if (!tbody) return;
    
    tbody.innerHTML = '';

    if (lixeira.length === 0) {
        if (trashEmpty) trashEmpty.classList.remove('d-none');
        return;
    }
    
    if (trashEmpty) trashEmpty.classList.add('d-none');

    lixeira.forEach(produto => {
        const tr = document.createElement('tr');

        tr.innerHTML = `
            <td>${produto.nome}</td>
            <td>${produto.categoria || 'Sem categoria'}</td>
            <td>R$ ${produto.preco.toFixed(2)}</td>
            <td>${produto.quantidade}</td>
            <td>
                <button class="btn btn-success btn-sm me-1" onclick="restaurarProduto(${produto.id})">
                    <i class="bi bi-arrow-clockwise"></i> Restaurar
                </button>
                <button class="btn btn-danger btn-sm" onclick="excluirPermanentemente(${produto.id})">
                    <i class="bi bi-trash"></i> Excluir
                </button>
            </td>
        `;

        tbody.appendChild(tr);
    });
}

function atualizarTabelaNotas() {
    const tableBody = document.getElementById('notas-table-body');
    const notasEmpty = document.getElementById('notas-empty');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    if (notasFiscais.length === 0) {
        if (notasEmpty) notasEmpty.classList.remove('d-none');
        return;
    }
    
    if (notasEmpty) notasEmpty.classList.add('d-none');
    
    const notasOrdenadas = [...notasFiscais].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    notasOrdenadas.forEach(nota => {
        const row = document.createElement('tr');
        
        const totalFormatado = nota.total && typeof nota.total === 'number' 
            ? nota.total.toFixed(2).replace('.', ',') 
            : '0,00';
        
        row.innerHTML = `
            <td>${nota.id}</td>
            <td>${new Date(nota.data).toLocaleDateString('pt-BR')}</td>
            <td>${nota.cliente || 'Consumidor não identificado'}</td>
            <td>R$ ${totalFormatado}</td>
            <td>
                <div class="btn-group">
                    <button class="btn btn-outline-primary btn-sm" onclick="visualizarNota(${nota.id})">
                        <i class="bi bi-eye"></i> Visualizar
                    </button>
                    <button class="btn btn-outline-danger btn-sm" onclick="excluirNotaFiscal(${nota.id})">
                        <i class="bi bi-trash"></i> Excluir
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
}

function excluirNotaFiscal(id) {
    if (confirm("Tem certeza que deseja excluir esta nota fiscal? Esta ação não pode ser desfeita!")) {
        const notaIndex = notasFiscais.findIndex(n => n.id === id);
        
        if (notaIndex !== -1) {
            const nota = notasFiscais[notaIndex];
            notasFiscais.splice(notaIndex, 1);
            
            const dataNota = new Date(nota.data).toLocaleDateString('pt-BR');
            const hoje = new Date().toLocaleDateString('pt-BR');
            
            if (dataNota === hoje) {
                relatorioDiario.totalVendas -= nota.total;
                relatorioDiario.totalNotas -= 1;
                relatorioDiario.vendas = relatorioDiario.vendas.filter(v => v.id !== id);
                salvarRelatorioDiario();
            }
            
            renumerarNotasFiscais();
            nextNotaId = notasFiscais.length > 0 ? Math.max(...notasFiscais.map(n => n.id)) + 1 : 1;
            salvarNotasFiscais();
            atualizarTabelaNotas();
            atualizarRelatorios();
            
            if (document.getElementById('pagina-relatorio-diario') && document.getElementById('pagina-relatorio-diario').classList.contains('d-none') === false) {
                atualizarRelatorioDiario();
            }
            
            alert("Nota excluída e sequência renumerada com sucesso!");
        } else {
            alert("Nota não encontrada!");
        }
    }
}

function renumerarNotasFiscais() {
    notasFiscais.sort((a, b) => new Date(a.data) - new Date(b.data));
    notasFiscais.forEach((nota, index) => {
        nota.id = index + 1;
    });
}

function atualizarRelatorios() {
    const totalVendas = notasFiscais.reduce((acc, n) => acc + (n.total || 0), 0);
    const totalVendasElement = document.getElementById("total-vendas");
    const totalProdutosElement = document.getElementById("total-produtos");
    const totalNotasElement = document.getElementById("total-notas");
    
    if (totalVendasElement) totalVendasElement.textContent = `R$ ${totalVendas.toFixed(2)}`;
    if (totalProdutosElement) totalProdutosElement.textContent = produtos.filter(p => p.ativo).length;
    if (totalNotasElement) totalNotasElement.textContent = notasFiscais.length;
    
    atualizarVendasPorCategoria();
    atualizarVendasPorPeriodo();
}

function atualizarVendasPorCategoria() {
    const tableBody = document.getElementById('vendas-categoria-body');
    if (!tableBody) return;
    
    tableBody.innerHTML = '';
    
    const vendasPorCategoria = {};
    const categorias = [...new Set(produtos.map(p => p.categoria || 'Outros'))];
    categorias.forEach(categoria => {
        vendasPorCategoria[categoria] = {
            quantidade: 0,
            valor: 0
        };
    });
    
    notasFiscais.forEach(nota => {
        nota.itens.forEach(item => {
            const produto = produtos.find(p => p.id === item.id);
            if (produto) {
                const categoria = produto.categoria || 'Outros';
                if (!vendasPorCategoria[categoria]) {
                    vendasPorCategoria[categoria] = {
                        quantidade: 0,
                        valor: 0
                    };
                }
                vendasPorCategoria[categoria].quantidade += item.quantity;
                vendasPorCategoria[categoria].valor += item.price * item.quantity;
            }
        });
    });
    
    const totalGeral = Object.values(vendasPorCategoria).reduce((total, cat) => total + cat.valor, 0);
    
    Object.entries(vendasPorCategoria).forEach(([categoria, dados]) => {
        const percentual = totalGeral > 0 ? (dados.valor / totalGeral * 100).toFixed(2) : '0.00';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${categoria}</td>
            <td>${dados.quantidade}</td>
            <td>R$ ${dados.valor.toFixed(2).replace('.', ',')}</td>
            <td>${percentual}%</td>
        `;
        
        tableBody.appendChild(row);
    });
}

function atualizarVendasPorPeriodo() {
    const dataInicio = document.getElementById('data-inicio');
    const dataFim = document.getElementById('data-fim');
    const tableBody = document.getElementById('vendas-periodo-body');
    
    if (!dataInicio || !dataFim || !tableBody) return;
    
    tableBody.innerHTML = '';
    
    let notasFiltradas = [...notasFiscais];
    
    if (dataInicio.value) {
        const inicio = new Date(dataInicio.value);
        notasFiltradas = notasFiltradas.filter(nota => new Date(nota.data) >= inicio);
    }
    
    if (dataFim.value) {
        const fim = new Date(dataFim.value);
        fim.setHours(23, 59, 59, 999);
        notasFiltradas = notasFiltradas.filter(nota => new Date(nota.data) <= fim);
    }
    
    const vendasPorData = {};
    
    notasFiltradas.forEach(nota => {
        const data = new Date(nota.data).toLocaleDateString('pt-BR');
        if (!vendasPorData[data]) {
            vendasPorData[data] = {
                quantidade: 0,
                valor: 0
            };
        }
        vendasPorData[data].quantidade += 1;
        vendasPorData[data].valor += nota.total;
    });
    
    Object.entries(vendasPorData).forEach(([data, dados]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data}</td>
            <td>${dados.quantidade}</td>
            <td>R$ ${dados.valor.toFixed(2).replace('.', ',')}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    if (Object.keys(vendasPorData).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-4">Nenhuma venda no período selecionado</td>
            </tr>
        `;
    }
}

// ========== FUNÇÕES DE FILTRO E NAVEGAÇÃO ==========
function filtrarProdutos() {
    const query = (document.getElementById('search-input')?.value || '').toLowerCase();
    const linhas = document.querySelectorAll('.product-row');
    
    linhas.forEach(linha => {
        const nomeProduto = linha.querySelector('td:first-child')?.textContent.toLowerCase() || '';
        linha.style.display = nomeProduto.includes(query) ? '' : 'none';
    });
}

function filtrarVendas() {
    atualizarVendasPorPeriodo();
}

function voltarParaInicio() {
    mostrarPagina('inicio');
}

// ========== FUNÇÕES DE GERENCIAMENTO DE PRODUTOS ==========
function aumentarEstoque(produtoId) {
    const input = document.getElementById('qtd-aumentar-' + produtoId);
    const qtd = parseNumberInput(input.value) || 0.01;
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    produto.quantidade = Number(produto.quantidade) + qtd;
    salvarProdutos();
    atualizarTabelaProdutos();
    alert('Estoque aumentado em ' + formatQuantity(qtd) + ' unidades!');
    salvarDadosUsuarioAtual();
}

function diminuirEstoque(produtoId) {
    const input = document.getElementById('qtd-diminuir-' + produtoId);
    const qtd = parseNumberInput(input.value) || 0.01;
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    if (qtd > Number(produto.quantidade)) {
        alert('Não é possível diminuir mais do que o estoque atual! Disponível: ' + formatQuantity(produto.quantidade));
        return;
    }
    
    produto.quantidade = Number(produto.quantidade) - qtd;
    if (produto.quantidade < 0) produto.quantidade = 0;
    salvarProdutos();
    atualizarTabelaProdutos();
    alert('Estoque diminuído em ' + formatQuantity(qtd) + ' unidades!');
    salvarDadosUsuarioAtual();
}

function addToCart(produtoId) {
    const input = document.querySelector('.quantity-sale[data-produto-id="' + produtoId + '"]');
    const qtd = parseNumberInput(input.value);
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    if (qtd <= 0) {
        alert('Digite uma quantidade válida para vender!');
        return;
    }
    
    const itemExistente = cart.find(item => item.id === produtoId);
    const quantidadeJaNoCarrinho = itemExistente ? itemExistente.quantity : 0;
    const totalSolicitado = quantidadeJaNoCarrinho + qtd;
    
    if (totalSolicitado > Number(produto.quantidade)) {
        alert(`Não há estoque suficiente! Disponível: ${formatQuantity(produto.quantidade)} | Já no carrinho: ${formatQuantity(quantidadeJaNoCarrinho)}`);
        return;
    }
    
    if (itemExistente) {
        itemExistente.quantity = totalSolicitado;
    } else {
        cart.push({
            id: produto.id,
            name: produto.nome,
            price: produto.preco,
            quantity: qtd,
            estoque: produto.quantidade
        });
    }
    
    updateCartDisplay();
    alert('Adicionado ao carrinho: ' + formatQuantity(qtd) + 'x ' + produto.nome);
    input.value = 0;
}

function updateCartDisplay() {
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalValue = document.getElementById('cart-total-value');
    const cartEmpty = document.getElementById('cart-empty');
    const cartItems = document.getElementById('cart-items');

    if (!cartItemsList || !cartTotalValue || !cartEmpty || !cartItems) return;

    salvarCarrinho();

    if (cart.length === 0) {
        cartEmpty.classList.remove('d-none');
        cartItems.classList.add('d-none');
        return;
    }
    
    cartEmpty.classList.add('d-none');
    cartItems.classList.remove('d-none');
    
    cartItemsList.innerHTML = '';
    
    let total = 0;
    
    cart.forEach(item => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        
        const cartItem = document.createElement('div');
        cartItem.className = 'cart-item d-flex justify-content-between align-items-center mb-2';
        cartItem.innerHTML = `
            <div>
                ${item.quantity}x ${item.name} - R$ ${itemTotal.toFixed(2).replace('.', ',')}
            </div>
            <div>
                <button class="btn btn-sm btn-outline-primary me-1" onclick="editarItemCarrinho(${item.id}, 'aumentar')">+</button>
                <button class="btn btn-sm btn-outline-warning me-1" onclick="editarItemCarrinho(${item.id}, 'diminuir')">-</button>
                <button class="btn btn-sm btn-outline-danger" onclick="editarItemCarrinho(${item.id}, 'remover')">X</button>
            </div>
        `;
        cartItemsList.appendChild(cartItem);
    });
    
    cartTotalValue.textContent = total.toFixed(2).replace('.', ',');
}

function finalizarVenda() {
    if (cart.length === 0) {
        alert("Carrinho vazio!");
        return;
    }

    verificarResetDiario();

    const cliente = prompt("Digite o nome do cliente (opcional):");

    let total = 0;
    cart.forEach(item => {
        const price = Number(item.price) || 0;
        const quantity = Number(item.quantity) || 0;
        total += price * quantity;
    });

    const proximoId = notasFiscais.length > 0 ? Math.max(...notasFiscais.map(n => n.id)) + 1 : 1;

    const novaNota = {
        id: proximoId,
        data: new Date().toISOString(),
        cliente: cliente || 'Consumidor não identificado',
        itens: [...cart],
        total: total
    };

    notasFiscais.push(novaNota);
    salvarNotasFiscais();

    relatorioDiario.totalVendas += total;
    relatorioDiario.totalNotas += 1;
    relatorioDiario.vendas.push({
        id: proximoId,
        hora: new Date().toLocaleTimeString('pt-BR'),
        total: total,
        itens: cart.length
    });
    salvarRelatorioDiario();

    cart.forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
            const quantidadeVendida = Number(item.quantity) || 0;
            produto.quantidade -= quantidadeVendida;
            if (produto.quantidade < 0) produto.quantidade = 0;
        }
    });
    
    salvarProdutos();
    cart = [];
    salvarCarrinho();
    
    atualizarTabelaProdutos();
    atualizarTabelaNotas();
    atualizarRelatorios();
    updateCartDisplay();

    alert("Venda finalizada! Nº: " + proximoId + " | Hoje: R$ " + relatorioDiario.totalVendas.toFixed(2));
    salvarDadosUsuarioAtual();
}

function adicionarProduto() {
    const nomeInput = document.getElementById('nome');
    const precoInput = document.getElementById('preco');
    const quantidadeInput = document.getElementById('quantidade');
    const categoriaInput = document.getElementById('categoria');
    
    if (!nomeInput || !precoInput || !quantidadeInput || !categoriaInput) return;
    
    const nome = (nomeInput.value || '').trim();
    const preco = parseNumberInput(precoInput.value);
    const quantidade = parseNumberInput(quantidadeInput.value);
    const categoria = categoriaInput.value;

    if (!nome || isNaN(preco) || preco <= 0 || isNaN(quantidade) || quantidade <= 0) {
        alert('Preencha todos os campos corretamente!');
        return;
    }

    produtos.push({
        id: nextProductId++,
        nome: nome,
        preco: preco,
        quantidade: quantidade,
        categoria: categoria,
        ativo: true
    });

    salvarProdutos();
    atualizarTabelaProdutos();
    
    const novoProdutoForm = document.getElementById('novoProdutoForm');
    if (novoProdutoForm) {
        novoProdutoForm.reset();
    }
    
    alert('Produto adicionado com sucesso!');
    salvarDadosUsuarioAtual();
}

function moverParaLixeira(id) {
    if (confirm("Deseja realmente enviar este produto para a lixeira?")) {
        const produtoIndex = produtos.findIndex(p => p.id === id);
        
        if (produtoIndex !== -1) {
            const produto = produtos[produtoIndex];
            produto.ativo = false;
            
            lixeira.push({
                id: produto.id,
                nome: produto.nome,
                preco: produto.preco,
                quantidade: produto.quantidade,
                categoria: produto.categoria,
                ativo: false
            });
            
            salvarProdutos();
            salvarLixeira();
            atualizarTabelaProdutos();
            atualizarTabelaLixeira();
            alert("Produto movido para a lixeira!");
            salvarDadosUsuarioAtual();
        }
    }
}

function restaurarProduto(id) {
    const produtoIndex = lixeira.findIndex(p => p.id === id);
    
    if (produtoIndex !== -1) {
        const produto = lixeira[produtoIndex];
        produto.ativo = true;
        
        const produtoExistente = produtos.find(p => p.id === id);
        if (!produtoExistente) {
            produtos.push(produto);
        } else {
            produtoExistente.ativo = true;
        }
        
        lixeira.splice(produtoIndex, 1);
        salvarProdutos();
        salvarLixeira();
        atualizarTabelaProdutos();
        atualizarTabelaLixeira();
        alert("Produto restaurado com sucesso!");
        salvarDadosUsuarioAtual();
    }
}

function excluirPermanentemente(id) {
    if (confirm("Deseja excluir permanentemente este produto?")) {
        lixeira = lixeira.filter(p => p.id !== id);
        salvarLixeira();
        atualizarTabelaLixeira();
        alert("Produto excluído permanentemente!");
        salvarDadosUsuarioAtual();
    }
}

function visualizarNota(id) {
    console.log("Tentando visualizar nota:", id);
    
    const nota = notasFiscais.find(n => n.id === id);
    
    if (!nota) {
        console.error("Nota não encontrada:", id);
        alert("Nota fiscal não encontrada!");
        return;
    }

    const totalFormatado = nota.total && typeof nota.total === 'number' 
        ? nota.total.toFixed(2) 
        : '0.00';

    document.getElementById("nota-numero").textContent = nota.id;
    document.getElementById("nota-id").textContent = nota.id;
    document.getElementById("nota-data").textContent = new Date(nota.data).toLocaleDateString('pt-BR');
    document.getElementById("nota-cliente").textContent = nota.cliente || "Não informado";
    document.getElementById("nota-total").textContent = totalFormatado;

    const tbody = document.getElementById("nota-itens");
    tbody.innerHTML = "";
    
    if (nota.itens && nota.itens.length > 0) {
        nota.itens.forEach(item => {
            const price = Number(item.price) || 0;
            const quantity = Number(item.quantity) || 0;
            const itemTotal = price * quantity;
            
            tbody.innerHTML += `
                <tr>
                    <td>${item.name || 'Produto sem nome'} (x${quantity})</td>
                    <td>R$ ${itemTotal.toFixed(2)}</td>
                </tr>
            `;
        });
    } else {
        tbody.innerHTML = `
            <tr>
                <td colspan="2">Nenhum item nesta nota fiscal</td>
            </tr>
        `;
    }

    try {
        const modal = new bootstrap.Modal(document.getElementById("notaFiscalModal"));
        modal.show();
    } catch (error) {
        console.error("Erro ao abrir modal:", error);
        document.getElementById("notaFiscalModal").style.display = "block";
        document.getElementById("notaFiscalModal").classList.add("show");
    }
}

function imprimirNota() {
    window.print();
}