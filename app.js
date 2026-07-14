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
    this.selectedJuntaBoatId = "custom";
    this.isListening = false;
    this.recognition = null;
    this.currentEditActivityIndex = -1;
    
    // Instanciar visualizador
    this.visualizer = new ShipyardVisualizer(
      this.state,
      this.handleBoatSelected.bind(this),
      this.handleBoatMoved.bind(this),
      this.showToast.bind(this)
    );

    // Inicializar manejadores de eventos
    this.initEvents();
    
    // Inicializar Speech Recognition
    this.initVoice();

    // Primera carga
    this.refreshAll();
  }

  // Inicializar todos los oyentes de eventos DOM
  initEvents() {
    // 0. Manejo de pestañas principales (Astillero vs Junta de Casco)
    const mainTabBtns = document.querySelectorAll('.nav-tab-btn');
    mainTabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        mainTabBtns.forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.main-tab-content').forEach(c => c.classList.remove('active'));
        
        btn.classList.add('active');
        const tabId = btn.dataset.mainTab;
        document.getElementById(`tab-content-${tabId}`).classList.add('active');

        // Si se cambia a Junta de Casco, refrescar
        if (tabId === 'juntacasco') {
          this.refreshJuntaCasco();
        }
      });
    });

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
    if (newForm) {
      newForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleRegisterNewBoat();
      });
    }

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
    if (btnCloseModal) {
      btnCloseModal.addEventListener('click', () => {
        editModal.classList.remove('active');
      });
    }

    if (editModal) {
      editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
          editModal.classList.remove('active');
        }
      });
    }

    // Enviar edición
    if (editForm) {
      editForm.addEventListener('submit', (e) => {
        e.preventDefault();
        this.handleSaveEdition();
      });
    }

    // 4. Buscador de logs
    const logSearch = document.getElementById('log-search');
    if (logSearch) {
      logSearch.addEventListener('input', () => {
        this.renderHistory(logSearch.value);
      });
    }

    // 5. Botón de restablecimiento
    const btnReset = document.getElementById('btn-clear-db');
    if (btnReset) {
      btnReset.addEventListener('click', () => {
        if (confirm('¿Está seguro de que desea restablecer el astillero? Se perderán todos los cambios actuales.')) {
          this.state.resetToDefault();
          this.selectedBoat = null;
          this.refreshAll();
          this.showToast('Base de datos restablecida a los valores de prueba.', 'warning');
        }
      });
    }

    // 6. Click fuera de barcos para deseleccionar
    document.addEventListener('click', (e) => {
      const isBoat = e.target.closest('.boat-vessel');
      const isModal = e.target.closest('#edit-boat-modal');
      const isTab = e.target.closest('.sidebar-tabs');
      const isInspector = e.target.closest('#tab-inspector');
      const isNavbar = e.target.closest('.main-navbar');
      const isActivityModal = e.target.closest('#edit-activity-modal');
      const isHelpModal = e.target.closest('#voice-help-modal');
      
      if (!isBoat && !isModal && !isTab && !isInspector && !isNavbar && !isActivityModal && !isHelpModal) {
        this.deselectBoat();
      }
    });

    // ==========================================
    // EVENTOS DE JUNTA DE CASCO
    // ==========================================
    
    // A. Selector de barco
    const vesselSelect = document.getElementById('vessel-select');
    if (vesselSelect) {
      vesselSelect.addEventListener('change', (e) => {
        this.selectedJuntaBoatId = e.target.value;
        this.loadJuntaVesselData();
        this.renderJuntaActivities();
      });
    }

    // B. Cambios manuales en los inputs de vessel info
    [
      document.getElementById('vessel-name'),
      document.getElementById('vessel-id'),
      document.getElementById('vessel-shipyard'),
      document.getElementById('vessel-date')
    ].forEach(elem => {
      if (elem) {
        elem.addEventListener('input', () => {
          this.syncJuntaToShipyardBoat();
        });
      }
    });

    // C. Carga de plantillas
    const vesselTemplate = document.getElementById('vessel-template');
    if (vesselTemplate) {
      vesselTemplate.addEventListener('change', (e) => {
        const val = e.target.value;
        if (!val) return;

        const currentActivities = this.getJuntaActivities();
        if (currentActivities.length > 0 && val !== 'vacio') {
          if (confirm('¿Está seguro que desea cargar esta plantilla? Esto sobrescribirá las actividades actuales.')) {
            this.loadJuntaTemplate(val);
          } else {
            vesselTemplate.value = '';
          }
        } else {
          this.loadJuntaTemplate(val);
        }
      });
    }

    // D. Control de Micrófono
    const btnMic = document.getElementById('btn-mic');
    if (btnMic) {
      btnMic.addEventListener('click', () => {
        if (this.isListening) {
          this.stopListening();
        } else {
          this.startListening();
        }
      });
    }

    // E. Agregar actividad
    const btnAddVoice = document.getElementById('btn-add-voice');
    if (btnAddVoice) {
      btnAddVoice.addEventListener('click', () => {
        const preview = document.getElementById('transcription-preview');
        const desc = preview ? preview.textContent.trim() : '';
        if (!desc) {
          this.showToast('Por favor dicte o escriba una actividad primero.', 'warning');
          return;
        }

        const cat = document.getElementById('voice-category').value;
        const pri = document.getElementById('voice-priority').value;

        this.addJuntaActivity(desc, cat, pri);

        // Limpiar campos
        preview.textContent = '';
        preview.classList.remove('has-text');
        document.getElementById('voice-category').value = 'Otros';
        document.getElementById('voice-priority').value = 'Media';
      });
    }

    // Enter en transcription preview
    const preview = document.getElementById('transcription-preview');
    if (preview) {
      preview.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          btnAddVoice.click();
        }
      });
    }

    // F. Limpiar lista de junta
    const btnClearJunta = document.getElementById('btn-clear-junta');
    if (btnClearJunta) {
      btnClearJunta.addEventListener('click', () => {
        const activities = this.getJuntaActivities();
        if (activities.length === 0) {
          this.showToast('La lista ya está vacía', 'info');
          return;
        }
        if (confirm('¿Está seguro de que desea eliminar TODAS las actividades registradas? Esta acción no se puede deshacer.')) {
          this.saveJuntaActivities([]);
          this.renderJuntaActivities();
          this.showToast('Se han eliminado todas las actividades', 'info');
        }
      });
    }

    // G. Exportar Excel
    const btnExportJunta = document.getElementById('btn-export-junta');
    if (btnExportJunta) {
      btnExportJunta.addEventListener('click', () => {
        this.exportJuntaToExcel();
      });
    }

    // H. Filtros y búsqueda de junta
    const juntaSearch = document.getElementById('junta-search');
    if (juntaSearch) juntaSearch.addEventListener('input', () => this.renderJuntaActivities());

    const juntaFilterCat = document.getElementById('junta-filter-category');
    if (juntaFilterCat) juntaFilterCat.addEventListener('change', () => this.renderJuntaActivities());

    const juntaFilterPri = document.getElementById('junta-filter-priority');
    if (juntaFilterPri) juntaFilterPri.addEventListener('change', () => this.renderJuntaActivities());

    // I. Modal de Edición de Actividad
    const activityModal = document.getElementById('edit-activity-modal');
    const btnCloseActivityModal = document.getElementById('btn-close-activity-modal');
    const btnCancelActivityEdit = document.getElementById('btn-cancel-activity-edit');
    const btnSaveActivityEdit = document.getElementById('btn-save-activity-edit');

    if (btnCloseActivityModal) btnCloseActivityModal.addEventListener('click', () => this.closeActivityModal());
    if (btnCancelActivityEdit) btnCancelActivityEdit.addEventListener('click', () => this.closeActivityModal());
    if (btnSaveActivityEdit) {
      btnSaveActivityEdit.addEventListener('click', () => {
        this.saveActivityEdition();
      });
    }

    if (activityModal) {
      activityModal.addEventListener('click', (e) => {
        if (e.target === activityModal) this.closeActivityModal();
      });
    }

    // J. Modal de Ayuda por Voz
    const voiceHelpModal = document.getElementById('voice-help-modal');
    const btnShowHelp = document.getElementById('btn-show-help');
    const btnCloseVoiceHelp = document.getElementById('btn-close-voice-help');
    const btnCloseVoiceHelpOk = document.getElementById('btn-close-voice-help-ok');

    if (btnShowHelp) btnShowHelp.addEventListener('click', () => voiceHelpModal.classList.add('active'));
    if (btnCloseVoiceHelp) btnCloseVoiceHelp.addEventListener('click', () => voiceHelpModal.classList.remove('active'));
    if (btnCloseVoiceHelpOk) btnCloseVoiceHelpOk.addEventListener('click', () => voiceHelpModal.classList.remove('active'));

    if (voiceHelpModal) {
      voiceHelpModal.addEventListener('click', (e) => {
        if (e.target === voiceHelpModal) voiceHelpModal.classList.remove('active');
      });
    }
  }

  // ==========================================
  // METODOS DE VOZ Y JUNTA DE CASCO
  // ==========================================
  
  initVoice() {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const btnMic = document.getElementById("btn-mic");
    const voiceStatus = document.getElementById("voice-status");
    
    if (!SpeechRecognition) {
      if (voiceStatus) voiceStatus.textContent = "API de Voz no soportada (Use Chrome o Edge)";
      if (btnMic) {
        btnMic.style.opacity = "0.5";
        btnMic.disabled = true;
      }
      return;
    }

    this.recognition = new SpeechRecognition();
    this.recognition.lang = 'es-PE';
    this.recognition.continuous = false;
    this.recognition.interimResults = true;

    this.recognition.onstart = () => {
      this.isListening = true;
      const statusEl = document.getElementById("voice-status");
      if (statusEl) {
        statusEl.textContent = "Escuchando... Hable ahora";
        statusEl.classList.add("listening");
      }
      const voiceCard = document.getElementById("voice-card");
      if (voiceCard) voiceCard.classList.add("recording");
      
      const micBtn = document.getElementById("btn-mic");
      if (micBtn) {
        const icon = micBtn.querySelector("svg");
        if (icon) {
          icon.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic-off"><line x1="2" y1="2" x2="22" y2="22"/><path d="M17 11a5 5 0 0 1-5 5H9.7A5 5 0 0 1 5 11V5a3 3 0 0 1 5.9-1"/><path d="M12 18.5a7 7 0 0 1-7-7"/><path d="M12 12V5a3 3 0 0 0-3-3"/></svg>`;
        }
      }
    };

    this.recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; ++i) {
        if (event.results[i].isFinal) {
          finalTranscript += event.results[i][0].transcript;
        } else {
          interimTranscript += event.results[i][0].transcript;
        }
      }

      const currentText = finalTranscript || interimTranscript;
      const previewEl = document.getElementById("transcription-preview");
      if (currentText.trim() && previewEl) {
        previewEl.textContent = currentText;
        previewEl.classList.add("has-text");
        this.autoCategorize(currentText);
      }
    };

    this.recognition.onerror = (event) => {
      console.error("Error reconocimiento de voz:", event.error);
      if (event.error === 'not-allowed') {
        this.showToast("Permiso de micrófono denegado. Habilítelo en el navegador.", "error");
      } else {
        this.showToast("Error en reconocimiento de voz: " + event.error, "error");
      }
      this.stopListening();
    };

    this.recognition.onend = () => {
      this.stopListening();
    };
  }

  startListening() {
    if (!this.recognition) return;
    const previewEl = document.getElementById("transcription-preview");
    if (previewEl) {
      previewEl.textContent = "";
      previewEl.classList.remove("has-text");
    }
    try {
      this.recognition.start();
    } catch (e) {
      console.error(e);
    }
  }

  stopListening() {
    this.isListening = false;
    const statusEl = document.getElementById("voice-status");
    if (statusEl) {
      statusEl.textContent = "Micrófono inactivo";
      statusEl.classList.remove("listening");
    }
    const voiceCard = document.getElementById("voice-card");
    if (voiceCard) voiceCard.classList.remove("recording");
    
    const micBtn = document.getElementById("btn-mic");
    if (micBtn) {
      const icon = micBtn.querySelector("svg");
      if (icon) {
        icon.outerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-mic"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="22"/></svg>`;
      }
    }
    if (this.recognition) {
      try { this.recognition.stop(); } catch(e) {}
    }
  }

  autoCategorize(text) {
    const normalized = text.toLowerCase();
    const catSelect = document.getElementById("voice-category");
    const priSelect = document.getElementById("voice-priority");
    if (!catSelect || !priSelect) return;

    if (normalized.includes("casco") || normalized.includes("plancha") || normalized.includes("calderería") || normalized.includes("soldadura") || normalized.includes("mamparo") || normalized.includes("quilla")) {
      catSelect.value = "Casco (Calderería)";
    } else if (normalized.includes("válvula") || normalized.includes("valvula") || normalized.includes("rejilla") || normalized.includes("fondo") || normalized.includes("toma de mar") || normalized.includes("descarga")) {
      catSelect.value = "Válvulas y Rejillas";
    } else if (normalized.includes("ánodo") || normalized.includes("anodo") || normalized.includes("zinc") || normalized.includes("sacrificio")) {
      catSelect.value = "Ánodos de Sacrificio";
    } else if (normalized.includes("pintado") || normalized.includes("pintura") || normalized.includes("esquema") || normalized.includes("arenado") || normalized.includes("limpieza") || normalized.includes("lavado") || normalized.includes("sandblast")) {
      catSelect.value = "Pintura y Limpieza";
    } else if (normalized.includes("eje") || normalized.includes("hélice") || normalized.includes("helice") || normalized.includes("timón") || normalized.includes("timon") || normalized.includes("bocina") || normalized.includes("propulsor")) {
      catSelect.value = "Sistemas de Propulsión";
    }

    if (normalized.includes("urgente") || normalized.includes("inmediato") || normalized.includes("crítico") || normalized.includes("critico") || normalized.includes("alta prioridad") || normalized.includes("muy importante")) {
      priSelect.value = "Alta";
    } else if (normalized.includes("prioridad media") || normalized.includes("regular") || normalized.includes("secundario")) {
      priSelect.value = "Media";
    } else if (normalized.includes("prioridad baja") || normalized.includes("no urgente") || normalized.includes("opcional")) {
      priSelect.value = "Baja";
    }
  }

  // Refrescar vistas de Junta de Casco
  refreshJuntaCasco() {
    const select = document.getElementById("vessel-select");
    if (!select) return;

    const previousSelection = this.selectedJuntaBoatId;
    select.innerHTML = "";
    
    // Opción por defecto
    const optCustom = document.createElement("option");
    optCustom.value = "custom";
    optCustom.textContent = "Personalizado (Sin barco de astillero)";
    select.appendChild(optCustom);

    // Agregar barcos activos
    const boats = this.state.getBoats().filter(b => b.status !== 'libre');
    boats.forEach(boat => {
      const opt = document.createElement("option");
      opt.value = boat.id;
      opt.textContent = `${boat.name} (${boat.registration})`;
      select.appendChild(opt);
    });

    if ([...select.options].some(o => o.value === previousSelection)) {
      select.value = previousSelection;
      this.selectedJuntaBoatId = previousSelection;
    } else {
      select.value = "custom";
      this.selectedJuntaBoatId = "custom";
    }

    this.loadJuntaVesselData();
    this.renderJuntaActivities();
  }

  loadJuntaVesselData() {
    const vesselNameInput = document.getElementById("vessel-name");
    const vesselIdInput = document.getElementById("vessel-id");
    const vesselShipyardInput = document.getElementById("vessel-shipyard");
    const vesselDateInput = document.getElementById("vessel-date");

    if (this.selectedJuntaBoatId === 'custom') {
      const data = this.state.getGeneralVessel();
      vesselNameInput.value = data.name || "";
      vesselIdInput.value = data.id || "";
      vesselShipyardInput.value = data.shipyard || "";
      vesselDateInput.value = data.date || new Date().toISOString().split('T')[0];
    } else {
      const boat = this.state.getBoatById(this.selectedJuntaBoatId);
      if (boat) {
        vesselNameInput.value = boat.name;
        vesselIdInput.value = boat.registration;
        vesselShipyardInput.value = boat.shipyardDestination || "Astillero Interno";
        vesselDateInput.value = boat.entryDate || "";
      }
    }
  }

  saveGeneralVesselData() {
    if (this.selectedJuntaBoatId !== 'custom') return;
    
    const data = {
      name: document.getElementById("vessel-name").value,
      id: document.getElementById("vessel-id").value,
      shipyard: document.getElementById("vessel-shipyard").value,
      date: document.getElementById("vessel-date").value
    };
    this.state.saveGeneralVessel(data);
  }

  syncJuntaToShipyardBoat() {
    if (this.selectedJuntaBoatId === 'custom') {
      this.saveGeneralVesselData();
      return;
    }
    const name = document.getElementById('vessel-name').value;
    const id = document.getElementById('vessel-id').value;
    const date = document.getElementById('vessel-date').value;
    const shipyardDest = document.getElementById('vessel-shipyard').value;
    
    this.state.updateBoat(this.selectedJuntaBoatId, {
      name: name.toUpperCase(),
      registration: id.toUpperCase(),
      entryDate: date,
      shipyardDestination: shipyardDest
    });
    this.refreshAll();
  }

  getJuntaActivities() {
    if (this.selectedJuntaBoatId === 'custom') {
      return this.state.getGeneralActivities();
    } else {
      const boat = this.state.getBoatById(this.selectedJuntaBoatId);
      return boat ? (boat.activities || []) : [];
    }
  }

  saveJuntaActivities(activities) {
    if (this.selectedJuntaBoatId === 'custom') {
      this.state.saveGeneralActivities(activities);
    } else {
      const boat = this.state.getBoatById(this.selectedJuntaBoatId);
      if (boat) {
        boat.activities = activities;
        this.state.saveState();
        this.refreshAll();
      }
    }
  }

  addJuntaActivity(desc, cat, pri) {
    const activities = this.getJuntaActivities();
    activities.push({
      description: desc,
      category: cat,
      priority: pri
    });
    this.saveJuntaActivities(activities);
    this.renderJuntaActivities();
    this.showToast("Actividad agregada con éxito", "success");
  }

  renderJuntaActivities() {
    const activitiesList = document.getElementById("junta-activities-list");
    if (!activitiesList) return;

    const query = document.getElementById("junta-search").value.toLowerCase().trim();
    const catFilter = document.getElementById("junta-filter-category").value;
    const priFilter = document.getElementById("junta-filter-priority").value;

    const activities = this.getJuntaActivities();

    const filtered = activities.filter(act => {
      const matchesSearch = act.description.toLowerCase().includes(query);
      const matchesCategory = catFilter === "" || act.category === catFilter;
      const matchesPriority = priFilter === "" || act.priority === priFilter;
      return matchesSearch && matchesCategory && matchesPriority;
    });

    activitiesList.innerHTML = "";

    if (filtered.length === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td colspan="5" class="empty-state">
          <div class="empty-state-content">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
            <p>${activities.length === 0 ? "No hay actividades en la lista. ¡Prueba a registrar una por voz o cargar una plantilla!" : "Ninguna actividad coincide con los filtros aplicados."}</p>
          </div>
        </td>
      `;
      activitiesList.appendChild(tr);
    } else {
      filtered.forEach((act, idx) => {
        const realIndex = activities.indexOf(act);
        const tr = document.createElement("tr");
        const priorityClass = `badge-${act.priority.toLowerCase()}`;

        tr.innerHTML = `
          <td style="color: var(--text-muted); font-weight: 600;">${idx + 1}</td>
          <td style="font-weight: 500;">${this.escapeHTML(act.description)}</td>
          <td><span class="badge badge-cat">${this.escapeHTML(act.category)}</span></td>
          <td><span class="badge ${priorityClass}">${this.escapeHTML(act.priority)}</span></td>
          <td style="text-align: center;">
            <div class="actions-cell" style="justify-content: center; display: flex; gap: 8px;">
              <button class="btn-table-icon edit-activity-btn" data-index="${realIndex}" title="Editar actividad">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-edit-3"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </button>
              <button class="btn-table-icon delete-activity-btn" data-index="${realIndex}" title="Eliminar actividad">
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-trash"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </td>
        `;
        activitiesList.appendChild(tr);
      });
    }

    // Bindeo de eventos
    activitiesList.querySelectorAll(".edit-activity-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index, 10);
        this.openEditActivityModal(index);
      });
    });

    activitiesList.querySelectorAll(".delete-activity-btn").forEach(btn => {
      btn.addEventListener("click", () => {
        const index = parseInt(btn.dataset.index, 10);
        this.deleteJuntaActivity(index);
      });
    });

    this.updateJuntaStats();

    if (window.lucide) {
      window.lucide.createIcons();
    }
  }

  updateJuntaStats() {
    const activities = this.getJuntaActivities();
    const total = activities.length;
    const critical = activities.filter(a => a.priority === "Alta").length;
    const casco = activities.filter(a => a.category === "Casco (Calderería)").length;
    const valvula = activities.filter(a => a.category === "Válvulas y Rejillas").length;

    const totalEl = document.getElementById("stat-total");
    const criticalEl = document.getElementById("stat-critical");
    const cascoEl = document.getElementById("stat-casco");
    const valvulaEl = document.getElementById("stat-valvula");

    if (totalEl) totalEl.textContent = total;
    if (criticalEl) criticalEl.textContent = critical;
    if (cascoEl) cascoEl.textContent = casco;
    if (valvulaEl) valvulaEl.textContent = valvula;
  }

  openEditActivityModal(index) {
    this.currentEditActivityIndex = index;
    const activities = this.getJuntaActivities();
    const act = activities[index];

    document.getElementById("edit-activity-index").value = index;
    document.getElementById("edit-activity-description").value = act.description;
    document.getElementById("edit-activity-category").value = act.category;
    document.getElementById("edit-activity-priority").value = act.priority;

    document.getElementById("edit-activity-modal").classList.add("active");
    setTimeout(() => document.getElementById("edit-activity-description").focus(), 100);
  }

  closeActivityModal() {
    document.getElementById("edit-activity-modal").classList.remove("active");
    this.currentEditActivityIndex = -1;
  }

  saveActivityEdition() {
    if (this.currentEditActivityIndex === -1) return;

    const desc = document.getElementById("edit-activity-description").value.trim();
    const cat = document.getElementById("edit-activity-category").value;
    const pri = document.getElementById("edit-activity-priority").value;

    if (!desc) {
      this.showToast("La descripción no puede estar vacía", "warning");
      return;
    }

    const activities = this.getJuntaActivities();
    activities[this.currentEditActivityIndex] = {
      description: desc,
      category: cat,
      priority: pri
    };

    this.saveJuntaActivities(activities);
    this.renderJuntaActivities();
    this.closeActivityModal();
    this.showToast("Actividad actualizada con éxito", "success");
  }

  deleteJuntaActivity(index) {
    if (confirm("¿Está seguro de eliminar esta actividad?")) {
      const activities = this.getJuntaActivities();
      activities.splice(index, 1);
      this.saveJuntaActivities(activities);
      this.renderJuntaActivities();
      this.showToast("Actividad eliminada", "info");
    }
  }

  loadJuntaTemplate(templateKey) {
    const PLANTILLAS = {
      pesquero: [
        { description: "Medición de espesores de casco por ultrasonido en casco y mamparos.", category: "Casco (Calderería)", priority: "Alta" },
        { description: "Limpieza con chorro de arena (sandblasting) del casco a grado comercial metal blanco (SSPC-SP5).", category: "Pintura y Limpieza", priority: "Alta" },
        { description: "Aplicación del esquema completo de pintura anticorrosiva y antiincrustante (antifouling).", category: "Pintura y Limpieza", priority: "Alta" },
        { description: "Cambio de 28 ánodos de zinc de sacrificio (12 lbs) soldados en casco, timón y tobera.", category: "Ánodos de Sacrificio", priority: "Alta" },
        { description: "Desmontaje, limpieza, rectificado de asientos y calibración de 14 válvulas de fondo y descargas.", category: "Válvulas y Rejillas", priority: "Alta" },
        { description: "Desmontaje de hélice de paso fijo para inspección de fisuras por tintes penetrantes y balanceo.", category: "Sistemas de Propulsión", priority: "Alta" },
        { description: "Toma de holguras de eje de cola en cojinete de bocina y medición de caída de eje.", category: "Sistemas de Propulsión", priority: "Alta" },
        { description: "Limpieza profunda de rejillas de aspiración de agua de mar de enfriamiento de máquinas.", category: "Válvulas y Rejillas", priority: "Baja" },
        { description: "Reparación por calderería de abolladura en plancha de babor cerca del trancanil (espesor 12mm).", category: "Casco (Calderería)", priority: "Media" }
      ],
      remolcador: [
        { description: "Calibración de espesores de planchas de casco. Distribución: dos anillos estructurales en proa y popa.", category: "Casco (Calderería)", priority: "Alta" },
        { description: "Arenado comercial (Sa-2) al 100% de la obra viva, incluyendo toberas.", category: "Pintura y Limpieza", priority: "Alta" },
        { description: "Aplicación del esquema de pintura en obra viva / 04 capas (Plan de Pintado de 5 años).", category: "Pintura y Limpieza", priority: "Alta" },
        { description: "Corte y soldeo (reemplazo) de 45 ánodos de zinc de sacrificio soldables en el casco.", category: "Ánodos de Sacrificio", priority: "Alta" },
        { description: "Mantenimiento completo (desmontaje, limpieza, asentado y pruebas) de válvulas de fondo tipo globo (DN350, DN250 y DN200).", category: "Válvulas y Rejillas", priority: "Alta" },
        { description: "Mantenimiento de canastillos portafiltros de válvulas de fondo.", category: "Válvulas y Rejillas", priority: "Media" },
        { description: "Desmontaje, montaje y cambio de sellos de hélices del sistema de propulsión azimutal.", category: "Sistemas de Propulsión", priority: "Alta" },
        { description: "Limpieza y pulido de palas de hélices.", category: "Sistemas de Propulsión", priority: "Media" },
        { description: "Arriado, arenado, pintado e izado de cadenas y anclas de babor (BR) y estribor (ER).", category: "Pintura y Limpieza", priority: "Media" },
        { description: "Calibración de diámetros de eslabones de cadena de fondeo (10 eslabones por paño).", category: "Otros", priority: "Media" },
        { description: "Desmontaje, montaje y mantenimiento de 16 llantas de defensa de casco.", category: "Casco (Calderería)", priority: "Media" },
        { description: "Cambio de 10 cáncamos de llantas (85x100x25mm) y grilletes/cadenas de defensas de casco.", category: "Casco (Calderería)", priority: "Media" },
        { description: "Limpieza y desgasificación de tanques de combustible (uso diario y almacenamiento) con desmontaje de tapas de registro.", category: "Pintura y Limpieza", priority: "Media" },
        { description: "Limpieza mecánica y aplicación de 1 capa de pintura anticorrosiva en el pañol de cadenas.", category: "Pintura y Limpieza", priority: "Media" },
        { description: "Limpieza e inspección de sentinas en la sala de máquinas.", category: "Pintura y Limpieza", priority: "Media" }
      ],
      barcaza: [
        { description: "Apertura de tapas de registro de tanques de lastre para inspección estructural interna.", category: "Otros", priority: "Alta" },
        { description: "Cambio de planchas corroídas en el fondo plano de la barcaza (aprox. 5 metros cuadrados).", category: "Casco (Calderería)", priority: "Alta" },
        { description: "Limpieza y desgasificación de tanques de almacenamiento de carga industrial.", category: "Pintura y Limpieza", priority: "Alta" },
        { description: "Instalación de 32 ánodos de zinc distribuidos en la obra viva y túneles de lastre.", category: "Ánodos de Sacrificio", priority: "Media" },
        { description: "Mantenimiento preventivo e inspección de válvulas de compuerta manuales de tanques.", category: "Válvulas y Rejillas", priority: "Media" }
      ]
    };

    let newActivities = [];
    if (templateKey !== "vacio" && PLANTILLAS[templateKey]) {
      newActivities = PLANTILLAS[templateKey].map(act => ({ ...act }));
    }

    this.saveJuntaActivities(newActivities);
    this.renderJuntaActivities();
    document.getElementById("vessel-template").value = "";
    this.showToast(`Plantilla cargada con éxito.`, "success");
  }

  exportJuntaToExcel() {
    const activities = this.getJuntaActivities();
    if (activities.length === 0) {
      this.showToast("No hay actividades para exportar en el reporte", "warning");
      return;
    }

    const vName = document.getElementById("vessel-name").value.trim() || "Embarcación sin Nombre";
    const vId = document.getElementById("vessel-id").value.trim() || "Sin Matrícula";
    const vShipyard = document.getElementById("vessel-shipyard").value.trim() || "Sin Astillero Especificado";
    const vDate = document.getElementById("vessel-date").value || "Sin Fecha";

    const aoaData = [
      ["REPORTE DE ACTIVIDADES - JUNTA DE CASCO"],
      [],
      ["DATOS GENERALES DE LA REUNIÓN"],
      ["Nombre de Embarcación:", vName, "", "Matrícula / Patente:", vId],
      ["Astillero Destino:", vShipyard, "", "Fecha de Reunión:", vDate],
      [],
      ["DETALLE DE LAS ACTIVIDADES PROGRAMADAS"],
      ["N°", "Descripción de la Actividad", "Categoría de Trabajo", "Prioridad asignada"]
    ];

    activities.forEach((act, index) => {
      aoaData.push([
        index + 1,
        act.description,
        act.category,
        act.priority
      ]);
    });

    try {
      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.aoa_to_sheet(aoaData);

      ws['!cols'] = [
        { wch: 6 },
        { wch: 75 },
        { wch: 28 },
        { wch: 15 }
      ];

      ws['!merges'] = [
        { s: { r: 0, c: 0 }, e: { r: 0, c: 4 } },
        { s: { r: 2, c: 0 }, e: { r: 2, c: 4 } },
        { s: { r: 6, c: 0 }, e: { r: 6, c: 4 } }
      ];

      XLSX.utils.book_append_sheet(wb, ws, "Junta de Casco");

      const sanitizedVName = vName.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `Junta_Casco_${sanitizedVName}_${vDate}.xlsx`;
      XLSX.writeFile(wb, filename);

      this.showToast(`Excel descargado con éxito: ${filename}`, "success");
    } catch (error) {
      console.error("Error generando Excel:", error);
      this.showToast("Error al exportar el reporte a Excel", "error");
    }
  }

  escapeHTML(str) {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
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

            <!-- Botón de acceso directo a Junta de Casco -->
            <button id="btn-view-junta" class="btn-action inspector-junta-btn" style="width: 100%;">
              <i data-lucide="clipboard-list"></i>
              Ver Junta de Casco (${boat.activities ? boat.activities.length : 0} Act.)
            </button>

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

    // 5. Ver Junta de Casco (Navegación directa)
    const btnViewJunta = document.getElementById('btn-view-junta');
    if (btnViewJunta) {
      btnViewJunta.addEventListener('click', () => {
        this.selectedJuntaBoatId = boat.id;
        const tabBtn = document.querySelector('.nav-tab-btn[data-main-tab="juntacasco"]');
        if (tabBtn) tabBtn.click();
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
