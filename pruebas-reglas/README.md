# Tests de las reglas de Firestore

Comprueban [`firestore.rules`](../firestore.rules) contra el emulador de
Firestore, sin tocar el proyecto real. Por cada regla que protege la cadena de
verificación hay casos que deben permitirse (lo que hace la app) y casos que
deben rechazarse (lo que intentaría alguien escribiendo directo a la base de
datos): inventar kilos, depositar en otra área, atrasar la fecha de un
depósito, validar en otra planta, certificar sin registrar el retiro, inflar
el resumen de un área, autoasignarse un rol, leer los códigos de rol, etc.

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

`npm test` levanta el emulador, corre con el runner de Node todos los archivos
`*.test.mjs` de esta carpeta, uno tras otro porque comparten el emulador, y lo
apaga. Hay un archivo por tema. Los datos base con que parte cada test están en
[`comun.mjs`](comun.mjs): una planta con dos áreas, sus colaboradores, la
validadora y la administradora, otra planta para comprobar que nadie actúa
fuera de la suya, contenedores y dos depósitos.

Si cambias una regla, agrega aquí el caso que la justifica. Si cambias lo que
escribe la app en un depósito (`crearRegistro` en
`app/src/services/registros.ts`), actualiza también `deposito()` en
`comun.mjs`.
