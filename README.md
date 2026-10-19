# RecyTrack — Sistema de Trazabilidad de Reciclaje Colectivo

Trabajo de Título (Capstone) — Ingeniería en Informática, Instituto Profesional Duoc UC — Asignatura APT122

## Equipo

- Álvaro Jaña
- Matías Bustamante
- Vicente Torres

## Descripción del proyecto

**RecyTrack** es un sistema de trazabilidad del reciclaje de uso diario en la planta de **Viñedos Familia Chadwick**. Los colaboradores reciclan todos los días en el casino, las oficinas y las salas de descanso, pero ese reciclaje no deja registro: no se sabe cuánto se junta, qué áreas participan, si los contenedores están bien separados ni si el material se retiró. RecyTrack construye una **cadena de verificación**: cada depósito queda registrado, una persona lo valida en el punto limpio y se certifica cuando el material sale de la planta.

**El problema que resolvemos:**
- **Sin registro** — el reciclaje de la planta existe, pero no se puede medir ni mostrar.
- **Sin trazabilidad** — no se sabe si lo que se juntó se retiró ni con qué calidad de separación.
- **Sin confianza** — las apps de reciclaje cuentan lo que declara el usuario; nadie lo revisa.

**Cadena de verificación RecyTrack:**
1. El **colaborador** escanea el código QR del contenedor y declara el material y la talla de la bolsa.
2. El **validador** hace una ronda diaria por los puntos limpios y valida cada contenedor completo: *conforme*, *con observación* (por ejemplo, vidrio en el de papel) o *sin material*.
3. El **administrador** registra el retiro del material desde el panel web, con el N° de guía y el peso si lo hubo. Ese retiro **certifica** los depósitos validados de esos contenedores.
4. Cada colaborador recibe un **certificado mensual** en PDF y el administrador descarga el **reporte mensual** de la planta.

Quien retira el material no es usuario del sistema: el retiro lo registra el administrador, que es quien recibe la guía o el comprobante.

**Principios del producto:**
- *Solo cuenta lo validado*: un depósito declarado y no revisado no suma a ningún indicador.
- *La estimación se rotula como estimación*: los kilos salen de la talla de la bolsa; solo un retiro con peso informado es un dato medido.
- *El incentivo es colectivo y nunca en kilos*: se compite por área y por participación, porque premiar kilos invita a inflarlos.
- *Privacidad entre compañeros*: nadie ve lo que registró otra persona; los nombres solo los ve el administrador.
- *Costo cero para la viña*: los celulares de los colaboradores, QR impresos y el plan gratuito de Firebase. Sin balanzas ni sensores.

> RecyTrack no es una app de reciclaje más. Verifica el acto donde ocurre, con personal que ya existe y sin instrumentos de medición.

**Sobre el nombre:** el proyecto partió como EcoTrack y pasó a llamarse RecyTrack para no confundirlo con otra app de Duoc UC que ya usa ese nombre. El cambio es solo en lo que se ve: el proyecto de Firebase (`ecotrack-capstone-3f12d`), la URL de la app, el prefijo `ECOTRACK:` de los códigos QR y los nombres del código (`state/EcoTrack.tsx`, `useEcoTrack`) siguen igual, porque son internos y cambiarlos rompería la base de datos y los QR ya generados.

**Sobre el cambio de contexto:** la propuesta de la Fase 1 era para un condominio (torres, departamentos y un gestor de reciclaje). Al cerrar el flujo con la viña, a fines de septiembre de 2026, el piloto pasó a la planta: las torres son ahora **áreas**, el administrador del edificio pasó a ser el **validador** y el **gestor** desapareció como usuario, porque el retiro lo registra el administrador desde el panel. El detalle está en la [metodología](Fase%202/Evidencias%20Proyecto/Evidencias%20de%20documentación/RecyTrack_Metodologia.docx) y en la [visión del producto](Fase%202/Evidencias%20Proyecto/Evidencias%20de%20documentación/RecyTrack_Product_Vision.docx).

## Alcance del proyecto de título

Prototipo publicado como **aplicación web instalable (PWA)** para el colaborador y el validador, y un **panel web** para el administrador.

## Estado actual de la implementación

Esto es lo que funciona hoy, contra Firebase real, no simulado:

