/* Shared stage selection for local, CPU, practice and host-controlled LAN lobbies. */
(() => {
    const styles = { all: "全部场景", western: "西方魔法", chinese: "中式都市", classic: "经典场景" };
    const styleOf = stage => stage.style || "classic";
    const game = window.game;
    try {
        const saved = localStorage.getItem("awa-selected-stage");
        if (CONFIG.stages[saved]) game.selectedStage = saved;
    } catch (_) { /* Storage is optional; selection still works for this session. */ }
    game.selectedStage ||= "lingxia";

    Game.prototype.selectStage = function(id, containerId) {
        if (!CONFIG.stages[id]) return;
        this.selectedStage = id;
        try { localStorage.setItem("awa-selected-stage", id); } catch (_) {}
        this.buildStagePicker(containerId, id, next => this.selectStage(next, containerId));
    };

    Game.prototype.buildStagePicker = function(containerId, selectedId, onChoose, editable = true) {
        const root = document.getElementById(containerId);
        if (!root) return;
        selectedId = CONFIG.stages[selectedId] ? selectedId : "lingxia";
        const selected = CONFIG.stages[selectedId];
        this.stageFilters ||= {};
        const filter = this.stageFilters[containerId] || "all";
        root.classList.add("scene-picker");
        root.replaceChildren();

        const tabs = document.createElement("div");
        tabs.className = "scene-filters";
        tabs.setAttribute("role", "group");
        tabs.setAttribute("aria-label", "场景风格");
        for (const [id, label] of Object.entries(styles)) {
            const button = document.createElement("button");
            button.type = "button";
            button.textContent = label;
            button.setAttribute("aria-pressed", String(filter === id));
            button.onclick = () => {
                this.stageFilters[containerId] = id;
                this.buildStagePicker(containerId, selectedId, onChoose, editable);
            };
            tabs.append(button);
        }

        const preview = document.createElement("div");
        preview.className = "scene-preview";
        if (selected.img) preview.style.backgroundImage = `url('${selected.img}')`;
        else preview.style.backgroundImage = `linear-gradient(140deg,${selected.sky[0]},${selected.sky[1]})`;
        const detail = document.createElement("div");
        const label = document.createElement("small"), title = document.createElement("strong"), desc = document.createElement("p");
        label.textContent = "已选 · " + styles[styleOf(selected)];
        title.textContent = selected.name;
        desc.textContent = selected.description || "沿用原有对战场景";
        detail.append(label, title, desc);
        detail.setAttribute("aria-live", "polite");
        preview.append(detail);

        const grid = document.createElement("div");
        grid.className = "scene-options";
        grid.setAttribute("role", "group");
        grid.setAttribute("aria-label", "场景列表");
        for (const id of CONFIG.stageOrder) {
            const stage = CONFIG.stages[id];
            if (filter !== "all" && styleOf(stage) !== filter) continue;
            const card = document.createElement("button");
            card.type = "button";
            card.className = "scene-option";
            card.setAttribute("aria-label", "选择场景：" + stage.name);
            card.setAttribute("aria-pressed", String(id === selectedId));
            card.disabled = !editable;
            const thumb = document.createElement("span");
            thumb.className = "scene-thumbnail";
            thumb.style.backgroundImage = stage.img ? `url('${stage.img}')` : `linear-gradient(140deg,${stage.sky[0]},${stage.sky[1]})`;
            const caption = document.createElement("span");
            caption.textContent = stage.name;
            card.append(thumb, caption);
            card.onclick = () => onChoose(id);
            grid.append(card);
        }
        root.append(tabs, preview, grid);
        if (!editable) {
            const note = document.createElement("p");
            note.className = "scene-host-note";
            note.textContent = "场景由房主选择，开局后双方使用相同场景。";
            root.append(note);
        }
    };
})();
