import { describe, expect, test } from "vitest";
import { esDiaHabil, feriadoDe } from "../src/lib/feriados";
import { fecha } from "./fabrica";

describe("feriadoDe", () => {
  test("el nombre del feriado, a cualquier hora de ese día", () => {
    expect(feriadoDe(fecha(2026, 12, 8, 0))).toBe("Inmaculada Concepción");
    expect(feriadoDe(fecha(2026, 12, 25, 23))).toBe("Navidad");
  });

  test("null en un día que no es feriado", () => {
    expect(feriadoDe(fecha(2026, 12, 9))).toBeNull();
  });
});

describe("esDiaHabil", () => {
  test("de lunes a viernes, salvo los feriados", () => {
    expect(esDiaHabil(fecha(2026, 12, 7))).toBe(true); // lunes
    expect(esDiaHabil(fecha(2026, 12, 8))).toBe(false); // martes feriado
    expect(esDiaHabil(fecha(2026, 12, 25))).toBe(false); // viernes feriado
  });

  test("los feriados que ya pasaron en el año tampoco son hábiles", () => {
    expect(esDiaHabil(fecha(2026, 9, 17))).toBe(true);
    expect(esDiaHabil(fecha(2026, 9, 18))).toBe(false);
    expect(esDiaHabil(fecha(2026, 10, 12))).toBe(false);
  });

  test("el fin de semana no es hábil", () => {
    expect(esDiaHabil(fecha(2026, 12, 5))).toBe(false); // sábado
    expect(esDiaHabil(fecha(2026, 12, 6))).toBe(false); // domingo
  });
});
