const fs=require('fs');let p='tools/mobility-review.html',s=fs.readFileSync(p,'utf8').replace("ctx.translate(-f.x,-CONFIG.canvas.groundY)","ctx.translate(-f.x,-Math.min(CONFIG.canvas.groundY,f.y+90))");fs.writeFileSync(p,s);
p='js/game.js';s=fs.readFileSync(p,'utf8');const a=s.indexOf('            const zoom = Math.max(1, Math.min(1.65, CONFIG.canvas.width * 0.7'),b=s.indexOf('\n        }',a);s=s.slice(0,a)+`            const view=this.practiceCamera();ctx.translate(view.x,view.y);ctx.scale(view.scale,view.scale);`+s.slice(b);
const at=s.indexOf('    render() {');s=s.slice(0,at)+`    practiceCamera(){
        const W=CONFIG.canvas.width,H=CONFIG.canvas.height,top=Math.min(this.p1.y-this.p1.height,this.p2.y-this.p2.height),bottom=Math.max(this.p1.y,this.p2.y);
        const horizontal=Math.max(1,Math.min(1.65,W*.7/Math.max(1,Math.abs(this.p1.x-this.p2.x))));
        const scale=Math.max(.8,Math.min(horizontal,(H-95)/Math.max(1,bottom-top)));
        let y=H*.84-bottom*scale;if(top*scale+y<28)y=28-top*scale;
        return {scale,x:W/2-(this.p1.x+this.p2.x)/2*scale,y};
    }

`+s.slice(at);fs.writeFileSync(p,s);
p='js/rain-weather.js';s=fs.readFileSync(p,'utf8').replace("view(g){const w=", "view(g){if(g.mode==='practice'&&g.p1&&g.p2&&typeof g.practiceCamera==='function')return g.practiceCamera();const w=");fs.writeFileSync(p,s);
p='index.html';s=fs.readFileSync(p,'utf8').replace('js/game.js?v=mobility1','js/game.js?v=mobility2').replace('js/rain-weather.js?v=mobility1','js/rain-weather.js?v=mobility2');fs.writeFileSync(p,s);
