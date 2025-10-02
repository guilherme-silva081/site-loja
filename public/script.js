// ========== SISTEMA DE AUTENTICAÇÃO E SINCRONIZAÇÃO ==========

const PLANILHA_URL = 'https://script.google.com/macros/s/AKfycbyo7xPPh1L2Lt4BPxWWuFKRNWa-yFN05wOjlf6u6xqMOVY7bxz0wTiaLoNuCI8Aydyd/exec';

// ========== CONFIGURAÇÃO JSONBIN ==========
const JSONBIN_BIN_ID = '68dd5f7dae596e708f02ae70';
const JSONBIN_API_KEY = '$2a$10$jzXMnTRGadrwyt.ghtHPuuxj1WSs6CNTFi98i.MREI5X/d6yBZ3By';
const SERVER_URL = 'https://api.jsonbin.io/v3/b/' + JSONBIN_BIN_ID;

// ========== CONFIGURAÇÃO JSONBIN PARA DADOS DOS USUÁRIOS ==========
const JSONBIN_DADOS_ID = '68dd7da843b1c97be9570e05'; // NOVO BIN para dados
const JSONBIN_DADOS_URL = 'https://api.jsonbin.io/v3/b/' + JSONBIN_DADOS_ID;

// Variáveis para controle de usuário e sincronização
let currentUser = null;
let isOnline = true;
let syncInterval = null;

// Estrutura para armazenar dados de todos os usuários
let dadosUsuarios = {};

// Verifica se há um usuário logado ao carregar a página
document.addEventListener('DOMContentLoaded', function() {
    checkAuthStatus();
    setupEventListeners();
    checkOnlineStatus();
    
    // Verifica periodicamente o status de conexão
    setInterval(checkOnlineStatus, 30000);
    
    // Adiciona botão do desenvolvedor
    adicionarBotaoDesenvolvedor();
    adicionarLinkSecreto();
    
    // Testa a conexão com Google Sheets
    // testarConexaoGoogleSheets();
});

// Configura os listeners de eventos
function setupEventListeners() {
    // Formulário de login
    document.getElementById('login-form').addEventListener('submit', function(e) {
        e.preventDefault();
        login();
    });
    
    // Formulário de registro
    document.getElementById('register-form').addEventListener('submit', function(e) {
        e.preventDefault();
        register();
    });
    
    // Configura navegação
    document.getElementById('nav-inicio').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('inicio');
    });

    document.getElementById('nav-notas').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('notas');
    });

    document.getElementById('nav-relatorios').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('relatorios');
    });

    document.getElementById('nav-lixeira').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('lixeira');
    });
    
    document.getElementById('nav-relatorio-diario').addEventListener('click', function(e) {
        e.preventDefault();
        mostrarPagina('relatorio-diario');
    });
}

// ========== SISTEMA DE SINCRONIZAÇÃO DE DADOS POR USUÁRIO ==========

// Busca todos os dados dos usuários do JSONBin
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

// Salva todos os dados dos usuários no JSONBin
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

// Salva os dados do usuário atual
async function salvarDadosUsuarioAtual() {
    if (!currentUser) return false;

    const dadosUsuario = {
        produtos: produtos,
        lixeira: lixeira,
        notasFiscais: notasFiscais,
        relatorioDiario: relatorioDiario,
        nextProductId: nextProductId,
        nextNotaId: nextNotaId,
        lastSync: new Date().toISOString()
    };

    // Atualiza na estrutura global
    dadosUsuarios[currentUser.id] = dadosUsuario;
    
    // Salva no JSONBin
    const sucesso = await salvarDadosUsuarios();
    
    if (sucesso) {
        console.log('✅ Dados do usuário sincronizados!');
        // Também salva localmente como backup
        salvarDadosLocais();
    }
    
    return sucesso;
}

// Carrega os dados do usuário atual
async function carregarDadosUsuarioAtual() {
    if (!currentUser) return false;

    // Busca dados atualizados do JSONBin
    await carregarDadosUsuariosRemotos();

    const dadosUsuario = dadosUsuarios[currentUser.id];
    
    if (dadosUsuario) {
        // Usa dados remotos (mais recentes)
        aplicarDadosUsuario(dadosUsuario);
        console.log('✅ Dados carregados do servidor');
    } else {
        // Se não tem dados remotos, tenta carregar locais
        carregarDadosLocais();
        console.log('ℹ️ Dados carregados localmente');
    }
    
    return true;
}

// Aplica os dados do usuário no sistema
function aplicarDadosUsuario(dados) {
    if (dados.produtos) produtos = dados.produtos;
    if (dados.lixeira) lixeira = dados.lixeira;
    if (dados.notasFiscais) notasFiscais = dados.notasFiscais;
    if (dados.relatorioDiario) relatorioDiario = dados.relatorioDiario;
    if (dados.nextProductId) nextProductId = dados.nextProductId;
    if (dados.nextNotaId) nextNotaId = dados.nextNotaId;
    
    // Atualiza a UI
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

// Salva dados localmente como backup
function salvarDadosLocais() {
    if (!currentUser) return;
    
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
}

// Carrega dados locais (quando offline)
function carregarDadosLocais() {
    if (!currentUser) return;
    
    const localData = localStorage.getItem(`local_${currentUser.id}_data`);
    
    if (localData) {
        const data = JSON.parse(localData);
        aplicarDadosUsuario(data);
    } else {
        // Se não há dados, inicializa para novo usuário
        inicializarDadosNovoUsuario();
    }
}

// Inicializa dados para novo usuário
function inicializarDadosNovoUsuario() {
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
    
    // Adiciona produtos de exemplo
    carregarProdutosIniciais();
    
    // Salva os dados iniciais
    salvarDadosUsuarioAtual();
    salvarDadosLocais();
}

// ========== SISTEMA DE LOGIN GLOBAL COM JSONBIN ==========

async function register() {
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

    // Mostra loading
    const btn = document.querySelector('#register-form button[type="submit"]');
    const originalText = btn.innerHTML;
    btn.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i> Cadastrando...';
    btn.disabled = true;

    try {
        const usuarios = await buscarUsuarios();
        
        // Verifica se email já existe
        if (usuarios.some(user => user.email.toLowerCase() === email.toLowerCase())) {
            alert('❌ Este email já está cadastrado!');
            return;
        }
        
        // Adiciona novo usuário
        const novoUsuario = {
            id: Date.now().toString(),
            nome: name,
            email: email,
            senha: password,
            dataCadastro: new Date().toISOString()
        };
        
        usuarios.push(novoUsuario);
        
        // Salva no JSONBin
        const sucesso = await salvarUsuarios(usuarios);
        
        if (sucesso) {
            alert('✅ Conta criada com sucesso! Agora você pode fazer login em qualquer dispositivo.');
            showLoginForm();
            
            // Limpa o formulário
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
        // Restaura botão
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

async function login() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;

    if (!email || !password) {
        alert('Preencha email e senha!');
        return;
    }

    // Mostra loading
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
            currentUser = {
                id: usuario.id,
                name: usuario.nome,
                email: usuario.email
            };
            
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
            showMainContent();
            alert(`🎉 Bem-vindo, ${usuario.nome}!`);
        } else {
            alert('❌ Email ou senha incorretos!');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro de conexão. Verifique sua internet.');
    } finally {
        // Restaura botão
        btn.innerHTML = originalText;
        btn.disabled = false;
    }
}

// ========== FUNÇÕES JSONBIN ==========
async function buscarUsuarios() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao buscar dados');
        }
        
        const data = await response.json();
        return data.record || [];
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return [];
    }
}

