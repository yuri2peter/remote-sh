module.exports = {
  env: {
    commonjs: true,
    es6: true,
    node: true,
  },
  extends: ['eslint:recommended', 'plugin:prettier/recommended'],
  globals: {
    Atomics: 'readonly',
    SharedArrayBuffer: 'readonly',
  },
  parserOptions: {
    ecmaVersion: 2018,
  },
  rules: {
    indent: [
      'error',
      2,
      {
        SwitchCase: 1,
      },
    ],
    'require-atomic-updates': 0,
  },
};
