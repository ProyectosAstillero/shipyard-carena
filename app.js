// Módulo Controlador Principal de la Aplicación (app.js)
import { ShipyardState } from './state.js';
import { ShipyardVisualizer } from './visualizer.js';

class ShipyardApp {
  constructor() {
    this.state = new ShipyardState();
    
    // Si la base de datos está vacía, inicializar datos por defecto
    if (this.state.getBoats().length === 0) {
      this.state.resetToDefault();
    }

    this.selectedBoat = null;
    
    // Instanciar visualizador
    this.visualizer = new ShipyardVisualizer(
      this.state,
      this.handleBoatSelected.bind(this),
      this.handleBoatMoved.bind(this),
      this.showToast.bind(this)
    );

    // Inicializar manejadores de eventos
    this.initEvents();
    
    // Primera carga
    this.refreshAll();
  }

  // Inicializar todos los oyentes de eventos DOM
  initEvents() {
    // 1. Manejo de pestañas del panel lateral (Inspector, Registro, Bitácora)
    const tabBtns = document.querySelectorAll('.tab-btn');
    tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        tabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.dataset.tab;
        document.getElementById(tabId).classList.add('active');

        // Si se cambia a la bitácora, actualizar buscador
        if (tabId === 'tab-registro') {
          this.renderHistory();
        }
      });
    });

    // 2. Formulario de registro de barco nuevo
    const newForm = document.getElementById('new-boat-form');
    newForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleRegisterNewBoat();
    });

    // Selector de colores del barco nuevo
    const colorOptions = document.querySelectorAll('#new-color-selector .color-option');
    colorOptions.forEach(opt => {
      opt.addEventListener('click', () => {
        colorOptions.forEach(o => o.classList.remove('selected'));
        opt.classList.add('selected');
      });
    });

    // 3. Modal de edición
    const editModal = document.getElementById('edit-boat-modal');
    const editForm = document.getElementById('edit-boat-form');
    const btnCloseModal = document.getElementById('btn-close-modal');

    // Cerrar modal
    btnCloseModal.addEventListener('click', () => {
      editModal.classList.remove('active');
    });

    editModal.addEventListener('click', (e) => {
      if (e.target === editModal) {
        editModal.classList.remove('active');
      }
    });

    // Enviar edición
    editForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSaveEdition();
    });

    // 4. Buscador de logs
    const logSearch = document.getElementById('log-search');
    logSearch.addEventListener('input', () => {
      this.renderHistory(logSearch.value);
    });

    // 5. Botón de restablecimiento
    const btnReset = document.getElementById('btn-clear-db');
    btnReset.addEventListener('click', () => {
      if (confirm('¿Está seguro de que desea restablecer el astillero? Se perderán todos los cambios actuales.')) {
        this.state.resetToDefault();
        this.selectedBoat = null;
        this.refreshAll();
        this.showToast('Base de datos restablecida a los valores de prueba.', 'warning');
      }
    });

    // 6. Click fuera de barcos para deseleccionar
    document.addEventListener('click', (e) => {
      const isBoat = e.target.closest('.boat-vessel');
      const isModal = e.target.closest('#edit-boat-modal');
      const isTab = e.target.closest('.sidebar-tabs');
      const isInspector = e.target.closest('#tab-inspector');
      
      if (!isBoat && !isModal && !isTab && !isInspector) {
        this.deselectBoat();
      }
    });
  }

  // Refrescar toda la aplicación
  refreshAll() {
    // 1. Renderizar mapa visual
    this.visualizer.render();
    
    // 2. Renderizar métricas numéricas
    this.renderStats();
    
    // 3. Renderizar barra de estado superior
    this.renderTopStatus();

    // 4. Renderizar diagrama de Gantt
    this.renderGanttChart();

    // 5. Renderizar Inspector
    this.renderInspector();

    // 6. Renderizar Bitácora
    this.renderHistory();

    // Actualizar iconos Lucide
    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  // Actualizar métricas del dashboard
  renderStats() {
    const stats = this.state.getStats();
    
    document.getElementById('stat-active').textContent = stats.totalActive;
    document.getElementById('stat-waiting').textContent = stats.waiting;
    document.getElementById('stat-occupancy').textContent = `${stats.occupied}/${stats.capacity}`;
    document.getElementById('stat-efficiency').textContent = `${stats.occupancyPercentage}%`;
  }

  // Renderizar la barra rápida de estado superior
  renderTopStatus() {
    const bar = document.getElementById('lane-status-bar');
    bar.innerHTML = '';

    // Añadir VARADA al inicio o final. Lo pondremos a la derecha para emparejar con el layout
    // Carriles del 8 al 0
    for (let i = 8; i >= 0; i--) {
      const boat = this.state.getBoatInLane(i);
      const badge = document.createElement('div');
      badge.className = `status-badge ${boat ? 'occupied' : 'free'}`;
      badge.innerHTML = `${i}<span>${boat ? 'OCUP' : 'LIBRE'}</span>`;
      
      // Acción rápida: click para inspeccionar
      if (boat) {
        badge.addEventListener('click', () => {
          this.handleBoatSelected(boat);
          this.highlightBoatInView(boat.id);
        });
      }
      bar.appendChild(badge);
    }

    // Varada
    const varadaBoat = this.state.getBoatInLane('VARADA');
    const varadaBadge = document.createElement('div');
    varadaBadge.className = `status-badge varada-status ${varadaBoat ? 'occupied' : 'free'}`;
    varadaBadge.innerHTML = `VARADA <span>${varadaBoat ? varadaBoat.name : 'LIBRE'}</span>`;
    if (varadaBoat) {
      varadaBadge.addEventListener('click', () => {
        this.handleBoatSelected(varadaBoat);
        this.highlightBoatInView(varadaBoat.id);
      });
    }
    bar.appendChild(varadaBadge);
  }

  // Generar y renderizar el Diagrama de Gantt
  renderGanttChart() {
    const body = document.getElementById('gantt-body');
    const headerRow = document.getElementById('gantt-header-row');
    
    // Limpiar
    body.innerHTML = '';
    headerRow.innerHTML = '<th>Carril / Slot</th>';

    // Generar las fechas para los próximos 15 días (eje X)
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 2); // Empezar 2 días atrás para ver ocupaciones previas
    const datesList = [];

    for (let i = 0; i < 15; i++) {
      const currentDate = new Date(startDate);
      currentDate.setDate(startDate.getDate() + i);
      datesList.push(currentDate);

      // Crear celda de cabecera
      const th = document.createElement('th');
      th.style.textAlign = 'center';
      th.style.fontSize = '0.75rem';
      th.style.padding = '6px';
      
      // Formato: "03 Jul"
      const day = String(currentDate.getDate()).padStart(2, '0');
      const months = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
      const month = months[currentDate.getMonth()];
      th.innerHTML = `${day}<br><span style="color:var(--text-dark); font-size:0.65rem;">${month}</span>`;
      
      // Resaltar el día de hoy
      const today = new Date();
      if (currentDate.getDate() === today.getDate() && currentDate.getMonth() === today.getMonth()) {
        th.style.background = 'rgba(59, 130, 246, 0.15)';
        th.style.color = 'var(--color-primary)';
      }

      headerRow.appendChild(th);
    }

    const slots = [];
    // Carriles de trabajo 1 a 8, Carril 0, VARADA
    for (let i = 8; i >= 1; i--) slots.push({ label: `Carril ${i}`, id: i, type: 'carril' });
    slots.push({ label: 'Carril 0 (Transfer)', id: 0, type: 'carril' });
    slots.push({ label: 'Varada (Cradle)', id: 'VARADA', type: 'varada' });

    // Renderizar cada fila
    slots.forEach(slot => {
      const row = document.createElement('tr');
      
      // Celda del carril
      const laneCell = document.createElement('td');
      laneCell.className = 'gantt-lane-cell';
      laneCell.textContent = slot.label;
      row.appendChild(laneCell);

      // Celda de la línea temporal
      const timelineCell = document.createElement('td');
      timelineCell.className = 'gantt-timeline-cell';
      timelineCell.colSpan = 15;
      
      // Buscar barco asignado a este slot
      const boat = this.state.getBoatInLane(slot.id);
      if (boat && boat.entryDate) {
        // Graficar la barra de Gantt
        const entry = new Date(boat.entryDate);
        const departure = boat.departureDate ? new Date(boat.departureDate) : new Date(entry.getTime() + 10 * 24 * 60 * 60 * 1000); // 10 días por defecto
        
        // Calcular índices de inicio y fin en base a datesList
        let startIndex = -1;
        let endIndex = -1;

        // Comprobar solapamiento
        const windowStart = datesList[0];
        const windowEnd = datesList[datesList.length - 1];

        if (departure >= windowStart && entry <= windowEnd) {
          // El barco se solapa con la ventana visualizada
          // Calcular la posición izquierda
          let leftDiff = (entry.getTime() - windowStart.getTime()) / (24 * 60 * 60 * 1000);
          let offsetPercent = (leftDiff / 15) * 100;
          if (offsetPercent < 0) offsetPercent = 0;

          // Calcular la duración
          let durationDays = (departure.getTime() - (entry < windowStart ? windowStart : entry).getTime()) / (24 * 60 * 60 * 1000) + 1;
          let widthPercent = (durationDays / 15) * 100;
          if (widthPercent + offsetPercent > 100) {
            widthPercent = 100 - offsetPercent;
          }

          // Crear la barra visual
          const ganttBar = document.createElement('div');
          ganttBar.className = 'gantt-bar';
          ganttBar.style.left = `${offsetPercent}%`;
          ganttBar.style.width = `${widthPercent}%`;
          ganttBar.style.backgroundColor = boat.color;
          ganttBar.style.setProperty('--boat-color-glow', boat.color);
          ganttBar.textContent = `${boat.name} (${boat.progress}%)`;
          ganttBar.title = `${boat.name} | ${boat.owner}\nEntrada: ${boat.entryDate}\nSalida: ${boat.departureDate || 'Sin programar'}`;
          
          ganttBar.addEventListener('click', () => {
            this.handleBoatSelected(boat);
            this.highlightBoatInView(boat.id);
          });

          timelineCell.appendChild(ganttBar);
        }
      }

      row.appendChild(timelineCell);
      body.appendChild(row);
    });
  }

  // Seleccionar barco en el Inspector
  handleBoatSelected(boat) {
    this.selectedBoat = boat;
    this.renderInspector();
  }

  // Deseleccionar barco
  deselectBoat() {
    this.selectedBoat = null;
    document.querySelectorAll('.boat-vessel').forEach(el => {
      el.style.border = '1px solid rgba(255,255,255,0.15)';
      el.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
    });
    this.renderInspector();
  }

  // Resaltar visualmente el barco seleccionado en el mapa
  highlightBoatInView(boatId) {
    const el = document.getElementById(boatId);
    if (el) {
      document.querySelectorAll('.boat-vessel').forEach(b => {
        b.style.border = '1px solid rgba(255,255,255,0.15)';
        b.style.boxShadow = '0 6px 16px rgba(0, 0, 0, 0.4)';
      });
      const boat = this.state.getBoatById(boatId);
      el.style.border = `2px solid ${boat.color}`;
      el.style.boxShadow = `0 0 20px ${boat.color}`;
      
      // Auto-scrollear a la vista si es necesario
      el.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'nearest' });
    }
  }

  // Callback ejecutado tras el Drag and Drop
  handleBoatMoved(boat) {
    this.showToast(`B/P ${boat.name} reubicado con éxito.`, 'success');
    
    // Si el barco trasladado era el seleccionado, refrescar inspector
    if (this.selectedBoat && this.selectedBoat.id === boat.id) {
      this.selectedBoat = this.state.getBoatById(boat.id);
    }
    
    this.refreshAll();
  }

  // Renderizar el Inspector en la columna derecha
  renderInspector() {
    const container = document.getElementById('inspector-container');
    
    if (!this.selectedBoat) {
      container.innerHTML = `
        <div class="no-boat-selected">
          <i data-lucide="mouse-pointer-click"></i>
          <p>Seleccione un barco en el mapa o en la bahía para inspeccionar detalles técnicos y operaciones.</p>
        </div>
      `;
      if (window.lucide) window.lucide.createIcons();
      return;
    }

    const boat = this.selectedBoat;
    const isCunaVarada = boat.status === 'cuna_varada';

    let locationText = 'Bahía de Espera (Mar)';
    if (boat.status === 'cuna_varada') locationText = 'Cuna de Varada (Slipway)';
    if (boat.status === 'transfer_varada') locationText = 'Transfer de Varada (Carro Superior)';
    if (boat.status === 'carril_0') locationText = 'Carril 0 (Transferencia Vertical)';
    if (boat.status === 'transfer_popa') locationText = `Transfer de Popa (Posición ${boat.lane})`;
    if (boat.status === 'carril') locationText = `Carril de Carena ${boat.lane}`;

    // Construir la lista de traslados manuales permitidos físicamente
    const moves = [
      { status: 'espera', lane: null, label: 'Bahía de Espera (Mar)' },
      { status: 'cuna_varada', lane: 'VARADA', label: 'Cuna de Varada (Slipway)' },
      { status: 'transfer_varada', lane: 'TRANSFER_VARADA', label: 'Transfer de Varada (Naranja)' },
      { status: 'carril_0', lane: 0, label: 'Carril 0 (Vertical)' },
      ...[0, 1, 2, 3, 4, 5, 6, 7, 8].map(l => ({ status: 'transfer_popa', lane: l, label: `Transfer Popa (Pos ${l})` })),
      ...[1, 2, 3, 4, 5, 6, 7, 8].map(l => ({ status: 'carril', lane: l, label: `Carril de Carena ${l}` }))
    ];

    const optionsHtml = moves.map(m => {
      const isCurrent = (boat.status === m.status && boat.lane === m.lane);
      const validation = this.state.validateMovement(boat.id, m.status, m.lane);
      
      let disabledAttr = '';
      let styleAttr = '';
      let labelSuffix = '';
      
      if (isCurrent) {
        disabledAttr = 'disabled';
        labelSuffix = ' (Actual)';
      } else if (!validation.allowed) {
        disabledAttr = 'disabled';
        styleAttr = 'style="color: #64748b;"'; // Gris apagado
        labelSuffix = ` (Bloqueado: ${validation.message})`;
      }
      
      const optionValue = `${m.status}|${m.lane !== null ? m.lane : ''}`;
      return `<option value="${optionValue}" ${disabledAttr} ${styleAttr}>${m.label}${labelSuffix}</option>`;
    }).join('');

    container.innerHTML = `
      <div class="boat-details-panel" style="--boat-color: ${boat.color}">
        
        <div class="detail-header">
          <h3>${boat.name}</h3>
          <span>Matrícula: ${boat.registration}</span>
        </div>

        <div class="detail-grid">
          <div class="detail-item">
            <label>Ubicación</label>
            <value style="color:var(--color-primary); font-weight:700;">${locationText}</value>
          </div>
          <div class="detail-item">
            <label>Tipo</label>
            <value>${boat.type}</value>
          </div>
          <div class="detail-item">
            <label>Armador / Cliente</label>
            <value>${boat.owner}</value>
          </div>
          <div class="detail-item">
            <label>TRB (Arqueo Neto)</label>
            <value>${boat.weight} Tons</value>
          </div>
          <div class="detail-item">
            <label>Eslora (Largo)</label>
            <value>${boat.length} m</value>
          </div>
          <div class="detail-item">
            <label>Manga (Ancho)</label>
            <value>${boat.beam} m</value>
          </div>
          <div class="detail-item">
            <label>Fecha Entrada</label>
            <value>${boat.entryDate}</value>
          </div>
          <div class="detail-item">
            <label>Salida Estimada</label>
            <value>${boat.departureDate || 'Sin registrar'}</value>
          </div>
        </div>

        <!-- Progreso y Barra -->
        <div style="margin: 5px 0;">
          <div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px;">
            <span style="color:var(--text-muted);">Progreso de Carena:</span>
            <span style="font-weight:700; color:var(--text-main);">${boat.progress}%</span>
          </div>
          <div class="boat-progress-bar" style="height:8px; border-radius:4px;">
            <div class="boat-progress-fill" style="width:${boat.progress}%;"></div>
          </div>
        </div>

        <!-- Notas de Mantenimiento -->
        <div style="background:rgba(255,255,255,0.01); border:1px solid rgba(255,255,255,0.03); padding:8px; border-radius:var(--radius-sm); font-size:0.8rem;">
          <span style="font-size:0.75rem; color:var(--text-muted); display:block; font-weight:600; margin-bottom:3px;">Notas de Trabajo:</span>
          <p style="color:var(--text-muted); font-style:italic;">${boat.notes || 'Sin observaciones registradas.'}</p>
        </div>

        <!-- Panel de Maniobras y Controles Manuales -->
        <div style="border-top:1px solid rgba(255,255,255,0.05); padding-top:10px; margin-top:5px;">
          <h4 style="font-family:var(--font-title); font-size:0.85rem; color:var(--text-muted); margin-bottom:8px; font-weight:600;">OPERACIONES Y TRASLADOS</h4>
          
          <div class="detail-actions">
            
            <!-- Selector de Traslados manuales (Como alternativa a Drag & Drop) -->
            <div style="display:flex; gap:6px; align-items:center;">
              <select id="select-manual-move" class="form-control" style="font-size:0.8rem; height:34px; padding:4px 8px;">
                <option value="" disabled selected>Trasladar a...</option>
                ${optionsHtml}
              </select>
              <button id="btn-manual-move" class="btn-action success" style="width:auto; height:34px; font-size:0.8rem; padding:0 12px;">Mover</button>
            </div>

            <!-- Botones de Acción directos -->
            ${isCunaVarada ? `
              <button id="btn-launch-boat" class="btn-action success">
                <i data-lucide="ship"></i>
                Realizar Botadura al Mar
              </button>
            ` : ''}

            <div style="display:flex; gap:8px;">
              <button id="btn-edit-boat" class="btn-action" style="flex:1;">
                <i data-lucide="edit-3"></i>
                Editar Ficha
              </button>
              <button id="btn-delete-boat" class="btn-action danger" style="flex:1;">
                <i data-lucide="trash-2"></i>
                Eliminar
              </button>
            </div>
          </div>
        </div>

      </div>
    `;

    // Vincular Eventos en el Inspector Renderizado
    this.bindInspectorEvents();
    if (window.lucide) window.lucide.createIcons();
  }

  // Vincular eventos de los botones internos del inspector
  bindInspectorEvents() {
    const boat = this.selectedBoat;
    if (!boat) return;

    // 1. Traslado Manual por botón
    const btnMove = document.getElementById('btn-manual-move');
    const selectMove = document.getElementById('select-manual-move');
    if (btnMove && selectMove) {
      btnMove.addEventListener('click', () => {
        const value = selectMove.value;
        if (!value) {
          this.showToast('Por favor, elija un destino válido.', 'warning');
          return;
        }

        const [targetStatus, rawLane] = value.split('|');
        let targetLane = rawLane;
        if (rawLane !== '' && rawLane !== 'VARADA' && rawLane !== 'TRANSFER_VARADA') {
          targetLane = parseInt(rawLane, 10);
        }

        const result = this.state.moveBoat(boat.id, targetStatus, targetLane);
        if (result.success) {
          this.selectedBoat = this.state.getBoatById(boat.id);
          this.handleBoatMoved(result.boat);
        } else {
          this.showToast(result.message, 'error');
        }
      });
    }

    // 2. Botadura
    const btnLaunch = document.getElementById('btn-launch-boat');
    if (btnLaunch) {
      btnLaunch.addEventListener('click', () => {
        if (confirm(`¿Confirma realizar la botadura de ${boat.name}? El carril de Varada quedará liberado.`)) {
          const result = this.state.launchBoat(boat.id);
          if (result.success) {
            this.selectedBoat = null;
            this.showToast(`¡Botadura exitosa! B/P ${boat.name} regresó a navegar.`, 'success');
            this.refreshAll();
          } else {
            this.showToast(result.message, 'error');
          }
        }
      });
    }

    // 3. Editar Ficha (Abre Modal)
    const btnEdit = document.getElementById('btn-edit-boat');
    if (btnEdit) {
      btnEdit.addEventListener('click', () => {
        this.openEditModal(boat);
      });
    }

    // 4. Eliminar del Sistema
    const btnDelete = document.getElementById('btn-delete-boat');
    if (btnDelete) {
      btnDelete.addEventListener('click', () => {
        if (confirm(`¿Está seguro de que desea eliminar a ${boat.name} del sistema? Esta acción no se puede deshacer.`)) {
          const deleted = this.state.deleteBoat(boat.id);
          if (deleted) {
            this.selectedBoat = null;
            this.showToast('Barco retirado con éxito.', 'warning');
            this.refreshAll();
          }
        }
      });
    }
  }

  // Abrir Modal de Edición e Inyectar Datos
  openEditModal(boat) {
    document.getElementById('edit-boat-id').value = boat.id;
    document.getElementById('edit-boat-name').value = boat.name;
    document.getElementById('edit-boat-reg').value = boat.registration;
    document.getElementById('edit-boat-type').value = boat.type;
    document.getElementById('edit-boat-owner').value = boat.owner;
    document.getElementById('edit-boat-length').value = boat.length;
    document.getElementById('edit-boat-beam').value = boat.beam;
    document.getElementById('edit-boat-weight').value = boat.weight;
    document.getElementById('edit-boat-progress').value = boat.progress;
    document.getElementById('edit-boat-entry').value = boat.entryDate;
    document.getElementById('edit-boat-departure').value = boat.departureDate || '';
    document.getElementById('edit-boat-notes').value = boat.notes || '';

    document.getElementById('edit-boat-modal').classList.add('active');
  }

  // Guardar Cambios de la Edición
  handleSaveEdition() {
    const id = document.getElementById('edit-boat-id').value;
    
    const updatedData = {
      name: document.getElementById('edit-boat-name').value.toUpperCase(),
      registration: document.getElementById('edit-boat-reg').value.toUpperCase(),
      type: document.getElementById('edit-boat-type').value,
      owner: document.getElementById('edit-boat-owner').value,
      length: parseFloat(document.getElementById('edit-boat-length').value) || 0,
      beam: parseFloat(document.getElementById('edit-boat-beam').value) || 0,
      weight: parseFloat(document.getElementById('edit-boat-weight').value) || 0,
      progress: parseInt(document.getElementById('edit-boat-progress').value, 10) || 0,
      entryDate: document.getElementById('edit-boat-entry').value,
      departureDate: document.getElementById('edit-boat-departure').value,
      notes: document.getElementById('edit-boat-notes').value
    };

    const updated = this.state.updateBoat(id, updatedData);
    if (updated) {
      this.selectedBoat = updated;
      document.getElementById('edit-boat-modal').classList.remove('active');
      this.showToast(`Ficha de ${updated.name} actualizada con éxito.`, 'success');
      this.refreshAll();
    } else {
      this.showToast('No se pudieron guardar los cambios en el barco.', 'error');
    }
  }

  // Registrar un Nuevo Barco en la Cola
  handleRegisterNewBoat() {
    const name = document.getElementById('new-boat-name').value;
    const registration = document.getElementById('new-boat-reg').value;
    const type = document.getElementById('new-boat-type').value;
    const owner = document.getElementById('new-boat-owner').value;
    const length = document.getElementById('new-boat-length').value;
    const beam = document.getElementById('new-boat-beam').value;
    const weight = document.getElementById('new-boat-weight').value;
    const days = parseInt(document.getElementById('new-boat-days').value, 10) || 10;
    const notes = document.getElementById('new-boat-notes').value;

    // Obtener color seleccionado
    const selectedColorEl = document.querySelector('#new-color-selector .color-option.selected');
    const color = selectedColorEl ? selectedColorEl.dataset.color : '#3b82f6';

    // Calcular fecha estimada de salida
    const entryDate = new Date().toISOString().split('T')[0];
    const depDate = new Date();
    depDate.setDate(depDate.getDate() + days);
    const departureDate = depDate.toISOString().split('T')[0];

    const newBoat = this.state.addBoat({
      name,
      registration,
      type,
      owner,
      length,
      beam,
      weight,
      entryDate,
      departureDate,
      color,
      notes
    });

    if (newBoat) {
      this.showToast(`B/P ${newBoat.name} añadido a la bahía de espera.`, 'success');
      
      // Limpiar formulario
      document.getElementById('new-boat-form').reset();
      
      // Auto-seleccionar el barco e ir a la pestaña del Inspector
      this.selectedBoat = newBoat;
      
      // Cambiar pestaña visualmente a Inspector
      document.querySelector('.tab-btn[data-tab="tab-inspector"]').click();
      
      this.refreshAll();
      this.highlightBoatInView(newBoat.id);
    } else {
      this.showToast('Error al registrar el buque.', 'error');
    }
  }

  // Renderizar la Bitácora (Historial)
  renderHistory(filterText = '') {
    const feed = document.getElementById('history-feed-container');
    feed.innerHTML = '';
    
    let history = this.state.getHistory();
    if (filterText) {
      const q = filterText.toLowerCase();
      history = history.filter(h => 
        h.boatName.toLowerCase().includes(q) || 
        h.action.toLowerCase().includes(q) || 
        h.details.toLowerCase().includes(q)
      );
    }

    if (history.length === 0) {
      feed.innerHTML = '<div style="color:var(--text-dark); text-align:center; font-style:italic; padding:2rem;">No hay registros para mostrar.</div>';
      return;
    }

    history.forEach(log => {
      const item = document.createElement('div');
      item.className = 'history-item';
      
      const badgeClass = `action-${log.action.toLowerCase().replace(/\s+/g, '-')}`;
      
      item.innerHTML = `
        <div class="history-item-header">
          <span class="history-badge ${badgeClass}">${log.action}</span>
          <span class="history-time">${log.timestamp}</span>
        </div>
        <div class="history-content">
          <span class="history-boat">${log.boatName}</span>
          <span class="history-details">${log.details}</span>
        </div>
      `;
      feed.appendChild(item);
    });
  }

  // Mostrar Toast Notification flotante
  showToast(message, type = 'success') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    
    // Icono según tipo
    let iconName = 'check-circle';
    if (type === 'warning') iconName = 'alert-triangle';
    if (type === 'error') iconName = 'alert-octagon';

    toast.innerHTML = `
      <div style="display:flex; align-items:center; gap:8px;">
        <i data-lucide="${iconName}"></i>
        <span class="toast-message">${message}</span>
      </div>
      <button class="toast-close">&times;</button>
    `;

    container.appendChild(toast);
    
    // Forzar reflow para animación
    setTimeout(() => toast.classList.add('active'), 10);
    
    if (window.lucide) window.lucide.createIcons();

    // Evento de cierre
    const closeBtn = toast.querySelector('.toast-close');
    closeBtn.addEventListener('click', () => {
      toast.classList.remove('active');
      setTimeout(() => toast.remove(), 300);
    });

    // Auto-cierre tras 4 segundos
    setTimeout(() => {
      if (toast.parentNode) {
        toast.classList.remove('active');
        setTimeout(() => toast.remove(), 300);
      }
    }, 4000);
  }
}

// Inicializar la aplicación al cargar la ventana
window.addEventListener('DOMContentLoaded', () => {
  new ShipyardApp();
});
