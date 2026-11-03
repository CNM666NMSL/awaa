// Run the existing balance contract with the real new visual module installed too.
const fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const filename=path.join(__dirname,'test-evelyn-v2.cjs');
let source=fs.readFileSync(filename,'utf8');
source=source.replace("load('evelyn-v2-config');load('evelyn-v2');", "load('evelyn-v2-config');load('evelyn-v2');c.window.gameAssets={loadImage(){return {naturalWidth:1}}};c.ASSET_VER='test';load('pixelfx-assets');load('pixelfx-combat');");
vm.runInNewContext(source,{require,__dirname,console},{filename});
