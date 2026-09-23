# EcoTrack — Sistema de Trazabilidad de Reciclaje Colectivo

Trabajo de Título (Capstone) — Ingeniería en Informática, Instituto Profesional Duoc UC — Asignatura APT122

## Equipo

- Álvaro Jaña
- Matías Bustamante
- Vicente Torres

## Descripción del proyecto

**EcoTrack** es un sistema de trazabilidad de reciclaje colectivo con incentivos verificables. A diferencia de las apps de reciclaje actuales, que confían ciegamente en la declaración del usuario, EcoTrack construye una **cadena de verificación completa**: cada acto de reciclaje genera evidencia real, no una simple declaración.

**El problema que resolvemos:**
- **Sin incentivo real** — reciclar no tiene un retorno concreto para el ciudadano.
- **Sin trazabilidad** — el residuo desaparece sin confirmación de destino.
- **Sin confianza** — nadie verifica si realmente llegó donde correspondía.

**Cadena de verificación EcoTrack:**
1. El **residente** escanea un código QR al depositar su reciclaje.
2. El **administrador** del edificio valida el depósito.
3. El **gestor** confirma el reciclaje efectivo.
4. Se emite un **certificado digital** único por ciclo completado.

**¿Por qué EcoTrack?**
- *Diferenciación real*: nadie en Chile ofrece verificación de cadena completa desde el ciudadano hacia arriba.
- *Viabilidad técnica*: prototipo acotado, realista y defendible como proyecto de título.
- *Proyección comercial*: modelo de negocio basado en suscripción organizacional + certificación premium.

> EcoTrack no es una app de reciclaje más. Es la capa que falta: evidencia verificable, desde el ciudadano hacia arriba.

## Alcance del proyecto de título

**Prototipo (App móvil, publicado también como app web instalable) que contiene lo siguiente:**

Sistema de trazabilidad de reciclaje colectivo con incentivos verificables.

## Estado actual de la implementación

Los módulos de más abajo describen el alcance planificado. Esto es lo que
realmente funciona hoy, contra Firebase real, no simulado:

| Módulo | Estado | Detalle |
|---|---|---|
| 1 — Incorporación | ✅ Implementado | Registro (residente o gestor con código), vinculación a torre por código, y promoción a administrador con el código propio de esa torre. Nadie se autoasigna un rol: lo exigen las reglas de Firestore, no la app. |
| 2 — Registro de reciclaje | 🔶 Parcial | Escaneo con cámara real y selección de material, en la versión web instalada. En el teléfono nativo (Expo Go) el código del contenedor se ingresa a mano. |
| 3 — Validación en 2 etapas | 🔶 Parcial | Las dos etapas (administrador → gestor) funcionan y están garantizadas por el servidor. Falta la validación diaria por lote como una sola operación atómica, y las notificaciones de avance. |
| 4 — Certificado digital | 🔶 Parcial | El PDF se genera y se descarga o comparte desde la versión web instalada. No está disponible todavía en el teléfono nativo. |
| 5 — Gamificación colectiva | 🔶 Parcial | Ranking semanal entre torres, misión de la torre con incentivo editable por el administrador, y misiones del sistema diarias y semanales con EcoPuntos, funcionando. Falta un marcador en tiempo real dedicado (hoy las métricas viven en el panel). |
| 6 — Panel del administrador | 🔶 Parcial | Validación de depósitos, edición de la misión/incentivo y métricas básicas de la torre. Falta gestión de usuarios y exportación de reportes mensuales en PDF. |

**Además, sin estar en el plan original:**
- App instalable como PWA en iPhone y Android, sin pasar por ninguna tienda de aplicaciones.
- Pantalla "Mi cuenta": editar nombre y departamento, cambiar contraseña, cerrar sesión.
- Barra de navegación inferior (Inicio / Misiones / Reciclados / Ranking) para el residente.

Detalle técnico completo en [SETUP-FIREBASE.md](SETUP-FIREBASE.md).

## Módulos

### Módulo 1 — Incorporación
Registro de usuarios en Android/iOS y vinculación obligatoria a una torre específica mediante invitación directa o código del administrador. Un usuario solo puede pertenecer a una torre a la vez.

### Módulo 2 — Registro de Reciclaje
Escaneo de código QR en el contenedor y selección del material (papel/cartón, plástico, vidrio, metal). El proceso no debe superar los 30 segundos.

### Módulo 3 — Validación en 2 Etapas
- **Administrador de la torre:** confirma la correcta deposición en el contenedor.
- **Gestor de reciclaje:** confirma el retiro y procesamiento del material.

El usuario recibe notificaciones de avance en un plazo máximo de 24 horas por etapa.

### Módulo 4 — Certificado Digital
Generación automática de un PDF descargable con código de verificación único al completar ambas etapas de validación.

### Módulo 5 — Gamificación Colectiva
Competencia enfocada en la torre (kg acumulados y % de departamentos participantes). Incluye:
- Marcador en tiempo real
- Ranking semanal entre torres
- Misiones colectivas con incentivos definidos por el administrador
- Misiones del sistema, individuales y alcanzables:
  - **Diarias (3 por día):** "Haz un depósito hoy" siempre, más dos que rotan (material del día, 1 kg en el día, dos depósitos).
  - **Semanales (3 por semana, lunes a domingo):** rotan entre reciclar en 3 días distintos, acumular 5 kg, 2 materiales distintos y 5 depósitos.
  - Cada misión entrega EcoPuntos. El avance se calcula en vivo con los depósitos del residente (pendientes, validados o certificados); un depósito rechazado deja de contar. No se guarda nada adicional en Firestore.

