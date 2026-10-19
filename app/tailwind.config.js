/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./App.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      // Colores del panel del administrador, sacados de su diseño: vino de la
      // viña para la barra, oliva para lo que está bien, ámbar para lo que
      // pide atención y piedra para el fondo. Los textos sobre cada fondo
      // cumplen contraste 4.5:1.
      colors: {
        vino: {
          DEFAULT: "#2B1424",
          medio: "#3D2135",
          linea: "#45283C",
          suave: "#C3AEBC",
          nav: "#DCCDD6",
          texto: "#F6EFF3",
        },
        oliva: {
          DEFAULT: "#3F6B2E",
          oscuro: "#2C4D20",
          claro: "#E6EEDD",
          medio: "#A9C98F",
          hoja: "#8DB574",
        },
        ambar: {
          DEFAULT: "#A8732F",
          oscuro: "#7A4E17",
          profundo: "#5C3B12",
          claro: "#F5EBDD",
          suave: "#FBF5EC",
          medio: "#EAD8BF",
          borde: "#E2C9A4",
          vivo: "#D9A35B",
        },
        piedra: {
          DEFAULT: "#F1F2EE",
          linea: "#ECEDE8",
          borde: "#E2E4DE",
          control: "#CFD2CA",
          campo: "#F7F8F5",
          punto: "#B8BDB1",
        },
        tinta: {
          DEFAULT: "#221C20",
          media: "#4D474B",
          suave: "#6E686C",
        },
        rojizo: {
          claro: "#F6E3E1",
          oscuro: "#8A2A22",
        },
        azulado: {
          claro: "#E1EAF4",
          oscuro: "#24496F",
        },
      },
    },
  },
  plugins: [],
};
