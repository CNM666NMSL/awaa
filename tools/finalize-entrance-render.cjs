const fs=require('fs');let p='js/rain-weather.js',s=fs.readFileSync(p,'utf8').replace('actors=[g.p1,g.p2].filter(Boolean)','actors=g.phase===\'intro\'?[]:[g.p1,g.p2].filter(Boolean)');fs.writeFileSync(p,s);
p='index.html';s=fs.readFileSync(p,'utf8').replace('js/rain-weather.js?v=mobility2','js/rain-weather.js?v=entrance1');fs.writeFileSync(p,s);
