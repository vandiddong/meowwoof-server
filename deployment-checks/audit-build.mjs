import { readdir, readFile } from 'node:fs/promises';
import assert from 'node:assert/strict';
const files=[];
async function walk(dir){for(const entry of await readdir(dir,{withFileTypes:true})){const path=`${dir}/${entry.name}`;if(entry.isDirectory())await walk(path);else files.push(path);}}
await walk('dist');
assert.ok(files.some(file=>file.endsWith('.js')));
for(const file of files){
  assert.ok(!/\.(map|ts|tsx)$/.test(file),`Source or source map shipped: ${file}`);
  if(file.endsWith('.js')){
    const code=await readFile(file,'utf8');
    assert.ok(!code.includes('sourceMappingURL'),`Source map reference shipped: ${file}`);
    assert.ok(!code.includes('worldSeed'),`World debug snapshot shipped: ${file}`);
    if(file.includes('/assets/index-')){
      for(const marker of ['FIND YOUR TARGET','MISSION FAILED','PASS THE CONTROLS'])assert.ok(!code.includes(marker),`Readable application string shipped: ${marker}`);
    }
  }
}
console.log('PASS build exposure audit: obfuscated app, no TS/source maps, no world debug snapshot');
