# RecyTrack — Puesta en marcha del backend

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

**Inicio de sesión con Microsoft (opcional, solo versión web / PWA):**

6. **Portal de Microsoft Entra (entra.microsoft.com) → Registros de aplicaciones →
   Nuevo registro.** Tipos de cuenta: *cuentas de cualquier directorio
   organizativo y cuentas personales de Microsoft*. URI de redirección, tipo
   **Web**: `https://ecotrack-capstone-3f12d.firebaseapp.com/__/auth/handler`.
   Después, en **Autenticación**, agregar también
   `https://ecotrack-capstone-3f12d.web.app/__/auth/handler` (mismo motivo que el
   paso 5 de Google).
7. En ese registro: copiar el **Id. de aplicación (cliente)** y, en
   **Certificados y secretos → Nuevo secreto de cliente**, copiar el **valor**
   del secreto (se muestra una sola vez).
8. **Authentication → Sign-in method → Microsoft → Habilitar**, pegando el Id. de
   aplicación y el secreto. El secreto vence (máximo 24 meses): hay que crear
   uno nuevo y reemplazarlo aquí antes de esa fecha.

Para dejar entrar solo a las cuentas de una organización (por ejemplo, los
correos de Microsoft 365 de una empresa), se reemplaza `INQUILINO_MICROSOFT`
en `app/src/services/auth.ts` por el ID de inquilino (tenant ID) que entrega su
área de TI. Si esa organización no deja a sus empleados autorizar aplicaciones
externas, un administrador de su TI tiene que aprobar la aplicación una vez.

Una cuenta que entra por primera vez con Google o Microsoft nace siempre como
**colaborador** y luego se une a su área con el código, igual que un registro
normal; no tiene que confirmar el correo, porque esos proveedores ya lo
comprobaron. Un mismo correo no puede tener dos formas de entrar: si alguien se
registró con contraseña o con Google, Microsoft le pide entrar como la primera
vez.

---

## 3. La planta y su código de administrador (en la consola)

La app no crea plantas ni códigos de rol: eso se hace a mano en **Firestore
Database → Datos**, una sola vez. La consola escribe con permisos de dueño del
proyecto, así que funciona aunque las reglas ya estén publicadas.

La planta es un documento en `plantas/`, con id propio sin `_` (p. ej.
`planta-1`; el `_` separa la planta del mes en los resúmenes):

| Campo | Tipo | Ejemplo |
|---|---|---|
| `nombre` | string | `Planta piloto` |
| `empresa` | string | `Viñedos Familia Chadwick` |

El código para ser administrador va en `codigosRol/`, una colección que la app
nunca puede leer ni escribir; solo las reglas la consultan para comparar:

| Documento | Campo | Valor |
|---|---|---|
| `codigosRol/{id de la planta}` | `administrador` | el código para ser administrador de esa planta |

Elige un código que no esté escrito en ningún lado del repositorio (es
público) y compártelo solo con quien corresponda.

Todo lo demás se crea desde la app, por el mismo camino que cualquier persona
real:

1. **Administrador:** Crear cuenta → confirmar el correo → en la pantalla de
   unirse a un área, tocar *¿Eres administrador de la planta?* y escribir el
   código de administrador. Nadie puede elegir "administrador" al registrarse.
2. **Áreas:** el administrador las crea en el panel, en **Personas y áreas**,
   con su nombre y su dotación (cuántas personas trabajan ahí, la base del %
   de participación). El panel le propone a cada una su código para unirse
   (p. ej. `EMB-4821`).
3. **Contenedores:** sin contenedores nadie puede registrar depósitos. El
   administrador los agrega en **Puntos limpios**, indicando el punto limpio
   donde está y si es mixto o de un material, y ahí mismo ve o imprime sus QR.
4. **Colaboradores:** Crear cuenta → confirmar el correo → unirse a su área con
   el código que le entrega el administrador.
5. **Validador:** se registra como cualquier colaborador y el administrador lo
   nombra validador en **Personas y áreas** (lo mismo para el suplente). Desde
   ahí ya no deposita: si depositara, validaría sus propios depósitos.

