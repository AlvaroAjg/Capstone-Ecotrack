import { describe, expect, test } from "vitest";
import { mensajeError } from "../src/lib/errores";

/** Como los errores de Firebase: un código y un mensaje en inglés. */
function errorDeFirebase(code: string): Error {
  return Object.assign(new Error(`Firebase: ${code} (in English).`), { code });
}

describe("mensajeError", () => {
  test("traduce los códigos de Firebase que conoce", () => {
    expect(mensajeError(errorDeFirebase("auth/wrong-password"))).toBe("Correo o contraseña incorrectos.");
    expect(mensajeError(errorDeFirebase("permission-denied"))).toBe("No tienes permiso para realizar esta acción.");
  });

  test("un código desconocido no muestra el texto en inglés", () => {
    expect(mensajeError(errorDeFirebase("internal"))).toBe("No pudimos completar la operación. Intenta de nuevo.");
  });

  test("los errores de la app, que ya están en español, se muestran tal cual", () => {
    expect(mensajeError(new Error("Ese contenedor ya fue retirado."))).toBe("Ese contenedor ya fue retirado.");
  });

  test("algo que no es un error da el mensaje genérico", () => {
    expect(mensajeError(null)).toBe("No pudimos completar la operación. Intenta de nuevo.");
    expect(mensajeError("raro")).toBe("No pudimos completar la operación. Intenta de nuevo.");
  });
});
