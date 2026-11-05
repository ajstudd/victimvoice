const path = require('path');
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);
// Shared logic has no runtime SDK dependency; each app supplies its own client.
config.watchFolders = [...config.watchFolders, path.resolve(__dirname, '../shared')];
module.exports = config;