### Módulo 6 — Panel del Administrador
Gestión de usuarios, validación de depósitos, configuración de misiones e incentivos, visualización de métricas de desempeño y exportación de reportes mensuales en PDF.

## Contexto y Límites del Piloto

| Parámetro | Detalle |
|---|---|
| Entorno | Condominio residencial de al menos 2 torres |
| Requisitos mínimos | 8 usuarios activos, 1 administrador por torre operando al menos 4 semanas consecutivas, 1 gestor (simulado por el equipo de desarrollo) |
| Duración | Mínimo 4 semanas de operación real antes de la defensa del proyecto |
| Materiales permitidos | Papel/cartón, plástico, vidrio y metal |
| Materiales excluidos | Orgánicos, electrónicos y residuos especiales |

## Métricas de Éxito

### Funcionalidad
- Flujo completo (depósito a certificado) en menos de 48 horas
- 95% de lectura exitosa del QR
- 100% de certificados PDF generados automáticamente

### Usabilidad
- Al menos 60% de participación de usuarios registrados
- Proceso de alta y asociación a torre en menos de 5 minutos
- Gestión autónoma por parte del administrador

### Valor
- Al menos 1 certificado por usuario activo
- Ranking en tiempo real funcional
- Reportes mensuales exportables de forma autónoma

## Exclusiones del Alcance

Quedan fuera del prototipo:
- Integración con blockchain
- Expansión a empresas o colegios
- Conexión con gestores industriales reales
- Mapa territorial de impacto
- APIs públicas para terceros
- Modelos de análisis predictivo con IA

## Metodología de Desarrollo

Scrum adaptado, organizado en **6 sprints de dos semanas** (12 semanas totales):

1. **Sprint 1:** Arquitectura base, autenticación y vinculación a torres.
2. **Sprint 2:** Escaneo QR, selección de material e historial.
3. **Sprint 3:** Panel de administración y primera etapa de validación.
4. **Sprint 4:** Módulo de gestor, segunda validación y generación de PDF.
5. **Sprint 5:** Gamificación, ranking y misiones.
6. **Sprint 6:** Piloto en entorno real, ajuste de errores y documentación final.

 

**Trabajo futuro (documentado, fuera del alcance del prototipo):**
- Soporte multi-contexto (empresas, colegios, municipios)
- Registro en blockchain inmutable
- Integración con gestores industriales reales
- Mapa territorial de impacto ciudadano
- API pública para terceros

## Objetivo general

Desarrollar un sistema (prototipo) que permita registrar, validar y certificar de forma verificable el reciclaje realizado por una comunidad (ej: residentes de un edificio), entregando trazabilidad real entre el ciudadano, el administrador y el gestor de residuos.

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | React Native (Expo) + TypeScript + NativeWind (Tailwind CSS); publicado también como app web instalable (PWA) |
| Backend | Firebase — la cadena de verificación se garantiza con reglas de seguridad de Firestore; sin Cloud Functions por ahora (documentado como trabajo futuro en [SETUP-FIREBASE.md](SETUP-FIREBASE.md)) |
| Base de datos | Firestore |
| Autenticación | Firebase Auth |
| Escaneo QR | Cámara del navegador + `jsQR`, en la versión web instalada; `qrcode-generator` dibuja el código de cada contenedor |
| Certificado digital | `pdf-lib`, generado en el propio dispositivo |


> Stack definido para el prototipo. Algunas tecnologías (Firebase, NativeWind) son nuevas para el equipo — se documentará el proceso de aprendizaje y las decisiones técnicas en las evidencias de cada fase.

## Estructura del repositorio

El repositorio sigue la estructura de evidencias exigida por la asignatura, organizada por fase:

```
├── Fase 1/
│   ├── Evidencias Individuales/
│   └── Evidencias Grupales/
├── Fase 2/
│   ├── Evidencias Individuales/
│   ├── Evidencias Grupales/
│   └── Evidencias Proyecto/
│       ├── Evidencias de documentación/
│       └── Evidencias de sistema/
│           ├── Aplicación/
│           └── Base de datos/
└── Fase 3/
    ├── Evidencias Individuales/
    └── Evidencias Grupales/
```

Las evidencias individuales de cada integrante siguen el formato de nombre:
`APELLIDO_NOMBRE_x.x_APT122_NombreEvidencia.docx` (en mayúsculas y sin tildes).

## Estado del proyecto

- [x] Fase 1 — Definición del proyecto
- [ ] Fase 2 — Desarrollo del proyecto
- [ ] Fase 3 — Entrega final

## Cómo ejecutar la aplicación

```bash
# Clonar el repositorio
git clone https://github.com/usuario/nombre-repositorio.git

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (abre Expo Go / emulador)
npx expo start
```

> Requiere Node.js y la app **Expo Go** instalada en el celular (o un emulador Android/iOS) para probar la app durante el desarrollo. Configuración de Firebase (claves y proyecto) en [SETUP-FIREBASE.md](SETUP-FIREBASE.md).

### Instalar en el iPhone sin App Store (PWA)

EcoTrack se publica como aplicación web instalable (PWA), por lo que no requiere cuenta de desarrollador de Apple ni descargar nada:

```bash
node scripts/publicar.mjs
npx firebase-tools deploy --only hosting
```

Luego, en el iPhone: abrir `https://ecotrack-capstone-3f12d.web.app/` **en Safari** → botón Compartir → **Añadir a pantalla de inicio**. Se abre a pantalla completa, con su ícono y sin la barra del navegador. La sesión del ícono es independiente de la de Safari, así que hay que iniciar sesión una vez dentro de la app instalada.

## Licencia

Proyecto académico desarrollado en el contexto de la asignatura APT122.
