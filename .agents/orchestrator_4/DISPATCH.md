## 2026-10-23T05:20:27Z

You are the Project Orchestrator for the stepped modular furniture project (muebles escalonados con alturas independientes por columna).

## Working Directory and Context
- Working Directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\orchestrator_4
- Project Root: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local
- Request Source: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local\.agents\ORIGINAL_REQUEST.md (see timestamp ## 2026-10-23T05:16:05Z)

## Verbatim User Request:
# Teamwork Project Prompt

Requested team: "un agente para cada una de estas tareas: modelo y layout de columnas con alturas independientes, editor 2D interactivo con (+) por columna y arrastre de bordes superiores, renderizado 3D de mueble escalonado con tapas individuales y cinemática (gavetas en escalera y puertas en bisagras), y despiece tabular en hoja de corte"

Implementar soporte completo para muebles modulares con alturas independientes por columna (muebles escalonados), permitiendo agregar módulos de tamaño predeterminado sobre cada columna sin alterar las columnas vecinas, ajustar alturas arrastrando el borde superior en 2D, renderizar el mueble escalonado en 3D con tapas independientes y cinemática realista, y calcular el despiece exacto en la hoja de corte.

Working directory: `C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local`
Integrity mode: development

## Requirements
### R1. Modelo de Datos y Layout con Alturas Independientes por Columna
- Cada columna del proyecto puede tener su propia altura individual (`column.height`), con fallback opcional a `project.settings.height`.
- Agregar un módulo sobre una columna (botón `(+)` superior) agrega un módulo de tamaño predeterminado (ej. 350mm o 400mm) aumentando **únicamente** la altura de esa columna específica, sin estirar, comprimir ni agregar módulos a las columnas contiguas.
- El cálculo geométrico de `computeLayout` debe calcular las coordenadas y alturas de cada columna de forma independiente a partir de su base común ($y = 0$).

### R2. Editor 2D Interactivo: Columnas Escalonadas y Arrastre de Bordes
- Renderizado SVG 2D fiel a la interfaz de referencia:
  - Cada columna se dibuja con su propia altura y su propia línea de tapa superior.
  - Cada columna dispone de su propio botón `(+)` centrado inmediatamente encima de su borde superior para añadir un módulo en esa columna.
  - Botones `(+)` laterales a la izquierda de la primera columna y a la derecha de la última columna para añadir columnas nuevas.
- Interacción de arrastre (drag-and-drop):
  - Permitir arrastrar la línea/borde superior de cualquier columna en el lienzo 2D para cambiar interactivamente la altura de esa columna sin alterar las demás.
  - Permitir arrastrar los divisores horizontales interiores para cambiar la proporción de los módulos internos dentro de la columna.

### R3. Generación y Renderizado 3D de Muebles Escalonados
- Estructura y carcasas tridimensionales independientes:
  - Cada columna tiene su propia tapa superior (`Tapa superior`) ubicada exactamente a la altura de esa columna.
  - Los laterales divisorios entre columnas de diferente altura se calculan y generan con la altura correspondiente (el lateral intermedio sube hasta la altura de la columna más alta, quedando expuesto en el escalón como en la referencia).
  - Fondo/trasera: se generan fondos acordes a la silueta escalonada del mueble.
- Cinemática y Aperturas:
  - **Gavetas**: Apertura graduada en cascada / escalera de abajo hacia arriba (la gaveta inferior se abre al 75% y las superiores progresivamente hasta el 35%), mostrando el interior de todas sin ocultarse.
  - **Puertas batientes**: El eje de giro debe ubicarse estrictamente en las bisagras exteriores laterales (para puertas dobles, abren hacia afuera alejándose del centro).

### R4. Despiece y Hoja de Corte Tabular para Muebles Escalonados
- Despiece exacto de tableros adaptado a las alturas escalonadas:
  - Laterales exteriores e interiores clasificados con sus alturas reales individuales.
  - Tapas superiores desglosadas por cada columna con sus medidas individuales de ancho y profundidad.
- Consistencia matemática: la suma de paneles y herrajes debe coincidir exactamente con el total de cotización y presentarse en formato tabular listo para imprimir con `Ctrl + P`.

## Acceptance Criteria
### Modelo y Layout Escalonado (R1)
- [ ] Cada columna soporta una altura independiente y `computeLayout` calcula celdas y piezas con la altura de su respectiva columna.
- [ ] Añadir un módulo con el botón `(+)` superior incrementa únicamente la altura de la columna seleccionada en la medida predeterminada, sin afectar las medidas de las demás columnas.
### Interfaz 2D y Arrastre de Altura (R2)
- [ ] En la vista 2D se visualiza la silueta escalonada de las columnas con diferentes alturas.
- [ ] Cada columna muestra su propio botón `(+)` flotando sobre su borde superior.
- [ ] Al arrastrar verticalmente el borde superior de una columna en 2D, se redimensiona en tiempo real la altura de esa columna.
- [ ] El arrastre de divisores internos dentro de una columna funciona manteniendo las cotas de seguridad mínimas (>= 50mm).
### Visor 3D y Cinemática (R3)
- [ ] El modelo 3D refleja fielmente el diseño escalonado con tapas superiores en cada escalón y laterales compartidos correctamente dimensionados.
- [ ] Al activar el modo "Puertas abiertas", las gavetas se abren en escalera de abajo hacia arriba (más abierta la inferior que la superior).
- [ ] Las puertas batientes dobles y simples pivotan en sus bisagras exteriores abriendo hacia los extremos.
### Hoja de Corte (R4)
- [ ] La tabla de corte refleja las piezas reales con dimensiones desiguales correspondientes a las diferentes alturas de columnas.
- [ ] Todos los tests de la suite (`npm test`) pasan al 100% sin regresiones.
