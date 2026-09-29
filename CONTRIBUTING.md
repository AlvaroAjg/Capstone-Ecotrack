# Cómo contribuir a EcoTrack

Reglas del repositorio para todo el equipo. Rigen para cualquier cambio, sea código, tests o documentación, y da lo mismo si lo escribes tú o Claude Code.

## Reglas

1. **Nunca se trabaja en `main`.** No se hacen commits ni `push` directo a `main`. `main` es la versión que funciona: todo lo que entra ahí pasa antes por un pull request.
2. **Una rama por issue**, con el nombre `issue-<número>`, por ejemplo `issue-4`. Si el cambio no tiene issue, crea uno antes.
3. **Todo entra por pull request** hacia `main`, con `Closes #<número>` en la descripción. Álvaro lo revisa y lo fusiona; nadie fusiona su propio PR.
4. **Los tests pasan antes de abrir el PR** (ver [Tests](#tests)).
5. **Se fusiona con merge commit, nunca con squash.** El squash junta los commits del PR en uno solo y se pierde el aporte de cada persona.
6. **Los commits van a nombre de quien los hizo**, sin la línea `Co-Authored-By`.

## Flujo de trabajo

```bash
# 1. Asígnate el issue, para que nadie más lo tome
gh issue edit 4 --add-assignee @me

# 2. Parte desde main al día
git switch main
git pull

# 3. Crea tu rama
git switch -c issue-4

# 4. Trabaja y haz commits (uno por cada casilla del issue)
git add <archivos>
git commit -m "Agregar ..."

# 5. Sube la rama (el -u solo la primera vez)
git push -u origin issue-4

# 6. Abre el pull request
gh pr create --fill --body "Closes #4"
```

Cuando el PR se fusione:

```bash
git switch main
git pull
git branch -d issue-4
```

### Si `main` avanzó mientras trabajabas

Tráete esos cambios a tu rama con `merge`, no con `rebase`, para no tener que forzar el `push`:

```bash
git switch main
git pull
git switch issue-4
git merge main
git push
```

### Si hiciste commits en `main` por error

Si todavía no los subes, muévelos a una rama y deja `main` igual que en GitHub:

```bash
git switch -c issue-4
git branch -f main origin/main
```

Si ya los subiste, avísale a Álvaro antes de intentar arreglarlo.

## Commits

- **Un commit por idea.** Normalmente es uno por casilla del issue. Evita los commits de "cambios varios".
- **Mensaje en español, corto y en infinitivo**, como el resto del historial: `Agregar historial de retiros del gestor`, `Mostrar el detalle de cada depósito`.
- **Sin `Co-Authored-By`** ni pies del tipo "Generated with…". Revisa el último mensaje con `git log -1 --format=%B` antes de subir.
- **Usa el correo de tu cuenta de GitHub** (`git config --global user.email`). Si no coincide, GitHub no te asocia los commits.

## Tests

Antes de abrir el PR, desde la raíz del repo:

```bash
cd app
npm test
```

Si tocaste `firestore.rules` o `pruebas-reglas/`, corre también los tests de reglas (requieren Java 21):

```bash
cd pruebas-reglas
npm install
npm test
```

- Toda lógica nueva que se pueda separar de la pantalla va como función pura en `app/src/lib/` y lleva su test en `app/pruebas/`.
- Todo cambio en `firestore.rules` lleva en `pruebas-reglas/` el caso que lo justifica: lo que debe permitirse y lo que debe rechazarse.
- La tabla de kilos por talla existe en dos lugares, `KG_POR_TALLA` en `app/src/lib/tipos.ts` y `kgPorTalla()` en `firestore.rules`: si cambias una, cambia la otra.

## Pull requests

- Título claro: qué hace el cambio, no el número del issue.
- En la descripción: `Closes #<número>`, qué cambió y cómo lo probaste.
- Si cambia algo visible, agrega una captura.
- Mientras el PR siga abierto, los arreglos que pida la revisión van como commits nuevos en la misma rama.

## Lo que nunca se sube

- Contraseñas, códigos de rol, correos reales ni archivos `.env`.
- Capturas con datos personales de residentes.
- `node_modules/`, `dist/`, `hosting/` ni logs (ya están en `.gitignore`).

## Si trabajas con Claude Code

Pídele que siga este archivo. Una instrucción que sirve para cualquier issue:

> Lee el issue #N con `gh issue view N` y hazlo en la rama `issue-N`, siguiendo CONTRIBUTING.md: un commit por cada casilla, mensajes en español y en infinitivo, sin la línea `Co-Authored-By`. Antes de cada commit muéstrame el cambio y explícamelo. No hagas commits ni push a `main`.

Lee cada cambio antes de aprobarlo: en la defensa te pueden preguntar por cualquier línea que lleve tu nombre.
