/* Decoded, deduplicated critical images. The loading curtain gates simulation and input. */
(() => {
    const entries=new Map(),waiters=[];
    let sealed=false,windowLoaded=document.readyState==='complete',blockedAt=performance.now();
    let resolveReady;
    const ready=new Promise(resolve=>{resolveReady=resolve;});
    const el=id=>document.getElementById(id);
    const manager=window.gameAssets={blocked:true,ready,entries,
        loadImage(src,onReady){
            const key=new URL(src,location.href).href;
            let entry=entries.get(key);
            if(!entry){entry={key,image:new Image(),status:'pending',callbacks:[],attempt:0};entries.set(key,entry);start(entry);}
            if(onReady){if(entry.status==='loaded')queueMicrotask(()=>onReady(entry.image));else entry.callbacks.push(onReady);}
            if(entry.status!=='loaded'&&!this.blocked){this.blocked=true;blockedAt=performance.now();}
            publish();return entry.image;
        },
        finishBootstrap(){
            for(const id of CONFIG.stageOrder){const src=CONFIG.stages[id].img;if(src)this.loadImage(src+'?v='+ASSET_VER);}
            sealed=true;publish();
        },
        whenReady(){return this.blocked?new Promise(resolve=>waiters.push(resolve)):Promise.resolve();},
        retryFailed(){for(const e of entries.values())if(e.status==='error'){e.attempt++;start(e);}publish();},
        stats(){const list=[...entries.values()];return {total:list.length,loaded:list.filter(e=>e.status==='loaded').length,failed:list.filter(e=>e.status==='error').length,blocked:this.blocked};}
    };
    function start(entry){
        entry.status='pending';
        const image=entry.image;
        image.onload=async()=>{
            try{if(image.decode)await image.decode();if(!image.naturalWidth)throw Error('Empty image');entry.status='loaded';for(const callback of entry.callbacks.splice(0))callback(image);}
            catch(_){entry.status='error';}
            publish();
        };
        image.onerror=()=>{entry.status='error';publish();};
        const source=new URL(entry.key);if(entry.attempt)source.searchParams.set('retry',String(entry.attempt));image.src=source.href;
    }
    function publish(){
        const {total,loaded,failed}=manager.stats();
        const complete=sealed&&windowLoaded&&loaded===total&&!failed;
        const progress=complete?100:sealed?Math.min(99,Math.floor(loaded/Math.max(1,total)*100)):0;
        const curtain=el('resource-loading');if(!curtain)return;
        const wrapper=el('game-wrapper');if(wrapper)wrapper.inert=!complete;
        el('loading-progress').value=progress;el('loading-progress').setAttribute('aria-valuenow',String(progress));
        el('loading-percent').textContent=progress+'%';
        el('loading-description').textContent=failed?`${failed} 项资源加载失败，请重试。`:!sealed?'正在整理角色、动作与场景…':loaded===total?'正在准备画面与特效…':`正在加载角色、动作与场景 · ${loaded} / ${total}`;
        el('loading-retry').hidden=!failed;
        if(complete){
            if(manager.blocked){const now=performance.now(),game=window.game;if(game){game._lastTime=now;game._accum=0;if(game.phase==='intro')game._introStartedAt=now;if(game.roundStartMs!=null)game.roundStartMs+=now-blockedAt;}}
            manager.blocked=false;curtain.hidden=true;curtain.setAttribute('aria-busy','false');
            document.body.classList.remove('assets-loading');resolveReady();for(const resolve of waiters.splice(0))resolve();
        }else{curtain.hidden=false;curtain.setAttribute('aria-busy','true');document.body.classList.add('assets-loading');}
    }
    el('loading-retry').onclick=()=>manager.retryFailed();
    window.addEventListener('load',()=>{windowLoaded=true;publish();},{once:true});
})();
