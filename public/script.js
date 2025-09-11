// Variáveis globais
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
    
    // Mostra a página inicial por padrão
    mostrarPagina('inicio');
});

// ---------------- Persistência de dados ----------------

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


// Função para mostrar página específica
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
}

// Salva notas fiscais no localStorage
function salvarNotasFiscais() {
    localStorage.setItem('notasFiscais', JSON.stringify(notasFiscais));
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
        if (produto.quantidade <= 5) stockClass = 'low-stock';
        if (produto.quantidade > 15) stockClass = 'high-stock';
        
        row.innerHTML = `
            <td>${produto.nome}</td>
            <td>
                <span class="badge ${produto.categoria === 'Alimentos' ? 'badge-alimentos' : produto.categoria === 'Limpeza' ? 'badge-limpeza' : 'badge-outros'}">
                    ${produto.categoria || 'Sem categoria'}
                </span>
            </td>
            <td>R$ <span class="product-price">${produto.preco.toFixed(2).replace('.', ',')}</span></td>
            <td>
                <span class="stock-cell ${stockClass}" id="stock-${produto.id}">${produto.quantidade}</span>
            </td>
            <td>
                <div class="input-group input-group-sm" style="width: 120px;">
                    <input type="number" class="form-control quantity-sale" value="0" min="0" max="${produto.quantidade}" data-produto-id="${produto.id}">
                    <button class="btn btn-outline-primary" type="button" onclick="addToCart(${produto.id})">
                        <i class="bi bi-cart-plus"></i>
                    </button>
                </div>
            </td>
            <td>
                <div class="product-actions">
                    <div class="input-group input-group-sm" style="width: 120px;">
                        <input type="number" class="form-control" id="qtd-aumentar-${produto.id}" value="1" min="1">
                        <button class="btn btn-outline-success" type="button" onclick="aumentarEstoque(${produto.id})">
                            <i class="bi bi-plus-circle"></i>
                        </button>
                    </div>
                    <div class="input-group input-group-sm" style="width: 120px;">
                        <input type="number" class="form-control" id="qtd-diminuir-${produto.id}" value="1" min="1" max="${produto.quantidade}">
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

// Função para aumentar o estoque
function aumentarEstoque(produtoId) {
    const input = document.getElementById('qtd-aumentar-' + produtoId);
    const qtd = parseInt(input.value) || 1;
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    produto.quantidade += qtd;
    salvarProdutos();
    atualizarTabelaProdutos();
    alert('Estoque aumentado em ' + qtd + ' unidades!');
}

// Função para diminuir o estoque
function diminuirEstoque(produtoId) {
    const input = document.getElementById('qtd-diminuir-' + produtoId);
    const qtd = parseInt(input.value) || 1;
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    if (qtd > produto.quantidade) {
        alert('Não é possível diminuir mais do que o estoque atual!');
        return;
    }
    
    produto.quantidade -= qtd;
    salvarProdutos();
    atualizarTabelaProdutos();
    alert('Estoque diminuído em ' + qtd + ' unidades!');
}

// Função para adicionar produto ao carrinho
function addToCart(produtoId) {
    const input = document.querySelector('.quantity-sale[data-produto-id="' + produtoId + '"]');
    const qtd = parseInt(input.value) || 0;
    const produto = produtos.find(p => p.id === produtoId);
    
    if (!produto) return;
    
    if (qtd <= 0) {
        alert('Digite uma quantidade válida para vender!');
        return;
    }
    
    if (qtd > produto.quantidade) {
        alert('Não há estoque suficiente! Disponível: ' + produto.quantidade);
        return;
    }
    
    // Adiciona ao carrinho
    const existingItemIndex = cart.findIndex(item => item.id === produtoId);
    
    if (existingItemIndex !== -1) {
        // Atualiza a quantidade se já estiver no carrinho
        cart[existingItemIndex].quantity += qtd;
    } else {
        // Adiciona novo item ao carrinho
        cart.push({
            id: produto.id,
            name: produto.nome,
            price: produto.preco,
            quantity: qtd
        });
    }
    
    // Atualiza a exibição do carrinho
    updateCartDisplay();
    
    alert('Adicionado ao carrinho: ' + qtd + 'x ' + produto.nome);
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
        cartItem.className = 'cart-item';
        cartItem.innerHTML = `
            <div>${item.quantity}x ${item.name}</div>
            <div>R$ ${itemTotal.toFixed(2).replace('.', ',')}</div>
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
}

// Função para adicionar produto
function adicionarProduto() {
    const nome = (document.getElementById('nome').value || '').trim();
    const preco = parseFloat(document.getElementById('preco').value);
    const quantidade = parseInt(document.getElementById('quantidade').value);
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
    }
}

// Excluir permanentemente
function excluirPermanentemente(id) {
    if (confirm("Deseja excluir permanentemente este produto?")) {
        lixeira = lixeira.filter(p => p.id !== id);
        
        salvarLixeira();
        atualizarTabelaLixeira();
        alert("Produto excluído permanentemente!");
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