(function () {
  const buttons = Array.from(document.querySelectorAll(".view-tab"));
  const views = {
    reference: document.getElementById("view-reference"),
    party: document.getElementById("view-party"),
  };

  buttons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const target = btn.dataset.view;
      buttons.forEach((b) => b.classList.toggle("active", b === btn));
      Object.entries(views).forEach(([key, el]) => {
        el.hidden = key !== target;
      });
    });
  });
})();
