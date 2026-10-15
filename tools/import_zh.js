// Extrae únicamente el diccionario JSON, sin ejecutar el userscript de origen.
// Uso: node tools/import_zh.js RUTA/combined.js
const fs = require('fs'), path = require('path');
const source = process.argv[2];
if (!source) throw new Error('Falta la ruta del archivo combined.js');
const text = fs.readFileSync(source, 'utf8');
const match = text.match(/const DICT = (\{[^\r\n]*\});/);
if (!match) throw new Error('No se encontró el diccionario JSON');
const dict = JSON.parse(match[1]);
if (!Object.values(dict).every(v => typeof v === 'string')) throw new Error('Diccionario inválido');
const output = path.join(__dirname, '..', 'js', 'data', 'lang-zh.js');
fs.writeFileSync(output, '// 简体中文词典，移植自 Gugusb 的 PokeSurvivor-PC combined.js（2026-10-14）。\n' +
  '// 只导入显示文本；使用游戏原生语言系统。\nG.I18n.addChinese(' + JSON.stringify(dict, null, 2) + ');\n');
console.log('Imported Chinese translations: ' + Object.keys(dict).length);
