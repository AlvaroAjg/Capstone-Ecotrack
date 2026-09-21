# EcoTrack — Puesta en marcha del backend

Guía para dejar corriendo la app con Firebase real. Proyecto:
`ecotrack-capstone-3f12d`.

---

## 1. Instalar dependencias

Desde la carpeta `app/`:

```bash
npx expo install firebase @react-native-async-storage/async-storage
```

Luego arrancar:

```bash
npx expo start -c
```

El `-c` limpia la caché de Metro. Es importante la primera vez, porque cambió
la estructura de carpetas.

---

## 2. Consola de Firebase (una sola vez)

1. **Authentication → Sign-in method → Correo electrónico/contraseña → Habilitar.**
2. **Firestore Database → Crear base de datos → modo de prueba** (ubicación
   `southamerica-east1`).

Déjalo en modo de prueba por ahora: el paso 3 necesita escribir sin reglas.

---

## 3. Preparar todo, de un toque

Abre la app. En la pantalla de login, abajo, botón
**"Preparar todo para la demostración"**. Tócalo una vez.

Crea en Firestore las dos torres del condominio piloto:

| Torre | Código | Meta mensual | Deptos. |
|---|---|---|---|
| Torre A | `ECO-TORRE-A` | 200 kg | 24 |
| Torre B | `ECO-TORRE-B` | 150 kg | 19 |

Y las tres cuentas, ya vinculadas a su torre:

| Rol | Correo | Contraseña |
|---|---|---|
| 🏠 Residente | `residente@ecotrack.cl` | `ecotrack2026` |
| 🛡️ Administrador | `admin@ecotrack.cl` | `ecotrack2026` |
| 🚛 Gestor | `gestor@ecotrack.cl` | `ecotrack2026` |

El botón solo aparece en desarrollo (`__DEV__`), nunca en una build de
producción, y se puede volver a tocar sin problema: si algo ya existe, lo salta.

> Estas cuentas son de prueba dentro de tu propio proyecto. Antes del piloto
> real conviene borrarlas desde Authentication en la consola. Los residentes
> reales se registran ellos mismos desde **Crear cuenta**, eligiendo su rol y
> vinculando su torre con el código.

---

## 4. Aplicar las reglas de seguridad

Recién ahora, en **Firestore Database → Reglas**, reemplaza todo por el
contenido de `firestore.rules` (raíz del repo) y publica.

Las reglas hacen cumplir la cadena de verificación a nivel de base de datos:

- un residente solo crea depósitos a su nombre y en estado `pendiente`;
- solo el administrador **de esa torre** puede pasar `pendiente → validado`
  o `rechazado`;
- solo el gestor puede pasar `validado → certificado`;
- nadie puede cambiar su propio rol ni borrar un registro.

Es la parte defendible del proyecto: la trazabilidad no depende de que la app
se porte bien, está garantizada por el servidor.

---

## 5. La demo

Con dos teléfonos (o un teléfono + emulador):

1. **Teléfono A, residente:** Escanear QR → material → peso → registrar. El QR
   del contenedor lo muestra el administrador en **Contenedor de la torre →
   Mostrar QR** (en pantalla o impreso). Si la cámara no lo lee, se puede
   escribir el código a mano (`T-A-01`). Un QR de otra torre es rechazado.
2. **Teléfono B, administrador:** el depósito **aparece solo, sin recargar**.
   Ajusta el peso si a la vista difiere, y valida. O usa
   **"Validar la tanda del día"** para cerrar toda la cola de una vez, que es
   como trabaja el conserje en la realidad.
3. **Teléfono B, gestor** (cerrar sesión y entrar con la cuenta de gestor):
   confirmar retiro → se emite el certificado con código único.
4. **Teléfono A:** el estado cambió a *Certificado* en vivo, con su código.

Esa es la cadena completa funcionando contra un backend real.

---

## Modelo de datos

```
torres/{torreId}
  nombre, condominio, codigoInvitacion, metaKg, deptosTotales

usuarios/{uid}                       ← uid de Firebase Auth
  nombre, email, rol, depto, torreId, torreNombre, creadoEn

registros/{id}
  residenteId, residente, depto, torreId, torreNombre,
  material, kgDeclarado, kgConfirmado, contenedor, estado,
  creadoEn, validadoEn, validadoPor,
  certificadoEn, certificadoPor, codigo, codigoRetiro
```

**Decisiones a defender:**

- `kgDeclarado` vs `kgConfirmado`: no hay balanza, la validación es visual. El
  residente estima, el administrador corrige a ojo al validar. Las métricas y
  el certificado usan el peso confirmado; si no existe, el declarado. La app
  muestra al residente cuando su peso fue ajustado.
- `torreNombre` y `residente` están **desnormalizados** en cada registro. Es
  práctica estándar en Firestore: evita una lectura extra por fila al mostrar
  la cola del gestor.
- Las marcas de tiempo son milisegundos del cliente, no `serverTimestamp()`.
  Simplifica el ordenamiento y las escrituras optimistas; el desfase de reloj
  es irrelevante a esta escala.
- **El gestor trabaja por torre, no por residente.** Retira el contenedor
  completo, así que su panel agrega los depósitos validados de cada torre
  (kilos totales y desglose por material) y no muestra nombres ni
  departamentos: no los necesita. Al confirmar, los depósitos de esa torre se
  certifican juntos en un `writeBatch` atómico, cada uno con su propio `codigo`
  de certificado y todos con el mismo `codigoRetiro` del lote en que salieron.
  Limitación honesta: las reglas de Firestore autorizan documentos completos,
  no campos, así que la privacidad frente al gestor es de capa de aplicación.
  Hacerla efectiva requeriría Cloud Functions, y está documentado como trabajo
  futuro.
- Se escucha la colección `registros` completa (acotada a 300) y se filtra en
  memoria por rol. Para 2 torres es lo más simple y evita índices compuestos.
  Al escalar conviene una consulta por torre y estado.

---

## Qué quedó fuera de este tramo

- Escáner con cámara y PDF del certificado en la app nativa (Expo Go): hoy
  existen solo en la versión web instalada (PWA), que es la que se presenta.
  En el teléfono nativo el código del contenedor se escribe a mano.
- Notificaciones de avance.
- Misiones e incentivos editables por el administrador.
- Exportación del reporte mensual.

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| "Missing or insufficient permissions" | Reglas publicadas antes de crear las torres | Vuelve a modo de prueba, siembra, y republica las reglas |
| La app queda en la pantalla de carga | Perfil en `usuarios/` no existe | La app cierra sesión sola; vuelve a registrarte |
| "auth/operation-not-allowed" | Falta habilitar correo/contraseña | Paso 2.1 |
| Cambios que no se reflejan | Caché de Metro | `npx expo start -c` |
| Códigos de torre no aparecen | No se ejecutó la siembra | Paso 3 |
