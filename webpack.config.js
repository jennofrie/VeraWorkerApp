// Webpack config to exclude native modules from web builds
const path = require('path');

module.exports = function (config) {
  // Exclude react-native-maps from web builds
  config.resolve.alias = {
    ...config.resolve.alias,
    'react-native-maps': path.resolve(__dirname, 'components/LocationMap.web.js'),
  };

  // Add fallback for native modules
  config.resolve.fallback = {
    ...config.resolve.fallback,
    'react-native-maps': false,
  };

  return config;
};