| Módulo | Estado | Detalle |
|---|---|---|
| 1 — Incorporación | ✅ Implementado | Todos se registran como colaboradores. Quien se registra con contraseña debe confirmar su correo antes de unirse a un área, y se une con el código del área. Al validador lo nombra el administrador desde el panel, y ser administrador exige el código de administrador de la planta. Nadie se autoasigna un rol: lo exigen las reglas de Firestore, no la app. También se puede entrar con una cuenta de Google o de Microsoft. |
| 2 — Registro de reciclaje | ✅ Implementado | Escaneo con la cámara del QR del contenedor. Cada contenedor tiene un código aleatorio (no adivinable: hay que estar frente a él para registrar) y puede ser mixto o de un material; en ese caso el material queda elegido al escanear y las reglas no aceptan otro. Luego se elige la talla de bolsa (S, M, L o XL) en vez del peso: la app estima los kilos con una tabla por material que las reglas exigen, así que no se pueden inventar. En el teléfono nativo (Expo Go) el código del contenedor se escribe a mano. |
| 3 — Ronda diaria de validación | ✅ Implementado | El validador valida contenedor por contenedor, no persona por persona: ve cuántos depósitos se declararon en cada uno y de qué tallas, y lo compara con lo que hay adentro. Cada contenedor queda *conforme*, *con observación* (se registra el contaminante: los depósitos se validan igual, porque no se sabe quién fue, y se avisa al administrador y a la planta) o *sin material* (se rechazan sus depósitos). "Validar la tanda del día" valida todo de una vez. Rechazar un depósito suelto queda para excepciones. Cada acción es una sola operación atómica: o se guarda completa o no se guarda nada. |
| 4 — Retiro y certificación | ✅ Implementado | Desde el panel, el administrador elige los contenedores que salieron, la fecha, quién retiró, el N° de guía y el peso (opcionales). Antes de registrar ve las advertencias de los contenedores contaminados. El retiro certifica en un solo lote los depósitos validados de esos contenedores y no se puede editar ni borrar. |
| 5 — Certificado y reporte mensual | ✅ Implementado | **Certificado mensual** por colaborador (no uno por depósito, que no tenía sentido para una botella suelta): kilos certificados del mes, desglose por material, código único y cada depósito con sus fechas de depósito, validación y retiro. **Reporte mensual** de la planta para el administrador: kilos certificados, participación comparada con la meta de 60 %, depósitos por estado, participación por área, retiros, contenedores contaminados y tiempo de la cadena comparado con la meta de 48 horas. Ambos se descargan en PDF en la versión web; en el teléfono nativo todavía no. |
| 6 — Campañas y ranking por área | ✅ Implementado | Ranking del mes entre las áreas de la planta por **participación** (el % de la dotación del área que recicló), con podio. Campaña de la planta con meta de participación, incentivo y fecha de término, editable por el administrador. Además, una misión semanal del sistema con EcoPuntos en el Inicio del colaborador. |
| 7 — Panel web del administrador | ✅ Implementado | Seis secciones: **Resumen** (analítica del mes), **Puntos limpios** (contenedores, impresión de sus QR y cambio de código si se filtra), **Personas y áreas** (crear áreas con su código y dotación, buscar personas, cambiarlas de área y nombrar al validador), **Rondas** (el estado de la ronda en cada día del mes), **Campañas** y **Retiros y reportes**. En un teléfono se le pide abrirlo en el computador, porque las tablas no caben. |
| Avisos | 🔶 Parcial | Avisos de avance dentro de la app, con un banner cuando ocurre el evento y una 🔔 con contador: al colaborador cuando su depósito se valida, se rechaza o se certifica; al validador por cada depósito por validar; al administrador por cada contenedor listo para retiro o contaminado. Faltan las notificaciones push con la app cerrada, que requieren el plan Blaze de Firebase. |

**Además:**
- App instalable como PWA en iPhone y Android, sin pasar por ninguna tienda de aplicaciones. En el iPhone no hace zoom al escribir ni al tocar dos veces seguidas, pero se mantiene el zoom con dos dedos por accesibilidad.
- Pantalla "Mi cuenta": editar el nombre, cambiar la contraseña y cerrar sesión.
- Barra de navegación inferior (Inicio / Reciclados / Ranking) para el colaborador.

Detalle técnico completo en [SETUP-FIREBASE.md](SETUP-FIREBASE.md).

## Módulos

### Módulo 1 — Incorporación
Registro desde el teléfono y vinculación obligatoria a un área de la planta con el código del área. Una persona pertenece a una sola área a la vez. El alta y la vinculación deben tomar menos de 5 minutos.

### Módulo 2 — Registro de reciclaje
Escaneo del QR del contenedor (uno por contenedor; si el punto limpio los tiene separados por material, el QR ya dice el material), selección del material (papel/cartón, plástico, vidrio, metal) y de la talla de la bolsa (S, M, L o XL). No se pide el peso: la app estima los kilos según material y talla. La bolsa es solo la referencia de cuánto se trae: el material se vacía suelto en el contenedor y la bolsa se guarda, porque una bolsa plástica dentro contamina el reciclaje. Registrar debe tomar segundos.

