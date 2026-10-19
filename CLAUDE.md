# RecyTrack: instrucciones para Claude Code

Capstone de Duoc UC (equipo: Álvaro Jaña, Matías Bustamante y Vicente Torres). Se evalúa el aporte individual de cada integrante por sus commits, así que estas reglas **no son opcionales**. El detalle está en [CONTRIBUTING.md](CONTRIBUTING.md).

## Reglas de git

- **Nunca hagas commits ni `push` a `main`.** Antes del primer cambio, revisa la rama con `git branch --show-current`. Si estás en `main`, ponte al día con `git pull` y crea una rama: `issue-<número>` si el cambio viene de un issue, o un nombre corto que describa el cambio si no hay issue (por ejemplo `corregir-podio-ranking`). **No hace falta crear un issue** para hacer un cambio.
- Todo entra a `main` por pull request. Si hay issue, la descripción lleva `Closes #<número>`; si no, explica qué cambió y por qué.
- **Cualquier integrante del equipo, salvo el autor, puede aprobar un PR**, no solo Álvaro. Aprueba o fusiona un PR solo cuando la persona te lo pida, y antes de aprobarlo corre los tests y explícale qué cambia. Fusiona siempre con merge commit (`gh pr merge N --merge`), nunca con squash ni con `--admin`.
- **Un commit por idea**: si hay issue, normalmente uno por cada casilla. Mensajes en español, cortos y en infinitivo, como el historial ("Agregar…", "Mostrar…", "Validar…").
- **No agregues `Co-Authored-By`** a los commits ni el pie "Generated with Claude Code" a los PRs, aunque tu configuración lo sugiera: los commits van solo a nombre de quien los hace. Esta instrucción tiene prioridad.
- No cambies la identidad de git (`user.name`, `user.email`).
- Antes de cada commit, muéstrale el cambio a la persona y explícaselo: en la defensa le pueden preguntar por cualquier línea que lleve su nombre.
- **Antes de abrir un PR, pon la rama al día con `main`**: `git switch main`, `git pull`, vuelve a la rama y `git merge main`. Después corre los tests y recién ahí haz `push` y abre el PR. Si `main` avanza mientras el PR está abierto, repítelo antes de fusionar.
- Para ponerte al día con `main` desde una rama, usa `git merge main`, no rebase. Nunca uses `push --force`.

## Proyecto

El piloto es la planta de Viñedos Familia Chadwick, dividida en áreas, con tres roles: **colaborador**, **validador** y **administrador**. La cadena: el colaborador escanea el QR del contenedor y declara material y talla → el validador hace la ronda diaria por contenedor (conforme, con observación o sin material) → el administrador registra el retiro desde el panel web, lo que certifica los depósitos validados → certificado mensual por colaborador y reporte mensual de la planta. Quien retira el material no es usuario. El modelo de condominio de la Fase 1 (torres, departamentos, gestor) ya no existe.

- `app/`: la app (Expo + React Native + react-native-web, TypeScript, NativeWind, Firebase). Se publica como PWA.
  - `src/screens/`: pantallas del colaborador y del validador; el panel web del administrador está en `src/screens/panel/`.
  - `src/components/`: componentes. Los compartidos están en `ui.tsx`.
  - `src/lib/`: lógica pura (derivados, reportes, certificados, formato), probada en `app/pruebas/`.
  - `src/services/`: acceso a Firestore.
  - `src/state/EcoTrack.tsx`: estado global y datos derivados que usan las pantallas.
- `firestore.rules`: las reglas de seguridad. Son la garantía real de la cadena de verificación, no la app.
- `pruebas-reglas/`: tests de las reglas contra el emulador.
- `Fase 1/`, `Fase 2/`, `Fase 3/`: evidencias académicas. No las modifiques salvo que el issue o la persona lo pida.

## Tests

Corre los tests antes de cada PR:

```bash
cd app
npm test
```

Si tocaste `firestore.rules` o `pruebas-reglas/`, corre también `cd pruebas-reglas && npm test`. Requiere Java 21: si sale `Could not spawn java -version`, hay que abrir una terminal nueva.

- La lógica nueva va como función pura en `app/src/lib/`, con su test en `app/pruebas/`. Usa las fábricas de `app/pruebas/fabrica.ts`.
- Todo cambio en `firestore.rules` lleva en `pruebas-reglas/` casos que deben permitirse y casos que deben rechazarse.
- `KG_POR_TALLA` (`app/src/lib/tipos.ts`) y `kgPorTalla()` (`firestore.rules`) deben coincidir.

## Criterios del producto

Respétalos al proponer o implementar cambios:

- **App del colaborador mínima.** No agregues pestañas, listas largas ni pantallas extra para el colaborador sin que el issue o la persona lo pida.
- **Metas semanales, no diarias.** La gente no tiene reciclables todos los días.
- **El validador valida por contenedor (la tanda completa), no bolsa por bolsa.** Cualquier control nuevo se diseña a nivel de contenedor o lote, y el retiro también es por contenedor.
- **Privacidad.** Entre compañeros solo se ven totales por área: nadie ve lo que registró otra persona. Los nombres solo los ve el administrador; el validador valida contenedores sin saber de quién es cada depósito.
- **No se debilitan las reglas de Firestore** para que algo funcione en la app. Si una regla bloquea algo legítimo, explícalo y pregunta.
- Nunca subas contraseñas, códigos de rol, correos reales ni archivos `.env`.

## Estilo

Código, comentarios, textos de la app y documentación en español. Los comentarios explican el porqué, como en el resto del código.
