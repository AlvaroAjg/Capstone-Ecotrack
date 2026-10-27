import { describe, expect, test } from "vitest";
import { htmlEtiquetaQr, htmlHojaQr, svgQr } from "../src/lib/etiquetaQr";
import { matrizQr } from "../src/lib/qr";
import { contenedor } from "./fabrica";

describe("svgQr", () => {
  test("un rectángulo por cada módulo oscuro del QR", () => {
    const texto = "ECOTRACK:planta-1:K7QM9X";
    const oscuros = matrizQr(texto).flat().filter(Boolean).length;
    const svg = svgQr(texto);
    // Más el fondo blanco.
    expect(svg.match(/<rect /g)?.length).toBe(oscuros + 1);
  });
});

describe("htmlEtiquetaQr", () => {
  test("lleva el código, el material y el punto limpio", () => {
    const html = htmlEtiquetaQr(contenedor({ codigo: "K7QM9X", punto: "Casino" }), "Planta Piloto");
    expect(html).toContain("K7QM9X");
    expect(html).toContain("Contenedor de plástico");
    expect(html).toContain("Casino · Planta Piloto");
  });

  test("escapa el nombre del punto limpio", () => {
    const html = htmlEtiquetaQr(contenedor({ punto: "<b>Casino</b>" }), "Planta Piloto");
    expect(html).not.toContain("<b>Casino</b>");
    expect(html).toContain("&lt;b&gt;Casino&lt;/b&gt;");
  });
});

describe("htmlHojaQr", () => {
  const CASINO = [
    contenedor({ codigo: "PLA111", punto: "Casino", material: "Plástico" }),
    contenedor({ codigo: "MIX222", punto: "Casino", material: null }),
  ];

  test("una etiqueta por contenedor, con su QR, material, punto y código", () => {
    const html = htmlHojaQr(CASINO, "Planta Piloto", "Hoja de QR del Casino");
    expect(html.match(/class="etiqueta"/g)?.length).toBe(2);
    expect(html.match(/<svg /g)?.length).toBe(2);
    expect(html).toContain("Casino, PLA111");
    expect(html).toContain("Mixto");
    expect(html).toContain("Hoja de QR del Casino");
  });

  test("la franja de cada etiqueta tiene el color de su material", () => {
    const html = htmlHojaQr(CASINO, "Planta Piloto", "Hoja");
    expect(html).toContain("background:#C79A1E");
    expect(html).toContain("background:#3F6B2E");
  });

  test("escapa el nombre del punto y el título", () => {
    const html = htmlHojaQr([contenedor({ punto: "<b>Casino</b>" })], "Planta", "<i>Hoja</i>");
    expect(html).not.toContain("<b>Casino</b>");
    expect(html).not.toContain("<i>Hoja</i>");
  });
});
