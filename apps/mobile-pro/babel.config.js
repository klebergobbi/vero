// Babel do Expo (SDK 50+ já inclui o transform do expo-router no preset).
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
  };
};
