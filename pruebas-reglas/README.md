# Tests de las reglas de Firestore

Comprueban [`firestore.rules`](../firestore.rules) contra el emulador de
Firestore, sin tocar el proyecto real. Por cada regla que protege la cadena de
verificación hay casos que deben permitirse (lo que hace la app) y casos que
deben rechazarse (lo que intentaría alguien escribiendo directo a la base de
datos): inventar kilos o departamentos, atrasar la fecha de un depósito,
validar en otra torre, autoasignarse un rol, leer los códigos de rol, etc.

## Requisitos

- Node 20 o superior
- Java 21 o superior (el emulador corre en Java). En Windows:
  `winget install EclipseAdoptium.Temurin.21.JRE`

## Correr

```bash
cd pruebas-reglas
npm install
npm test
```

`npm test` levanta el emulador, corre [`reglas.test.mjs`](reglas.test.mjs) con
el runner de Node y apaga el emulador. Cada test parte de la misma base: dos
torres, sus códigos de rol, residentes, administradores, un gestor,
contenedores y dos depósitos.

Si cambias una regla, agrega aquí el caso que la justifica. Si cambias lo que
escribe la app en un depósito (`crearRegistro` en
`app/src/services/registros.ts`), actualiza también `deposito()` en el test.
