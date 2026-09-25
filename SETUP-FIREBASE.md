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

**Inicio de sesión con Google (opcional, solo versión web / PWA):**

3. **Authentication → Sign-in method → Google → Habilitar**, eligiendo un correo de soporte.
4. **Authentication → Settings → Authorized domains:** deben estar `localhost` y
   `ecotrack-capstone-3f12d.web.app` (normalmente ya vienen).
5. **Google Cloud Console → APIs y servicios → Credenciales →** el cliente OAuth
   *"Web client (auto created by Google Service)"* **→ URIs de redireccionamiento
   autorizados →** agregar `https://ecotrack-capstone-3f12d.web.app/__/auth/handler`.
   Es necesario porque en el sitio publicado la app usa su propio dominio para
   Google (así Safari del iPhone no bloquea la sesión); sin este paso Google
   responde `redirect_uri_mismatch`.

Una cuenta que entra por primera vez con Google nace siempre como **residente**
y luego pasa por la vinculación a torre, igual que un registro normal.

---

## 3. Preparar todo, de un toque

Abre la app. En la pantalla de login, abajo, botón
**"Preparar todo para la demostración"**. Tócalo una vez.

Crea en Firestore las dos torres del condominio piloto:

| Torre | Código | Meta mensual | Deptos. |
|---|---|---|---|
| Torre A | `ECO-TORRE-A` | 200 kg | 24 |
| Torre B | `ECO-TORRE-B` | 150 kg | 19 |

Junto con las torres siembra también sus códigos de rol, en una colección
aparte que la app nunca lee (`codigosRol`):

| Documento | Campo | Valor |
|---|---|---|
| `codigosRol/torre-a` | `administrador` | `ADM-DEMO-A` |
| `codigosRol/torre-b` | `administrador` | `ADM-DEMO-B` |
| `codigosRol/gestor` | `codigo` | `GESTOR-DEMO` |

Y las tres cuentas, ya vinculadas a su torre:

| Rol | Correo | Contraseña |
|---|---|---|
| 🏠 Residente | `residente@ecotrack.cl` | `ecotrack2026` |
| 🛡️ Administrador | `admin@ecotrack.cl` | `ecotrack2026` |
| 🚛 Gestor | `gestor@ecotrack.cl` | `ecotrack2026` |

La cuenta de administrador no nace administradora: se crea como residente y
se promueve aparte, presentando el código de su torre (`ADM-DEMO-A`), exactamente
por el mismo camino que seguiría cualquier persona real. No hay un atajo
especial para la demo.

El botón solo aparece en desarrollo (`__DEV__`), nunca en una build de
producción, y se puede volver a tocar sin problema: si algo ya existe, lo salta.

> Estas cuentas son de prueba dentro de tu propio proyecto. Antes del piloto
> real conviene borrarlas desde Authentication en la consola. Un residente
> real se registra desde **Crear cuenta** y se vincula a su torre con el
> código. Nadie puede elegir "administrador" al registrarse: se llega a ese
> rol vinculándose a una torre con el código de administrador de esa torre.
> Un gestor sí se registra directo, pero necesita el código de gestor.

> Si el proyecto ya está en producción (reglas estrictas ya publicadas) y
> necesitas sembrar torres o códigos nuevos, este botón ya no puede escribirlos:
> hazlo a mano desde **Firestore Database → Datos** en la consola, con la misma
> estructura de la tabla de arriba.

---

## 4. Aplicar las reglas de seguridad

Recién ahora, en **Firestore Database → Reglas**, reemplaza todo por el
contenido de `firestore.rules` (raíz del repo) y publica. También se pueden
publicar desde la terminal con `npx firebase-tools deploy --only firestore:rules`.

Las reglas hacen cumplir la cadena de verificación a nivel de base de datos:

- un residente solo crea depósitos a su nombre y en estado `pendiente`, con
  una talla de bolsa válida y exactamente los kilos que esa talla estima
  para ese material (nadie puede escribir los kilos a mano);
- solo el administrador **de esa torre** puede pasar `pendiente → validado`
  o `rechazado`, y solo puede tocar el estado y los kilos confirmados;
