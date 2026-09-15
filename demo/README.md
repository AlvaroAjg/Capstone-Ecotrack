# Pared de demostración de EcoTrack

Tres formas de mostrar los tres roles funcionando al mismo tiempo, en vivo,
contra el mismo Firestore. Ordenadas de menos a más riesgo el día de la defensa.

| Archivo | ¿Necesita Expo en localhost:8081? | Cómo abrirlo |
|---|---|---|
| `pared-demo.html` | **No** | Doble clic en `abrir-pared.bat`, o `node demo/servidor.mjs` |
| `pared-app.html` | **Sí**, salvo que esté publicado | `npx expo start --web` y luego abrirlo |

Publicados en internet (ver más abajo), **ninguno de los dos** necesita nada
corriendo en tu máquina.

---

## Recomendada para Duoc — publicarla en internet

Si la demo vive en una URL, en la sala solo abres el navegador. No importa si
presentas desde tu notebook o desde el PC del proyector: no hay que instalar
Node, ni levantar Metro, ni enchufar nada.

### Una sola vez, desde tu casa

```bash
# 1. Instalar la herramienta de Firebase y entrar con tu cuenta
npm install -g firebase-tools
firebase login

# 2. Activar Hosting en el proyecto (elige "Hosting" con la barra espaciadora)
#    Cuando pregunte la carpeta pública, responde: hosting
#    Cuando pregunte si es una SPA, responde: sí
#    Cuando pregunte si sobrescribe index.html, responde: NO
firebase init hosting

# 3. Construir y publicar
node scripts/publicar.mjs
npx firebase-tools deploy --only hosting
```

> Si `firebase init hosting` te reescribe el `firebase.json` que ya viene en el
> repositorio, recupéralo con `git checkout firebase.json`.

Quedan publicadas:

| URL | Qué es |
|---|---|
| `https://ecotrack-capstone-3f12d.web.app/` | La app, para abrirla en el celular |
| `.../demo/pared-app.html` | Pared con la app real (plan A) |
| `.../demo/pared-demo.html` | Pared independiente (plan B) |

Cada vez que cambies algo, repites los dos últimos comandos.

### En la sala

1. Abrir la URL de la pared.
2. Iniciar sesión en los tres paneles (queda guardado en ese navegador).
3. **Pantalla completa** y presentar.

Como la sesión se guarda por navegador, si ensayas en el mismo PC el día
anterior, llegas con los tres paneles ya conectados.

---

## Plan A — `pared-app.html` · la app real

Incrusta **tu app de React Native** tres veces, una por rol, usando Expo Web.
Es la de mayor fidelidad: cada panel ejecuta exactamente el mismo código que
corre en el teléfono.

**Este sí necesita que la app esté sirviéndose en alguna parte**, porque son
tres iframes que la cargan.

Si la abres publicada, la toma del mismo sitio y no hay nada que configurar.
Si la abres como archivo local, necesitas Expo corriendo en `localhost:8081`:

```bash
cd app
npx expo start --web        # deja esto corriendo
```

Luego abre `demo/pared-app.html`. Si Metro levanta en otro puerto, cámbialo en
el campo **Servidor** y pulsa **Aplicar servidor**.

**Cómo funciona.** Los tres iframes cargan la app con `?slot=residente`,
`?slot=administrador` y `?slot=gestor`. En `src/lib/firebase.ts` ese parámetro
hace que cada panel use una instancia de Firebase con nombre propio
(`ecotrack-residente`, etc.). Firebase Auth guarda la sesión web bajo una clave
que incluye el nombre de la app, así que las tres sesiones conviven en la misma
pestaña sin pisarse. En el teléfono no hay slot y todo funciona como siempre.

Para ahorrar tipeo, rellena los correos en `src/lib/demo.ts` y quedarán
prellenados en cada panel.

---

## Plan B — `pared-demo.html` · pared independiente

Un solo archivo HTML, sin Expo, sin compilar nada. Dibuja los tres teléfonos y
se conecta directo a tu proyecto de Firebase con el SDK Web.

**Los datos son 100% reales**: mismas colecciones, mismas reglas, mismos
documentos que la app del teléfono. Lo que cambia es que la interfaz está
reescrita en HTML en lugar de ser los componentes de React Native. Por eso es el
plan B en fidelidad, pero el más robusto de todos: es un archivo suelto que
funciona en cualquier navegador.

**No necesita Expo ni `localhost:8081`.** No tiene iframes: dibuja los teléfonos
él mismo y habla directo con Firebase.

Lo único que sí necesita es servirse por HTTP. Para eso está el servidor mínimo
que viene en esta carpeta, que no instala nada (usa solo lo que trae Node):

**Windows:** doble clic en `abrir-pared.bat`.

**Cualquier sistema:**

```bash
node demo/servidor.mjs
```

Abre el navegador solo, en `http://localhost:5500/pared-demo.html`. Deja esa
ventana abierta mientras presentas; se cierra con Ctrl + C. Si el puerto está
ocupado: `PORT=5501 node demo/servidor.mjs`.

<details>
<summary>¿Por qué no basta con doble clic en el HTML?</summary>