---

## 4. Aplicar las reglas de seguridad

En **Firestore Database → Reglas**, reemplaza todo por el
contenido de `firestore.rules` (raíz del repo) y publica. También se pueden
publicar desde la terminal con `npx firebase-tools deploy --only firestore:rules`.

Las reglas hacen cumplir la cadena de verificación a nivel de base de datos:

- solo un colaborador crea depósitos, siempre a su nombre y en estado
  `pendiente`, en su propia planta y área y en un contenedor real de ella (que
  exista, esté activo y, si es de un material, reciba ese material), con una
  talla de bolsa válida y exactamente los kilos que esa talla estima para ese
  material (nadie puede escribir los kilos a mano); la planta y el área deben
  ser las de su perfil y la fecha la de ahora, así nadie deposita en otra área
  para subirle la participación ni atrasa un depósito para cumplir una misión
  pasada. El validador y el administrador no depositan;
- solo el validador o el administrador **de esa planta** puede pasar
  `pendiente → validado` o `rechazado`, firmando con su propio uid; al validar
  confirma exactamente los kilos declarados, así nadie infla los kilos;
- solo el administrador de la planta puede pasar `validado → certificado`, y
  solo en el mismo lote en que registra un retiro que existe, es de esa planta
  e incluye el contenedor del depósito; firma con su propio uid y solo toca
  los campos de certificación. Un retiro no se edita ni se borra;
- los contenedores solo los crea y desactiva el administrador de la planta, y
  solo los listan él y el validador; cualquiera puede leer uno **si conoce su
  código**, que es aleatorio y solo aparece en el QR pegado en el contenedor;
- una incidencia de contaminación la crea el validador o el administrador
  sobre un contenedor de su planta, solo la marca como atendida el
  administrador en el lote del retiro de ese contenedor, y nadie la borra;
- cada colaborador lee solo sus propios depósitos: el ranking de áreas sale
  del resumen del mes (`resumenes/`), cuyas sumas las reglas comprueban una por
  una. El validador y el administrador leen los depósitos de su planta;
- todos nacen colaboradores. Unirse a un área exige el correo confirmado y se
  hace una sola vez: cambiarse de área lo hace el administrador, así nadie se
  pasa al área que va perdiendo. Al validador lo nombra el administrador, que
  no puede hacer administrador a nadie;
- nadie se autoasigna administrador: ese rol exige el código correcto de
  `codigosRol`, una colección que la app nunca puede leer ni escribir — solo
  estas reglas la consultan para comparar;
- cada quien lee solo su propio perfil, y el administrador los de su planta
  (el de un administrador guarda el código que presentó);
- nadie borra un depósito, un perfil, un área, un retiro ni una incidencia.

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

1. **Navegador A, colaborador:** Escanear QR → (material) → talla de bolsa →
   registrar. Los QR los muestra el administrador en **Puntos limpios → Ver
   QR** (en pantalla o impresos con **Imprimir etiqueta**). Si el contenedor es
   de un material, al escanearlo el material ya queda elegido; si es mixto, se
   elige. Si la cámara no lo lee, se escribe el código de 6 caracteres que va
   bajo el QR (p. ej. `K7QM9X`). Un QR de otra planta o uno cuyo código se
   cambió es rechazado.
2. **Navegador B, validador:** el depósito **aparece solo, sin recargar**. Los
   pendientes aparecen agrupados por contenedor, con las tallas que se
   declararon en cada uno. El validador mira el contenedor y compara:
   **Conforme** si cuadra; **Con observación** si encuentra algo que no
   corresponde (vidrio en el de papel/cartón), eligiendo el contaminante: los
   depósitos se validan igual, porque no se sabe quién fue, y se avisa al
   administrador y a la planta; **Sin material** si el contenedor está vacío,
   y sus depósitos se rechazan. **"Validar la tanda del día"** valida todos los
   contenedores de una vez. Cada una de estas acciones es un solo `writeBatch`
   atómico: si falla, no queda nada validado a medias, y la incidencia se
   guarda junto con su validación o no se guarda. No se revisa persona por
   persona, porque dentro del contenedor no se sabe de quién es cada cosa; eso
   queda plegado en "Ver depósitos", para excepciones (p. ej. un depósito
   registrado dos veces).
