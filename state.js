// Módulo de Gestión de Estado del Astillero (state.js) - Versión Dos Transfers

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
        status: "carril", // En carril de trabajo
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
        status: "carril", // En carril de trabajo
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
        status: "carril", // En carril de trabajo
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
        status: "carril", // En carril de trabajo
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
      { timestamp: "2026-06-15 10:15:00", boatName: "COPEINCA II", action: "VARADA", details: "Posicionado en cuna de varada (Slipway)." },
      { timestamp: "2026-06-15 11:00:00", boatName: "COPEINCA II", action: "TRASLADO", details: "Transferido lateralmente al carro de Varada (Naranja)." },
      { timestamp: "2026-06-15 11:30:00", boatName: "COPEINCA II", action: "TRASLADO", details: "Ingresó al Carril 0." },
      { timestamp: "2026-06-15 12:15:00", boatName: "COPEINCA II", action: "TRASLADO", details: "Bajó al Transfer de Popa (Posición 0)." },
      { timestamp: "2026-06-15 13:00:00", boatName: "COPEINCA II", action: "TRASLADO", details: "Desplazado horizontalmente al Carril 8 e ingresado a carena." }
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

  // Obtener el barco en una posición específica
  getBoatInLane(lane) {
    if (lane === 'VARADA') {
      return this.state.boats.find(b => b.status === 'cuna_varada');
    }
    if (lane === 'TRANSFER_VARADA') {
      return this.state.boats.find(b => b.status === 'transfer_varada');
    }
    if (typeof lane === 'string' && lane.startsWith('TRANSFER_POPA_')) {
      const pos = parseInt(lane.split('_')[2], 10);
      return this.state.boats.find(b => b.status === 'transfer_popa' && b.lane === pos);
    }
    const laneNum = parseInt(lane, 10);
    if (laneNum === 0) {
      return this.state.boats.find(b => b.status === 'carril_0');
    }
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

    // Verificar ocupación del destino
    if (targetStatus === 'cuna_varada') {
      const occupied = this.getBoatInLane('VARADA');
      if (occupied && occupied.id !== boatId) {
        return { allowed: false, message: `La Cuna de Varada ya está ocupada por ${occupied.name}.` };
      }
    } else if (targetStatus === 'transfer_varada') {
      const occupied = this.getBoatInLane('TRANSFER_VARADA');
      if (occupied && occupied.id !== boatId) {
        return { allowed: false, message: `El Transfer de Varada (Ramp) ya está ocupado por ${occupied.name}.` };
      }
    } else if (targetStatus === 'carril_0') {
      const occupied = this.getBoatInLane(0);
      if (occupied && occupied.id !== boatId) {
        return { allowed: false, message: `El Carril 0 de transferencia ya está ocupado por ${occupied.name}.` };
      }
    } else if (targetStatus === 'transfer_popa') {
      const occupied = this.getBoatInLane(`TRANSFER_POPA_${targetLane}`);
      if (occupied && occupied.id !== boatId) {
        return { allowed: false, message: `El Transfer de Popa en posición ${targetLane} está ocupado por ${occupied.name}.` };
      }
    } else if (targetStatus === 'carril') {
      const occupied = this.getBoatInLane(targetLane);
      if (occupied && occupied.id !== boatId) {
        return { allowed: false, message: `El Carril ${targetLane} ya está ocupado por ${occupied.name}.` };
      }
    }

    // REGLAS FÍSICAS DE MANIOBRA (2 TRANSFERS)
    
    // 1. Desde Espera (Mar) -> Solo puede entrar a Cuna de Varada (Slipway)
    if (currentStatus === 'espera') {
      if (targetStatus !== 'cuna_varada') {
        return { allowed: false, message: "Los barcos en la bahía deben entrar primero a la Cuna de Varada." };
      }
    }

    // 2. Desde Cuna de Varada -> Puede volver a Espera (Botadura) o pasar al Transfer de Varada (Naranja)
    if (currentStatus === 'cuna_varada') {
      if (targetStatus !== 'espera' && targetStatus !== 'transfer_varada') {
        return { allowed: false, message: "Desde la cuna de varada, el barco debe moverse al Transfer de Varada (Carro Horizontal de Varada)." };
      }
    }

    // 3. Desde Transfer de Varada -> Puede volver a Cuna de Varada o ingresar al Carril 0
    if (currentStatus === 'transfer_varada') {
      if (targetStatus !== 'cuna_varada' && targetStatus !== 'carril_0') {
        return { allowed: false, message: "El Transfer de Varada solo conecta la cuna de varada con el Carril 0." };
      }
    }

    // 4. Desde Carril 0 -> Puede subir al Transfer de Varada o bajar al Transfer de Popa (en posición 0)
    if (currentStatus === 'carril_0') {
      if (targetStatus === 'transfer_varada') {
        return { allowed: true };
      }
      if (targetStatus === 'transfer_popa') {
        if (targetLane !== 0) {
          return { allowed: false, message: "Desde el Carril 0, el barco solo puede bajar al Transfer de Popa en la posición 0." };
        }
      } else {
        return { allowed: false, message: "Maniobra inválida. Desde el Carril 0 debe ir al Transfer de Varada o al Transfer de Popa (Posición 0)." };
      }
    }

    // 5. Desde Transfer de Popa (Posición X):
    if (currentStatus === 'transfer_popa') {
      // Si quiere ir al mar (espera) directo: denegado
      if (targetStatus === 'espera') {
        return { allowed: false, message: "Debe pasar el barco por Carril 0, Transfer de Varada y Cuna de Varada para botarlo al mar." };
      }

      // Si está en la Posición 0: puede subir al Carril 0 (vertical) o moverse lateralmente a otra posición de Popa (1 a 8)
      if (currentLane === 0) {
        if (targetStatus === 'carril_0') {
          return { allowed: true };
        }
        if (targetStatus === 'transfer_popa') {
          // Movimiento lateral
          return { allowed: true };
        }
        return { allowed: false, message: "Desde el Transfer de Popa en posición 0, debe subir al Carril 0 o desplazarse horizontalmente a otras posiciones de popa (1-8)." };
      }
      
      // Si está en Posición X (1 a 8): puede moverse lateralmente a otra posición de Popa, o subir al Carril de Trabajo X
      if (currentLane > 0) {
        if (targetStatus === 'transfer_popa') {
          return { allowed: true }; // Desplazamiento lateral en la popa
        }
        if (targetStatus === 'carril') {
          if (targetLane !== currentLane) {
            return { allowed: false, message: `El Transfer de Popa está alineado con el Carril ${currentLane}. Para ir al Carril ${targetLane}, primero desplace el Transfer lateralmente.` };
          }
          return { allowed: true }; // Subir al carril
        }
        return { allowed: false, message: "Desde el Transfer de Popa alineado, debe subir al carril de trabajo correspondiente o desplazarse lateralmente." };
      }
    }

    // 6. Desde Carriles de Trabajo (1 a 8) -> Solo pueden bajar al Transfer de Popa correspondiente
    if (currentStatus === 'carril') {
      if (targetStatus !== 'transfer_popa' || targetLane !== currentLane) {
        return { allowed: false, message: `Para salir de carena del Carril ${currentLane}, debe descender el barco al Transfer de Popa en la posición ${currentLane}.` };
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
    } else if (targetStatus === 'cuna_varada') {
      boat.lane = null;
      this.logHistory(boat.name, 'VARADA', 'Barco posicionado en cuna de varada (Slipway).');
    } else if (targetStatus === 'transfer_varada') {
      boat.lane = null;
      this.logHistory(boat.name, 'TRASLADO', 'Desplazado al Transfer de Varada (Carro Horizontal superior).');
    } else if (targetStatus === 'carril_0') {
      boat.lane = 0;
      this.logHistory(boat.name, 'TRASLADO', 'Ingresado al carril vertical 0.');
    } else if (targetStatus === 'transfer_popa') {
      boat.lane = parseInt(targetLane, 10);
      const logMsg = `Posicionado en el Transfer de Popa (Posición ${targetLane}).`;
      this.logHistory(boat.name, 'TRASLADO', logMsg);
    } else if (targetStatus === 'carril') {
      boat.lane = parseInt(targetLane, 10);
      const logMsg = `Ingresado a carena en el Carril ${targetLane}.`;
      this.logHistory(boat.name, 'TRASLADO', logMsg);
    }

    this.saveState();
    return { success: true, boat };
  }

  // Botar/lanzar un barco (liberar espacio y enviarlo a agua/historial de terminados)
  launchBoat(boatId) {
    const boat = this.getBoatById(boatId);
    if (!boat) return { success: false, message: "El barco no existe." };

    // Debe estar en cuna_varada para ser lanzado al agua
    if (boat.status !== 'cuna_varada') {
      return { success: false, message: "El barco debe estar posicionado en la Cuna de Varada (Slipway) para realizar la botadura al mar." };
    }

    // Cambiar estado a 'libre' (eliminado del astillero activo pero queda registrado en historial)
    boat.status = 'libre';
    boat.lane = null;
    boat.progress = 100;
    this.logHistory(boat.name, 'BOTADURA', 'Maniobra de botadura completada. Barco entregado a armador.');

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
    
    // Contar slots físicos del astillero activos:
    // Cuna de varada (1) + Transfer de varada (1) + Carril 0 (1) + Transfer de Popa (1 de 9 slots) + Carriles 1-8 (8)
    const occupiedLanes = activeBoats.filter(b => b.status !== 'espera').length;
    const totalCapacity = 12; // Cuna (1) + Transfer Varada (1) + Carril 0 (1) + Transfer Popa (1) + Carriles 1-8 (8) = 12 slots max activos

    return {
      totalActive: activeBoats.length,
      waiting: waitingCount,
      occupied: occupiedLanes,
      capacity: totalCapacity,
      occupancyPercentage: Math.round((occupiedLanes / totalCapacity) * 100)
    };
  }
}