### Módulo 3 — Ronda diaria de validación
El validador (con un suplente) ya recorre la planta por su trabajo. Una vez al día pasa por los puntos limpios y marca cada contenedor con uno de tres resultados: conforme, con observación o sin material. No pesa ni mide.

### Módulo 4 — Retiro y certificación
El administrador registra desde el panel cada retiro de material, con su guía o comprobante. Al registrarlo se certifican los depósitos validados de los contenedores retirados: es la última etapa de la cadena.

### Módulo 5 — Certificado y reporte mensual
Certificado mensual en PDF para cada colaborador, con código único, y reporte mensual en PDF de la planta, generados sin intervención manual.

### Módulo 6 — Campañas y ranking por área
Competencia entre áreas por participación, no por kilos. Incluye:
- Ranking del mes entre áreas, actualizado con cada depósito.
- Campaña de la planta con meta de participación e incentivo colectivo definidos por el administrador.
- Misión semanal del sistema, individual y alcanzable, en una tarjeta de Inicio:
  - **Una por semana** (lunes a domingo), que rota entre reciclar al menos una vez, reciclar 2 materiales distintos o juntar 3 kg. Cada una se cumple con una o dos bajadas al contenedor.
  - Es semanal y no diaria a propósito: la gente no tiene residuos para reciclar todos los días. Tampoco depende de cuándo se retira el contenedor, porque un depósito cuenta desde que se registra.
  - Cumplirla entrega 50 EcoPuntos, que se muestran como total del mes. El avance se calcula en vivo con los depósitos del colaborador (pendientes, validados o certificados); un depósito rechazado deja de contar. No se guarda nada adicional en Firestore.
  - Ninguna misión premia la cantidad de depósitos, para no incentivar dividir uno en varios.
  - Si un depósito completa la misión, la pantalla de confirmación lo celebra con los EcoPuntos ganados.

### Módulo 7 — Panel web del administrador
Configuración de la planta (áreas, puntos limpios y contenedores con sus QR, personas y validador), seguimiento de las rondas, campañas, registro de retiros, métricas del mes y descarga del reporte mensual.

## Contexto y límites del piloto

| Parámetro | Detalle |
|---|---|
| Entorno | Planta de Viñedos Familia Chadwick, con las áreas y los puntos limpios que defina la viña |
| Usuarios | Colaboradores de las áreas participantes, un validador titular y un suplente, y el administrador del programa (área de Sostenibilidad y Calidad) |
| Duración | Cuatro semanas de operación real, desde el cierre del sprint 4 |
| Materiales permitidos | Papel/cartón, plástico, vidrio y metal |
| Fuera del alcance | Residuos industriales y del proceso vitivinícola, orgánicos, electrónicos y residuos especiales |

## Métricas de éxito

| Dimensión | Indicador | Meta |
|---|---|---|
| Participación | Colaboradores registrados que reciclan en el mes | 60 % o más |
| Operación | Rondas diarias completadas | 70 % o más |
| Funcionalidad | Tiempo promedio desde el depósito hasta su certificación | Menos de 48 horas |
| Funcionalidad | Lecturas de QR exitosas | 95 % o más |
| Funcionalidad | Reportes y certificados emitidos sin intervención manual | 100 % |
| Usabilidad | Alta de un colaborador y vinculación a su área | Menos de 5 minutos |
| Usabilidad | El administrador opera el panel y descarga el reporte sin ayuda técnica | Sí |

## Exclusiones del alcance

RecyTrack no gestiona los residuos industriales ni los del proceso vitivinícola, no mide el peso con instrumentos, no avisa cuando un punto limpio está lleno y no reemplaza a las empresas que retiran el material. Tampoco es un sistema de puntos canjeables individuales: el incentivo lo define la viña y es para el área.

**Trabajo futuro (documentado, fuera del alcance del prototipo):**
- Notificaciones push con la app cerrada y cálculos en el servidor (Cloud Functions), cuando exista presupuesto para el plan Blaze.
- Extender el sistema a otras plantas de la viña: el modelo de datos ya considera más de una.
- Integración con los gestores que retiran el material.

## Metodología de desarrollo

Scrum adaptado al contexto académico: un **sprint 0** de validación en terreno y **seis sprints de dos semanas**. El piloto de cuatro semanas en la planta empieza al cierre del sprint 4 y corre en paralelo con los sprints 5 y 6.

| Sprint | Semanas | Objetivo |
|---|---|---|
| S0 | 3 y 4 | Validación en terreno del problema y de la ronda diaria con la viña. |
| S1 | 5 y 6 | Arquitectura base, modelo de datos de la planta, autenticación, roles y vinculación a un área. |
| S2 | 7 y 8 | Registro de reciclaje por QR, con material, talla de bolsa e historial del colaborador. |
| S3 | 9 y 10 | Ronda diaria del validador: conforme, con observación y sin material. |
| S4 | 11 y 12 | Retiros desde el panel, reporte mensual y certificado mensual. Al cierre comienza el piloto. |
| S5 | 13 y 14 | Panel web del administrador, campañas y ranking de áreas por participación. |
| S6 | 15 a 17 | Cierre del piloto, plan de pruebas, medición de métricas y documentación final. |

