(function () {
  const DATA = window.XENOBLADE2_DATA;

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

  const REACTIONS = [
    { key: "break", label: "ブレイク" },
    { key: "down", label: "ダウン" },
    { key: "smash", label: "スマッシュ" },
    { key: "rising", label: "ライジング" },
  ];

  const driverTabsEl = document.getElementById("driverTabs");
  const elementFilterEl = document.getElementById("elementFilter");
  const roleFilterEl = document.getElementById("roleFilter");
  const searchInputEl = document.getElementById("searchInput");
  const tableBodyEl = document.getElementById("bladeTableBody");
  const resultCountEl = document.getElementById("resultCount");
  const reactionCheckboxes = Array.from(
    document.querySelectorAll('input[data-reaction]')
  );

  const state = {
    driverId: DATA.drivers[0].id,
    element: "",
    role: "",
    search: "",
    reactions: new Set(),
  };

  function currentDriver() {
    return DATA.drivers.find((d) => d.id === state.driverId);
  }

  function renderDriverTabs() {
    driverTabsEl.innerHTML = "";
    DATA.drivers.forEach((driver) => {
      const btn = document.createElement("button");
      btn.textContent = `${driver.name}（${driver.blades.length}）`;
      btn.className = driver.id === state.driverId ? "active" : "";
      btn.addEventListener("click", () => {
        state.driverId = driver.id;
        renderDriverTabs();
        render();
      });
      driverTabsEl.appendChild(btn);
    });
  }

  function collectOptions(field) {
    const values = new Set();
    DATA.drivers.forEach((driver) =>
      driver.blades.forEach((blade) => {
        const v = blade[field];
        if (Array.isArray(v)) {
          v.forEach((item) => values.add(item));
        } else {
          values.add(v);
        }
      })
    );
    return Array.from(values).sort();
  }

  function renderFilterOptions() {
    const elements = collectOptions("element");
    const roles = collectOptions("role");

    elementFilterEl.innerHTML = '<option value="">すべて</option>';
    elements.forEach((el) => {
      const opt = document.createElement("option");
      opt.value = el;
      opt.textContent = el;
      elementFilterEl.appendChild(opt);
    });

    roleFilterEl.innerHTML = '<option value="">すべて</option>';
    roles.forEach((role) => {
      const opt = document.createElement("option");
      opt.value = role;
      opt.textContent = role;
      roleFilterEl.appendChild(opt);
    });
  }

  function filteredBlades() {
    const driver = currentDriver();
    return driver.blades.filter((blade) => {
      if (state.element && !blade.element.includes(state.element)) return false;
      if (state.role && blade.role !== state.role) return false;
      if (
        state.search &&
        !blade.name.toLowerCase().includes(state.search.toLowerCase())
      )
        return false;
      for (const key of state.reactions) {
        if (!blade[key]) return false;
      }
      return true;
    });
  }

  function reactionDot(active) {
    return `<span class="reaction-dot${active ? " active" : ""}"></span>`;
  }

  function renderTable() {
    const blades = filteredBlades();
    resultCountEl.textContent = `${blades.length} / ${
      currentDriver().blades.length
    } 体`;

    if (blades.length === 0) {
      tableBodyEl.innerHTML =
        '<tr class="empty-row"><td colspan="8">該当するブレイドがありません</td></tr>';
      return;
    }

    tableBodyEl.innerHTML = blades
      .map((blade) => {
        const elementBadges = blade.element
          .map((el) => {
            const color = ELEMENT_COLOR[el] || "var(--accent)";
            return `<span class="badge" style="background:${color}">${el}</span>`;
          })
          .join(" ");
        const reactionCells = REACTIONS.map(
          (r) => `<td class="reaction-cell">${reactionDot(blade[r.key])}</td>`
        ).join("");
        return `
          <tr>
            <td class="blade-name">${blade.name}</td>
            <td>${elementBadges}</td>
            <td><span class="badge role">${blade.role}</span></td>
            <td>${blade.weapon}</td>
            ${reactionCells}
          </tr>
        `;
      })
      .join("");
  }

  function render() {
    renderTable();
  }

  elementFilterEl.addEventListener("change", (e) => {
    state.element = e.target.value;
    render();
  });

  roleFilterEl.addEventListener("change", (e) => {
    state.role = e.target.value;
    render();
  });

  searchInputEl.addEventListener("input", (e) => {
    state.search = e.target.value.trim();
    render();
  });

  reactionCheckboxes.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
      const key = checkbox.dataset.reaction;
      if (checkbox.checked) {
        state.reactions.add(key);
      } else {
        state.reactions.delete(key);
      }
      render();
    });
  });

  renderDriverTabs();
  renderFilterOptions();
  render();
})();
