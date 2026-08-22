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

**Prototipo (lo que se entrega):**
- Registro de reciclaje por QR
- Validación en dos etapas (administrador y gestor)
- Marcador colectivo del edificio (comparación entre comunidades/edificios)
- Panel del administrador con métricas
- Certificado PDF por ciclo completado
- Metodología de trabajo: Scrum, con sprints de 2 semanas

**Trabajo futuro (documentado, fuera del alcance del prototipo):**
- Soporte multi-contexto (empresas, colegios, municipios)
- Registro en blockchain inmutable
- Integración con gestores industriales reales
- Mapa territorial de impacto ciudadano
- API pública para terceros

## Objetivo general

Desarrollar un sistema (prototipo) que permita registrar, validar y certificar de forma verificable el reciclaje realizado por una comunidad (ej: residentes de un edificio), entregando trazabilidad real entre el ciudadano, el administrador y el gestor de residuos.

## Tecnologías utilizadas

*Aún por definir.* Se actualizará esta sección una vez que el equipo defina el stack (frontend, backend, base de datos y herramientas de apoyo) durante la Fase 1/2 del proyecto.

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
# (completar según el framework elegido, ej: flutter pub get / npm install)

# Ejecutar en modo desarrollo
# (completar comando de ejecución)
```

## Licencia

Proyecto académico desarrollado en el contexto de la asignatura APT122.
