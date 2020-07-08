module.exports = {
    parser: 'babel-eslint',
    extends: ['eslint:recommended'],
    env: {
        jest: true,
        browser: true,
        node: true,
        es6: true,
    },
    parserOptions: {
        ecmaVersion: 6,
        sourceType: 'module',
        ecmaFeatures: {
            jsx: true,
        },
    },
    rules: {
        'arrow-body-style': [2, 'as-needed'],
        'no-console': 0,
        'no-unused-vars': 2,
        'no-redeclare': 0,
        'prefer-template': 2,
    },
};