async function salvarUsuarios(usuarios) {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}`, {
            method: 'PUT',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(usuarios)
        });
        
        return response.ok;
    } catch (error) {
        console.error('Erro ao salvar usuários:', error);
        return false;
    }
}

// ========== FUNÇÃO PARA SAIR DO MODO DESENVOLVEDOR ==========
function sairModoDesenvolvedor() {
    if (confirm('🚪 Sair do modo desenvolvedor?\n\nIsso irá remover seu acesso especial.')) {
        localStorage.removeItem('senhaDesenvolvedor');
        // Se estiver logado como admin, faz logout também
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
        // VERIFICA SE É O DESENVOLVEDOR
        const isDesenvolvedor = verificarSeEDesenvolvedor();
        
        if (isDesenvolvedor) {
            // Cria botão flutuante APENAS para o desenvolvedor
            const botao = document.createElement('button');
            botao.innerHTML = '👁️ Ver Cadastros';
            botao.className = 'btn btn-warning btn-sm';
            botao.onclick = verCadastros;
            botao.style.position = 'fixed';
            botao.style.bottom = '20px';
            botao.style.right = '20px';
            botao.style.zIndex = '9999';
            botao.style.fontSize = '12px';
            botao.style.padding = '5px 10px';
            botao.id = 'botao-desenvolvedor';
            document.body.appendChild(botao);
            
            // SEMPRE adiciona botão para SAIR do modo desenvolvedor
            const botaoSair = document.createElement('button');
            botaoSair.innerHTML = '🚪 Sair Dev';
            botaoSair.className = 'btn btn-danger btn-sm';
            botaoSair.onclick = sairModoDesenvolvedor;
            botaoSair.style.position = 'fixed';
            botaoSair.style.bottom = '60px';
            botaoSair.style.right = '20px';
            botaoSair.style.zIndex = '9999';
            botaoSair.style.fontSize = '10px';
            botaoSair.style.padding = '3px 8px';
            botaoSair.id = 'botao-sair-desenvolvedor';
            document.body.appendChild(botaoSair);
            
            console.log('✅ Botões do desenvolvedor adicionados!');
        }
    }, 1000);
}

// ========== VERIFICAÇÃO DE DESENVOLVEDOR ==========
function verificarSeEDesenvolvedor() {
    // MÉTODO 1: Verifica por email específico do desenvolvedor
    const emailDesenvolvedor = 'admin'; // EMAIL DO DESENVOLVEDOR
    const usuarioLogado = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    if (usuarioLogado.email && usuarioLogado.email === emailDesenvolvedor) {
        console.log('✅ Acesso concedido: Email do desenvolvedor');
        return true;
    }
    
    // MÉTODO 2: Verifica por senha mestra (alternativa)
    const senhaMestra = '26092005Gui?'; // SENHA DO DESENVOLVEDOR
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
    const senhaMestra = '26092005Gui?'; // SENHA DO DESENVOLVEDOR
    
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
// ========== FUNÇÃO PARA O DESENVOLVEDOR VER OS CADASTROS ==========
async function verCadastros() {
    // Verifica novamente se é desenvolvedor
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
        
        // Cria uma modal para mostrar os usuários (em vez de alert)
        criarModalUsuarios(usuarios);
        
        // Também mostra no console
        console.log('📋 Usuários cadastrados:', usuarios);
        
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao carregar usuários.');
    }
}

// ========== MODAL PARA VISUALIZAR USUÁRIOS ==========
// ========== MODAL PARA VISUALIZAR USUÁRIOS ==========
function criarModalUsuarios(usuarios) {
    // Remove modal existente se houver
    const modalExistente = document.getElementById('modalUsuarios');
    if (modalExistente) {
        modalExistente.remove();
    }
    
    // Cria a modal
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
                    
                    <!-- Estatísticas -->
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
    
    // Adiciona a modal ao body
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Adiciona estilos CSS
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
    
    // Mostra a modal
    const modal = new bootstrap.Modal(document.getElementById('modalUsuarios'));
    modal.show();
}

// ========== EXCLUIR USUÁRIO INDIVIDUAL ==========
async function excluirUsuario(usuarioId, usuarioNome, usuarioEmail) {
    // Verificação de segurança EXTRA para desenvolvedor
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ ACESSO NEGADO!\n\nApenas o desenvolvedor pode excluir usuários.');
        return;
    }
    
    const usuarioAtual = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Verifica se está tentando excluir a si mesmo
    if (usuarioAtual.id === usuarioId) {
        alert('❌ Você não pode excluir sua própria conta enquanto está logado!\n\nFaça logout primeiro ou use outra conta de desenvolvedor.');
        return;
    }
    
    // Confirmação de exclusão
    const confirmacao = confirm(`🚨 EXCLUIR USUÁRIO\n\nNome: ${usuarioNome}\nEmail: ${usuarioEmail}\nID: ${usuarioId}\n\n⚠️ Esta ação NÃO PODE ser desfeita!\n\nDeseja continuar?`);
    
    if (!confirmacao) {
        return;
    }
    
    // Confirmação FINAL
    const confirmacaoFinal = confirm(`⚠️ CONFIRMAÇÃO FINAL ⚠️\n\nVocê está excluindo permanentemente:\n\n"${usuarioNome}" (${usuarioEmail})\n\nEsta ação REMOVERÁ TODOS os dados deste usuário!\n\nContinuar?`);
    
    if (!confirmacaoFinal) {
        return;
    }
    
    try {
        // Mostrar loading
        const botao = event.target;
        const originalHTML = botao.innerHTML;
        botao.innerHTML = '<i class="bi bi-arrow-repeat spinner"></i>';
        botao.disabled = true;
        
        // Busca usuários atuais
        const usuarios = await buscarUsuarios();
        
        // Encontra e remove o usuário
        const usuarioIndex = usuarios.findIndex(u => u.id === usuarioId);
        
        if (usuarioIndex === -1) {
            alert('❌ Usuário não encontrado!');
            botao.innerHTML = originalHTML;
            botao.disabled = false;
            return;
        }
        
        // Remove o usuário do array
        usuarios.splice(usuarioIndex, 1);
        
        // Salva no JSONBin
        const sucesso = await salvarUsuarios(usuarios);
        
        if (sucesso) {
            alert(`✅ Usuário "${usuarioNome}" excluído com sucesso!`);
            
            // Atualiza a modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalUsuarios'));
            modal.hide();
            
            // Reabre a modal com a lista atualizada
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
        
        // Restaura botão
        const botao = event.target;
        botao.innerHTML = '<i class="bi bi-trash"></i>';
        botao.disabled = false;
    }
}

// ========== LIMPAR DADOS DE UM USUÁRIO ESPECÍFICO ==========
async function limparDadosUsuario(usuarioId, usuarioNome) {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ Acesso restrito ao desenvolvedor!');
        return;
    }
    
    const confirmacao = confirm(`🧹 LIMPAR DADOS DO USUÁRIO\n\nUsuário: ${usuarioNome}\nID: ${usuarioId}\n\nIsso irá remover TODOS os dados (produtos, notas, etc.) deste usuário.\n\nContinuar?`);
    
    if (!confirmacao) return;
    
    try {
        // Busca dados atuais
        await carregarDadosUsuariosRemotos();
        
        // Remove os dados do usuário
        if (dadosUsuarios[usuarioId]) {
            delete dadosUsuarios[usuarioId];
            
            // Salva no JSONBin
            const sucesso = await salvarDadosUsuarios();
            
            if (sucesso) {
                alert(`✅ Dados do usuário "${usuarioNome}" removidos com sucesso!`);
            } else {
                alert('❌ Erro ao remover dados do usuário.');
            }
        } else {
            alert('ℹ️ Este usuário não possui dados salvos.');
        }
        
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao limpar dados do usuário.');
    }
}

// ========== RECARREGAR DADOS ==========
function limparDadosUsuarioAtual() {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ Acesso restrito ao desenvolvedor!');
        return;
    }
    
    if (confirm('🔄 Recarregar lista de usuários?\n\nIsso irá buscar os dados mais recentes do servidor.')) {
        // Fecha a modal atual
        const modal = bootstrap.Modal.getInstance(document.getElementById('modalUsuarios'));
        if (modal) modal.hide();
        
        // Reabre a modal com dados atualizados
        setTimeout(() => {
            verCadastros();
        }, 500);
    }
}

// ========== LIMPAR TODOS OS USUÁRIOS ==========
async function limparTodosUsuarios() {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ Acesso restrito ao desenvolvedor!');
        return;
    }
    
    // Verificação EXTRA de segurança
    const usuarioAtual = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Primeira confirmação
    if (!confirm('🚨🚨🚨 ATENÇÃO! 🚨🚨🚨\n\nVocê está prestes a APAGAR TODOS OS USUÁRIOS CADASTRADOS!\n\n⚠️  Esta ação NÃO PODE ser desfeita!\n\n⚠️  Você NÃO poderá excluir sua própria conta logada.\n\nContinuar?')) {
        return;
    }
    
    // Segunda confirmação
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
        
        // Filtra para não excluir o usuário atual
        const usuariosParaManter = usuarios.filter(u => u.id === usuarioAtual.id);
        
        const sucesso = await salvarUsuarios(usuariosParaManter);
        
        if (sucesso) {
            if (usuariosParaManter.length > 0) {
                alert(`✅ Todos os usuários foram removidos, exceto sua conta (${usuarioAtual.name})!`);
            } else {
                alert('✅ Todos os usuários foram removidos!');
            }
            
            // Fecha a modal
            const modal = bootstrap.Modal.getInstance(document.getElementById('modalUsuarios'));
            modal.hide();
        } else {
            alert('❌ Erro ao remover usuários.');
        }
    } catch (error) {
        console.error('Erro:', error);
        alert('❌ Erro ao remover usuários.');
    }
}// ========== LIMPAR TODOS OS USUÁRIOS ==========
async function limparTodosUsuarios() {
    if (!verificarSeEDesenvolvedor()) {
        alert('❌ Acesso restrito ao desenvolvedor!');
        return;
    }
    
    // Verificação EXTRA de segurança
    const usuarioAtual = JSON.parse(localStorage.getItem('currentUser') || '{}');
    
    // Primeira confirmação
    if (!confirm('🚨🚨🚨 ATENÇÃO! 🚨🚨🚨\n\nVocê está prestes a APAGAR TODOS OS USUÁRIOS CADASTRADOS!\n\n⚠️  Esta ação NÃO PODE ser desfeita!\n\n⚠️  Você NÃO poderá excluir sua própria conta logada.\n\nContinuar?')) {
        return;
    }
    
    // Segunda confirmação
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
        
        // Filtra para não excluir o usuário atual
        const usuariosParaManter = usuarios.filter(u => u.id === usuarioAtual.id);
        
        const sucesso = await salvarUsuarios(usuariosParaManter);
        
        if (sucesso) {
            if (usuariosParaManter.length > 0) {
                alert(`✅ Todos os usuários foram removidos, exceto sua conta (${usuarioAtual.name})!`);
            } else {
                alert('✅ Todos os usuários foram removidos!');
            }
            
            // Fecha a modal
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

// Copiar senha individual
function copiarSenha(senha) {
    navigator.clipboard.writeText(senha).then(() => {
        // Feedback visual
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

// Copiar lista completa de usuários
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

// Exportar para CSV
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

// Abrir JSONBin no navegador
function abrirJSONBin() {
    window.open(`https://jsonbin.io/${JSONBIN_BIN_ID}`, '_blank');
}

