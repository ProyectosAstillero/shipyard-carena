// Módulo de Visualización Interactiva del Astillero (visualizer.js)

export class ShipyardVisualizer {
  constructor(stateInstance, onBoatSelected, onBoatMoved, showToast) {
    this.state = stateInstance;
    this.onBoatSelected = onBoatSelected;
    this.onBoatMoved = onBoatMoved;
    this.showToast = showToast;

    // Elementos DOM
    this.gridElement = document.getElementById('shipyard-grid');
    this.seaElement = document.getElementById('sea-boats');

    this.draggedBoatId = null;
  }

  // Renderizar todo el astillero
  render() {
    this.clearGrid();
    const boats = this.state.getBoats().filter(b => b.status !== 'libre');

    // 1. Crear las columnas de los Carriles (0 al 8)
    for (let lane = 8; lane >= 0; lane--) {
      const isTransfer = (lane === 0);
      const laneCol = document.createElement('div');
      laneCol.className = `lane-column ${isTransfer ? 'lane-transfer' : ''}`;
      laneCol.dataset.status = 'carril';
      laneCol.dataset.lane = lane;

      // Etiqueta del carril
      const label = document.createElement('div');
      label.className = 'lane-label';
      label.textContent = lane === 0 ? 'Carril 0 (Transfer)' : `Carril ${lane}`;
      laneCol.appendChild(label);

      // Buscar barco en este carril
      const boat = boats.find(b => b.status === 'carril' && b.lane === lane);
      if (boat) {
        laneCol.classList.add('occupied');
        const boatEl = this.createBoatElement(boat);
        laneCol.appendChild(boatEl);
      }

      this.setupDropTarget(laneCol);
      this.gridElement.appendChild(laneCol);
    }

    // 2. Crear la columna de Varada (Slipway)
    const slipwayCol = document.createElement('div');
    slipwayCol.className = 'slipway-column';
    slipwayCol.dataset.status = 'varada';
    slipwayCol.dataset.lane = 'VARADA';

    const slipwayTitle = document.createElement('div');
    slipwayTitle.className = 'slipway-title';
    slipwayTitle.textContent = 'VARADA';
    slipwayCol.appendChild(slipwayTitle);

    const varadaBoat = boats.find(b => b.status === 'varada');
    if (varadaBoat) {
      slipwayCol.classList.add('occupied');
      const boatEl = this.createBoatElement(varadaBoat);
      slipwayCol.appendChild(boatEl);
    }

    this.setupDropTarget(slipwayCol);
    this.gridElement.appendChild(slipwayCol);

    // 3. Crear los barcos en la cola de espera (Mar)
    this.seaElement.innerHTML = '';
    const seaBoats = boats.filter(b => b.status === 'espera');
    
    if (seaBoats.length === 0) {
      const emptyMsg = document.createElement('div');
      emptyMsg.style.color = 'rgba(255,255,255,0.2)';
      emptyMsg.style.fontSize = '0.8rem';
      emptyMsg.style.fontStyle = 'italic';
      emptyMsg.style.paddingLeft = '10px';
      emptyMsg.textContent = 'Bahía libre. No hay barcos en espera.';
      this.seaElement.appendChild(emptyMsg);
    } else {
      seaBoats.forEach(boat => {
        const boatEl = this.createBoatElement(boat);
        this.seaElement.appendChild(boatEl);
      });
    }

    // Permitir retornar barcos al mar (Botadura / Cancelar)
    this.setupSeaDropTarget();
  }

  // Limpiar el grid del astillero antes de renderizar
  clearGrid() {
    this.gridElement.innerHTML = '';
  }