3. **Navegador C, administrador (panel web):** en **Retiros y reportes →
   Registrar retiro** elige los contenedores que salieron, la fecha, quién
   retiró y, si los hay, el N° de guía y el peso. Antes de registrar ve las
   advertencias de los contenedores contaminados. El retiro certifica en un
   solo lote los depósitos validados de esos contenedores.
4. **Navegador A:** el estado cambió a *Certificado* en vivo. El colaborador
   descarga su **certificado mensual** en PDF y el administrador, el **reporte
   mensual** de la planta.

Esa es la cadena completa funcionando contra un backend real.

---

## Modelo de datos

```
plantas/{plantaId}                   ← se crea en la consola; el id no lleva "_"
  nombre, empresa

areas/{areaId}                       ← las crea el administrador desde el panel
  plantaId, nombre, codigo, dotacion

usuarios/{uid}                       ← uid de Firebase Auth
  nombre, email, rol, plantaId, areaId, areaNombre, avisosVistosHasta, creadoEn
  proveedor                          ← solo si entró con Google o Microsoft
  codigoRolUsado                     ← solo el administrador; queda como rastro de auditoría

contenedores/{codigo}                ← id = código aleatorio del QR (p. ej. K7QM9X)
  plantaId, punto, material (null = mixto), activo, creadoEn

registros/{id}                       ← un depósito; no guarda el nombre de la persona
  colaboradorId, plantaId, areaId,
  material, talla, kgDeclarado, kgConfirmado, contenedor, estado,
  creadoEn, validadoEn, validadoPor,
  certificadoEn, certificadoPor, codigo, retiroId

incidencias/{id}                     ← contenedor encontrado contaminado; no señala a nadie
  plantaId, contenedor, contenedorNombre, contaminante,
  reportadoEn, reportadoPor, atendida, atendidaEn, retiroId

retiros/{id}                         ← no se edita ni se borra
  plantaId, fecha, quienRetira, guia, contenedores, pesoKg,
  depositos, kgEstimado, registradoPor, registradoEn

campanas/{plantaId}                  ← una por planta; puede no existir
  nombre, metaParticipacion, incentivo, terminaEn, actualizadaEn, actualizadaPor

resumenes/{plantaId}_{AAAA-MM}       ← totales del mes por área, para el ranking
  plantaId, mes, areas: {areaId: {depositos, participantes}}, ultimoRegistro

participaciones/{AAAA-MM}_{uid}      ← marca de que la persona ya depositó en el mes
  uid, mes

codigosRol/{plantaId}                ← nunca se lee desde la app, solo desde las reglas
  administrador                      ← código de esa planta
```

Hasta la Fase 1 el modelo era el de un condominio (`torres/`, `misiones/` y un
código para el rol de gestor). Al pasar el piloto a la planta, esas colecciones
dejaron de usarse: ni la app ni las reglas las leen.

**Decisiones a defender:**

- **Talla de bolsa en vez de kilos:** nadie pesa su bolsa antes de bajarla. El
  colaborador elige la talla (S, M, L o XL) y los kilos salen de una tabla por
  material y talla (`KG_POR_TALLA` en `app/src/lib/tipos.ts`, repetida en
  `firestore.rules`, que no acepta otro valor). Las métricas y el certificado
  los muestran como estimados ("≈ 1,2 kg"); solo un retiro con peso informado
  es un dato medido. El validador valida la tanda completa sin corregir bolsa
  por bolsa, así que `kgConfirmado` copia el estimado. La tabla parte de los
  factores de volumen a peso de la EPA para material suelto (vidrio ~0,36
  kg/L, latas de aluminio ~0,04 y de acero ~0,09, botellas plásticas ~0,02),
  ajustados a bolsas que no van llenas al máximo; el metal promedia aluminio y
  acero. Conviene calibrarla pesando bolsas reales.
