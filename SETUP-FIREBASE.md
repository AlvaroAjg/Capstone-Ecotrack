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

El modo de prueba deja la base abierta a cualquiera: publica las reglas del
paso 4 apenas la crees.

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

## 3. Torres y códigos de rol (en la consola)

La app no crea torres ni códigos: eso se hace a mano en **Firestore Database →
Datos**, una vez por torre. La consola escribe con permisos de dueño del
proyecto, así que funciona aunque las reglas ya estén publicadas.

Una torre es un documento en `torres/`, con id propio (p. ej. `torre-a`):

| Campo | Tipo | Ejemplo |
|---|---|---|
| `nombre` | string | `Torre A` |
| `condominio` | string | `Condominio Piloto` |
| `codigoInvitacion` | string | `ECO-TORRE-A` (en mayúsculas: es el que se reparte a los residentes) |
| `metaKg` | number | `200` |
| `deptosTotales` | number | `24` |

Los códigos de rol van en `codigosRol/`, una colección que la app nunca puede
leer ni escribir; solo las reglas la consultan para comparar:

| Documento | Campo | Valor |
|---|---|---|
| `codigosRol/{id de la torre}` | `administrador` | el código para ser administrador de esa torre |
| `codigosRol/gestor` | `codigo` | el código para crear la cuenta de gestor |

Elige códigos que no estén escritos en ningún lado del repositorio (es
público) y compártelos solo con quien corresponda.

Después, las cuentas se crean desde la app, por el mismo camino que cualquier
persona real:

- **Residente:** Crear cuenta → vincularse a su torre con el código de invitación.
- **Administrador:** Crear cuenta → en la vinculación, entrar como
  administrador con el código de invitación de la torre y su código de
  administrador. Nadie puede elegir "administrador" al registrarse.
- **Gestor:** Crear cuenta eligiendo gestor, con el código de gestor.

Sin contenedores nadie puede registrar depósitos: el administrador los agrega
desde su panel, en **Contenedores de la torre**, y ahí mismo muestra o imprime
sus QR.

---

## 4. Aplicar las reglas de seguridad

En **Firestore Database → Reglas**, reemplaza todo por el
contenido de `firestore.rules` (raíz del repo) y publica. También se pueden
publicar desde la terminal con `npx firebase-tools deploy --only firestore:rules`.

Las reglas hacen cumplir la cadena de verificación a nivel de base de datos:

- un residente solo crea depósitos a su nombre y en estado `pendiente`, en su
  propia torre y en un contenedor real de ella (que exista, esté activo y, si
  es de un material, reciba ese material), con una talla de bolsa válida y exactamente los kilos que esa talla estima
  para ese material (nadie puede escribir los kilos a mano); el nombre y el
  departamento deben ser los de su perfil y la fecha la de ahora, así nadie
  inventa departamentos para subir la participación ni atrasa un depósito
  para cumplir una misión pasada;
- solo el administrador **de esa torre** puede pasar `pendiente → validado`
  o `rechazado`, firmando con su propio uid; al validar confirma exactamente
  los kilos declarados, así no puede inflar los de su torre en el ranking;
- solo el gestor puede pasar `validado → certificado`, firmando con su propio
  uid, y solo puede tocar los campos de certificación;
- los contenedores solo los crea, lista y desactiva el administrador de su
  torre; cualquiera puede leer uno **si conoce su código**, que es aleatorio y
  solo aparece en el QR pegado en el contenedor;
- una incidencia de contaminación solo la crea el administrador de esa torre y
  solo la marca como atendida el gestor al retirar; nadie la borra;
- nadie puede cambiar su propio rol ni borrar un registro;
- nadie se autoasigna administrador o gestor: esos roles exigen el código
  correcto de `codigosRol`, una colección que la app nunca puede leer ni
  escribir — solo estas reglas la consultan para comparar;
- cada quien lee solo su propio perfil (el de un administrador guarda el
  código que presentó), y solo un residente puede cambiarse de torre: un
  administrador queda fijo en la suya.

