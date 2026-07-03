// Módulo de Gestión de Estado del Astillero (state.js)

export class ShipyardState {
  constructor() {
    this.storageKey = 'shipyard_management_state';
    this.loadState();
  }

  // Cargar estado desde LocalStorage
  loadState() {
    const defaultState = {
      boats: [],
      history: [],
      nextBoatId: 1
    };

    try {
      const stored = localStorage.getItem(this.storageKey);
      this.state = stored ? JSON.parse(stored) : defaultState;
    } catch (e) {
      console.error("Error al cargar localStorage, usando estado vacío:", e);
      this.state = defaultState;
    }
  }

  // Guardar estado actual en LocalStorage
  saveState() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.state));
    } catch (e) {
      console.error("Error al guardar en localStorage:", e);
    }
  }

  // Limpiar base de datos y reiniciar con datos de prueba
  resetToDefault() {
    const mockBoats = [
      {
        id: "boat_1",
        name: "COPEINCA II",
        registration: "CO-4820-PM",
        type: "Pesquero",
        length: 42.5,
        beam: 9.2,
        weight: 380,
        status: "carril",
        lane: 8,
        entryDate: "2026-06-15",
        departureDate: "2026-07-10",
        owner: "Copeinca S.A.C.",
        progress: 75,
        color: "#3b82f6", // Azul eléctrico
        notes: "Limpieza de casco, cambio de zincs de sacrificio, pintado de obra viva."
      },
      {
        id: "boat_2",
        name: "HUMBOLDT",
        registration: "HU-1029-PM",
        type: "Carguero",
        length: 55.0,
        beam: 11.5,
        weight: 650,
        status: "carril",
        lane: 4,
        entryDate: "2026-06-20",
        departureDate: "2026-07-15",
        owner: "TASA (Tecnológica de Alimentos S.A.)",
        progress: 45,
        color: "#06b6d4", // Cyan
        notes: "Mantenimiento de hélice de proa y timón."
      },
      {
        id: "boat_3",
        name: "DON TITO",
        registration: "DT-3382-PM",
        type: "Pesquero",
        length: 38.2,
        beam: 8.5,
        weight: 290,
        status: "carril",
        lane: 3,
        entryDate: "2026-06-28",
        departureDate: "2026-07-08",
        owner: "Pesquera Centinela",
        progress: 20,
        color: "#f59e0b", // Ámbar/Naranja
        notes: "Calibración de espesores de casco y reparación de mamparos."
      },
      {
        id: "boat_4",
        name: "KRAKEN I",
        registration: "KR-0091-RE",
        type: "Remolcador",
        length: 28.0,
        beam: 7.8,
        weight: 180,
        status: "carril",
        lane: 1,
        entryDate: "2026-07-01",
        departureDate: "2026-07-07",
        owner: "Svitzer Latam",
        progress: 90,
        color: "#10b981", // Verde
        notes: "Pruebas de tracción y mantenimiento de toberas."
      },
      {
        id: "boat_5",
        name: "MARLIN AZUL",
        registration: "MA-5512-YA",
        type: "Yate",
        length: 22.4,
        beam: 5.6,
        weight: 95,
        status: "espera",
        lane: null,
        entryDate: "2026-07-02",
        departureDate: "2026-07-12",
        owner: "Particular",
        progress: 0,
        color: "#ec4899", // Rosa
        notes: "Inspección general de línea de ejes."
      },
      {
        id: "boat_6",
        name: "DELFIN V",
        registration: "DF-8812-PM",
        type: "Pesquero",
        length: 45.0,
        beam: 9.8,
        weight: 410,
        status: "espera",
        lane: null,
        entryDate: "2026-07-04",
        departureDate: "2026-07-20",
        owner: "Exalmar",
        progress: 0,
        color: "#8b5cf6", // Violeta
        notes: "Cambio de válvulas de fondo y rejillas."
      }
    ];

    const mockHistory = [
      { timestamp: "2026-06-15 08:30:00", boatName: "COPEINCA II", action: "INGRESO COLA", details: "Ingreso a la lista de espera." },
      { timestamp: "2026-06-15 10:15:00", boatName: "COPEINCA II", action: "VARADA", details: "Posicionado en carro de varada (VARADA)." },
      { timestamp: "2026-06-15 11:30:00", boatName: "COPEINCA II", action: "TRASLADO", details: "Trasladado a Carril 0 (Transferencia)." },
      { timestamp: "2026-06-15 13:00:00", boatName: "COPEINCA II", action: "TRASLADO", details: "Posicionado final en Carril 8 para carena." },
      { timestamp: "2026-06-20 09:00:00", boatName: "HUMBOLDT", action: "VARADA", details: "Posicionado en carro de varada (VARADA)." },
      { timestamp: "2026-06-20 11:45:00", boatName: "HUMBOLDT", action: "TRASLADO", details: "Trasladado a Carril 4 pasando por Carril 0." },
      { timestamp: "2026-06-28 14:20:00", boatName: "DON TITO", action: "TRASLADO", details: "Varado y posicionado en Carril 3." },
      { timestamp: "2026-07-01 07:10:00", boatName: "KRAKEN I", action: "TRASLADO", details: "Varado y posicionado en Carril 1." }
    ];

    this.state = {
      boats: mockBoats,
      history: mockHistory.reverse(), // Más recientes primero
      nextBoatId: 7
    };
    this.saveState();
  }

  // Obtener todos los barcos
  getBoats() {
    return this.state.boats;
  }

  // Obtener un barco por ID
  getBoatById(id) {
    return this.state.boats.find(b => b.id === id);
  }

  // Obtener el barco en un carril específico
  getBoatInLane(lane) {
    if (lane === 'VARADA') {
      return this.state.boats.find(b => b.status === 'varada');
    }
    const laneNum = parseInt(lane, 10);
    return this.state.boats.find(b => b.status === 'carril' && b.lane === laneNum);
  }

  // Agregar un nuevo barco a la cola de espera (Mar)
  addBoat(boatData) {
    const id = `boat_${this.state.nextBoatId++}`;
    const newBoat = {
      id,
      name: boatData.name.toUpperCase(),
      registration: boatData.registration.toUpperCase(),
      type: boatData.type || 'Pesquero',
      length: parseFloat(boatData.length) || 0,
      beam: parseFloat(boatData.beam) || 0,
      weight: parseFloat(boatData.weight) || 0,
      status: 'espera',
      lane: null,
      entryDate: boatData.entryDate || new Date().toISOString().split('T')[0],
      departureDate: boatData.departureDate || '',
      owner: boatData.owner || 'S/D',
      progress: 0,
      color: boatData.color || '#3b82f6',
      notes: boatData.notes || ''
    };

    this.state.boats.push(newBoat);
    this.logHistory(newBoat.name, 'INGRESO COLA', 'Ingreso a la cola de espera en bahía.');
    this.saveState();
    return newBoat;
  }

  // Editar información de un barco
  updateBoat(id, updatedData) {
    const index = this.state.boats.findIndex(b => b.id === id);
    if (index === -1) return null;

    const oldBoat = this.state.boats[index];
    const newBoat = {
      ...oldBoat,
      ...updatedData,
      // Evitar que editen estatus y carril directamente por formulario técnico
      status: oldBoat.status,
      lane: oldBoat.lane
    };

    // Asegurar tipos numéricos
    newBoat.length = parseFloat(newBoat.length) || 0;
    newBoat.beam = parseFloat(newBoat.beam) || 0;
    newBoat.weight = parseFloat(newBoat.weight) || 0;
    newBoat.progress = Math.min(100, Math.max(0, parseInt(newBoat.progress, 10) || 0));

    this.state.boats[index] = newBoat;
    this.logHistory(newBoat.name, 'EDICION', 'Se actualizó la información técnica del barco.');
    this.saveState();
    return newBoat;
  }

  // Validar si un traslado es permitido físicamente en el astillero
  validateMovement(boatId, targetStatus, targetLane) {
    const boat = this.getBoatById(boatId);
    if (!boat) return { allowed: false, message: "El barco no existe." };

    const currentStatus = boat.status;
    const currentLane = boat.lane;

    // Si no hay cambio de posición
    if (currentStatus === targetStatus && currentLane === targetLane) {
      return { allowed: true };
    }

    // Verificar si el carril de destino está ocupado
    if (targetStatus === 'varada') {
      const occupied = this.getBoatInLane('VARADA');
      if (occupied && occupied.id !== boatId) {
        return { allowed: false, message: `El carro de Varada (Slipway) ya está ocupado por ${occupied.name}.` };
      }
    } else if (targetStatus === 'carril') {
      const occupied = this.getBoatInLane(targetLane);
      if (occupied && occupied.id !== boatId) {
        return { allowed: false, message: `El Carril ${targetLane} ya está ocupado por ${occupied.name}.` };
      }
    }

    // REGLA DE NEGOCIO: Ruta física de movimiento
    // 1. Desde espera (mar) -> Solo puede ir a VARADA
    if (currentStatus === 'espera') {
      if (targetStatus !== 'varada') {
        return { allowed: false, message: "Un barco en el mar debe ingresar primero al carro de Varada (cradle)." };
      }
    }

    // 2. Desde VARADA (slipway) -> Solo puede ir a Carril 0 (carro de transferencia) o volver al mar (lanzar/borrar)
    if (currentStatus === 'varada') {
      if (targetStatus === 'espera') {
        return { allowed: true }; // Cancelar entrada/volver al agua
      }
      if (targetStatus === 'carril' && targetLane !== 0) {
        return { allowed: false, message: "Desde la Varada, el barco debe moverse al Carril 0 (Carro de Transferencia) antes de ir a los carriles de mantenimiento (1-8)." };
      }
    }

    // 3. Desde Carril 0 (Transferencia) -> Puede ir a cualquier Carril (1 a 8), o volver a VARADA
    if (currentStatus === 'carril' && currentLane === 0) {
      if (targetStatus === 'espera') {
        return { allowed: false, message: "Para botar el barco, debe pasarlo primero al carro de Varada." };
      }
    }

    // 4. Desde Carriles 1 a 8 -> Solo pueden retornar al Carril 0 (para transferencia)
    if (currentStatus === 'carril' && currentLane > 0) {
      if (targetStatus === 'espera') {
        return { allowed: false, message: "No se puede botar el barco directamente desde un carril de trabajo. Debe pasar por el Carril 0 (Transferencia) y luego a VARADA." };
      }
      if (targetStatus === 'varada') {
        return { allowed: false, message: "Debe pasar primero por el Carril 0 (Transferencia) antes de llevarlo a VARADA." };
      }
      if (targetStatus === 'carril' && targetLane !== 0) {
        return { allowed: false, message: "No se puede mover un barco directamente entre carriles de trabajo (1-8). Debe pasar primero al Carril 0 (Carro de Transferencia)." };
      }
    }

    return { allowed: true };
  }

  // Mover barco a un carril o estado específico
  moveBoat(boatId, targetStatus, targetLane) {
    const validation = this.validateMovement(boatId, targetStatus, targetLane);
    if (!validation.allowed) {
      return { success: false, message: validation.message };
    }

    const boat = this.getBoatById(boatId);
    const oldStatus = boat.status;
    const oldLane = boat.lane;

    boat.status = targetStatus;
    if (targetStatus === 'espera') {
      boat.lane = null;
      boat.progress = 0; // Se reinicia el progreso al salir
      this.logHistory(boat.name, 'BOTADURA', 'El barco fue botado exitosamente de regreso al mar.');
    } else if (targetStatus === 'varada') {
      boat.lane = null;
      this.logHistory(boat.name, 'VARADA', 'Barco subido al carro de Varada (cradle).');
    } else if (targetStatus === 'carril') {
      boat.lane = parseInt(targetLane, 10);
      const logMsg = `Trasladado del carril ${oldStatus === 'varada' ? 'VARADA' : oldLane} al Carril ${targetLane}.`;
      this.logHistory(boat.name, 'TRASLADO', logMsg);
    }

    this.saveState();
    return { success: true, boat };
  }

  // Botar/lanzar un barco (liberar espacio y enviarlo a agua/historial de terminados)
  launchBoat(boatId) {
    const boat = this.getBoatById(boatId);
    if (!boat) return { success: false, message: "El barco no existe." };

    // Debe estar en VARADA para ser lanzado al agua
    if (boat.status !== 'varada') {
      return { success: false, message: "El barco debe estar posicionado en el carro de Varada (VARADA) para realizar la botadura al mar." };
    }

    // Cambiar estado a 'libre' (eliminado del astillero activo pero queda registrado en historial)
    boat.status = 'libre';
    boat.lane = null;
    boat.progress = 100;
    this.logHistory(boat.name, 'BOTADURA', 'Maniobra de botadura completada. Barco entregado a armador.');

    // Eliminar de los activos (o mantenerlos marcados como libre)
    // Para simplificar, lo mantendremos con estatus 'libre' para reportes, pero ya no ocupa carril.
    this.saveState();
    return { success: true, boat };
  }

  // Eliminar un barco por completo (limpieza)
  deleteBoat(boatId) {
    const index = this.state.boats.findIndex(b => b.id === boatId);
    if (index === -1) return false;

    const boat = this.state.boats[index];
    this.state.boats.splice(index, 1);
    this.logHistory(boat.name, 'ELIMINACION', 'Barco retirado completamente del sistema.');
    this.saveState();
    return true;
  }

  // Escribir en el historial
  logHistory(boatName, action, details) {
    const now = new Date();
    const formattedDate = now.getFullYear() + '-' +
      String(now.getMonth() + 1).padStart(2, '0') + '-' +
      String(now.getDate()).padStart(2, '0') + ' ' +
      String(now.getHours()).padStart(2, '0') + ':' +
      String(now.getMinutes()).padStart(2, '0') + ':' +
      String(now.getSeconds()).padStart(2, '0');

    this.state.history.unshift({
      timestamp: formattedDate,
      boatName,
      action,
      details
    });

    // Limitar historial a 100 elementos
    if (this.state.history.length > 100) {
      this.state.history.pop();
    }
  }

  // Obtener historial de auditoría
  getHistory() {
    return this.state.history;
  }

  // Obtener estadísticas en tiempo real
  getStats() {
    const activeBoats = this.state.boats.filter(b => b.status !== 'libre');
    const waitingCount = activeBoats.filter(b => b.status === 'espera').length;
    const occupiedLanes = activeBoats.filter(b => b.status === 'carril' || b.status === 'varada').length;
    const totalCapacity = 10; // Carriles 0 al 8 (9) + Varada (1) = 10 slots posibles en astillero

    return {
      totalActive: activeBoats.length,
      waiting: waitingCount,
      occupied: occupiedLanes,
      capacity: totalCapacity,
      occupancyPercentage: Math.round((occupiedLanes / totalCapacity) * 100)
    };
  }
}
