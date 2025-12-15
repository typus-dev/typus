
export function autoComponentNamePlugin() {
  return {
    name: 'auto-component-name',
    transform(code, id) {
      if (!id.endsWith('.vue')) return;
      
      const filename = id.split('/').pop()?.replace('.vue', '');
      if (!filename) return;
      

      if (!code.includes('defineOptions') && code.includes('<script setup')) {
        const setupScriptMatch = code.match(/<script setup[^>]*>/);
        if (setupScriptMatch) {
          const insertion = `\ndefineOptions({ name: '${filename}' })\n`;
          const insertPos = setupScriptMatch.index! + setupScriptMatch[0].length;
          return {
            code: code.slice(0, insertPos) + insertion + code.slice(insertPos),
            map: null
          };
        }
      }
      
      return null;
    }
  };
}