Al abrirlo con doble clic el navegador usa el protocolo `file://` y trata la
página como **origen "null"**. El SDK de Firebase alcanza a cargar desde el CDN
(está comprobado), pero de ahí en adelante el comportamiento de Auth y Firestore
frente a un origen nulo varía entre navegadores y versiones: a veces funciona,
a veces no, y el almacenamiento de sesión se comporta distinto.

No vale la pena jugársela el día de la defensa por ahorrarse un comando. Con
`servidor.mjs` la página corre en `http://localhost`, que es un origen normal y
además está autorizado por defecto en Firebase.

</details>

> **Plan de emergencia sin instalar nada:** arrastra **solo este archivo** a
> [app.netlify.com/drop](https://app.netlify.com/drop) y te da una URL al
> instante, sin cuenta ni configuración.

La primera vez se abre el diálogo **Cuentas** con las cuentas de demostración ya
escritas: solo pulsa **Conectar los tres**. Quedan guardadas en ese navegador.

Si usas otras cuentas, escríbelas ahí; el botón **Usar las cuentas de
demostración** vuelve a cargar las de siempre.

### Lo que puedes hacer desde la pared

| Panel | Acciones |
|---|---|
| Residente | Escanear QR (simulado), elegir material y peso, registrar el depósito |
| Administrador | Ajustar el peso ±0,5 kg, validar o rechazar, validar la tanda del día |
| Gestor | Ver el total por torre y confirmar el retiro del contenedor completo |

Todo lo que ocurre en un panel aparece **solo** en los otros dos, sin recargar.
Las tarjetas que cambian se resaltan un instante para que se note en la
proyección. Abajo, la tira de flujo cuenta en vivo cuántos depósitos van en cada
etapa de la cadena.

### El botón "Probar seguridad"

Intenta, desde la cuenta del **residente**, marcar uno de sus propios depósitos
como `certificado` saltándose al administrador y al gestor. Firestore lo
rechaza y la pared muestra el resultado.

Es la forma más corta de demostrar en la defensa que la cadena de verificación
no depende de que la app se porte bien: la hace cumplir el servidor.

> Requiere tener publicadas las reglas de `firestore.rules`. Si la escritura
> pasa, es señal de que la base sigue en modo de prueba.

---

## El día de la defensa

### La noche anterior

- [ ] Publicar la última versión (`node scripts/publicar.mjs` + `deploy`).
- [ ] Abrir la URL y hacer el flujo completo de punta a punta, para que el
      ranking y las métricas no salgan en cero frente a la comisión.
- [ ] Dejar los tres paneles con sesión iniciada en el navegador que vas a usar.
- [ ] **Grabar un video de 2 minutos del flujo funcionando.** Es tu seguro: si
      la red de la sala falla, muestras el video y sigues. Nadie te va a
      descontar por eso, pero quedarte en blanco sí duele.
- [ ] Guardar la URL en los favoritos y anotarla también en papel.

### Al llegar a la sala

- [ ] Conectarse al wifi **antes** de que empiece tu turno. Si la red de Duoc
      tiene portal de inicio de sesión, acéptalo ahí mismo: si lo dejas para
      después, el navegador te va a interceptar en pleno demo.
- [ ] Abrir la URL y confirmar que dice **"3 de 3 en vivo"** arriba a la derecha.
- [ ] Ajustar **Tamaño** (Compacto / Normal / Grande) según el proyector, y
      entrar en **Pantalla completa**.
- [ ] Tener el celular con datos móviles listo para compartir internet. Es el
      respaldo que más veces salva una demo.

### Sé honesto sobre esto

La demo **necesita internet**. Los tres paneles hablan con Firestore en la nube;
sin red no hay sincronización que mostrar. No intentes disimularlo: si la sala
se cae, dilo, muestra el video y explica la arquitectura. Una comisión valora
mucho más a alguien que entiende las limitaciones de su sistema que a alguien
que improvisa.

### Guion sugerido (2 minutos)

1. *"Estas son las tres vistas del sistema, conectadas a la misma base de datos."*
2. Panel residente → Escanear → Vidrio → 2 kg → Registrar.
3. Señalar el panel del administrador: **el depósito ya está ahí**, sin recargar.
4. *"El conserje no tiene balanza, estima a ojo"* → ajustar el peso → Validar.
5. Señalar el panel del gestor: *"él no ve residentes, ve el contenedor de la
   torre"* → los kilos totales subieron solos.
6. Confirmar retiro de la torre → se certifica el lote completo y aparece su
   código de retiro.
7. Volver al panel del residente: el certificado ya está en su historial.
8. Botón **Probar seguridad** → *"y esto no se puede falsificar desde el cliente"*.

### Si te preguntan por qué las tres vistas están en un notebook

Porque es la única forma de que la comisión vea las tres al mismo tiempo. Cada
panel tiene su propia sesión y su propio rol; el servidor los trata como tres
usuarios distintos y les aplica reglas distintas. Si abres la misma URL de la
app en tu celular y registras un depósito desde ahí, aparece igual en la pared:
es la misma base de datos.
