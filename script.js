
        let boletos = [];
        let boletosFiltrados = [];
        let editandoIndex = -1;
        let chartStatus = null;
        let chartValores = null;
        let alertasVisiveis = false;
        let scannerAtivo = false;
        let bufferScanner = '';
        let timerScanner = null;

        function mudarAba(aba) {
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            });
            
            document.querySelectorAll('.tabs li').forEach(li => {
                li.classList.remove('is-active');
            });
            
            document.getElementById(`tab-${aba}`).style.display = 'block';
            document.querySelector(`[data-tab="${aba}"]`).classList.add('is-active');
            
            if (aba === 'dashboard') {
                atualizarDashboard();
            } else if (aba === 'lista') {
                aplicarFiltroPeriodo();
            }
        }

        function toggleAlertas() {
            alertasVisiveis = !alertasVisiveis;
            document.getElementById('alertasPanel').style.display = alertasVisiveis ? 'block' : 'none';
        }

        function togglePrintDropdown() {
            document.getElementById('printDropdown').classList.toggle('is-active');
        }

        document.addEventListener('click', function(e) {
            if (!e.target.closest('#printDropdown')) {
                document.getElementById('printDropdown').classList.remove('is-active');
            }
        });

        // FILTRO POR PERÍODO
        function aplicarFiltroPeriodo() {
            const periodo = document.getElementById('filtroPeriodo').value;
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            switch(periodo) {
                case 'hoje':
                    boletosFiltrados = boletos.filter(b => {
                        const venc = new Date(b.dataVencimento + 'T00:00:00');
                        return venc.toDateString() === hoje.toDateString();
                    });
                    break;
                    
                case 'semana':
                    const inicioSemana = new Date(hoje);
                    const diaAtual = hoje.getDay();
                    const diff = diaAtual === 0 ? 6 : diaAtual - 1;
                    inicioSemana.setDate(hoje.getDate() - diff);
                    
                    const fimSemana = new Date(inicioSemana);
                    fimSemana.setDate(inicioSemana.getDate() + 6);
                    
                    boletosFiltrados = boletos.filter(b => {
                        const venc = new Date(b.dataVencimento + 'T00:00:00');
                        return venc >= inicioSemana && venc <= fimSemana;
                    });
                    break;
                    
                case 'mes':
                    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                    
                    boletosFiltrados = boletos.filter(b => {
                        const venc = new Date(b.dataVencimento + 'T00:00:00');
                        return venc >= inicioMes && venc <= fimMes;
                    });
                    break;
                    
                case 'ano':
                    const inicioAno = new Date(hoje.getFullYear(), 0, 1);
                    const fimAno = new Date(hoje.getFullYear(), 11, 31);
                    
                    boletosFiltrados = boletos.filter(b => {
                        const venc = new Date(b.dataVencimento + 'T00:00:00');
                        return venc >= inicioAno && venc <= fimAno;
                    });
                    break;
                    
                default: // todos
                    boletosFiltrados = [...boletos];
            }
            
            atualizarEstatisticasPeriodo();
            renderizarBoletos();
        }

        function atualizarEstatisticasPeriodo() {
            let totalPagos = 0;
            let totalPendentes = 0;
            let totalVencidos = 0;
            let totalGeral = 0;
            
            boletosFiltrados.forEach(boleto => {
                const status = getStatusBoleto(boleto);
                totalGeral += boleto.valor;
                
                if (status.texto === 'Pago') {
                    totalPagos += boleto.valor;
                } else if (status.texto === 'Vencido') {
                    totalVencidos += boleto.valor;
                } else {
                    totalPendentes += boleto.valor;
                }
            });
            
            document.getElementById('statQuantidade').textContent = boletosFiltrados.length;
            document.getElementById('statPagos').textContent = formatarMoeda(totalPagos);
            document.getElementById('statPendentes').textContent = formatarMoeda(totalPendentes);
            document.getElementById('statVencidos').textContent = formatarMoeda(totalVencidos);
            document.getElementById('statTotal').textContent = formatarMoeda(totalGeral);
        }

        // SCANNER DE CÓDIGO DE BARRAS
        function abrirScanner() {
            const container = document.getElementById('scannerContainer');
            container.classList.add('active');
            scannerAtivo = true;
            
            Quagga.init({
                inputStream: {
                    name: "Live",
                    type: "LiveStream",
                    target: document.querySelector('#scanner-video'),
                    constraints: {
                        width: 640,
                        height: 480,
                        facingMode: "environment"
                    },
                },
                decoder: {
                    readers: [
                        "i2of5_reader",
                        "code_128_reader",
                        "ean_reader",
                        "ean_8_reader"
                    ]
                },
            }, function(err) {
                if (err) {
                    console.error('Erro ao iniciar scanner:', err);
                    alert('Erro ao acessar a câmera. Verifique as permissões.');
                    fecharScanner();
                    return;
                }
                Quagga.start();
            });

            Quagga.onDetected(function(result) {
                if (result && result.codeResult && result.codeResult.code) {
                    const codigo = result.codeResult.code;
                    document.getElementById('codigoBarras').value = codigo;
                    
                    // Vibrar se disponível
                    if (navigator.vibrate) {
                        navigator.vibrate(200);
                    }
                    
                    fecharScanner();
                    
                    // Notificação de sucesso
                    const notification = document.createElement('div');
                    notification.className = 'notification is-success';
                    notification.innerHTML = `
                        <button class="delete" onclick="this.parentElement.remove()"></button>
                        <strong>Código escaneado com sucesso!</strong><br>
                        ${codigo}
                    `;
                    notification.style.position = 'fixed';
                    notification.style.top = '20px';
                    notification.style.right = '20px';
                    notification.style.zIndex = '9999';
                    document.body.appendChild(notification);
                    
                    setTimeout(() => {
                        if (notification.parentElement) {
                            notification.remove();
                        }
                    }, 5000);
                }
            });
        }

        function fecharScanner() {
            if (scannerAtivo) {
                Quagga.stop();
                scannerAtivo = false;
            }
            document.getElementById('scannerContainer').classList.remove('active');
        }

        // BUSCAR POR CÓDIGO DE BARRAS
        function buscarPorCodigoBarras() {
            const codigo = prompt('Digite o código de barras do boleto:');
            if (!codigo) return;
            
            const encontrado = boletos.find(b => b.codigoBarras === codigo);
            
            if (encontrado) {
                const index = boletos.indexOf(encontrado);
                
                // Destacar o boleto encontrado
                mudarAba('lista');
                document.getElementById('filtroPeriodo').value = 'todos';
                aplicarFiltroPeriodo();
                
                setTimeout(() => {
                    const boletoElement = document.querySelectorAll('.boleto-item')[index];
                    if (boletoElement) {
                        boletoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        boletoElement.style.animation = 'pulse 1s ease-in-out 3';
                    }
                }, 300);
                
                alert(`✅ Boleto encontrado!\n\nEmpresa: ${encontrado.empresa}\nValor: ${formatarMoeda(encontrado.valor)}\nVencimento: ${formatarData(encontrado.dataVencimento)}`);
            } else {
                alert('❌ Nenhum boleto encontrado com este código de barras.');
            }
        }

        function imprimirBoletos(periodo) {
            document.getElementById('printDropdown').classList.remove('is-active');
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            let boletosPrint = [];
            let textoPeriodo = '';
            
            switch(periodo) {
                case 'hoje':
                    boletosPrint = boletos.filter(b => {
                        const venc = new Date(b.dataVencimento + 'T00:00:00');
                        return venc.toDateString() === hoje.toDateString();
                    });
                    textoPeriodo = 'Boletos que vencem HOJE';
                    break;
                    
                case 'semana':
                    const fimSemana = new Date(hoje);
                    fimSemana.setDate(hoje.getDate() + 7);
                    boletosPrint = boletos.filter(b => {
                        const venc = new Date(b.dataVencimento + 'T00:00:00');
                        return venc >= hoje && venc <= fimSemana;
                    });
                    textoPeriodo = 'Boletos desta SEMANA';
                    break;
                    
                case 'mes':
                    const inicioMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);
                    const fimMes = new Date(hoje.getFullYear(), hoje.getMonth() + 1, 0);
                    boletosPrint = boletos.filter(b => {
                        const venc = new Date(b.dataVencimento + 'T00:00:00');
                        return venc >= inicioMes && venc <= fimMes;
                    });
                    textoPeriodo = 'Boletos deste MÊS';
                    break;
                    
                case 'todos':
                    boletosPrint = [...boletos];
                    textoPeriodo = 'TODOS os boletos';
                    break;
            }
            
            if (boletosPrint.length === 0) {
                alert('Nenhum boleto encontrado para o período selecionado!');
                return;
            }
            
            document.getElementById('printPeriodo').textContent = textoPeriodo;
            const dataFormatada = hoje.toLocaleDateString('pt-BR', { 
                day: '2-digit', 
                month: 'long', 
                year: 'numeric',
                hour: '2-digit',
                minute: '2-digit'
            });
            document.getElementById('printData').textContent = `Gerado em: ${dataFormatada}`;
            document.getElementById('printDataRodape').textContent = dataFormatada;
            
            const listaOriginal = document.getElementById('listaBoletos').innerHTML;
            renderizarBoletosParaImpressao(boletosPrint);
            
            setTimeout(() => {
                window.print();
                setTimeout(() => {
                    document.getElementById('listaBoletos').innerHTML = listaOriginal;
                }, 100);
            }, 500);
        }

        function renderizarBoletosParaImpressao(boletosPrint) {
            const lista = document.getElementById('listaBoletos');
            
            lista.innerHTML = boletosPrint.map((boleto, index) => {
                const status = getStatusBoleto(boleto);
                let classeItem = '';
                
                if (boleto.dataPagamento) {
                    classeItem = 'boleto-pago';
                } else if (status.texto === 'Vencido') {
                    classeItem = 'boleto-vencido';
                } else if (boleto.statusBoleto === 'aguardando') {
                    classeItem = 'boleto-aguardando';
                }
                
                const statusBoletoTexto = boleto.statusBoleto === 'aguardando' ? 
                    '<span class="tag is-light is-small ml-2"><i class="fas fa-hourglass-half mr-1"></i> Aguardando</span>' : '';
                
                const codigoBarrasHtml = boleto.codigoBarras ? 
                    `<div class="boleto-campo">
                        <strong>CÓDIGO DE BARRAS</strong>
                        <span class="barcode-display">${boleto.codigoBarras}</span>
                    </div>` : '';
                
                return `
                    <div class="box boleto-item ${classeItem} mb-3">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 250px;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                                    <span class="tag ${status.classe} status-badge">
                                        <i class="fas ${status.icone}"></i> ${status.texto}
                                    </span>
                                    ${statusBoletoTexto}
                                </div>
                                
                                <div class="boleto-info">
                                    <div class="boleto-campo">
                                        <strong>EMPRESA</strong>
                                        <span>${boleto.empresa}</span>
                                    </div>
                                    
                                    <div class="boleto-campo">
                                        <strong>VALOR</strong>
                                        <span class="has-text-weight-bold">${formatarMoeda(boleto.valor)}</span>
                                    </div>
                                    
                                    <div class="boleto-campo">
                                        <strong>VENCIMENTO</strong>
                                        <span>${formatarData(boleto.dataVencimento)}</span>
                                    </div>
                                    
                                    ${boleto.dataPagamento ? `
                                    <div class="boleto-campo">
                                        <strong>PAGAMENTO</strong>
                                        <span class="has-text-success">${formatarData(boleto.dataPagamento)}</span>
                                    </div>
                                    ` : ''}
                                    
                                    ${codigoBarrasHtml}
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function verificarAlertas() {
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            
            const alertas = [];
            
            boletos.forEach((boleto, index) => {
                if (boleto.dataPagamento) return;
                
                const vencimento = new Date(boleto.dataVencimento + 'T00:00:00');
                const diffTime = vencimento - hoje;
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                
                if (diffDays === 0) {
                    alertas.push({
                        tipo: 'critico',
                        icone: 'fa-exclamation-circle',
                        mensagem: `<strong>${boleto.empresa}</strong> - Vence HOJE!`,
                        valor: formatarMoeda(boleto.valor),
                        index: index
                    });
                } else if (diffDays === 1) {
                    alertas.push({
                        tipo: 'urgente',
                        icone: 'fa-clock',
                        mensagem: `<strong>${boleto.empresa}</strong> - Vence AMANHÃ!`,
                        valor: formatarMoeda(boleto.valor),
                        index: index
                    });
                } else if (diffDays === 2) {
                    alertas.push({
                        tipo: 'aviso',
                        icone: 'fa-bell',
                        mensagem: `<strong>${boleto.empresa}</strong> - Vence em 2 dias`,
                        valor: formatarMoeda(boleto.valor),
                        index: index
                    });
                } else if (diffDays < 0) {
                    const diasVencidos = Math.abs(diffDays);
                    alertas.push({
                        tipo: 'vencido',
                        icone: 'fa-times-circle',
                        mensagem: `<strong>${boleto.empresa}</strong> - Vencido há ${diasVencidos} ${diasVencidos === 1 ? 'dia' : 'dias'}`,
                        valor: formatarMoeda(boleto.valor),
                        index: index
                    });
                }
            });
            
            const notificationBadge = document.getElementById('notificationCount');
            const listaAlertas = document.getElementById('listaAlertas');
            
            if (alertas.length > 0) {
                notificationBadge.textContent = alertas.length;
                notificationBadge.style.display = 'block';
                
                listaAlertas.innerHTML = alertas.map(alerta => {
                    const classeCritica = (alerta.tipo === 'critico' || alerta.tipo === 'vencido') ? 'alerta-critico' : '';
                    return `
                        <div class="alerta-item ${classeCritica}">
                            <i class="fas ${alerta.icone}"></i>
                            <div style="flex: 1;">
                                <p>${alerta.mensagem}</p>
                                <p class="has-text-weight-bold">${alerta.valor}</p>
                            </div>
                            <button class="button is-small is-info" onclick="editarBoletoDoAlerta(${alerta.index})">
                                <span class="icon"><i class="fas fa-edit"></i></span>
                            </button>
                        </div>
                    `;
                }).join('');
            } else {
                notificationBadge.style.display = 'none';
                listaAlertas.innerHTML = '<p class="has-text-centered has-text-grey">Nenhum alerta no momento! 🎉</p>';
            }
        }

        function editarBoletoDoAlerta(index) {
            toggleAlertas();
            mudarAba('cadastro');
            editarBoleto(index);
        }

        function salvarBoletos() {
            try {
                localStorage.setItem('boletos', JSON.stringify(boletos));
                console.log('✅ Boletos salvos com sucesso!', boletos);
            } catch (e) {
                console.error('❌ Erro ao salvar:', e);
                alert('Erro ao salvar os dados. Verifique o console.');
            }
        }

        function carregarBoletos() {
            try {
                const dados = localStorage.getItem('boletos');
                if (dados) {
                    boletos = JSON.parse(dados);
                    boletos = boletos.map(b => ({
                        ...b,
                        statusBoleto: b.statusBoleto || 'recebido',
                        codigoBarras: b.codigoBarras || ''
                    }));
                    console.log('✅ Boletos carregados:', boletos);
                } else {
                    boletos = [];
                    console.log('ℹ️ Nenhum boleto salvo anteriormente');
                }
            } catch (e) {
                console.error('❌ Erro ao carregar:', e);
                boletos = [];
            }
            boletosFiltrados = [...boletos];
            renderizarBoletos();
            atualizarDashboard();
            verificarAlertas();
        }

        function formatarMoeda(valor) {
            return new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(valor);
        }

        function formatarData(data) {
            if (!data) return '-';
            return new Date(data + 'T00:00:00').toLocaleDateString('pt-BR');
        }

        function getStatusBoleto(boleto) {
            if (boleto.dataPagamento) {
                return { texto: 'Pago', classe: 'is-success', icone: 'fa-check-circle' };
            }
            
            const hoje = new Date();
            hoje.setHours(0, 0, 0, 0);
            const vencimento = new Date(boleto.dataVencimento + 'T00:00:00');
            
            if (vencimento < hoje) {
                return { texto: 'Vencido', classe: 'is-danger', icone: 'fa-exclamation-circle' };
            }
            
            return { texto: 'Pendente', classe: 'is-warning', icone: 'fa-clock' };
        }

        function atualizarDashboard() {
            let totalPagos = 0;
            let totalPendentes = 0;
            let totalVencidos = 0;
            let countPagos = 0;
            let countPendentes = 0;
            let countVencidos = 0;

            boletos.forEach(boleto => {
                const status = getStatusBoleto(boleto);
                if (status.texto === 'Pago') {
                    totalPagos += boleto.valor;
                    countPagos++;
                } else if (status.texto === 'Vencido') {
                    totalVencidos += boleto.valor;
                    countVencidos++;
                } else {
                    totalPendentes += boleto.valor;
                    countPendentes++;
                }
            });

            document.getElementById('metricTotal').textContent = boletos.length;
            document.getElementById('metricPagos').textContent = formatarMoeda(totalPagos);
            document.getElementById('metricPendentes').textContent = formatarMoeda(totalPendentes);
            document.getElementById('metricVencidos').textContent = formatarMoeda(totalVencidos);

            atualizarGraficos(countPagos, countPendentes, countVencidos, totalPagos, totalPendentes, totalVencidos);
        }

        function atualizarGraficos(countPagos, countPendentes, countVencidos, totalPagos, totalPendentes, totalVencidos) {
            const ctxStatus = document.getElementById('chartStatus').getContext('2d');
            if (chartStatus) chartStatus.destroy();
            
            chartStatus = new Chart(ctxStatus, {
                type: 'doughnut',
                data: {
                    labels: ['Pagos', 'Pendentes', 'Vencidos'],
                    datasets: [{
                        data: [countPagos, countPendentes, countVencidos],
                        backgroundColor: ['#48c774', '#ffdd57', '#f14668'],
                        borderWidth: 0
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom'
                        }
                    }
                }
            });

            const ctxValores = document.getElementById('chartValores').getContext('2d');
            if (chartValores) chartValores.destroy();
            
            chartValores = new Chart(ctxValores, {
                type: 'bar',
                data: {
                    labels: ['Pagos', 'Pendentes', 'Vencidos'],
                    datasets: [{
                        label: 'Valor Total (R$)',
                        data: [totalPagos, totalPendentes, totalVencidos],
                        backgroundColor: ['#48c774', '#ffdd57', '#f14668'],
                        borderRadius: 5
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            display: false
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: {
                                callback: function(value) {
                                    return 'R$ ' + value.toFixed(2);
                                }
                            }
                        }
                    }
                }
            });
        }

        function renderizarBoletos() {
            const lista = document.getElementById('listaBoletos');
            const total = document.getElementById('totalBoletos');
            
            total.textContent = `${boletosFiltrados.length} ${boletosFiltrados.length === 1 ? 'boleto' : 'boletos'}`;
            
            if (boletosFiltrados.length === 0) {
                lista.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p class="subtitle">Nenhum boleto encontrado</p>
                        <p>Tente ajustar os filtros ou adicione novos boletos</p>
                    </div>
                `;
                return;
            }

            lista.innerHTML = boletosFiltrados.map((boleto) => {
                const index = boletos.indexOf(boleto);
                const status = getStatusBoleto(boleto);
                let classeItem = '';
                
                if (boleto.dataPagamento) {
                    classeItem = 'boleto-pago';
                } else if (status.texto === 'Vencido') {
                    classeItem = 'boleto-vencido';
                } else if (boleto.statusBoleto === 'aguardando') {
                    classeItem = 'boleto-aguardando';
                } else {
                    const hoje = new Date();
                    hoje.setHours(0, 0, 0, 0);
                    const vencimento = new Date(boleto.dataVencimento + 'T00:00:00');
                    const diffDays = Math.ceil((vencimento - hoje) / (1000 * 60 * 60 * 24));
                    
                    if (diffDays <= 2 && diffDays >= 0) {
                        classeItem = 'boleto-alerta';
                    }
                }
                
                const statusBoletoTexto = boleto.statusBoleto === 'aguardando' ? 
                    '<span class="tag is-light is-small ml-2"><i class="fas fa-hourglass-half mr-1"></i> Aguardando</span>' : '';
                
                const codigoBarrasHtml = boleto.codigoBarras ? 
                    `<div class="boleto-campo">
                        <strong>CÓDIGO DE BARRAS</strong>
                        <span class="barcode-display">${boleto.codigoBarras}</span>
                    </div>` : '';
                
                return `
                    <div class="box boleto-item ${classeItem} mb-3">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 250px;">
                                <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 1rem;">
                                    <span class="tag ${status.classe} status-badge">
                                        <i class="fas ${status.icone}"></i> ${status.texto}
                                    </span>
                                    ${statusBoletoTexto}
                                </div>
                                
                                <div class="boleto-info">
                                    <div class="boleto-campo">
                                        <strong>EMPRESA</strong>
                                        <span>${boleto.empresa}</span>
                                    </div>
                                    
                                    <div class="boleto-campo">
                                        <strong>VALOR</strong>
                                        <span class="has-text-weight-bold">${formatarMoeda(boleto.valor)}</span>
                                    </div>
                                    
                                    <div class="boleto-campo">
                                        <strong>VENCIMENTO</strong>
                                        <span>${formatarData(boleto.dataVencimento)}</span>
                                    </div>
                                    
                                    ${boleto.dataPagamento ? `
                                    <div class="boleto-campo">
                                        <strong>PAGAMENTO</strong>
                                        <span class="has-text-success">${formatarData(boleto.dataPagamento)}</span>
                                    </div>
                                    ` : ''}
                                    
                                    ${codigoBarrasHtml}
                                </div>
                            </div>
                            
                            <div class="boleto-actions no-print">
                                <button class="button is-info is-small" onclick="editarBoletoNaLista(${index})" title="Editar">
                                    <span class="icon">
                                        <i class="fas fa-edit"></i>
                                    </span>
                                </button>
                                <button class="button is-danger is-small" onclick="excluirBoleto(${index})" title="Excluir">
                                    <span class="icon">
                                        <i class="fas fa-trash"></i>
                                    </span>
                                </button>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');
        }

        function editarBoletoNaLista(index) {
            mudarAba('cadastro');
            editarBoleto(index);
        }

        function editarBoleto(index) {
            editandoIndex = index;
            const boleto = boletos[index];
            
            document.getElementById('editIndex').value = index;
            document.getElementById('empresa').value = boleto.empresa;
            document.getElementById('valor').value = boleto.valor;
            document.getElementById('dataVencimento').value = boleto.dataVencimento;
            document.getElementById('dataPagamento').value = boleto.dataPagamento || '';
            document.getElementById('statusBoleto').value = boleto.statusBoleto || 'recebido';
            document.getElementById('codigoBarras').value = boleto.codigoBarras || '';
            
            document.getElementById('formTitle').textContent = 'Editar Boleto';
            document.getElementById('btnText').textContent = 'Atualizar Boleto';
            document.getElementById('cancelEditBtn').style.display = 'block';
            
            document.getElementById('boletoForm').scrollIntoView({ behavior: 'smooth' });
        }

        function cancelarEdicao() {
            editandoIndex = -1;
            document.getElementById('editIndex').value = '-1';
            document.getElementById('boletoForm').reset();
            document.getElementById('formTitle').textContent = 'Adicionar Novo Boleto';
            document.getElementById('btnText').textContent = 'Salvar Boleto';
            document.getElementById('cancelEditBtn').style.display = 'none';
        }

        function excluirBoleto(index) {
            if (confirm('Deseja realmente excluir este boleto?')) {
                boletos.splice(index, 1);
                salvarBoletos();
                aplicarFiltroPeriodo();
                atualizarDashboard();
                verificarAlertas();
            }
        }

        function exportarCSV() {
            if (boletos.length === 0) {
                alert('Não há boletos para exportar!');
                return;
            }

            const csv = [
                ['Empresa', 'Valor', 'Data Vencimento', 'Data Pagamento', 'Status Boleto', 'Código de Barras', 'Status'],
                ...boletos.map(b => [
                    b.empresa,
                    b.valor.toFixed(2).replace('.', ','),
                    b.dataVencimento,
                    b.dataPagamento || '',
                    b.statusBoleto || 'recebido',
                    b.codigoBarras || '',
                    getStatusBoleto(b).texto
                ])
            ].map(row => row.join(';')).join('\n');

            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `boletos_${new Date().toISOString().split('T')[0]}.csv`;
            link.click();
        }

        function exportarExcel() {
            if (boletos.length === 0) {
                alert('Não há boletos para exportar!');
                return;
            }

            const dados = boletos.map(b => ({
                'Empresa': b.empresa,
                'Valor': b.valor,
                'Data Vencimento': b.dataVencimento,
                'Data Pagamento': b.dataPagamento || '',
                'Status Boleto': b.statusBoleto || 'recebido',
                'Código de Barras': b.codigoBarras || '',
                'Status': getStatusBoleto(b).texto
            }));

            const ws = XLSX.utils.json_to_sheet(dados);
            const wb = XLSX.utils.book_new();
            XLSX.utils.book_append_sheet(wb, ws, 'Boletos');
            XLSX.writeFile(wb, `boletos_${new Date().toISOString().split('T')[0]}.xlsx`);
        }

        function importarCSV(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const text = e.target.result;
                    const lines = text.split('\n');
                    
                    const novos = [];
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const valores = lines[i].split(';');
                        if (valores.length >= 3) {
                            novos.push({
                                empresa: valores[0].trim(),
                                valor: parseFloat(valores[1].replace(',', '.')),
                                dataVencimento: valores[2].trim(),
                                dataPagamento: valores[3] ? valores[3].trim() : null,
                                statusBoleto: valores[4] ? valores[4].trim() : 'recebido',
                                codigoBarras: valores[5] ? valores[5].trim() : ''
                            });
                        }
                    }
                    
                    if (confirm(`Importar ${novos.length} boletos? Isso irá adicionar aos boletos existentes.`)) {
                        boletos.push(...novos);
                        salvarBoletos();
                        aplicarFiltroPeriodo();
                        atualizarDashboard();
                        verificarAlertas();
                        alert(`✅ ${novos.length} boletos importados com sucesso!`);
                    }
                } catch (error) {
                    alert('❌ Erro ao importar CSV: ' + error.message);
                }
                event.target.value = '';
            };
            reader.readAsText(file);
        }

        function importarExcel(event) {
            const file = event.target.files[0];
            if (!file) return;

            const reader = new FileReader();
            reader.onload = function(e) {
                try {
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
                    const jsonData = XLSX.utils.sheet_to_json(firstSheet);
                    
                    const novos = jsonData.map(row => ({
                        empresa: row.Empresa || row.empresa || '',
                        valor: parseFloat(row.Valor || row.valor || 0),
                        dataVencimento: row['Data Vencimento'] || row.dataVencimento || row['Data_Vencimento'] || '',
                        dataPagamento: row['Data Pagamento'] || row.dataPagamento || row['Data_Pagamento'] || null,
                        statusBoleto: row['Status Boleto'] || row.statusBoleto || row['Status_Boleto'] || 'recebido',
                        codigoBarras: row['Código de Barras'] || row.codigoBarras || row['Codigo_Barras'] || ''
                    }));
                    
                    if (confirm(`Importar ${novos.length} boletos? Isso irá adicionar aos boletos existentes.`)) {
                        boletos.push(...novos);
                        salvarBoletos();
                        aplicarFiltroPeriodo();
                        atualizarDashboard();
                        verificarAlertas();
                        alert(`✅ ${novos.length} boletos importados com sucesso!`);
                    }
                } catch (error) {
                    alert('❌ Erro ao importar Excel: ' + error.message);
                }
                event.target.value = '';
            };
            reader.readAsArrayBuffer(file);
        }

        document.getElementById('boletoForm').addEventListener('submit', function(e) {
            e.preventDefault();
            
            const novoBoleto = {
                empresa: document.getElementById('empresa').value,
                valor: parseFloat(document.getElementById('valor').value),
                dataVencimento: document.getElementById('dataVencimento').value,
                dataPagamento: document.getElementById('dataPagamento').value || null,
                statusBoleto: document.getElementById('statusBoleto').value,
                codigoBarras: document.getElementById('codigoBarras').value || ''
            };
            
            const editIndex = parseInt(document.getElementById('editIndex').value);
            
            if (editIndex >= 0) {
                boletos[editIndex] = novoBoleto;
            } else {
                boletos.push(novoBoleto);
            }
            
            salvarBoletos();
            aplicarFiltroPeriodo();
            atualizarDashboard();
            verificarAlertas();
            cancelarEdicao();
            
            const btn = this.querySelector('button[type="submit"]');
            const textoOriginal = btn.innerHTML;
            btn.innerHTML = '<span class="icon"><i class="fas fa-check"></i></span><span>Salvo!</span>';
            btn.classList.add('is-success');
            
            setTimeout(() => {
                btn.innerHTML = textoOriginal;
                btn.classList.remove('is-success');
            }, 2000);
        });

        window.addEventListener('DOMContentLoaded', carregarBoletos);
        
        setInterval(verificarAlertas, 60000);

        // SUPORTE PARA LEITOR FÍSICO DE CÓDIGO DE BARRAS (USB)
        document.addEventListener('keypress', function(e) {
            // Se estiver em um campo de texto que não seja o de código de barras, ignora
            const campoAtivo = document.activeElement;
            if (campoAtivo && campoAtivo.tagName === 'INPUT' && campoAtivo.id !== 'codigoBarras' && campoAtivo.type === 'text') {
                return;
            }

            // Cancela o timer anterior
            if (timerScanner) {
                clearTimeout(timerScanner);
            }

            // Adiciona o caractere ao buffer
            if (e.key && e.key.length === 1) {
                bufferScanner += e.key;
            }

            // Define um timer para processar o código (scanners são muito rápidos, < 100ms entre caracteres)
            timerScanner = setTimeout(function() {
                if (bufferScanner.length >= 10) { // Código de barras tem pelo menos 10 dígitos
                    processarCodigoScanner(bufferScanner);
                }
                bufferScanner = '';
            }, 100);
        });

        function processarCodigoScanner(codigo) {
            // Remove espaços e caracteres especiais
            codigo = codigo.trim().replace(/[^0-9]/g, '');
            
            if (codigo.length < 10) return; // Código muito curto
            
            console.log('📦 Código detectado pelo scanner:', codigo);
            
            // Verifica se está na aba de cadastro
            const abaCadastro = document.getElementById('tab-cadastro');
            if (abaCadastro && abaCadastro.style.display !== 'none') {
                // Preenche o campo de código de barras
                document.getElementById('codigoBarras').value = codigo;
                
                // Feedback visual e sonoro
                mostrarNotificacao('✅ Código escaneado com sucesso!', 'success', codigo);
                
                // Vibrar se disponível
                if (navigator.vibrate) {
                    navigator.vibrate(200);
                }
                
                // Destaca o campo temporariamente
                const campo = document.getElementById('codigoBarras');
                campo.style.background = '#48c774';
                campo.style.color = 'white';
                setTimeout(() => {
                    campo.style.background = '';
                    campo.style.color = '';
                }, 1000);
            } else {
                // Se não está na aba de cadastro, busca o boleto
                const encontrado = boletos.find(b => b.codigoBarras === codigo);
                
                if (encontrado) {
                    const index = boletos.indexOf(encontrado);
                    
                    // Vai para a aba de lista
                    mudarAba('lista');
                    document.getElementById('filtroPeriodo').value = 'todos';
                    aplicarFiltroPeriodo();
                    
                    // Destaca o boleto
                    setTimeout(() => {
                        const boletoElement = document.querySelectorAll('.boleto-item')[boletosFiltrados.indexOf(encontrado)];
                        if (boletoElement) {
                            boletoElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                            boletoElement.style.animation = 'pulse 1s ease-in-out 3';
                        }
                    }, 300);
                    
                    mostrarNotificacao(
                        `✅ Boleto encontrado!<br><strong>${encontrado.empresa}</strong><br>${formatarMoeda(encontrado.valor)}`,
                        'success'
                    );
                } else {
                    mostrarNotificacao(
                        `❌ Boleto não encontrado!<br>Código: ${codigo}<br>Deseja cadastrar?`,
                        'warning',
                        codigo,
                        true
                    );
                }
            }
        }

        function mostrarNotificacao(mensagem, tipo = 'info', codigo = '', comBotao = false) {
            const notification = document.createElement('div');
            notification.className = `notification is-${tipo}`;
            notification.style.cssText = 'position: fixed; top: 20px; right: 20px; z-index: 9999; max-width: 400px; box-shadow: 0 10px 30px rgba(0,0,0,0.3);';
            
            notification.innerHTML = `
                <button class="delete" onclick="this.parentElement.remove()"></button>
                <div style="display: flex; align-items: center; gap: 1rem;">
                    <i class="fas ${tipo === 'success' ? 'fa-check-circle' : tipo === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle'} fa-2x"></i>
                    <div style="flex: 1;">
                        ${mensagem}
                        ${codigo ? `<div class="barcode-display mt-2">${codigo}</div>` : ''}
                    </div>
                </div>
                ${comBotao ? `
                    <div style="margin-top: 1rem;">
                        <button class="button is-primary is-fullwidth" onclick="cadastrarComCodigo('${codigo}')">
                            <span class="icon"><i class="fas fa-plus"></i></span>
                            <span>Cadastrar Boleto</span>
                        </button>
                    </div>
                ` : ''}
            `;
            
            document.body.appendChild(notification);
            
            if (!comBotao) {
                setTimeout(() => {
                    if (notification.parentElement) {
                        notification.remove();
                    }
                }, 5000);
            }
        }

        function cadastrarComCodigo(codigo) {
            // Remove todas as notificações
            document.querySelectorAll('.notification').forEach(n => n.remove());
            
            // Vai para aba de cadastro
            mudarAba('cadastro');
            
            // Preenche o código
            document.getElementById('codigoBarras').value = codigo;
            
            // Foca no primeiro campo
            document.getElementById('empresa').focus();
        }

        function ativarModoLeituraRapida() {
            const mensagem = `
                <div style="text-align: left;">
                    <h3 class="title is-5 mb-3">
                        <i class="fas fa-bolt mr-2"></i> Modo Leitura Rápida Ativado!
                    </h3>
                    <p class="mb-2"><strong>Como usar:</strong></p>
                    <ol style="margin-left: 1.5rem; margin-bottom: 1rem;">
                        <li>Vá para a aba "Cadastrar"</li>
                        <li>Pressione <kbd>F2</kbd> ou clique no campo de código</li>
                        <li>Use seu leitor físico USB nos boletos</li>
                        <li>O sistema detectará automaticamente</li>
                    </ol>
                    <p class="help">
                        <i class="fas fa-lightbulb"></i> 
                        <strong>Dica:</strong> Você pode escanear vários boletos seguidos. 
                        O sistema identificará automaticamente se o boleto já está cadastrado.
                    </p>
                </div>
            `;
            
            const modal = document.createElement('div');
            modal.className = 'modal is-active';
            modal.innerHTML = `
                <div class="modal-background" onclick="this.parentElement.remove()"></div>
                <div class="modal-card" style="max-width: 600px;">
                    <header class="modal-card-head" style="background: linear-gradient(135deg, #48c774 0%, #3cd366 100%);">
                        <p class="modal-card-title" style="color: white;">
                            <i class="fas fa-usb mr-2"></i> Instruções - Leitor Físico USB
                        </p>
                        <button class="delete" aria-label="close" onclick="this.closest('.modal').remove()"></button>
                    </header>
                    <section class="modal-card-body">
                        ${mensagem}
                        <div class="notification is-info is-light">
                            <i class="fas fa-info-circle mr-2"></i>
                            <strong>Compatível com:</strong> 
                            Leitores USB/Bluetooth que emulam teclado (maioria dos modelos)
                        </div>
                    </section>
                    <footer class="modal-card-foot" style="justify-content: space-between;">
                        <button class="button" onclick="this.closest('.modal').remove()">Fechar</button>
                        <button class="button is-primary" onclick="this.closest('.modal').remove(); mudarAba('cadastro'); setTimeout(() => document.getElementById('codigoBarras').focus(), 200);">
                            <span class="icon"><i class="fas fa-rocket"></i></span>
                            <span>Começar Agora</span>
                        </button>
                    </footer>
                </div>
            `;
            
            document.body.appendChild(modal);
        }

        // Atalho para focar no campo de código de barras (F2)
        document.addEventListener('keydown', function(e) {
            if (e.key === 'F2') {
                e.preventDefault();
                const campo = document.getElementById('codigoBarras');
                if (campo) {
                    mudarAba('cadastro');
                    setTimeout(() => {
                        campo.focus();
                        campo.select();
                        mostrarNotificacao('💡 Campo de código de barras ativado!<br>Pronto para escanear com leitor físico.', 'info');
                    }, 100);
                }
            }
        });

        // Feedback visual quando o campo de código está focado
        document.addEventListener('DOMContentLoaded', function() {
            const campoCodigoBarras = document.getElementById('codigoBarras');
            
            if (campoCodigoBarras) {
                campoCodigoBarras.addEventListener('focus', function() {
                    this.classList.add('scanner-ready');
                    this.placeholder = '⚡ PRONTO! Use o leitor físico ou digite...';
                });
                
                campoCodigoBarras.addEventListener('blur', function() {
                    this.classList.remove('scanner-ready');
                    this.placeholder = 'Digite, escaneie com câmera ou use leitor físico USB';
                });
            }
        });
    