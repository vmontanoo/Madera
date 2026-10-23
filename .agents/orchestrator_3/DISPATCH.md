## 2026-10-23T00:40:10Z

<USER_REQUEST>
Evolucionar la réplica local de Madera hacia una versión profesional completa: autenticación moderna (registro/login y Google OAuth), nuevo dashboard principal con galería de muebles prediseñados (closet, mesa de noche, centro de entretenimiento, cocina) y pestaña de proyectos con importación/creación, depuración de controles obsoletos y ampliación de tipos de apertura (puertas corredizas, acordeón/plegables y abatibles hacia arriba), y un entorno 3D avanzado con modos de render (normal, puertas abiertas, explosión), temas visuales (a color realista vs. negro con aristas naranja y cuadrícula punteada), sombras y widget tridimensional interactivo de orientación.

Working directory: C:\Users\rosibel m\.gemini\antigravity\scratch\madera-local
Integrity mode: development

## Requirements

### R1. Autenticación y Cuentas (Registro / Login / Google Sign-In)
- Página de registro profesional solicitando nombre/datos del usuario, correo electrónico y contraseña.
- Página de login limpia con opción directa de inicio de sesión con Google (Google Sign-In / OAuth).
- Manejo seguro de sesiones locales y persistencia de perfiles en la base de datos SQLite.

### R2. Dashboard Principal (Demos Prediseñados, Proyectos e Importación)
- Vista principal organizada en dos pestañas:
  1. **Galería de Demos**: muebles prediseñados listos para visualizar o editar:
     - Closet modular completo (con repisas, percheros y gavetas).
     - Mesa de noche moderna.
     - Centro de entretenimiento / TV rack.
     - Mueble bajo de cocina modular.
  2. **Mis Proyectos** (pestaña sombreada/activa): listado de proyectos creados por el usuario con opciones de duplicar, renombrar y eliminar.
- Acceso en la esquina superior del menú principal para:
  - Botón **"Nuevo mueble"** desde cero.
  - Botón **"Importar archivo"** compatible (JSON de proyecto exportado).

### R3. Depuración de Controles y Nuevos Tipos de Apertura y Módulos
- Limpiar y remover botones redundantes u obsoletos del panel de control de módulos acumulados en iteraciones previas.
- Ampliar el catálogo de aperturas y frentes:
  - **Puertas corredizas** (sliding doors superpuestas con riel).
  - **Puertas plegables / acordeón** (bi-fold doors).
  - **Puertas abatibles hacia arriba** (lift-up flap doors con pistones/compases).
- Integración en el Cutlist: cálculo de los herrajes específicos (guías corredizas, bisagras especiales, pistones a gas) y desglose de tableros.

### R4. Visor 3D Avanzado (Modos, Temas Visuales, Sombras y Widget)
- Barra de herramientas superior del visor 3D (similar a la barra de iconos de madera.app):
  - **Estados de visualización**:
    1. *Normal*: mueble cerrado sin explosión ni puertas abiertas.
    2. *Puertas abiertas*: animación/posición de apertura en puertas y gavetas.
    3. *Despiece / Explosión*: separación tridimensional de todos los paneles.
  - **Temas de renderizado**:
    1. *Color y textura*: visualización actual a color/materiales.
    2. *Modo Contorno Naranja sobre Negro*: fondo negro carbón, cuadrícula sutil punteada en el suelo, paneles oscuros y aristas delineadas en naranja brillante exactas a la captura de referencia.
- **Iluminación y Sombras**: sombras suaves en tiempo real sobre el plano base y entre componentes.
- **Widget 3D de Orientación**: pequeño gizmo/widget tridimensional interactivo en la esquina inferior derecha que rota solidariamente con la cámara mostrando la orientación de los ejes y vistas.

## Acceptance Criteria

### Autenticación y Google Sign-In (R1)
- [ ] Vistas de Login y Registro diferenciadas, con campos validados (nombre, correo, password).
- [ ] Botón de Google Sign-In funcional (con flujo OAuth o simulación local de proveedor para desarrollo sin credenciales externas).

### Dashboard y Demos (R2)
- [ ] Pantalla principal con pestañas para "Demos prediseñados" y "Mis proyectos".
- [ ] Al seleccionar cualquier demo (closet, mesa de noche, centro de TV, cocina), se abre en el editor con su geometría preconfigurada.
- [ ] Botones de "+ Nuevo proyecto" e "Importar JSON" accesibles en la cabecera.

### Catálogo de Puertas y Limpieza de UI (R3)
- [ ] Panel inferior sin botones duplicados o en desuso.
- [ ] Selector de puertas con opciones: `corredizas`, `acordeón`, `abatible arriba` además de las batientes existentes.
- [ ] Los herrajes de cada nuevo tipo se calculan y listan correctamente en la hoja de cortes.

### Visor 3D, Modos, Sombras y Widget (R4)
- [ ] Iconos/botones en la esquina superior del 3D para alternar entre: mueble cerrado, puertas abiertas y explosión.
- [ ] Botón de tema para alternar entre vista a color y vista negro con líneas naranja neón idéntica a la imagen.
- [ ] Suelo con cuadrícula de puntos y sombras proyectadas.
- [ ] Widget tridimensional en la esquina inferior derecha que gira sincronizado con el ratón.

</USER_REQUEST>