// Limpar todos os usuários (FUNÇÃO PERIGOSA - APENAS PARA DESENVOLVEDOR)
async function limparTodosUsuarios() {
    if (!confirm('🚨🚨🚨 ATENÇÃO! 🚨🚨🚨\n\nVocê está prestes a APAGAR TODOS OS USUÁRIOS CADASTRADOS!\n\nEsta ação NÃO PODE ser desfeita!\n\nTem certeza absoluta?')) {
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
        const sucesso = await salvarUsuarios([]);
        
        if (sucesso) {
            alert('✅ Todos os usuários foram removidos!');
            // Fecha a modal
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

// ========== ATUALIZAR A FUNÇÃO buscarUsuarios PARA CACHE ==========
async function buscarUsuarios() {
    try {
        const response = await fetch(`https://api.jsonbin.io/v3/b/${JSONBIN_BIN_ID}/latest`, {
            method: 'GET',
            headers: {
                'X-Master-Key': JSONBIN_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Erro ao buscar dados');
        }
        
        const data = await response.json();
        const usuarios = data.record || [];
        
        // Salva no cache para usar na modal
        localStorage.setItem('usuariosCache', JSON.stringify(usuarios));
        
        return usuarios;
    } catch (error) {
        console.error('Erro ao buscar usuários:', error);
        return [];
    }
}

// ========== LINK SECRETO PARA ATIVAR MODO DESENVOLVEDOR ==========
function adicionarLinkSecreto() {
    // Adiciona um link secreto no login para ativar modo desenvolvedor
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

// ========== FUNÇÕES EXISTENTES - MANTIDAS ORIGINAIS ==========

// Função para testar a conexão com o Google Apps Script
// async function testarConexaoGoogleSheets() {
//     console.log('🔍 Testando conexão com Google Apps Script...');
    
//     try {
//         const response = await fetch(PLANILHA_URL + '?acao=teste&timestamp=' + Date.now());
//         const texto = await response.text();
//         console.log('✅ Resposta do teste:', texto);
//         return true;
//     } catch (error) {
//         console.error('❌ Erro no teste:', error);
//         return false;
//     }
// }

// Verifica o status de autenticação ao carregar
function checkAuthStatus() {
    const savedUser = localStorage.getItem('currentUser');
    const rememberMe = localStorage.getItem('rememberMe') === 'true';
    
    if (savedUser && rememberMe) {
        currentUser = JSON.parse(savedUser);
        showMainContent();
        loadUserData();
    }
}

// Verifica status de conexão
function checkOnlineStatus() {
    isOnline = navigator.onLine;
    updateOnlineStatusUI();
    
    // Se estivermos online e tivermos dados pendentes para sincronizar, sincroniza
    if (isOnline && currentUser) {
        syncPendingData();
    }
}

// Atualiza a UI com o status de conexão
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

// Mostra o formulário de registro
function showRegisterForm() {
    document.getElementById('login-form').classList.add('d-none');
    document.getElementById('register-form').classList.remove('d-none');
}

// Mostra o formulário de login
function showLoginForm() {
    document.getElementById('register-form').classList.add('d-none');
    document.getElementById('login-form').classList.remove('d-none');
}

// SOLUÇÃO FINAL - SEU GOOGLE FORMS (SEM CORS)
// SOLUÇÃO FUNCIONAL - SEU GOOGLE FORMS
function enviarParaGoogleSheets(nome, email, senha) {
    console.log('🎯 Enviando para seu Google Forms...');
    
    const FORM_ID = '1FAIpQLSc74xTr5BdSgOJJ7zhsi1iVAY3O2mz5bMvIOw9aGKMB-AZS3w';
    const FORM_URL = `https://docs.google.com/forms/d/e/${FORM_ID}/formResponse`;
    
    // Tenta diferentes combinações de IDs
    const tentativas = [
        // Combinação 1 - IDs mais comuns
        { nome: 'entry.2005620554', email: 'entry.1045781291', senha: 'entry.1065046570' },
        // Combinação 2 - Outra possibilidade
        { nome: 'entry.1234567890', email: 'entry.0987654321', senha: 'entry.5555555555' },
        // Combinação 3 - Padrão sequencial
        { nome: 'entry.1', email: 'entry.2', senha: 'entry.3' }
    ];
    
    // Tenta cada combinação
    tentativas.forEach((fieldIds, index) => {
        setTimeout(() => {
            const formData = new URLSearchParams();
            formData.append(fieldIds.nome, nome);
            formData.append(fieldIds.email, email);
            formData.append(fieldIds.senha, senha);
            
            console.log(`🔄 Tentativa ${index + 1} com IDs:`, fieldIds);
            
            fetch(FORM_URL, {
                method: 'POST',
                mode: 'no-cors',
                body: formData
            })
            .then(() => {
                console.log(`✅ Tentativa ${index + 1} - Dados enviados!`);
            })
            .catch(() => {
                console.log(`⚠️ Tentativa ${index + 1} - Enviado em segundo plano`);
            });
        }, index * 1000); // Espera 1 segundo entre tentativas
    });
    
    console.log('📤 Iniciando envio...');
    alert('✅ Usuário cadastrado! Os dados estão sendo enviados.');
    
    // Abre o forms para verificar
    setTimeout(() => {
        window.open('https://docs.google.com/forms/d/1FAIpQLSc74xTr5BdSgOJJ7zhsi1iVAY3O2mz5bMvIOw9aGKMB-AZS3w/viewanalytics', '_blank');
    }, 3000);
}

// Faz logout do usuário
function logout() {
    // Para a sincronização periódica
    if (syncInterval) {
        clearInterval(syncInterval);
    }
    
    // Limpa dados sensíveis
    currentUser = null;
    localStorage.removeItem('currentUser');
    
    // Mostra tela de login
    document.getElementById('main-content').classList.add('d-none');
    document.getElementById('login-container').classList.remove('d-none');
}

// Mostra a mensagem de status
function showMessage(message, type) {
    const messageEl = document.getElementById('login-message');
    messageEl.textContent = message;
    messageEl.className = `alert alert-${type} mt-3`;
    messageEl.classList.remove('d-none');
    
    // Esconde a mensagem após 5 segundos
    setTimeout(() => {
        messageEl.classList.add('d-none');
    }, 5000);
}

// Mostra o conteúdo principal após login
function showMainContent() {
    document.getElementById('login-container').classList.add('d-none');
    document.getElementById('main-content').classList.remove('d-none');
    
    // Atualiza o nome do usuário na navbar
    if (currentUser) {
        document.getElementById('user-name').textContent = currentUser.name;
    }
    
    // Carrega dados sincronizados do usuário
    carregarDadosUsuarioAtual();
    
    // Inicia a sincronização periódica
    setupPeriodicSync();
    
    // Mostra a página inicial por padrão
    mostrarPagina('inicio');
}

// Configura a sincronização periódica
function setupPeriodicSync() {
    // Sincroniza a cada 1 minuto
    syncInterval = setInterval(async () => {
        if (isOnline && currentUser) {
            await salvarDadosUsuarioAtual();
        }
    }, 60000);
}

// Carrega os dados do usuário
function loadUserData() {
    if (!currentUser) return;
    
    // Tenta carregar do servidor (simulado)
    const userKey = `user_${currentUser.id}_data`;
    const serverData = localStorage.getItem(userKey);
    
    if (serverData) {
        // Se temos dados do servidor, usamos eles
        const data = JSON.parse(serverData);
        applyUserData(data);
    } else {
        // Se não, tentamos carregar dados locais
        loadLocalData();
    }
    
    // Verifica se há dados pendentes para sincronizar
    checkPendingSync();
}

// Aplica os dados do usuário no sistema
function applyUserData(data) {
    if (data.produtos) produtos = data.produtos;
    if (data.lixeira) lixeira = data.lixeira;
    if (data.notasFiscais) notasFiscais = data.notasFiscais;
    if (data.relatorioDiario) relatorioDiario = data.relatorioDiario;
    if (data.nextProductId) nextProductId = data.nextProductId;
    if (data.nextNotaId) nextNotaId = data.nextNotaId;
    
    // Atualiza a UI
    atualizarTabelaProdutos();
    atualizarTabelaNotas();
    atualizarTabelaLixeira();
    atualizarRelatorios();
    updateCartDisplay();
}

// Carrega dados locais (quando não há conexão com servidor)
function loadLocalData() {
    // Tenta carregar dados salvos localmente para este usuário
    const localData = localStorage.getItem(`local_${currentUser.id}_data`);
    
    if (localData) {
        const data = JSON.parse(localData);
        applyUserData(data);
    } else {
        // Se não há dados locais, inicializa com dados padrão
        initializeUserData();
    }
}

// Inicializa dados para um novo usuário
function initializeUserData() {
    // Dados iniciais para novo usuário
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
    
    // Adiciona alguns produtos de exemplo
    carregarProdutosIniciais();
    
    // Salva localmente
    saveLocalData();
}

// Salva dados localmente
function saveLocalData() {
    if (!currentUser) return;
    
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
    
    // Marca que temos dados pendentes para sincronizar
    localStorage.setItem(`pending_sync_${currentUser.id}`, 'true');
}

// Verifica se há dados pendentes para sincronizar
function checkPendingSync() {
    const pendingSync = localStorage.getItem(`pending_sync_${currentUser.id}`) === 'true';
    
    if (pendingSync && isOnline) {
        syncData();
    }
}

// Sincroniza dados com o servidor (simulado)
function syncData() {
    if (!currentUser || !isOnline) return;
    
    // Mostra status de sincronizando
    const syncIcon = document.getElementById('sync-icon');
    const syncText = document.getElementById('sync-text');
    if (syncIcon && syncText) {
        syncIcon.className = 'bi bi-cloud-arrow-up syncing';
        syncText.textContent = 'Sincronizando...';
    }
    
    // Simula tempo de sincronização
    setTimeout(() => {
        // Prepara dados para enviar
        const data = {
            produtos,
            lixeira,
            notasFiscais,
            relatorioDiario,
            nextProductId,
            nextNotaId,
            lastSync: new Date().toISOString()
        };
        
        // "Envia" para o servidor (simulado com localStorage)
        const userKey = `user_${currentUser.id}_data`;
        localStorage.setItem(userKey, JSON.stringify(data));
        
        // Remove a flag de sincronização pendente
        localStorage.removeItem(`pending_sync_${currentUser.id}`);
        
        // Atualiza UI com status de sincronizado
        updateOnlineStatusUI();
        
        console.log('Dados sincronizados com sucesso!');
    }, 1500);
}

// Sincroniza dados pendentes
function syncPendingData() {
    const pendingSync = localStorage.getItem(`pending_sync_${currentUser.id}`) === 'true';
    
    if (pendingSync) {
        syncData();
    }
}

// ========== FUNÇÃO PARA MOSTRAR PÁGINAS ==========
function mostrarPagina(pagina) {
    // Esconde todas as páginas
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
    
    // Mostra a página solicitada
    const paginaElemento = document.getElementById(`pagina-${pagina}`);
    if (paginaElemento) {
        paginaElemento.classList.remove('d-none');
    }
    
    // Atualiza navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.getElementById(`nav-${pagina}`).classList.add('active');
    
    // Atualiza os dados específicos da página se necessário
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

// ========== VARIÁVEIS GLOBAIS E FUNÇÕES EXISTENTES ==========

// Variáveis globais (mantidas do código original)
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

// Inicialização
document.addEventListener('DOMContentLoaded', function() {
    // Configura data atual
    const now = new Date();
    document.getElementById('current-date').textContent = now.toLocaleDateString('pt-BR');

    // Migra dados antigos antes de carregar
    migrarDadosAntigos();

    // Carrega dados iniciais
    carregarProdutos();
    carregarLixeira();
    carregarNotasFiscais();
    carregarCarrinho();
    carregarRelatorioDiario();
    
    atualizarTabelaProdutos();
    atualizarTabelaNotas();
    atualizarTabelaLixeira();
    atualizarRelatorios();

    // Adiciona evento para filtrar produtos enquanto digita
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
        searchInput.addEventListener('input', filtrarProdutos);
    }
});

// ---------------- Persistência de dados ----------------

function addToCart(product, quantity) {
    // Verifica se já tem esse produto no carrinho
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

// Edita quantidade ou remove item do carrinho - VERSÃO CORRIGIDA
function editarItemCarrinho(produtoId, acao) {
    const itemIndex = cart.findIndex(i => i.id === produtoId);
    if (itemIndex === -1) return;

    const item = cart[itemIndex];
    // BUSCA O PRODUTO ORIGINAL PARA VERIFICAR ESTOQUE ATUAL
    const produtoOriginal = produtos.find(p => p.id === produtoId);

    if (!produtoOriginal) {
        alert('Produto não encontrado!');
        return;
    }

    if (acao === 'aumentar') {
        // Verifica se há estoque suficiente considerando o que JÁ ESTÁ NO CARRINHO
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

// Função para cancelar compra (zera o carrinho sem mexer no estoque)
function cancelarCompra() {
    if (cart.length === 0) {
        alert('Não há itens no carrinho para cancelar.');
        return;
    }
    
    if (confirm('Tem certeza que deseja cancelar esta compra?')) {
        cart = []; // esvazia o carrinho
        updateCartDisplay(); // atualiza exibição do carrinho
        alert('Compra cancelada com sucesso.');
    }
}

// --- helpers para quantidade e parsing seguros (aceita vírgula ou ponto) ---
function parseNumberInput(str) {
    if (str === undefined || str === null) return 0;
    if (typeof str === 'number') return str;
    // aceita "0,5" ou "0.5"
    return parseFloat(String(str).replace(',', '.')) || 0;
}

function formatQuantity(q) {
    const num = Number(q) || 0;
    // se inteiro, mostra como inteiro; se decimal, mostra com 2 casas e vírgula
    if (Number.isInteger(num)) return String(num);
    return num.toFixed(2).replace('.', ',');
}

// Função para migrar dados antigos (notas excluídas que ainda estão no relatório diário)
function migrarDadosAntigos() {
    // Verifica se há notas fiscais no localStorage
    const notasSalvas = localStorage.getItem('notasFiscais');
    if (!notasSalvas) return;
    
    const notas = JSON.parse(notasSalvas);
    
    // Verifica se há relatório diário no localStorage
    const relatorioSalvo = localStorage.getItem('relatorioDiario');
    if (!relatorioSalvo) return;
    
    const relatorio = JSON.parse(relatorioSalvo);
    
    // Obtém a data de hoje
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    // Se o relatório for de hoje, verifica consistência
    if (relatorio.data === hoje) {
        // Filtra as vendas do relatório diário, mantendo apenas as que existem nas notas fiscais
        relatorio.vendas = relatorio.vendas.filter(venda => {
            return notas.some(nota => nota.id === venda.id);
        });
        
        // Recalcula totais
        relatorio.totalNotas = relatorio.vendas.length;
        relatorio.totalVendas = relatorio.vendas.reduce((total, venda) => total + venda.total, 0);
        
        // Salva o relatório corrigido
        localStorage.setItem('relatorioDiario', JSON.stringify(relatorio));
    }
}

// Função para atualizar o relatório diário na tela
function atualizarRelatorioDiario() {
    // Verifica se precisa resetar para o dia atual
    verificarResetDiario();
    
    document.getElementById('data-hoje').textContent = relatorioDiario.data;
    document.getElementById('total-vendas-hoje').textContent = `R$ ${relatorioDiario.totalVendas.toFixed(2)}`;
    document.getElementById('total-notas-hoje').textContent = relatorioDiario.totalNotas;
    
    const ticketMedio = relatorioDiario.totalNotas > 0 ? relatorioDiario.totalVendas / relatorioDiario.totalNotas : 0;
    document.getElementById('ticket-medio-hoje').textContent = `R$ ${ticketMedio.toFixed(2)}`;
    
    const tbody = document.getElementById('vendas-hoje-body');
    tbody.innerHTML = '';
    
    if (relatorioDiario.vendas.length > 0) {
        // Mostra as últimas vendas primeiro (mais recentes no topo)
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

// Função para salvar relatório diário
function salvarRelatorioDiario() {
    localStorage.setItem('relatorioDiario', JSON.stringify(relatorioDiario));
    saveLocalData();
    // Sincroniza com nuvem
    salvarDadosUsuarioAtual();
}

// Função para carregar relatório diário
function carregarRelatorioDiario() {
    const relatorioSalvo = localStorage.getItem('relatorioDiario');
    if (relatorioSalvo) {
        const relatorio = JSON.parse(relatorioSalvo);
        
        // Verifica se é do mesmo dia
        const hoje = new Date().toLocaleDateString('pt-BR');
        if (relatorio.data === hoje) {
            relatorioDiario = relatorio;
        } else {
            // Se for um dia diferente, reinicia o relatório
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

// Função para verificar e resetar o relatório diário
function verificarResetDiario() {
    const hoje = new Date().toLocaleDateString('pt-BR');
    
    if (relatorioDiario.data !== hoje) {
        // Novo dia, resetar o relatório
        relatorioDiario = {
            data: hoje,
            totalVendas: 0,
            totalNotas: 0,
            vendas: []
        };
        salvarRelatorioDiario();
    }
}

// Salva produtos ativos no localStorage
function salvarProdutos() {
    localStorage.setItem('produtos', JSON.stringify(produtos));
    saveLocalData();
    // Sincroniza com nuvem
    salvarDadosUsuarioAtual();
}

// Carrega produtos do localStorage, ou inicializa se não houver
function carregarProdutos() {
    const produtosSalvos = localStorage.getItem('produtos');
    if (produtosSalvos) {
        produtos = JSON.parse(produtosSalvos);
        // Atualiza o próximo ID com base nos IDs existentes
        nextProductId = produtos.length > 0 ? Math.max(...produtos.map(p => p.id)) + 1 : 1;
    } else {
        carregarProdutosIniciais();
        salvarProdutos(); // salva os produtos iniciais
    }
}

// Carrega produtos iniciais
function carregarProdutosIniciais() {
    produtos = [
        { id: nextProductId++, nome: 'Arroz 5kg', preco: 22.90, quantidade: 12, categoria: 'Alimentos', ativo: true },
        { id: nextProductId++, nome: 'Feijão 1kg', preco: 8.50, quantidade: 25, categoria: 'Alimentos', ativo: true },
        { id: nextProductId++, nome: 'Açúcar 1kg', preco: 4.99, quantidade: 18, categoria: 'Alimentos', ativo: true },
        { id: nextProductId++, nome: 'Detergente', preco: 2.79, quantidade: 40, categoria: 'Limpeza', ativo: true }
    ];
}

// Carrega lixeira do localStorage
function carregarLixeira() {
    const lixeiraSalva = localStorage.getItem('lixeira');
    if (lixeiraSalva) {
        lixeira = JSON.parse(lixeiraSalva);
    }
}

// Carrega notas fiscais do localStorage
function carregarNotasFiscais() {
    const notasSalvas = localStorage.getItem('notasFiscais');
    if (notasSalvas) {
        notasFiscais = JSON.parse(notasSalvas);
        // Garante que todas as notas estão numeradas sequencialmente
        renumerarNotasFiscais();
        // Atualiza o próximo ID
        nextNotaId = notasFiscais.length > 0 ? Math.max(...notasFiscais.map(n => n.id)) + 1 : 1;
        // Salva as notas já renumeradas
        salvarNotasFiscais();
    }
}

// Salva lixeira no localStorage
function salvarLixeira() {
    localStorage.setItem('lixeira', JSON.stringify(lixeira));
    saveLocalData();
    // Sincroniza com nuvem
    salvarDadosUsuarioAtual();
}

// Salva notas fiscais no localStorage
function salvarNotasFiscais() {
    localStorage.setItem('notasFiscais', JSON.stringify(notasFiscais));
    saveLocalData();
    // Sincroniza com nuvem
    salvarDadosUsuarioAtual();
}

// Salva carrinho no localStorage
function salvarCarrinho() {
    localStorage.setItem('cart', JSON.stringify(cart));
}

// Carrega carrinho do localStorage
function carregarCarrinho() {
    const cartSalvo = localStorage.getItem('cart');
    if (cartSalvo) {
        cart = JSON.parse(cartSalvo);
    }
    updateCartDisplay();
}

// ---------------- Atualização de visualizações ----------------

// Atualiza tabela de produtos
function atualizarTabelaProdutos() {
    const tableBody = document.getElementById('products-table-body');
    tableBody.innerHTML = '';
    
    const produtosAtivos = produtos.filter(p => p.ativo);
    
    if (produtosAtivos.length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="text-center py-4">Nenhum produto cadastrado.</td>
            </tr>
        `;
        return;
    }
    
    produtosAtivos.forEach(produto => {
        const row = document.createElement('tr');
        row.className = 'product-row';
        row.id = `product-${produto.id}`;
        
        // Determina a classe de estoque
        let stockClass = 'good-stock';
        if (Number(produto.quantidade) <= 5) stockClass = 'low-stock';
        if (Number(produto.quantidade) > 15) stockClass = 'high-stock';
        
        row.innerHTML = `
            <td>${produto.nome}</td>
            <td>
                <span class="badge ${produto.categoria === 'Alimentos' ? 'badge-alimentos' : produto.categoria === 'Limpeza' ? 'badge-limpeza' : 'badge-outros'}">
                    ${produto.categoria || 'Sem categoria'}
                </span>
            </td>
            <td>R$ <span class="product-price">${produto.preco.toFixed(2).replace('.', ',')}</span></td>
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
                    <button class="btn btn-outline-danger" type="button" onclick="moverParaLixeira(${produto.id})">
                        <i class="bi bi-trash"></i>
                    </button>
                </div>
            </td>
        `;
        
        tableBody.appendChild(row);
    });
    filtrarProdutos();
}

// Atualiza tabela da lixeira
function atualizarTabelaLixeira() {
    const tbody = document.getElementById('trash-table-body');
    const trashEmpty = document.getElementById('trash-empty');
    tbody.innerHTML = '';

    if (lixeira.length === 0) {
        trashEmpty.classList.remove('d-none');
        return;
    }
    
    trashEmpty.classList.add('d-none');

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

// Atualiza tabela de notas fiscais
function atualizarTabelaNotas() {
    const tableBody = document.getElementById('notas-table-body');
    const notasEmpty = document.getElementById('notas-empty');
    
    tableBody.innerHTML = '';
    
    if (notasFiscais.length === 0) {
        notasEmpty.classList.remove('d-none');
        return;
    }
    
    notasEmpty.classList.add('d-none');
    
    // Ordena notas por data (mais recente primeiro)
    const notasOrdenadas = [...notasFiscais].sort((a, b) => new Date(b.data) - new Date(a.data));
    
    notasOrdenadas.forEach(nota => {
        const row = document.createElement('tr');
        
        // Formatar o total
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

// Função para excluir nota fiscal COM RENUMERAÇÃO
function excluirNotaFiscal(id) {
    if (confirm("Tem certeza que deseja excluir esta nota fiscal? Esta ação não pode ser desfeita!")) {
        // Encontra a nota a ser excluída
        const notaIndex = notasFiscais.findIndex(n => n.id === id);
        
        if (notaIndex !== -1) {
            const nota = notasFiscais[notaIndex];
            
            // Remove a nota do array de notas fiscais
            notasFiscais.splice(notaIndex, 1);
            
            // ATUALIZAÇÃO DO RELATÓRIO DIÁRIO (NOVO)
            // Verifica se a nota é do dia atual
            const dataNota = new Date(nota.data).toLocaleDateString('pt-BR');
            const hoje = new Date().toLocaleDateString('pt-BR');
            
            if (dataNota === hoje) {
                // Remove a nota do relatório diário
                relatorioDiario.totalVendas -= nota.total;
                relatorioDiario.totalNotas -= 1;
                
                // Remove a venda do array de vendas do dia
                relatorioDiario.vendas = relatorioDiario.vendas.filter(v => v.id !== id);
                
                // Salva as alterações no relatório diário
                salvarRelatorioDiario();
            }
            
            // RENUMERA todas as notas fiscais para manter a sequência
            renumerarNotasFiscais();
            
            // Atualiza o próximo ID para continuar a sequência
            nextNotaId = notasFiscais.length > 0 ? Math.max(...notasFiscais.map(n => n.id)) + 1 : 1;
            
            // Salva as alterações
            salvarNotasFiscais();
            
            // Atualiza as visualizações
            atualizarTabelaNotas();
            atualizarRelatorios();
            
            // Se estiver na página de relatório diário, atualiza também
            if (document.getElementById('pagina-relatorio-diario').classList.contains('d-none') === false) {
                atualizarRelatorioDiario();
            }
            
            alert("Nota excluída e sequência renumerada com sucesso!");
        } else {
            alert("Nota não encontrada!");
        }
    }
}

// Função para renumerar todas as notas fiscais em ordem sequencial
function renumerarNotasFiscais() {
    // Ordena as notas por data de criação (mais antiga primeiro)
    notasFiscais.sort((a, b) => new Date(a.data) - new Date(b.data));
    
    // Renumera sequencialmente a partir de 1
    notasFiscais.forEach((nota, index) => {
        nota.id = index + 1;
    });
}

// Atualiza relatórios
function atualizarRelatorios() {
    // Total geral (acumulado)
    const totalVendas = notasFiscais.reduce((acc, n) => acc + (n.total || 0), 0);
    document.getElementById("total-vendas").textContent = `R$ ${totalVendas.toFixed(2)}`;
    
    document.getElementById("total-produtos").textContent = produtos.filter(p => p.ativo).length;
    
    document.getElementById("total-notas").textContent = notasFiscais.length;
    
    // Atualizar também as tabelas de relatórios
    atualizarVendasPorCategoria();
    atualizarVendasPorPeriodo();
}

// Atualiza vendas por categoria
function atualizarVendasPorCategoria() {
    const tableBody = document.getElementById('vendas-categoria-body');
    tableBody.innerHTML = '';
    
    const vendasPorCategoria = {};
    
    // Inicializa categorias
    const categorias = [...new Set(produtos.map(p => p.categoria || 'Outros'))];
    categorias.forEach(categoria => {
        vendasPorCategoria[categoria] = {
            quantidade: 0,
            valor: 0
        };
    });
    
    // Calcula vendas por categoria
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
    
    // Calcula total geral
    const totalGeral = Object.values(vendasPorCategoria).reduce((total, cat) => total + cat.valor, 0);
    
    // Preenche a tabela
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

// Atualiza vendas por período
function atualizarVendasPorPeriodo() {
    const dataInicio = document.getElementById('data-inicio').value;
    const dataFim = document.getElementById('data-fim').value;
    
    const tableBody = document.getElementById('vendas-periodo-body');
    tableBody.innerHTML = '';
    
    let notasFiltradas = [...notasFiscais];
    
    // Aplica filtro de data se fornecido
    if (dataInicio) {
        const inicio = new Date(dataInicio);
        notasFiltradas = notasFiltradas.filter(nota => new Date(nota.data) >= inicio);
    }
    
    if (dataFim) {
        const fim = new Date(dataFim);
        fim.setHours(23, 59, 59, 999); // Fim do dia
        notasFiltradas = notasFiltradas.filter(nota => new Date(nota.data) <= fim);
    }
    
    // Agrupa vendas por data
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
    
    // Preenche a tabela
    Object.entries(vendasPorData).forEach(([data, dados]) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${data}</td>
            <td>${dados.quantidade}</td>
            <td>R$ ${dados.valor.toFixed(2).replace('.', ',')}</td>
        `;
        
        tableBody.appendChild(row);
    });
    
    // Se não houver dados, exibe mensagem
    if (Object.keys(vendasPorData).length === 0) {
        tableBody.innerHTML = `
            <tr>
                <td colspan="3" class="text-center py-4">Nenhuma venda no período selecionado</td>
            </tr>
        `;
    }
}

// ---------------- Funções de filtro e navegação ----------------

// Filtra produtos na barra de pesquisa
function filtrarProdutos() {
    const query = (document.getElementById('search-input')?.value || '').toLowerCase();
    const linhas = document.querySelectorAll('.product-row');
    
    linhas.forEach(linha => {
        const nomeProduto = linha.querySelector('td:first-child')?.textContent.toLowerCase() || '';
        linha.style.display = nomeProduto.includes(query) ? '' : 'none';
    });
}

// Filtra vendas por período
function filtrarVendas() {
    atualizarVendasPorPeriodo();
}

// Volta para a página inicial
function voltarParaInicio() {
    mostrarPagina('inicio');
}

// ---------------- Funções de gerenciamento de produtos ----------------

// Função para aumentar o estoque (aceita fração)
function aumentarEstoque(produtoId) {
    const input = document.getElementById('qtd-aumentar-' + produtoId);
    const qtd = parseNumberInput(input.value) || 0.01;
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    produto.quantidade = Number(produto.quantidade) + qtd;
    salvarProdutos();
    atualizarTabelaProdutos();
    alert('Estoque aumentado em ' + formatQuantity(qtd) + ' unidades!');
    
    // SINCRONIZAÇÃO ADICIONADA
    salvarDadosUsuarioAtual();
}

// Função para diminuir o estoque (aceita fração)
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
    
    // SINCRONIZAÇÃO ADICIONADA
    salvarDadosUsuarioAtual();
}

// Função para adicionar produto ao carrinho (aceita frações) - VERSÃO CORRIGIDA
function addToCart(produtoId) {
    const input = document.querySelector('.quantity-sale[data-produto-id="' + produtoId + '"]');
    const qtd = parseNumberInput(input.value);
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    if (qtd <= 0) {
        alert('Digite uma quantidade válida para vender!');
        return;
    }
    
    // Verifica estoque considerando o que já está no carrinho
    const itemExistente = cart.find(item => item.id === produtoId);
    const quantidadeJaNoCarrinho = itemExistente ? itemExistente.quantity : 0;
    const totalSolicitado = quantidadeJaNoCarrinho + qtd;
    
    if (totalSolicitado > Number(produto.quantidade)) {
        alert(`Não há estoque suficiente! Disponível: ${formatQuantity(produto.quantidade)} | Já no carrinho: ${formatQuantity(quantidadeJaNoCarrinho)}`);
        return;
    }
    
    // Adiciona ao carrinho
    if (itemExistente) {
        // Atualiza a quantidade se já estiver no carrinho
        itemExistente.quantity = totalSolicitado;
    } else {
        // Adiciona novo item ao carrinho com TODOS os dados necessários
        cart.push({
            id: produto.id,
            name: produto.nome,
            price: produto.preco,
            quantity: qtd,
            estoque: produto.quantidade // ADICIONA ESTOQUE PARA REFERÊNCIA
        });
    }
    
    // Atualiza a exibição do carrinho
    updateCartDisplay();
    
    alert('Adicionado ao carrinho: ' + formatQuantity(qtd) + 'x ' + produto.nome);
    input.value = 0;
}

// Função para atualizar a exibição do carrinho
function updateCartDisplay() {
    const cartItemsList = document.getElementById('cart-items-list');
    const cartTotalValue = document.getElementById('cart-total-value');
    const cartEmpty = document.getElementById('cart-empty');
    const cartItems = document.getElementById('cart-items');

    // Salvar carrinho no localStorage
    salvarCarrinho();

    if (cart.length === 0) {
        cartEmpty.classList.remove('d-none');
        cartItems.classList.add('d-none');
        return;
    }
    
    cartEmpty.classList.add('d-none');
    cartItems.classList.remove('d-none');
    
    // Limpa a lista
    cartItemsList.innerHTML = '';
    
    // Calcula o total
    let total = 0;
    
    // Adiciona os itens
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

    
    // Atualiza o total
    cartTotalValue.textContent = total.toFixed(2).replace('.', ',');
}

// Função para finalizar a venda - COM RELATÓRIO DIÁRIO
function finalizarVenda() {
    if (cart.length === 0) {
        alert("Carrinho vazio!");
        return;
    }

    // Verifica se precisa resetar o relatório diário
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

    // ATUALIZA RELATÓRIO DIÁRIO
    relatorioDiario.totalVendas += total;
    relatorioDiario.totalNotas += 1;
    relatorioDiario.vendas.push({
        id: proximoId,
        hora: new Date().toLocaleTimeString('pt-BR'),
        total: total,
        itens: cart.length
    });
    salvarRelatorioDiario();

    // Atualizar estoque dos produtos vendidos
    cart.forEach(item => {
        const produto = produtos.find(p => p.id === item.id);
        if (produto) {
            const quantidadeVendida = Number(item.quantity) || 0;
            produto.quantidade -= quantidadeVendida;
            if (produto.quantidade < 0) produto.quantidade = 0;
        }
    });
    
    salvarProdutos();

    // Limpar carrinho
    cart = [];
    salvarCarrinho();
    
    atualizarTabelaProdutos();
    atualizarTabelaNotas();
    atualizarRelatorios();
    updateCartDisplay();

    alert("Venda finalizada! Nº: " + proximoId + " | Hoje: R$ " + relatorioDiario.totalVendas.toFixed(2));
    
    // SINCRONIZAÇÃO ADICIONADA
    salvarDadosUsuarioAtual();
}

// Função para adicionar produto (quantidade aceita decimais)
function adicionarProduto() {
    const nome = (document.getElementById('nome').value || '').trim();
    const preco = parseNumberInput(document.getElementById('preco').value);
    const quantidade = parseNumberInput(document.getElementById('quantidade').value);
    const categoria = document.getElementById('categoria').value;

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
    document.getElementById('novoProdutoForm').reset();
    alert('Produto adicionado com sucesso!');
    
    // SINCRONIZAÇÃO ADICIONADA
    salvarDadosUsuarioAtual();
}

// Função para mover produto para a lixeira
function moverParaLixeira(id) {
    if (confirm("Deseja realmente enviar este produto para a lixeira?")) {
        const produtoIndex = produtos.findIndex(p => p.id === id);
        
        if (produtoIndex !== -1) {
            const produto = produtos[produtoIndex];
            
            // Marca como inativo
            produto.ativo = false;
            
            // Adiciona à lixeira (faz uma cópia)
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
            
            // SINCRONIZAÇÃO ADICIONADA
            salvarDadosUsuarioAtual();
        }
    }
}

// Restaurar produto da lixeira
function restaurarProduto(id) {
    // Encontra o produto na lixeira
    const produtoIndex = lixeira.findIndex(p => p.id === id);
    
    if (produtoIndex !== -1) {
        const produto = lixeira[produtoIndex];
        
        // Marca o produto como ativo novamente
        produto.ativo = true;
        
        // Adiciona de volta à lista de produtos (se não existir)
        const produtoExistente = produtos.find(p => p.id === id);
        if (!produtoExistente) {
            produtos.push(produto);
        } else {
            // Se já existe, apenas marca como ativo
            produtoExistente.ativo = true;
        }
        
        // Remove da lixeira
        lixeira.splice(produtoIndex, 1);
        
        // Salva as alterações
        salvarProdutos();
        salvarLixeira();
        
        // Atualiza as visualizações
        atualizarTabelaProdutos();
        atualizarTabelaLixeira();
        
        alert("Produto restaurado com sucesso!");
        
        // SINCRONIZAÇÃO ADICIONADA
        salvarDadosUsuarioAtual();
    }
}

// Excluir permanentemente
function excluirPermanentemente(id) {
    if (confirm("Deseja excluir permanentemente este produto?")) {
        lixeira = lixeira.filter(p => p.id !== id);
        
        salvarLixeira();
        atualizarTabelaLixeira();
        alert("Produto excluído permanentemente!");
        
        // SINCRONIZAÇÃO ADICIONADA
        salvarDadosUsuarioAtual();
    }
}

// Visualizar nota fiscal
function visualizarNota(id) {
    console.log("Tentando visualizar nota:", id);
    
    const nota = notasFiscais.find(n => n.id === id);
    
    if (!nota) {
        console.error("Nota não encontrada:", id);
        alert("Nota fiscal não encontrada!");
        return;
    }

    // Formatar valores com verificação de segurança
    const totalFormatado = nota.total && typeof nota.total === 'number' 
        ? nota.total.toFixed(2) 
        : '0.00';

    // Preencher os dados da modal
    document.getElementById("nota-numero").textContent = nota.id;
    document.getElementById("nota-id").textContent = nota.id;
    document.getElementById("nota-data").textContent = new Date(nota.data).toLocaleDateString('pt-BR');
    document.getElementById("nota-cliente").textContent = nota.cliente || "Não informado";
    document.getElementById("nota-total").textContent = totalFormatado;

    // Preencher os itens da nota
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

    // Mostrar a modal
    try {
        const modal = new bootstrap.Modal(document.getElementById("notaFiscalModal"));
        modal.show();
    } catch (error) {
        console.error("Erro ao abrir modal:", error);
        document.getElementById("notaFiscalModal").style.display = "block";
        document.getElementById("notaFiscalModal").classList.add("show");
    }
}

// Imprime nota fiscal
function imprimirNota() {
    window.print();
}