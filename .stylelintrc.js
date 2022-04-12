module.exports = {
    extends: [
        'stylelint-config-standard',
        'stylelint-config-sass-guidelines',
        'stylelint-prettier/recommended',
    ],
    rules: {
        'alpha-value-notation': 'number',
        'color-function-notation': 'legacy',
    },
    defaultSeverity: 'warning',
};
