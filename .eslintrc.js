module.exports = {
    "env": {
        "browser": true,
        "node": true,
        "jest": true,
        "es2021": true
    },
    "extends": "eslint:recommended",
    "parserOptions": {
        "ecmaVersion": 12,
        "sourceType": "module"
    },
    "rules": {
        "no-var": 2,
        "semi": [2, "always"],
        "indent": 2,
        "no-multi-spaces": 2,
        "space-in-parens": 2,
        "no-multiple-empty-lines": 2,
        "prefer-const": 2,
        "no-use-before-define": 2
    }
};