- **Privacidad entre compañeros, garantizada por las reglas.** El depósito no
  guarda el nombre de la persona, solo su `colaboradorId`. Cada colaborador
  lee solo sus propios depósitos y el ranking de áreas sale de `resumenes/`,
  así que entre compañeros solo se ven totales por área. El validador lee los
  depósitos de la planta para su ronda, pero no los perfiles: no sabe de quién
  es cada uno. Solo el administrador cruza los depósitos con los perfiles de
  su planta.
- **El resumen del mes lo suma el propio colaborador.** No hay Cloud Functions
  (exigen el plan Blaze), así que en el mismo lote en que crea su depósito el
  colaborador suma 1 a los depósitos de su área y, si es su primer depósito
  del mes, 1 a sus participantes (lo marca `participaciones/`). Las reglas
  comprueban cada suma contra el depósito que se crea en ese lote, así que
  nadie puede inflarla. Cuenta también los depósitos que después se rechazan;
  el panel calcula los exactos con los registros.
- `areaNombre` está **desnormalizado** en el perfil: se muestra sin leer el
  área. Si el administrador cambia el nombre del área, el panel lo actualiza en
  los perfiles de esa área.
- Las marcas de tiempo son milisegundos del cliente, no `serverTimestamp()`.
  Simplifica el ordenamiento y las escrituras optimistas. Las reglas exigen
  que `creadoEn` y `registradoEn` estén a menos de 10 minutos de la hora del
  servidor, así nadie atrasa un depósito.
- **La cadena trabaja por contenedor, no por persona.** El validador valida la
  tanda completa de cada contenedor, y el administrador elige qué contenedores
  salieron en cada retiro. Al registrarlo, los depósitos validados de esos
  contenedores se certifican juntos en un `writeBatch` atómico, cada uno con su
  propio `codigo` y todos con el `retiroId` del retiro en que salieron, y las
  incidencias de esos contenedores quedan atendidas en el mismo lote. Quien
  retira el material no es usuario del sistema: el retiro lo registra el
  administrador, que recibe la guía o el comprobante.
- Cada rol escucha solo las consultas de `registros` que necesita, sin límite
  por cantidad, así ningún depósito queda afuera por antiguo: el colaborador,
  todos los suyos (historial, certificados y misión semanal); el validador y el
  administrador, todos los de su planta (pendientes, por retirar y reporte
  mensual). Ninguna necesita índice compuesto: para el volumen del piloto
  (unos 400 depósitos al mes) no hace falta filtrar por fecha.

---

## Qué quedó fuera de este tramo

- Escáner con cámara y los PDF (certificado y reporte) en la app nativa (Expo Go): hoy
  existen solo en la versión web instalada (PWA), que es la que se presenta.
  En el teléfono nativo el código del contenedor se escribe a mano.
- Notificaciones push con la app cerrada: los avisos funcionan dentro de la
  app, pero las push requieren el plan Blaze.
- Cloud Functions: el resumen del mes lo suma el cliente y lo comprueban las
  reglas. Con el plan Blaze se podría calcular en el servidor.

---

## Problemas frecuentes

| Síntoma | Causa | Solución |
|---|---|---|
| "Missing or insufficient permissions" | La acción no le corresponde a ese rol, o falta la planta en Firestore | Revisa el rol de la cuenta; crea la planta en la consola (paso 3) |
| La app queda en la pantalla de carga | Perfil en `usuarios/` no existe | La app cierra sesión sola; vuelve a registrarte |
| "auth/operation-not-allowed" | Falta habilitar correo/contraseña | Paso 2.1 |
| "auth/unauthorized-continue-uri" al pedir el correo de verificación | El dominio del sitio no está autorizado | Agrégalo en Authentication → Settings → Authorized domains |
| Cambios que no se reflejan | Caché de Metro | `npx expo start -c` |
| "Código no válido" al unirse a un área | El código no corresponde a ningún área | Revisa el código del área en el panel, en Personas y áreas |
| "Código de administrador incorrecto" | No coincide con `codigosRol/{id de la planta}` | Revisa mayúsculas y el documento en la consola (paso 3) |
