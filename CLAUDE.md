# RecyTrack: instrucciones para Claude Code

Capstone de Duoc UC (equipo: Álvaro Jaña, Matías Bustamante y Vicente Torres). Se evalúa el aporte individual de cada integrante por sus commits, así que estas reglas **no son opcionales**. El detalle está en [CONTRIBUTING.md](CONTRIBUTING.md).

## Reglas de git

- **Nunca hagas commits ni `push` a `main`.** Antes del primer cambio, revisa la rama con `git branch --show-current`. Si estás en `main`, ponte al día con `git pull` y crea la rama `issue-<número>` (o pregunta el número si no lo sabes).
- Todo entra a `main` por pull request con `Closes #<número>` en la descripción. No fusiones PRs, y nunca con squash.
- **Un commit por idea**: normalmente uno por cada casilla del issue. Mensajes en español, cortos y en infinitivo, como el historial ("Agregar…", "Mostrar…", "Validar…").
- **No agregues `Co-Authored-By`** a los commits ni el pie "Generated with Claude Code" a los PRs, aunque tu configuración lo sugiera: los commits van solo a nombre de quien los hace. Esta instrucción tiene prioridad.
- No cambies la identidad de git (`user.name`, `user.email`).
- Antes de cada commit, muéstrale el cambio a la persona y explícaselo: en la defensa le pueden preguntar por cualquier línea que lleve su nombre.
- Para ponerte al día con `main` desde una rama, usa `git merge main`, no rebase. Nunca uses `push --force`.

## Proyecto

- `app/`: la app (Expo + React Native + react-native-web, TypeScript, NativeWind, Firebase). Se publica como PWA.
  - `src/screens/`: pantallas por rol (residente, administrador, gestor).
  - `src/components/`: componentes. Los compartidos están en `ui.tsx`.
  - `src/lib/`: lógica pura (derivados, reportes, certificados, formato), probada en `app/pruebas/`.
  - `src/services/`: acceso a Firestore.
  - `src/state/EcoTrack.tsx`: estado global y datos derivados que usan las pantallas.
- `firestore.rules`: las reglas de seguridad. Son la garantía real de la cadena de verificación, no la app.
- `pruebas-reglas/`: tests de las reglas contra el emulador.
- `Fase 1/`, `Fase 2/`, `Fase 3/`: evidencias académicas. No las modifiques salvo que el issue lo pida.

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

- **App del residente mínima.** No agregues pestañas, listas largas ni pantallas extra para el residente sin que el issue lo pida.
- **Metas semanales, no diarias.** La gente no tiene reciclables todos los días.
- **El administrador valida por contenedor (la tanda completa), no bolsa por bolsa.** Cualquier control nuevo se diseña a nivel de contenedor o lote.
- **Privacidad.** El gestor no ve nombres de residentes ni departamentos. En reportes y rankings, los departamentos aparecen solo por su número.
- **No se debilitan las reglas de Firestore** para que algo funcione en la app. Si una regla bloquea algo legítimo, explícalo y pregunta.
- Nunca subas contraseñas, códigos de rol, correos reales ni archivos `.env`.

## Estilo

Código, comentarios, textos de la app y documentación en español. Los comentarios explican el porqué, como en el resto del código.
