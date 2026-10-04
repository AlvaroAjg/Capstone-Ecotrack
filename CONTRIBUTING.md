# Cómo contribuir a RecyTrack

Reglas del repositorio para todo el equipo. Rigen para cualquier cambio, sea código, tests o documentación, y da lo mismo si lo escribes tú o Claude Code.

## Reglas

1. **Nunca se trabaja en `main`.** No se hacen commits ni `push` directo a `main`. `main` es la versión que funciona: todo lo que entra ahí pasa antes por un pull request.
2. **Una rama por cambio.** Si el cambio viene de un issue, la rama se llama `issue-<número>`, por ejemplo `issue-4`. Si no hay issue, usa un nombre corto que diga qué hace, por ejemplo `corregir-podio-ranking`. **No hace falta crear un issue** para abrir un PR.
3. **Todo entra por pull request** hacia `main`. Si hay issue, la descripción lleva `Closes #<número>`; si no, explica qué cambió y por qué.
4. **Cualquier otro integrante del equipo aprueba el PR.** No hace falta que sea Álvaro: basta con una aprobación de alguien que no sea el autor (GitHub no deja aprobar el propio PR). Con la aprobación, el autor o quien aprobó lo fusiona.
5. **Los tests pasan antes de abrir el PR** (ver [Tests](#tests)).
6. **Se fusiona con merge commit, nunca con squash.** El squash junta los commits del PR en uno solo y se pierde el aporte de cada persona.
7. **Los commits van a nombre de quien los hizo**, sin la línea `Co-Authored-By`.

## Flujo de trabajo

```bash
# 1. Si trabajas un issue, asígnatelo para que nadie más lo tome
#    (sin issue, sáltate este paso)
gh issue edit 4 --add-assignee @me

# 2. Parte desde main al día
git switch main
git pull

# 3. Crea tu rama: issue-<número>, o un nombre corto si no hay issue
git switch -c issue-4

# 4. Trabaja y haz commits (uno por idea; con issue, uno por casilla)
git add <archivos>
git commit -m "Agregar ..."

# 5. Sube la rama (el -u solo la primera vez)
git push -u origin issue-4

# 6. Abre el pull request
gh pr create --fill --body "Closes #4"
#    Sin issue: gh pr create --fill
```

Después avísale al equipo que el PR está listo para revisar. Cuando alguien lo apruebe, fusiónalo:

```bash
gh pr merge 4 --merge --delete-branch
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

## Revisar el PR de otro integrante

Cualquiera del equipo puede revisar y aprobar. Antes de aprobar, prueba el cambio en tu computador:

```bash
gh pr list
gh pr checkout 7
cd app
npm test
cd ..
```

Lee los cambios en GitHub (pestaña **Files changed**) o con `gh pr diff 7`. Después:

```bash
# Si está bien
gh pr review 7 --approve

# Si hay que corregir algo
gh pr review 7 --request-changes --body "Qué hay que corregir y por qué"
```

Una vez aprobado, el autor o quien aprobó lo fusiona con `gh pr merge 7 --merge --delete-branch`. Al terminar, vuelve a `main` con `git switch main` y `git pull`.

Álvaro puede fusionar sin aprobación porque es el administrador del repositorio, pero eso queda para urgencias: lo normal es que otro integrante apruebe.

## Commits

- **Un commit por idea.** Si trabajas un issue, normalmente es uno por casilla. Evita los commits de "cambios varios".
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
- En la descripción: qué cambió, cómo lo probaste y, si viene de un issue, `Closes #<número>`.
- Si cambia algo visible, agrega una captura.
- Mientras el PR siga abierto, los arreglos que pida la revisión van como commits nuevos en la misma rama.

## Lo que nunca se sube

- Contraseñas, códigos de rol, correos reales ni archivos `.env`.
- Capturas con datos personales de residentes.
- `node_modules/`, `dist/`, `hosting/` ni logs (ya están en `.gitignore`).

## Si trabajas con Claude Code

Pídele que siga este archivo. Una instrucción que sirve para cualquier issue:

> Lee el issue #N con `gh issue view N` y hazlo en la rama `issue-N`, siguiendo CONTRIBUTING.md: un commit por cada casilla, mensajes en español y en infinitivo, sin la línea `Co-Authored-By`. Antes de cada commit muéstrame el cambio y explícamelo. No hagas commits ni push a `main`.

Y para un cambio sin issue:

> Quiero [describe el cambio]. Hazlo en una rama nueva con un nombre corto que lo describa, siguiendo CONTRIBUTING.md: un commit por idea, mensajes en español y en infinitivo, sin la línea `Co-Authored-By`. Antes de cada commit muéstrame el cambio y explícamelo. Al terminar, abre el PR hacia `main`.

Para revisar el PR de un compañero:

> Revisa el PR #N: bájalo con `gh pr checkout N`, corre los tests y explícame qué cambia y si ves algún problema. No lo apruebes ni lo fusiones hasta que yo te lo diga.

Lee cada cambio antes de aprobarlo: en la defensa te pueden preguntar por cualquier línea que lleve tu nombre.
