import terser from '@rollup/plugin-terser';

export default [
  {
    input: 'src/p5.svgExport.js',
    output: {
      file: 'dist/p5.svgExport.min.js',
      format: 'iife',
      name: 'p5.SVG',
      plugins: [
        terser()
      ]
    }
  },
  {
    input: 'src/p5.svgImport.js',
    output: {
      file: 'dist/p5.svgImport.min.js',
      format: 'iife',
      name: 'p5.SVG',
      plugins: [
        terser()
      ]
    }
  }
];