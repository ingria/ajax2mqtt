module.exports = {
  env: {
    browser: true,
    es2023: true,
  },
  extends: [
    'airbnb-base',
  ],
  parserOptions: {
    ecmaVersion: 'latest',
    sourceType: 'module',
  },
  rules: {
    "camelcase": "off",
    "indent": ["error", 4, {
      SwitchCase: 1,
    }],
    "no-unused-vars": ["error", {
      argsIgnorePattern: "^_",
      varsIgnorePattern: "^_",
    }],
    "max-classes-per-file": "warn",
    "default-case": "off",
    "no-return-await": "off",
    "class-methods-use-this": "warn",
    "quote-props": ["warn", "consistent-as-needed"],
    "no-undef-init": "off",
    "prefer-template": "off",
    "prefer-object-spread": "off",
    "prefer-destructuring": "off",
    "max-len": "off",
    "object-curly-newline": "off",
    "object-property-newline": "off",
    "no-console": "off",
    "no-continue": "off",
    "no-useless-escape": "off",
    "arrow-parens": ["warn", "as-needed", {
      requireForBlockBody: true,
    }],
    "lines-between-class-members": "off",
    "import/no-named-as-default-member": "off",
    "import/prefer-default-export": "off",
    "import/extensions": ["error", "always"],
    "import/no-unresolved": ["error"],
  },

  settings: {
    'import/resolver': {
      alias: {
        map: [
          ['#src', './src'],
        ],
        extensions: ['.mjs'],
      },
    },
  },
};