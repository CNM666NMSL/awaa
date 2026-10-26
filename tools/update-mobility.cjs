const fs=require('fs');let p='js/config.js',s=fs.readFileSync(p,'utf8');s=s.replace('airControl: 0.92,','runMultiplier: 1.65,\n        doubleTapFrames: 15,\n        airAcceleration: 1.1,\n        airAttackControl: 0.85,\n        airControl: 0.92,');s=s.replace('向上 / 起跳 / W+J 上攻','上挑组合键 / W+J 上攻（不跳跃）');fs.writeFileSync(p,s);
p='js/game.js';s=fs.readFileSync(p,'utf8');s=s.replace('const upPressed = edge(keyMap.up);',`edge(keyMap.up);
        const leftPressed=edge(keyMap.left),rightPressed=edge(keyMap.right);
        const tick=edgeStore._inputTick=(edgeStore._inputTick||0)+1;
        for(const [dir,pressed]of [[-1,leftPressed],[1,rightPressed]])if(pressed){const name=dir<0?'_leftTap':'_rightTap';if(edgeStore[name]!==undefined&&tick-edgeStore[name]<=CONFIG.physics.doubleTapFrames)edgeStore._runDir=dir;edgeStore[name]=tick;}
        if((!k[keyMap.left]&&!k[keyMap.right])||(k[keyMap.left]&&k[keyMap.right])||(edgeStore._runDir===-1&&!k[keyMap.left])||(edgeStore._runDir===1&&!k[keyMap.right]))edgeStore._runDir=0;`);
s=s.replace('jmp: jumpPressed || upPressed,','jmp: jumpPressed, run: edgeStore._runDir||0,');
const jstart=s.indexOf('        if (inp.jmp && !(inp.atk && inp.u))'),jend=s.indexOf('        if (inp.skl)',jstart);s=s.slice(0,jstart)+s.slice(jend);s=s.replace('        if (inp.dsh) f.dash();',`        if(inp.jmp)f.jump(inp.l&&!inp.r?-1:inp.r&&!inp.l?1:0);
        if (inp.dsh) f.dash();`);
s=s.replace('else if (inp.d) f.comboAttack("low");','else if (!f.onGround) f.attack();\n            else if (inp.d) f.comboAttack("low");');s=s.replace('if (inp.l) f.move(-1);\n        else if (inp.r) f.move(1);','if (inp.l && !inp.r) f.move(-1,inp.run===-1);\n        else if (inp.r && !inp.l) f.move(1,inp.run===1);');
s=s.replace('["W", "跳"]','["W+J", "上挑"]').replace('["↑", "跳"]','["↑+1", "上挑"]').replace('["A/D", "移动"]','["A/D", "走 / 双击跑"]').replace('["←/→", "移动"]','["←/→", "走 / 双击跑"]');fs.writeFileSync(p,s);
p='js/fighter.js';s=fs.readFileSync(p,'utf8');s=s.replace('this.pendingFacing = facing;','this.pendingFacing = facing;\n        this.running = false;',1);
s=s.replace('        if (st === "walk" && d.anims.walkStart', '        if (st === "walk" && this.running && d.anims.run) return "run";\n        if (st === "walk" && d.anims.walkStart');
s=s.replace('        if (st === "jump") return d.anims.jump ?',`        if(st==='jump'&&this.jumpsLeft===0&&this.stateTimer<10&&d.anims.doubleJump)return 'doubleJump';
        if(st==='jump'&&Math.abs(this.vx)>.4&&d.anims.airMove)return 'airMove';
        if (st === "jump") return d.anims.jump ?`);
s=s.replace('        if (a.physics && this.state === "jump") {',`        if(a.airTravel&&this.state==='jump'){this.animFrame=this.vy< -6?0:this.vy<2?1:this.vy<8?2:3;return;}
        if (a.physics && this.state === "jump") {`);
s=s.replace('    setState(s) {\n        this.moveStopping = false;', '    setState(s) {\n        if(s!=="walk")this.running=false;\n        this.moveStopping = false;');
let a=s.indexOf('    move(dir) {'),b=s.indexOf('    /** K/W 跳跃',a);s=s.slice(0,a)+`    move(dir,running=false) {
        const airAttack=!this.onGround&&this.state==='attack'&&this.currentAttack===this.def.airAttack;
        if(!this.onGround&&(this.state==='jump'||airAttack)){
            const speed=this.curWalkSpeed()*CONFIG.physics.airControl*(this.jumpsLeft===0?1.15:1)*(airAttack?CONFIG.physics.airAttackControl:1);
            const target=dir*speed,acc=CONFIG.physics.airAcceleration;
            this.vx+=Math.max(-acc,Math.min(acc,target-this.vx));return;
        }
        if(!['idle','walk','turn'].includes(this.state)||!this.onGround)return;
        const changed=this.running!==!!running;
        this.running=!!running;
        if(this.def.anims?.walkStart&&(this.state!=='walk'||this._walkDirection!==dir||changed))this.setState('walk');
        this._walkDirection=dir;this.state='walk';this.vx=dir*this.curWalkSpeed()*(this.running?CONFIG.physics.runMultiplier:1);
    }

    stopMove() {
        this.running=false;
        if(this.state==='walk'){if(this.def.anims?.walkStop){this.setState('idle');this.moveStopping=true;}else this.state='idle';this.vx=0;}
        if(!this.onGround&&(this.state==='jump'||(this.state==='attack'&&this.currentAttack===this.def.airAttack))){this.vx*=.86;if(Math.abs(this.vx)<.08)this.vx=0;}
    }

`+s.slice(b);
s=s.replace('/** K/W 跳跃','/** K 跳跃');s=s.replace('this.vx = (dir > 0 ? 1 : -1) * CONFIG.physics.jumpHop;', 'this.vx = (dir > 0 ? 1 : -1) * CONFIG.physics.jumpHop * (this.jumpsLeft===1?1.25:1);');
s=s.replace('    _startAttack(a) {\n        this.currentAttack = a;', '    _startAttack(a) {\n        const carry=!this.onGround&&a===this.def.airAttack?this.vx:0;\n        this.currentAttack = a;');s=s.replace('this.setState("attack");\n        this.vx = 0;','this.setState("attack");\n        this.vx = carry;');
s=s.replace('wd: this._walkDirection || 0, ms:', 'rn: !!this.running, wd: this._walkDirection || 0, ms:');s=s.replace('this._walkDirection = s.wd || 0;','this._walkDirection = s.wd || 0;\n        this.running=!!s.rn;');s=s.replace('this.form = this.def.sprites ? "armored" : null;   // 每回合重置回穿甲', 'this.running=false;\n        this.form = this.def.sprites ? "armored" : null;   // 每回合重置回穿甲');fs.writeFileSync(p,s);