  // Generar el SVG del barco según su tipo
  getBoatSvg(type, color) {
    // Definimos diferentes gráficos vectoriales (SVG) por tipo de barco
    const safeColor = color || '#3b82f6';
    
    if (type === 'Pesquero') {
      return `
        <svg viewBox="0 0 80 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <!-- Casco -->
          <path d="M15,20 L65,20 L65,140 C65,165 40,180 40,180 C40,180 15,165 15,140 Z" fill="${safeColor}" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
          <path d="M20,25 L60,25 L60,135 C60,150 40,165 40,165 C40,165 20,150 20,135 Z" fill="#131a2c" opacity="0.8"/>
          <!-- Superestructura (Cabina) -->
          <rect x="25" y="45" width="30" height="40" rx="3" fill="#ffffff" />
          <!-- Ventanas de la cabina -->
          <rect x="30" y="50" width="8" height="10" fill="#0ea5e9" rx="1"/>
          <rect x="42" y="50" width="8" height="10" fill="#0ea5e9" rx="1"/>
          <rect x="30" y="65" width="20" height="12" fill="#0ea5e9" rx="1"/>
          <!-- Pluma de pesca / Grúa de popa -->
          <line x1="40" y1="85" x2="40" y2="125" stroke="#94a3b8" stroke-width="3" />
          <circle cx="40" cy="125" r="3" fill="#f59e0b" />
          <!-- Redes de Pesca en cubierta -->
          <path d="M25,135 Q40,125 55,135 Q40,145 25,135 Z" fill="rgba(245,158,11,0.3)" stroke="#f59e0b" stroke-width="1" stroke-dasharray="2,2" />
          <!-- Chimenea -->
          <rect x="35" y="32" width="10" height="14" fill="#ef4444" />
          <circle cx="40" cy="32" r="3" fill="#000" />
        </svg>
      `;
    } else if (type === 'Carguero') {
      return `
        <svg viewBox="0 0 80 200" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <!-- Casco Largo -->
          <path d="M15,15 L65,15 L65,160 C65,185 40,200 40,200 C40,200 15,185 15,160 Z" fill="${safeColor}" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
          <path d="M20,20 L60,20 L60,155 C60,175 40,185 40,185 C40,185 20,175 20,155 Z" fill="#131a2c" opacity="0.8"/>
          <!-- Contenedores Apilados -->
          <g fill="#ec4899" stroke="rgba(0,0,0,0.2)">
            <rect x="25" y="30" width="14" height="25" rx="1"/>
            <rect x="41" y="30" width="14" height="25" rx="1" fill="#f59e0b"/>
            <rect x="25" y="60" width="14" height="25" rx="1" fill="#10b981"/>
            <rect x="41" y="60" width="14" height="25" rx="1" fill="#3b82f6"/>
            <rect x="25" y="90" width="14" height="25" rx="1" fill="#8b5cf6"/>
            <rect x="41" y="90" width="14" height="25" rx="1" fill="#ef4444"/>
          </g>
          <!-- Cabina en Popa -->
          <rect x="22" y="130" width="36" height="30" rx="2" fill="#ffffff" />
          <rect x="28" y="135" width="24" height="8" fill="#0ea5e9"/>
          <!-- Grúa portuaria de servicio -->
          <line x1="40" y1="20" x2="40" y2="120" stroke="rgba(255,255,255,0.1)" stroke-width="1"/>
        </svg>
      `;
    } else if (type === 'Remolcador') {
      return `
        <svg viewBox="0 0 85 160" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <!-- Casco Ancho y Fuerte -->
          <path d="M10,25 L75,25 L75,120 C75,145 42.5,160 42.5,160 C42.5,160 10,145 10,120 Z" fill="${safeColor}" stroke="rgba(255,255,255,0.2)" stroke-width="2.5"/>
          <path d="M16,30 L69,30 L69,115 C69,135 42.5,148 42.5,148 C42.5,148 16,135 16,115 Z" fill="#131a2c" opacity="0.8"/>
          <!-- Defensas de Goma alrededor del casco -->
          <path d="M8,25 Q42.5,10 77,25" fill="none" stroke="#000" stroke-width="4" stroke-linecap="round"/>
          <path d="M9,24 L9,120 C9,146 42.5,162 42.5,162 C42.5,162 76,146 76,120 L76,24" fill="none" stroke="#000" stroke-width="2" stroke-dasharray="6,4"/>
          <!-- Cabina Central Voluminosa -->
          <rect x="22" y="50" width="41" height="45" rx="5" fill="#f8fafc"/>
          <rect x="27" y="55" width="31" height="15" fill="#0ea5e9" rx="2"/>
          <rect x="27" y="75" width="8" height="12" fill="#0ea5e9" rx="1"/>
          <rect x="50" y="75" width="8" height="12" fill="#0ea5e9" rx="1"/>
          <!-- Bitas de Remolque en Popa -->
          <rect x="36" y="110" width="13" height="10" fill="#475569" rx="1"/>
          <line x1="30" y1="115" x2="55" y2="115" stroke="#1e293b" stroke-width="4" stroke-linecap="round"/>
          <!-- Chimeneas Dobles -->
          <rect x="28" y="38" width="8" height="12" fill="#1e293b"/>
          <rect x="49" y="38" width="8" height="12" fill="#1e293b"/>
        </svg>
      `;
    } else {
      // Yate o Diseño Genérico Sleek
      return `
        <svg viewBox="0 0 80 180" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
          <!-- Casco muy estilizado con punta pronunciada -->
          <path d="M20,10 L60,10 L60,130 C60,160 40,180 40,180 C40,180 20,160 20,130 Z" fill="${safeColor}" stroke="rgba(255,255,255,0.2)" stroke-width="2"/>
          <!-- Cubierta de teca de madera -->
          <path d="M24,14 L56,14 L56,125 C56,145 40,165 40,165 C40,165 24,145 24,125 Z" fill="#b45309" opacity="0.9"/>
          <!-- Cabina de lujo blanca aerodinámica -->
          <path d="M28,40 Q40,20 52,40 L50,90 Q40,95 30,90 Z" fill="#ffffff" stroke="rgba(0,0,0,0.1)"/>
          <path d="M32,45 Q40,32 48,45 L47,60 Q40,65 33,60 Z" fill="#0f172a"/>
          <!-- Jacuzzi/Piscina en cubierta popa -->
          <circle cx="40" cy="115" r="10" fill="#38bdf8" stroke="#fff" stroke-width="1"/>
          <circle cx="40" cy="115" r="8" fill="#0ea5e9" opacity="0.6"/>
          <!-- Solárium / Asientos -->
          <rect x="30" y="135" width="20" height="8" fill="#e2e8f0" rx="2" />
        </svg>
      `;
    }
  }

