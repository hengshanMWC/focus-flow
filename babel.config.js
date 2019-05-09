module.exports = {
  "plugins": [
    "@babel/plugin-proposal-class-properties", //class的静态属性
  ], 
  "presets": [
    [
      "@babel/preset-env",
      {
        "targets": {
          "node": "current",
        },
      },
    ],
  ],
}