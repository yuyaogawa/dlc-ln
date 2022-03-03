module.exports = {
    "env": {
        "browser": true,
        "commonjs": true,
        "es2021": true
    },
    "extends": [
        "eslint:recommended",
        "prettier",
    ],
    "parserOptions": {
        "ecmaVersion": "latest"
    },
    "rules": {
        "prefer-const": [
            "error"
        ],
        "no-var": "error",
        "no-unused-vars": [
            "error",
            {
                "vars": "all",
                "args": "none" // 関数の引数は unused でもよい
            }
        ],
        "no-useless-escape": "off"
    }
}