  // Crear elemento HTML para representar un barco
  createBoatElement(boat) {
    const boatDiv = document.createElement('div');
    boatDiv.className = 'boat-vessel';
    boatDiv.id = boat.id;
    boatDiv.draggable = true;
    boatDiv.style.setProperty('--boat-color-glow', boat.color);
    
    // Inyectar el gráfico SVG correspondiente
    const svgWrapper = document.createElement('div');
    svgWrapper.style.width = '100%';
    svgWrapper.style.height = boat.status === 'espera' ? '100%' : '75%';
    svgWrapper.innerHTML = this.getBoatSvg(boat.type, boat.color);
    boatDiv.appendChild(svgWrapper);

    // Contenido técnico para barcos en el astillero
    if (boat.status !== 'espera') {
      const detailsDiv = document.createElement('div');
      detailsDiv.className = 'boat-hull-details';
      
      const name = document.createElement('div');
      name.className = 'boat-vessel-name';
      name.textContent = boat.name;
      detailsDiv.appendChild(name);

      const reg = document.createElement('div');
      reg.className = 'boat-vessel-reg';
      reg.textContent = boat.registration;
      detailsDiv.appendChild(reg);

      const type = document.createElement('div');
      type.className = 'boat-vessel-type-badge';
      type.textContent = boat.type;
      type.style.background = `${boat.color}40`; // Color semi-transparente
      type.style.color = boat.color;
      detailsDiv.appendChild(type);

      const progressWrapper = document.createElement('div');
      progressWrapper.className = 'boat-progress-bar';
      const progressFill = document.createElement('div');
      progressFill.className = 'boat-progress-fill';
      progressFill.style.width = `${boat.progress}%`;
      if (boat.progress >= 90) progressFill.style.backgroundColor = 'var(--color-success)';
      else if (boat.progress >= 40) progressFill.style.backgroundColor = 'var(--color-info)';
      else progressFill.style.backgroundColor = 'var(--color-warning)';
      
      progressWrapper.appendChild(progressFill);
      detailsDiv.appendChild(progressWrapper);

      boatDiv.appendChild(detailsDiv);
    } else {
      // En la cola de espera solo mostramos el nombre al pasar el mouse o texto corto
      const nameSpan = document.createElement('span');
      nameSpan.className = 'boat-vessel-name';
      nameSpan.textContent = boat.name;
      nameSpan.style.position = 'absolute';
      nameSpan.style.zIndex = '3';
      nameSpan.style.fontSize = '0.65rem';
      nameSpan.style.fontWeight = 'bold';
      nameSpan.style.color = '#fff';
      nameSpan.style.textShadow = '0 1px 4px #000, 0 0 2px #000';
      boatDiv.appendChild(nameSpan);
    }

    // Configurar Eventos de Drag & Drop
    this.setupDragEvents(boatDiv);

    // Evento de Selección (Click)
    boatDiv.addEventListener('click', (e) => {
      e.stopPropagation(); // Evitar clicks en el contenedor
      
      // Remover selección previa
      document.querySelectorAll('.boat-vessel').forEach(el => el.style.border = '1px solid rgba(255,255,255,0.15)');
      boatDiv.style.border = `2px solid ${boat.color}`;
      boatDiv.style.boxShadow = `0 0 15px ${boat.color}`;

      this.onBoatSelected(boat);
    });

    return boatDiv;
  }

