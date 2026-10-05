// Compile actual TS/TSX with the installed Next compiler for isolated unit tests.
// Explicit dependency doubles apply only in this process, never in the app.
import {createRequire} from 'node:module';
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import vm from 'node:vm';
const require=createRequire(import.meta.url),swc=require('next/dist/build/swc');
await swc.loadBindings();
export function loadSource(file,doubles={}) {
 const filename=resolve(file),code=swc.transformSync(readFileSync(filename,'utf8'),{filename,jsc:{parser:{syntax:'typescript',tsx:filename.endsWith('.tsx')},target:'es2022',transform:{react:{runtime:'automatic'}}},module:{type:'commonjs'}}).code;
 const testModule={exports:{}};
 const dependency=name=>{
  if(Object.hasOwn(doubles,name))return doubles[name];
  if(name.startsWith('.')){const base=resolve(dirname(filename),name),local=[base,base+'.ts',base+'.tsx',base+'.mjs'].find(p=>existsSync(p));if(local&&/\.tsx?$/.test(local))return loadSource(local,doubles);}
  return require(name);
 };
 vm.runInThisContext(`(function(require,module,exports){${code}\n})`,{filename})(dependency,testModule,testModule.exports);
 return testModule.exports;
}
export function loadExternalRenderer(file,React) {
 const filename=resolve(file),externalRequire=createRequire(filename),testModule={exports:{}};
 vm.runInThisContext(`(function(require,module,exports){${readFileSync(filename,'utf8')}\n})`,{filename})(name=>name==='react'?React:externalRequire(name),testModule,testModule.exports);
 return testModule.exports;
}
