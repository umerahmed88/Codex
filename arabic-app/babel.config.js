// Babel config — required so react-native-reanimated works.
// The worklets plugin MUST be listed last. Reanimated 4 uses
// 'react-native-worklets/plugin' (the old 'react-native-reanimated/plugin' is
// gone). babel-preset-expo is the Expo/React Native base.
module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: ['react-native-worklets/plugin'],
  };
};