- solo el gestor puede pasar `validado → certificado`, y solo puede tocar los
  campos de certificación;
- nadie puede cambiar su propio rol ni borrar un registro;
- nadie se autoasigna administrador o gestor: esos roles exigen el código
  correcto de `codigosRol`, una colección que la app nunca puede leer
  directamente — solo estas reglas la consultan para comparar.

Es la parte defendible del proyecto: la trazabilidad no depende de que la app
se porte bien, está garantizada por el servidor.

---

## 5. La demo

Con dos teléfonos (o un teléfono + emulador):

1. **Teléfono A, residente:** Escanear QR → material → talla de bolsa → registrar. El QR
   del contenedor lo muestra el administrador en **Contenedor de la torre →
   Mostrar QR** (en pantalla o impreso). Si la cámara no lo lee, se puede
   escribir el código a mano (`T-A-01`). Un QR de otra torre es rechazado.
2. **Teléfono B, administrador:** el depósito **aparece solo, sin recargar**.
   Usa **"Validar la tanda del día"** para cerrar toda la cola de una vez, que
   es como trabaja el conserje en la realidad: revisa el contenedor completo,
   no bolsa por bolsa. Si algún depósito no está, lo rechaza antes, uno a uno.
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
  codigoRolUsado                     ← solo si el rol no es residente; queda como rastro de auditoría

registros/{id}
  residenteId, residente, depto, torreId, torreNombre,
  material, talla, kgDeclarado, kgConfirmado, contenedor, estado,
  creadoEn, validadoEn, validadoPor,
  certificadoEn, certificadoPor, codigo, codigoRetiro

misiones/{torreId}                   ← un documento por torre; puede no existir
  metaKg, incentivo, actualizadaEn, actualizadaPor

codigosRol/{torreId | "gestor"}      ← nunca se lee desde la app, solo desde las reglas
  administrador                      ← código de esa torre
  codigo                             ← solo en el documento "gestor"
```

**Decisiones a defender:**

- **Talla de bolsa en vez de kilos:** nadie pesa su bolsa antes de bajarla. El
  residente elige la talla (S, M, L o XL) y los kilos salen de una tabla por
  material y talla (`KG_POR_TALLA` en `app/src/lib/tipos.ts`, repetida en
  `firestore.rules`, que no acepta otro valor). Las métricas y el certificado
  los muestran como estimados ("≈ 1,2 kg"). El administrador valida la tanda
  completa sin corregir bolsa por bolsa, así que `kgConfirmado` copia el
  estimado. Los depósitos antiguos, registrados en kilos, se muestran igual que
  antes. La tabla parte de los factores de volumen a peso de la EPA para
  material suelto (vidrio ~0,36 kg/L, latas de aluminio ~0,04 y de acero ~0,09,
  botellas plásticas ~0,02), ajustados a bolsas que no van llenas al máximo; el
  metal promedia aluminio y acero. Conviene calibrarla pesando bolsas reales.
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
- Validación diaria por lote como una sola operación atómica: hoy
  "Validar la tanda del día" valida uno por uno, en un bucle.
- Notificaciones de avance.
- Gestión de usuarios y exportación del reporte mensual, desde el panel del
  administrador.
- Cloud Functions: la privacidad del gestor frente a los registros completos
  sigue siendo de capa de aplicación, no de base de datos (ver más arriba).

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| "Missing or insufficient permissions" | Reglas publicadas antes de crear las torres | Vuelve a modo de prueba, siembra, y republica las reglas |
| La app queda en la pantalla de carga | Perfil en `usuarios/` no existe | La app cierra sesión sola; vuelve a registrarte |
| "auth/operation-not-allowed" | Falta habilitar correo/contraseña | Paso 2.1 |
| Cambios que no se reflejan | Caché de Metro | `npx expo start -c` |
| Códigos de torre no aparecen | No se ejecutó la siembra | Paso 3 |
| "Código de administrador/gestor incorrecto" | No coincide con `codigosRol` | Revisa mayúsculas; si el proyecto ya está en producción, agrégalo a mano en la consola (ver nota del paso 3) |
