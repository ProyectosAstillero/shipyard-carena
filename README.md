# Gestión de Astillero - Control de Espacio para Carena

Aplicación web interactiva y responsiva de alto rendimiento diseñada para la planificación, control y gestión de espacios de carena de barcos en un astillero de **8 carriles principales**, un **carril de transferencia (Carril 0)** y una **rampa de varada (Slipway)**.

## 🚀 Características
*   **Visualizador Físico 2D**: Representación interactiva del astillero con estados dinámicos (badges de ocupación superior).
*   **Gráficos Vectoriales (SVG)**: Diseños de barcos específicos por tipo (Pesquero, Carguero, Remolcador, Yate).
*   **Drag & Drop e Inspector**: Desplace los barcos arrastrándolos o use el panel de control manual respetando el flujo físico real del astillero:
    $$\text{Bahía} \rightarrow \text{Varada} \rightarrow \text{Carril 0} \rightarrow \text{Carril (1-8)}$$
*   **Diagrama de Gantt**: Cronograma dinámico a 15 días con fechas estimadas de entrada y salida para planificar la capacidad.
*   **Bitácora en Tiempo Real**: Historial de auditoría detallado con buscador para registrar todas las operaciones.
*   **Persistencia Local**: Los datos se guardan automáticamente en el navegador (`localStorage`), permitiendo un uso continuo sin configurar servidores.

## 📁 Estructura del Código
*   `index.html`: Layout y componentes estructurales.
*   `styles.css`: Estilos visuales con tema oscuro premium.
*   `state.js`: Estado de la base de datos local y validación de traslados.
*   `visualizer.js`: Renderizado del mapa interactivo y drag-and-drop.
*   `app.js`: Coordinación de eventos, Gantt e inicializador de métricas.

## 💻 Ejecución Local
Simplemente abra `index.html` en cualquier navegador web, o inicie un servidor local:
```bash
python -m http.server 8000
```
Navegue a `http://localhost:8000`.