  // Registrar eventos de arrastre en el barco
  setupDragEvents(boatElement) {
    boatElement.addEventListener('dragstart', (e) => {
      this.draggedBoatId = boatElement.id;
      boatElement.classList.add('dragging');
      
      // Guardar información del barco en el portapapeles
      e.dataTransfer.setData('text/plain', boatElement.id);
      e.dataTransfer.effectAllowed = 'move';

      // Añadir clase global para mostrar objetivos válidos
      const boats = this.state.getBoats();
      const currentBoat = boats.find(b => b.id === this.draggedBoatId);
      
      // Resaltar posibles destinos
      document.querySelectorAll('.lane-column, .slipway-column, #sea-bay-drop').forEach(target => {
        let status = target.dataset.status;
        let lane = target.dataset.lane;

        if (status === 'carril') {
          lane = parseInt(lane, 10);
        }

        const valid = this.state.validateMovement(this.draggedBoatId, status, lane);
        if (valid.allowed) {
          target.style.outline = '2px dashed rgba(16, 185, 129, 0.4)';
          target.style.outlineOffset = '-2px';
        } else {
          target.style.opacity = '0.4';
        }
      });
    });

    boatElement.addEventListener('dragend', () => {
      boatElement.classList.remove('dragging');
      
      // Limpiar clases globales y opacidades
      document.querySelectorAll('.lane-column, .slipway-column, #sea-bay-drop').forEach(target => {
        target.style.outline = 'none';
        target.style.opacity = '1';
        target.classList.remove('drag-over', 'drag-over-invalid');
      });
      this.draggedBoatId = null;
    });
  }

  // Registrar evento de caída en destinos (carriles/varada)
  setupDropTarget(targetElement) {
    targetElement.addEventListener('dragover', (e) => {
      e.preventDefault(); // Necesario para permitir soltar
      
      if (!this.draggedBoatId) return;

      const status = targetElement.dataset.status;
      let lane = targetElement.dataset.lane;
      if (status === 'carril') {
        lane = parseInt(lane, 10);
      }

      const validation = this.state.validateMovement(this.draggedBoatId, status, lane);
      if (validation.allowed) {
        targetElement.classList.add('drag-over');
        targetElement.classList.remove('drag-over-invalid');
        e.dataTransfer.dropEffect = 'move';
      } else {
        targetElement.classList.add('drag-over-invalid');
        targetElement.classList.remove('drag-over');
        e.dataTransfer.dropEffect = 'none';
      }
    });

    targetElement.addEventListener('dragleave', () => {
      targetElement.classList.remove('drag-over', 'drag-over-invalid');
    });

    targetElement.addEventListener('drop', (e) => {
      e.preventDefault();
      targetElement.classList.remove('drag-over', 'drag-over-invalid');
      
      const boatId = e.dataTransfer.getData('text/plain');
      const status = targetElement.dataset.status;
      let lane = targetElement.dataset.lane;
      if (status === 'carril') {
        lane = parseInt(lane, 10);
      }

      const result = this.state.moveBoat(boatId, status, lane);
      if (result.success) {
        this.onBoatMoved(result.boat);
        this.render();
      } else {
        this.showToast(result.message, 'error');
      }
    });
  }

  // Configurar la zona del mar para poder botar barcos arrastrándolos
  setupSeaDropTarget() {
    const seaDropZone = document.getElementById('sea-bay-drop');
    if (!seaDropZone) return;

    seaDropZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      if (!this.draggedBoatId) return;

      const validation = this.state.validateMovement(this.draggedBoatId, 'espera', null);
      if (validation.allowed) {
        seaDropZone.style.background = 'rgba(16, 185, 129, 0.15)';
        seaDropZone.style.border = '2px dashed var(--color-success)';
      } else {
        seaDropZone.style.background = 'rgba(239, 68, 68, 0.15)';
        seaDropZone.style.border = '2px dashed var(--color-danger)';
      }
    });

    seaDropZone.addEventListener('dragleave', () => {
      seaDropZone.style.background = 'transparent';
      seaDropZone.style.border = '1px solid rgba(59, 130, 246, 0.2)';
    });

    seaDropZone.addEventListener('drop', (e) => {
      e.preventDefault();
      seaDropZone.style.background = 'transparent';
      seaDropZone.style.border = '1px solid rgba(59, 130, 246, 0.2)';
      
      const boatId = e.dataTransfer.getData('text/plain');
      const result = this.state.moveBoat(boatId, 'espera', null);
      
      if (result.success) {
        this.onBoatMoved(result.boat);
        this.render();
      } else {
        this.showToast(result.message, 'error');
      }
    });
  }
}
