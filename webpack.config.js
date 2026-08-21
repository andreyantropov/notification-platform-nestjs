const { TsconfigPathsPlugin } = require('tsconfig-paths-webpack-plugin');

module.exports = function (options) {
  return {
    ...options,
    resolve: {
      ...options.resolve,
      plugins: [
        new TsconfigPathsPlugin({
          cconfigFile:
            options.compilerOptions?.tsConfigPath || './tsconfig.json',
        }),
      ],
    },
  };
};
