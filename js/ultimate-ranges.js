/* Apply after all roster definitions so animation rebuilds cannot reset combat reach. */
(() => {
    const roles = {
        noble: 'melee', jianke: 'melee', shouwang: 'melee',
        motong: 'ranged', liequan: 'ranged', wuxiang: 'ranged',
    };
    for (const [id, role] of Object.entries(roles)) {
        const def = CONFIG.characters[id];
        if (!def?.super_) continue;
        def.combatRole = role;
        // One body = the caster's collision width. range starts at its front edge;
        // Fighter.getAttackBox adds half a body to measure from the caster's centre.
        def.super_.rangeBodies = role === 'melee' ? 3 : 4.5;
        def.super_.range = def.width * def.super_.rangeBodies;
    }
})();