Las reglas tienen tests automáticos contra el emulador de Firestore en
[`pruebas-reglas/`](pruebas-reglas/README.md): cada caso de arriba tiene uno
que comprueba que se permite y otro que comprueba que se rechaza.

Es la parte defendible del proyecto: la trazabilidad no depende de que la app
se porte bien, está garantizada por el servidor.

---

## 5. La demo

Tres sesiones abiertas a la vez, una por rol, cada una en un navegador
distinto (o una ventana normal y otra de incógnito): la sesión de Firebase se
guarda por navegador, así que dos pestañas del mismo navegador compartirían
la cuenta. Proyectadas lado a lado se ve la cadena completa avanzar en vivo.

1. **Navegador A, residente:** Escanear QR → (material) → talla de bolsa →
   registrar. Los QR los muestra el administrador en **Contenedores de la
   torre → Ver QR** (en pantalla o impreso). Si el contenedor es de un
   material, al escanearlo el material ya queda elegido; si es mixto, se
   elige. Si la cámara no lo lee, se escribe el código de 6 caracteres que va
   bajo el QR (p. ej. `K7QM9X`). Un QR de otra torre, uno antiguo (`T-A-01`)
   o uno cuyo código se cambió es rechazado.
2. **Navegador B, administrador:** el depósito **aparece solo, sin recargar**.
   Los pendientes aparecen agrupados por contenedor, con lo que se declaró en
   cada uno. El administrador mira el contenedor y compara: **Validar
   contenedor** si cuadra, **No cuadra** si no. **"Validar la tanda del día"**
   valida todos los contenedores de una vez. No se revisa persona por persona,
   porque dentro del contenedor no se sabe de quién es cada cosa; eso queda
   plegado en "Ver depósitos", para excepciones. Si encuentra algo que no
   corresponde (vidrio en el de cartón), usa **Reportar contaminación**: valida
   igual lo declarado y avisa al gestor y a la torre.
3. **Navegador C, gestor:** confirmar retiro → se emite el certificado con
   código único.
4. **Navegador A:** el estado cambió a *Certificado* en vivo, con su código.

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

contenedores/{codigo}                ← id = código aleatorio del QR (p. ej. K7QM9X)
  torreId, material (null = mixto), activo, creadoEn

incidencias/{id}                     ← contenedor encontrado contaminado; no señala a nadie
  torreId, torreNombre, contenedor, contenedorNombre, contaminante,
  reportadoEn, reportadoPor, atendida, atendidaEn, codigoRetiro

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
- Cada rol escucha solo las consultas de `registros` que necesita, sin límite
  por cantidad, así ningún depósito queda afuera por antiguo: todos, los del
  mes en curso (desde el lunes de su primera semana) y los certificados del
  mes, para el ranking; el residente, además, todos los suyos; el
  administrador, los pendientes de su torre; el gestor, todos los validados.
  Ninguna necesita índice compuesto. El ranking todavía se calcula en cada
  teléfono con los depósitos del mes de todas las torres: para un piloto es
  poco, pero con muchas torres convendría guardar un resumen por torre con
  Cloud Functions.

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
| "Missing or insufficient permissions" | La acción no le corresponde a ese rol, o falta la torre en Firestore | Revisa el rol de la cuenta; crea la torre en la consola (paso 3) |
| La app queda en la pantalla de carga | Perfil en `usuarios/` no existe | La app cierra sesión sola; vuelve a registrarte |
| "auth/operation-not-allowed" | Falta habilitar correo/contraseña | Paso 2.1 |
| Cambios que no se reflejan | Caché de Metro | `npx expo start -c` |
| "Código no válido" al vincularse | La torre no existe o su `codigoInvitacion` no está en mayúsculas | Paso 3 |
| "Código de administrador/gestor incorrecto" | No coincide con `codigosRol` | Revisa mayúsculas y el documento en la consola (paso 3) |
