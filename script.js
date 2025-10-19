
        let boletos = [];
        let editandoIndex = -1;
        let chartStatus = null;
        let chartValores = null;

        function mudarAba(aba) {
            // Esconder todas as abas
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.style.display = 'none';
            }); 
            
            // Remover classe active de todas as tabs
            document.querySelectorAll('.tabs li').forEach(li => {
                li.classList.remove('is-active');
            });
            
            // Mostrar aba selecionada
            document.getElementById(`tab-${aba}`).style.display = 'block';
            document.querySelector(`[data-tab="${aba}"]`).classList.add('is-active');
            
            // Atualizar dashboard se for a aba dashboard
            if (aba === 'dashboard') {
                atualizarDashboard();
            }
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
                    console.log('✅ Boletos carregados:', boletos);
                } else {
                    boletos = [];
                    console.log('ℹ️ Nenhum boleto salvo anteriormente');
                }
            } catch (e) {
                console.error('❌ Erro ao carregar:', e);
                boletos = [];
            }
            renderizarBoletos();
            atualizarDashboard();
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
            // Gráfico de Status (Pizza)
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

            // Gráfico de Valores (Barras)
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
            
            total.textContent = `${boletos.length} ${boletos.length === 1 ? 'boleto' : 'boletos'}`;
            
            if (boletos.length === 0) {
                lista.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-inbox"></i>
                        <p class="subtitle">Nenhum boleto cadastrado</p>
                        <p>Adicione seu primeiro boleto ou importe um arquivo</p>
                    </div>
                `;
                return;
            }

            lista.innerHTML = boletos.map((boleto, index) => {
                const status = getStatusBoleto(boleto);
                const classeItem = boleto.dataPagamento ? 'boleto-pago' : 
                                  (status.texto === 'Vencido' ? 'boleto-vencido' : '');
                
                return `
                    <div class="box boleto-item ${classeItem} mb-3">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start; gap: 1rem; flex-wrap: wrap;">
                            <div style="flex: 1; min-width: 250px;">
                                <span class="tag ${status.classe} status-badge mb-3">
                                    <i class="fas ${status.icone}"></i> ${status.texto}
                                </span>
                                
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
                                </div>
                            </div>
                            
                            <div class="boleto-actions">
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
                renderizarBoletos();
                atualizarDashboard();
            }
        }

        function exportarCSV() {
            if (boletos.length === 0) {
                alert('Não há boletos para exportar!');
                return;
            }

            const csv = [
                ['Empresa', 'Valor', 'Data Vencimento', 'Data Pagamento', 'Status'],
                ...boletos.map(b => [
                    b.empresa,
                    b.valor.toFixed(2).replace('.', ','),
                    b.dataVencimento,
                    b.dataPagamento || '',
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
                    const headers = lines[0].split(';');
                    
                    const novos = [];
                    for (let i = 1; i < lines.length; i++) {
                        if (!lines[i].trim()) continue;
                        
                        const valores = lines[i].split(';');
                        if (valores.length >= 3) {
                            novos.push({
                                empresa: valores[0].trim(),
                                valor: parseFloat(valores[1].replace(',', '.')),
                                dataVencimento: valores[2].trim(),
                                dataPagamento: valores[3] ? valores[3].trim() : null
                            });
                        }
                    }
                    
                    if (confirm(`Importar ${novos.length} boletos? Isso irá adicionar aos boletos existentes.`)) {
                        boletos.push(...novos);
                        salvarBoletos();
                        renderizarBoletos();
                        atualizarDashboard();
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
                        dataPagamento: row['Data Pagamento'] || row.dataPagamento || row['Data_Pagamento'] || null
                    }));
                    
                    if (confirm(`Importar ${novos.length} boletos? Isso irá adicionar aos boletos existentes.`)) {
                        boletos.push(...novos);
                        salvarBoletos();
                        renderizarBoletos();
                        atualizarDashboard();
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
                dataPagamento: document.getElementById('dataPagamento').value || null
            };
            
            const editIndex = parseInt(document.getElementById('editIndex').value);
            
            if (editIndex >= 0) {
                boletos[editIndex] = novoBoleto;
            } else {
                boletos.push(novoBoleto);
            }
            
            salvarBoletos();
            renderizarBoletos();
            atualizarDashboard();
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
    