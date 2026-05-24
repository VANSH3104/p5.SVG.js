import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/p5.svgExport.js',
    output: {
      file: 'dist/p5.svgExport.min.js',
      format: 'iife',
      name: 'addonTemplate',
      plugins: [
        terser()
      ]
    }
  },
];