La presentación final es en la semana 18. Roles: Matías Bustamante es Scrum Master; Álvaro Jaña y Vicente Torres son el equipo de desarrollo, y la contraparte de la viña es el dueño del producto. Detalle en [RecyTrack_Metodologia.docx](Fase%202/Evidencias%20Proyecto/Evidencias%20de%20documentación/RecyTrack_Metodologia.docx); el avance está en el Product Backlog y el Sprint Backlog de la misma carpeta.

## Objetivo general

Desarrollar un sistema (prototipo) que permita registrar, validar y certificar el reciclaje de uso diario de los colaboradores de una planta, entregando a la empresa datos verificados de cuánto se recicla, en qué áreas y con qué calidad, sin balanzas ni sensores.

## Tecnologías utilizadas

| Capa | Tecnología |
|---|---|
| Frontend | React Native (Expo) + TypeScript + NativeWind (Tailwind CSS); publicado como app web instalable (PWA) |
| Backend | Firebase — la cadena de verificación se garantiza con reglas de seguridad de Firestore; sin Cloud Functions por ahora (documentado como trabajo futuro en [SETUP-FIREBASE.md](SETUP-FIREBASE.md)) |
| Base de datos | Firestore |
| Autenticación | Firebase Auth (correo y contraseña, Google y Microsoft) |
| Hosting | Firebase Hosting |
| Escaneo QR | Cámara del navegador + `jsQR`, en la versión web instalada; `qrcode-generator` dibuja el código de cada contenedor |
| Certificado y reporte | `pdf-lib`, generados en el propio dispositivo |

## Estructura del repositorio

El repositorio sigue la estructura de evidencias exigida por la asignatura, organizada por fase:

```
├── app/                 la aplicación (Expo + React Native)
├── firestore.rules      reglas de seguridad de Firestore
├── pruebas-reglas/      tests de las reglas contra el emulador
├── Fase 1/
│   ├── Evidencias Individuales/
│   ├── Evidencias Grupales/
│   └── Evidencias Adicionales/
├── Fase 2/
│   ├── Evidencias Individuales/
│   ├── Evidencias Grupales/
│   ├── Evidencias Adicionales/
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
git clone https://github.com/AlvaroAjg/Capstone-Ecotrack.git
cd Capstone-Ecotrack/app

# Instalar dependencias
npm install

# Ejecutar en modo desarrollo (abre Expo Go / emulador)
npx expo start
```

> Requiere Node.js y la app **Expo Go** instalada en el celular (o un emulador Android/iOS) para probar la app durante el desarrollo. Con `npm run web` se abre la versión web, que es la que tiene el escáner y los PDF. Configuración de Firebase (claves y proyecto) en [SETUP-FIREBASE.md](SETUP-FIREBASE.md).

### Instalar en el teléfono sin tienda de aplicaciones (PWA)

RecyTrack se publica como aplicación web instalable (PWA), por lo que no requiere cuenta de desarrollador de Apple ni descargar nada. Desde la raíz del repositorio:

```bash
node scripts/publicar.mjs
npx firebase-tools deploy --only hosting
```

Luego, en el iPhone: abrir `https://ecotrack-capstone-3f12d.web.app/` **en Safari** → botón Compartir → **Añadir a pantalla de inicio**. Se abre a pantalla completa, con su ícono y sin la barra del navegador. La sesión del ícono es independiente de la de Safari, así que hay que iniciar sesión una vez dentro de la app instalada.

## Tests

Hay dos grupos de tests automáticos:

| Qué prueban | Dónde | Cómo se corren |
|---|---|---|
| **La lógica de la app**: kilos por talla, misiones y EcoPuntos, certificado mensual, avisos, lectura del QR, ranking por área, rondas del mes, retiros, resumen del panel y reporte mensual de la planta. También que la tabla de kilos y la lista de contaminantes coincidan con las de las reglas. | [`app/pruebas/`](app/pruebas) | `cd app` y `npm test` |
| **Las reglas de seguridad de Firestore**: que nadie pueda inventar kilos, registrar en un área que no es la suya, validar sus propios depósitos, saltarse etapas de la cadena o darse un rol, contra un emulador de Firestore. Requiere Java 21. | [`pruebas-reglas/`](pruebas-reglas/README.md) | `cd pruebas-reglas` y `npm test` |

Ninguno toca la base de datos real.

## Licencia

Proyecto académico desarrollado en el contexto de la asignatura APT122.
