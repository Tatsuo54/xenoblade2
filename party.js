(function () {
  const DATA = window.XENOBLADE2_DATA;
  const MAX_SLOTS = 3;
  const MAX_BLADES = 3;

  const ELEMENT_COLOR = {
    "火": "var(--el-fire)",
    "水": "var(--el-water)",
    "風": "var(--el-wind)",
    "氷": "var(--el-ice)",
    "地": "var(--el-earth)",
    "雷": "var(--el-thunder)",
    "光": "var(--el-light)",
    "闇": "var(--el-dark)",
  };

  const ELEMENT_ORDER = ["火", "水", "風", "氷", "地", "雷", "光", "闇"];

  const REACTIONS = [
    { key: "break", label: "ブレイク" },
    { key: "down", label: "ダウン" },
    { key: "smash", label: "スマッシュ" },
    { key: "rising", label: "ライジング" },
  ];

  // Tokens that can never coexist, regardless of slot.
  // "driver:<id>" / "blade:<name>" tokens.
  const EXCLUSIVE_GROUPS = [
    ["blade:ホムラ", "blade:ヒカリ"],
    ["driver:nia", "blade:ニア（ブレイド）"],
  ];

  function driverById(id) {
    return DATA.drivers.find((d) => d.id === id);
  }

  function bladeOf(driverId, bladeName) {
    const driver = driverById(driverId);
    if (!driver) return null;
    return driver.blades.find((b) => b.name === bladeName) || null;
  }

  function allElements() {
    const values = new Set();
    DATA.drivers.forEach((driver) =>
      driver.blades.forEach((blade) => blade.element.forEach((el) => values.add(el)))
    );
    return Array.from(values).sort(
      (a, b) => ELEMENT_ORDER.indexOf(a) - ELEMENT_ORDER.indexOf(b)
    );
  }
  const ELEMENT_OPTIONS = allElements();

  const party = [
    { driverId: null, blades: [] },
    { driverId: null, blades: [] },
    { driverId: null, blades: [] },
  ];

  // Per-slot picker filter state.
  const slotFilters = [
    { element: "", reactions: new Set() },
    { element: "", reactions: new Set() },
    { element: "", reactions: new Set() },
  ];

  function groupOf(token) {
    return EXCLUSIVE_GROUPS.find((g) => g.includes(token)) || null;
  }

  // Returns true if `token` may be activated for `slotIndex` given the
  // party's current state (ignoring token's own current placement in that slot).
  function isTokenAvailable(token, slotIndex) {
    for (let i = 0; i < party.length; i++) {
      const slot = party[i];
      const slotTokens = [];
      if (slot.driverId) slotTokens.push(`driver:${slot.driverId}`);
      slot.blades.forEach((b) => slotTokens.push(`blade:${b}`));

      for (const t of slotTokens) {
        if (t === token) {
          if (i !== slotIndex) return false; // used in another slot
          continue; // already active in this slot -> fine (toggle handles removal)
        }
        const group = groupOf(token);
        if (group && group.includes(t)) return false; // exclusive-group conflict
      }
    }
    return true;
  }

  function setDriver(slotIndex, driverId) {
    party[slotIndex].driverId = driverId || null;
    party[slotIndex].blades = [];
    slotFilters[slotIndex] = { element: "", reactions: new Set() };
    render();
  }

  function clearSlot(slotIndex) {
    party[slotIndex] = { driverId: null, blades: [] };
    slotFilters[slotIndex] = { element: "", reactions: new Set() };
    render();
  }

  function toggleBlade(slotIndex, bladeName) {
    const slot = party[slotIndex];
    const idx = slot.blades.indexOf(bladeName);
    if (idx >= 0) {
      slot.blades.splice(idx, 1);
    } else {
      if (slot.blades.length >= MAX_BLADES) return;
      if (!isTokenAvailable(`blade:${bladeName}`, slotIndex)) return;
      slot.blades.push(bladeName);
    }
    render();
  }

  function reactionDot(active) {
    return `<span class="reaction-dot${active ? " active" : ""}"></span>`;
  }

  function buildSelectedList(slotIndex, slot) {
    const wrap = document.createElement("div");
    wrap.className = "slot-selected-list";

    if (slot.blades.length === 0) {
      const hint = document.createElement("p");
      hint.className = "slot-selected-empty";
      hint.textContent = "未選択";
      wrap.appendChild(hint);
      return wrap;
    }

    slot.blades.forEach((name) => {
      const tag = document.createElement("button");
      tag.type = "button";
      tag.className = "selected-blade-tag";
      tag.textContent = `${name} ×`;
      tag.title = "クリックで外す";
      tag.addEventListener("click", () => toggleBlade(slotIndex, name));
      wrap.appendChild(tag);
    });

    return wrap;
  }

  function buildFilterBar(slotIndex) {
    const filter = slotFilters[slotIndex];
    const bar = document.createElement("div");
    bar.className = "slot-filter";

    const select = document.createElement("select");
    const emptyOpt = document.createElement("option");
    emptyOpt.value = "";
    emptyOpt.textContent = "属性: すべて";
    select.appendChild(emptyOpt);
    ELEMENT_OPTIONS.forEach((el) => {
      const opt = document.createElement("option");
      opt.value = el;
      opt.textContent = el;
      if (filter.element === el) opt.selected = true;
      select.appendChild(opt);
    });
    select.addEventListener("change", (e) => {
      filter.element = e.target.value;
      render();
    });
    bar.appendChild(select);

    const reactionRow = document.createElement("div");
    reactionRow.className = "slot-filter-reactions";

    REACTIONS.forEach((r) => {
      const label = document.createElement("label");
      label.className = "chip";
      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.checked = filter.reactions.has(r.key);
      checkbox.addEventListener("change", () => {
        if (checkbox.checked) filter.reactions.add(r.key);
        else filter.reactions.delete(r.key);
        render();
      });
      label.appendChild(checkbox);
      label.appendChild(document.createTextNode(r.label));
      reactionRow.appendChild(label);
    });

    bar.appendChild(reactionRow);

    return bar;
  }

  function buildBladeList(slotIndex, driver, slot) {
    const filter = slotFilters[slotIndex];
    const wrap = document.createElement("div");
    wrap.className = "blade-row-list";

    const visibleBlades = driver.blades.filter((blade) => {
      if (slot.blades.includes(blade.name)) return true; // always show selected
      if (filter.element && !blade.element.includes(filter.element)) return false;
      if (filter.reactions.size > 0) {
        const matchesAny = Array.from(filter.reactions).some((key) => blade[key]);
        if (!matchesAny) return false;
      }
      return true;
    });

    if (visibleBlades.length === 0) {
      const empty = document.createElement("p");
      empty.className = "slot-empty-hint";
      empty.textContent = "条件に合うブレイドがありません";
      wrap.appendChild(empty);
      return wrap;
    }

    visibleBlades.forEach((blade) => {
      const row = document.createElement("div");
      row.className = "blade-row";

      const selected = slot.blades.includes(blade.name);
      const token = `blade:${blade.name}`;
      const canPick =
        selected ||
        (slot.blades.length < MAX_BLADES && isTokenAvailable(token, slotIndex));

      if (selected) row.classList.add("selected");
      if (!canPick) row.classList.add("disabled");

      const name = document.createElement("span");
      name.className = "blade-row-name";
      name.textContent = blade.name;

      const elements = document.createElement("span");
      elements.className = "blade-row-elements";
      elements.innerHTML = blade.element
        .map((el) => `<span class="badge" style="background:${ELEMENT_COLOR[el] || "var(--accent)"}">${el}</span>`)
        .join("");

      const reactions = document.createElement("span");
      reactions.className = "blade-row-reactions";
      reactions.innerHTML = REACTIONS.map((r) => reactionDot(blade[r.key])).join("");

      row.appendChild(name);
      row.appendChild(elements);
      row.appendChild(reactions);

      row.addEventListener("click", () => {
        if (!canPick) return;
        toggleBlade(slotIndex, blade.name);
      });

      wrap.appendChild(row);
    });

    return wrap;
  }

  function renderSlots() {
    const container = document.getElementById("partySlots");

    // Preserve each slot's blade-list scroll position across re-renders,
    // so picking a blade doesn't jump the list back to the top.
    const existingLists = container.querySelectorAll(".blade-row-list");
    const savedScroll = party.map((_, i) => (existingLists[i] ? existingLists[i].scrollTop : 0));

    container.innerHTML = "";
    const newLists = [];

    party.forEach((slot, slotIndex) => {
      const card = document.createElement("div");
      card.className = "slot-card";

      const titleEl = document.createElement("p");
      titleEl.className = "slot-title";
      titleEl.textContent = `ドライバー ${slotIndex + 1}`;
      card.appendChild(titleEl);

      const header = document.createElement("div");
      header.className = "slot-header";

      const select = document.createElement("select");
      const emptyOpt = document.createElement("option");
      emptyOpt.value = "";
      emptyOpt.textContent = "— ドライバーを選択 —";
      select.appendChild(emptyOpt);

      DATA.drivers.forEach((driver) => {
        const opt = document.createElement("option");
        opt.value = driver.id;
        opt.textContent = driver.name;
        const token = `driver:${driver.id}`;
        const available =
          driver.id === slot.driverId || isTokenAvailable(token, slotIndex);
        opt.disabled = !available;
        if (driver.id === slot.driverId) opt.selected = true;
        select.appendChild(opt);
      });

      select.addEventListener("change", (e) => setDriver(slotIndex, e.target.value));

      const clearBtn = document.createElement("button");
      clearBtn.type = "button";
      clearBtn.className = "slot-clear";
      clearBtn.textContent = "クリア";
      clearBtn.addEventListener("click", () => clearSlot(slotIndex));

      header.appendChild(select);
      header.appendChild(clearBtn);
      card.appendChild(header);

      if (!slot.driverId) {
        const hint = document.createElement("p");
        hint.className = "slot-empty-hint";
        hint.textContent = "ドライバー未選択";
        card.appendChild(hint);
      } else {
        const driver = driverById(slot.driverId);

        const count = document.createElement("p");
        count.className = "slot-count";
        count.textContent = `ブレイド ${slot.blades.length} / ${MAX_BLADES}`;
        card.appendChild(count);

        card.appendChild(buildSelectedList(slotIndex, slot));
        card.appendChild(buildFilterBar(slotIndex));

        const listEl = buildBladeList(slotIndex, driver, slot);
        card.appendChild(listEl);
        newLists[slotIndex] = listEl;
      }

      container.appendChild(card);
    });

    newLists.forEach((el, i) => {
      if (el) el.scrollTop = savedScroll[i] || 0;
    });
  }

  function equippedList() {
    const list = [];
    party.forEach((slot) => {
      if (!slot.driverId) return;
      slot.blades.forEach((bladeName) => {
        const blade = bladeOf(slot.driverId, bladeName);
        if (blade) list.push({ driver: driverById(slot.driverId), blade });
      });
    });
    return list;
  }

  function renderSummary() {
    const equipped = equippedList();

    const elementSummaryEl = document.getElementById("elementSummary");
    const reactionSummaryEl = document.getElementById("reactionSummary");

    const elementCount = new Map(ELEMENT_OPTIONS.map((el) => [el, 0]));
    equipped.forEach(({ blade }) => {
      blade.element.forEach((el) => {
        elementCount.set(el, (elementCount.get(el) || 0) + 1);
      });
    });
    elementSummaryEl.innerHTML = ELEMENT_OPTIONS.map((el) => {
      const n = elementCount.get(el) || 0;
      const zero = n === 0 ? " zero" : "";
      return `<span class="badge${zero}" style="background:${ELEMENT_COLOR[el] || "var(--accent)"}">${el} ×${n}</span>`;
    }).join("");

    reactionSummaryEl.innerHTML = REACTIONS.map((r) => {
      const n = equipped.filter(({ blade }) => blade[r.key]).length;
      const covered = n > 0 ? "covered" : "";
      return `<span class="reaction-pill ${covered}">${r.label} ×${n}</span>`;
    }).join("");
  }

  function renderRoster() {
    const equipped = equippedList();
    const body = document.getElementById("rosterTableBody");

    if (equipped.length === 0) {
      body.innerHTML =
        '<tr class="empty-row"><td colspan="8">ドライバーとブレイドを選択してください</td></tr>';
      return;
    }

    body.innerHTML = equipped
      .map(({ driver, blade }) => {
        const elementBadges = blade.element
          .map((el) => `<span class="badge" style="background:${ELEMENT_COLOR[el] || "var(--accent)"}">${el}</span>`)
          .join(" ");
        const reactionCells = REACTIONS.map(
          (r) => `<td class="reaction-cell" data-label="${r.label}">${reactionDot(blade[r.key])}</td>`
        ).join("");
        return `
          <tr>
            <td class="blade-name" data-label="ドライバー">${driver.name}</td>
            <td data-label="ブレイド">${blade.name}</td>
            <td data-label="属性">${elementBadges}</td>
            <td data-label="ロール"><span class="badge role">${blade.role}</span></td>
            ${reactionCells}
          </tr>
        `;
      })
      .join("");
  }

  function render() {
    renderSlots();
    renderSummary();
    renderRoster();
  }

  render();
})();
