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

**Prototipo (App Movil) que contiene lo siguiente:**

Módulo 1: Incorporación: Registro de usuarios en Android/iOS y vinculación obligatoria a una torre específica mediante invitación directa o código del administrador. Un usuario solo puede pertenecer a una torre a la vez.
Módulo 2: Registro de Reciclaje: Escaneo de código QR en el contenedor y selección del material (papel/cartón, plástico, vidrio, metal). El proceso no debe superar los 30 segundos.
Módulo 3: Validación en 2 Etapas:
Administrador de la torre: Confirma la correcta deposición en el contenedor.
Gestor de reciclaje: Confirma el retiro y procesamiento del material.
El usuario recibe notificaciones de avance en un plazo máximo de 24 horas por etapa.
Módulo 4: Certificado Digital: Generación automática de un PDF descargable con código de verificación único al completar ambas etapas de validación.
Módulo 5: Gamificación Colectiva: Competencia enfocada en la torre (kg acumulados y % de departamentos participantes). Incluye marcador en tiempo real, ranking semanal entre torres y misiones colectivas con incentivos definidos por el administrador.
Módulo 6: Panel del Administrador: Gestión de usuarios, validación de depósitos, configuración de misiones e incentivos, visualización de métricas de desempeño y exportación de reportes mensuales en PDF.
Contexto y Límites del Piloto
Entorno: Condominio residencial de al menos 2 torres.
Requisitos mínimos: 8 usuarios activos, 1 administrador por torre operando al menos 4 semanas consecutivas y 1 gestor (simulado por el equipo de desarrollo).
Duración: Mínimo 4 semanas de operación real antes de la defensa del proyecto.
Materiales permitidos: Papel/cartón, plástico, vidrio y metal (se excluyen orgánicos, electrónicos y residuos especiales).
Métricas de Éxito
Funcionalidad: Flujo completo (depósito a certificado) en menos de 48 horas, 95% de lectura exitosa del QR y 100% de certificados PDF generados automáticamente.
Usabilidad: Al menos 60% de participación de usuarios registrados, proceso de alta y asociación a torre en menos de 5 minutos, y gestión autónoma por parte del administrador.
Valor: Al menos 1 certificado por usuario activo, ranking en tiempo real funcional y reportes mensuales exportables de forma autónoma.
Exclusiones del Alcance
Quedan fuera del prototipo la integración con blockchain, la expansión a empresas o colegios, la conexión con gestores industriales reales, el mapa territorial de impacto, APIs públicas para terceros y modelos de análisis predictivo con IA.
Metodología de Desarrollo
Se utiliza Scrum adaptado organizado en 6 sprints de dos semanas:
Arquitectura base, autenticación y vinculación a torres.
Escaneo QR, selección de material e historial.
Panel de administración y primera etapa de validación.
Módulo de gestor, segunda validación y generación de PDF.
Gamificación, ranking y misiones.
Piloto en entorno real, ajuste de errores y documentación final.

 

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
| Frontend móvil | React Native (Expo) + TypeScript + NativeWind (Tailwind CSS) |
| Backend | Firebase (Cloud Functions) |
| Base de datos | Firestore |
| Autenticación | Firebase Auth |
| Escaneo QR | expo-camera / expo-barcode-scanner |


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

> Requiere Node.js y la app **Expo Go** instalada en el celular (o un emulador Android/iOS) para probar la app durante el desarrollo. Configuración de Firebase (claves y proyecto) se documentará una vez creado el proyecto en la consola de Firebase.

## Licencia

Proyecto académico desarrollado en el contexto de la asignatura APT122.
