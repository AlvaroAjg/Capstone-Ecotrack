const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

// `tslib` (dependencia de pdf-lib y de otras librerías) publica un envoltorio ESM
// (modules/index.js) que hace `import tslib from "../tslib.js"`. Ese archivo es UMD
// y marca `__esModule`, así que Metro entrega `default` como undefined y la app
// muere al arrancar con "Cannot destructure property '__extends'". Apuntando a la
// versión ESM nativa (tslib.es6.js) las exportaciones nombradas funcionan bien.
const resolverPorDefecto = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "tslib") {
    return (resolverPorDefecto ?? context.resolveRequest)(
      context,
      "tslib/tslib.es6.js",
      platform
    );
  }
  return (resolverPorDefecto ?? context.resolveRequest)(context, moduleName, platform);
};

module.exports = withNativeWind(config, { input: "./global.css" });
