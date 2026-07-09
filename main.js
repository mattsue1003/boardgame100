const games = window.BOARD_GAMES ?? [];
const state = {
  query: "",
  category: "all",
  tag: "all",
  sort: "rank",
  favoritesOnly: false,
  favorites: new Set(JSON.parse(localStorage.getItem("favoriteBoardGames") ?? "[]")),
};

const elements = {
  grid: document.querySelector("#gameGrid"),
  template: document.querySelector("#gameCardTemplate"),
  search: document.querySelector("#searchInput"),
  category: document.querySelector("#categoryFilter"),
  tag: document.querySelector("#tagFilter"),
  sort: document.querySelector("#sortSelect"),
  favoritesOnly: document.querySelector("#favoritesOnly"),
  resultCount: document.querySelector("#resultCount"),
  favoriteCount: document.querySelector("#favoriteCount"),
  activeFilters: document.querySelector("#activeFilters"),
  dialog: document.querySelector("#gameDialog"),
  dialogContent: document.querySelector("#dialogContent"),
  closeDialog: document.querySelector("#closeDialog"),
};

function saveFavorites() {
  localStorage.setItem("favoriteBoardGames", JSON.stringify([...state.favorites]));
}

function youtubeId(url) {
  return url?.match(/[?&]v=([^&]+)/)?.[1] ?? "";
}

function imageUrl(game) {
  const videoId = youtubeId(game.tutorialUrl);
  return game.image || game.thumbnail || (videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : "");
}

function imageSearchUrl(game) {
  return `https://www.google.com/search?tbm=isch&q=${encodeURIComponent(`${game.searchTitle} board game box`)}`;
}

function makeCover(game, large = false) {
  const wrap = document.createElement("div");
  wrap.className = "cover-wrap";
  const src = imageUrl(game);
  if (src) {
    const img = document.createElement("img");
    img.src = src;
    img.alt = `${game.title} 外觀圖片`;
    img.loading = large ? "eager" : "lazy";
    img.onerror = () => {
      img.replaceWith(makeFallback(game));
    };
    wrap.append(img);
  } else {
    wrap.append(makeFallback(game));
  }
  return wrap;
}

function makeFallback(game) {
  const fallback = document.createElement("div");
  fallback.className = "cover-fallback";
  fallback.innerHTML = `<span>#${game.rank} / ${game.score} 分</span><strong>${game.title}</strong><span>${game.tags.join(" · ")}</span>`;
  return fallback;
}

function populateFilters() {
  const categories = [...new Set(games.map((game) => game.category).filter(Boolean))].sort((a, b) =>
    a.localeCompare(b, "zh-Hant"),
  );
  const tags = [...new Set(games.flatMap((game) => game.tags))].sort((a, b) => a.localeCompare(b, "zh-Hant"));

  for (const category of categories) {
    elements.category.add(new Option(category, category));
  }
  for (const tag of tags) {
    elements.tag.add(new Option(tag, tag));
  }
}

function filteredGames() {
  const query = state.query.trim().toLowerCase();
  const filtered = games.filter((game) => {
    const searchable = [game.title, game.searchTitle, game.category, ...game.tags].join(" ").toLowerCase();
    const matchesQuery = !query || searchable.includes(query);
    const matchesCategory = state.category === "all" || game.category === state.category;
    const matchesTag = state.tag === "all" || game.tags.includes(state.tag);
    const matchesFavorite = !state.favoritesOnly || state.favorites.has(game.rank);
    return matchesQuery && matchesCategory && matchesTag && matchesFavorite;
  });

  return filtered.sort((a, b) => {
    if (state.sort === "score") return b.score - a.score || a.rank - b.rank;
    if (state.sort === "name") return a.searchTitle.localeCompare(b.searchTitle);
    if (state.sort === "favorites") {
      return Number(state.favorites.has(b.rank)) - Number(state.favorites.has(a.rank)) || a.rank - b.rank;
    }
    return a.rank - b.rank;
  });
}

function renderActiveFilters() {
  const chips = [];
  if (state.query) chips.push(`搜尋：${state.query}`);
  if (state.category !== "all") chips.push(`分類：${state.category}`);
  if (state.tag !== "all") chips.push(`標籤：${state.tag}`);
  if (state.favoritesOnly) chips.push("只看最愛");
  elements.activeFilters.innerHTML = chips.map((chip) => `<span class="chip">${chip}</span>`).join("");
}

function render() {
  const list = filteredGames();
  elements.grid.innerHTML = "";

  if (!list.length) {
    elements.grid.innerHTML = `<div class="empty-state">找不到符合條件的桌遊</div>`;
  }

  for (const game of list) {
    const node = elements.template.content.firstElementChild.cloneNode(true);
    node.querySelector(".cover-wrap").replaceWith(makeCover(game));
    node.querySelector(".rank").textContent = `#${game.rank}`;
    node.querySelector(".score").textContent = `${game.score} 分`;
    node.querySelector("h2").textContent = game.title;
    node.querySelector(".meta").textContent = `${game.category} · ${game.tutorialUrl ? "有直接教學影片" : "提供搜尋教學"}`;
    node.querySelector(".tags").innerHTML = game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("");

    const favoriteButton = node.querySelector(".favorite-button");
    favoriteButton.classList.toggle("active", state.favorites.has(game.rank));
    favoriteButton.textContent = state.favorites.has(game.rank) ? "♥" : "♡";
    favoriteButton.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleFavorite(game.rank);
    });

    node.querySelector(".card-main").addEventListener("click", () => openDetail(game));
    elements.grid.append(node);
  }

  elements.resultCount.textContent = `${list.length} 款`;
  elements.favoriteCount.textContent = `${state.favorites.size} 收藏`;
  renderActiveFilters();
}

function toggleFavorite(rank) {
  if (state.favorites.has(rank)) state.favorites.delete(rank);
  else state.favorites.add(rank);
  saveFavorites();
  render();
}

function openDetail(game) {
  const videoId = youtubeId(game.tutorialUrl);
  const favoriteLabel = state.favorites.has(game.rank) ? "移除最愛" : "加入最愛";
  elements.dialogContent.innerHTML = "";

  const detail = document.createElement("section");
  detail.className = "detail";

  const media = document.createElement("div");
  media.className = "detail-media";
  media.append(makeCover(game, true));
  if (videoId) {
    const iframe = document.createElement("iframe");
    iframe.className = "video-frame";
    iframe.src = `https://www.youtube.com/embed/${videoId}`;
    iframe.title = `${game.title} 教學影片`;
    iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
    iframe.allowFullscreen = true;
    media.append(iframe);
  }

  const info = document.createElement("div");
  info.innerHTML = `
    <p class="eyebrow">#${game.rank} · ${game.score} 分</p>
    <h2>${game.title}</h2>
    <p class="meta">${game.category} · ${game.tags.join(" · ")}</p>
    <dl class="verification-list">
      <div><dt>原創地區</dt><dd>${game.originType || "待查核"}</dd></div>
      <div><dt>臺灣購買</dt><dd>${game.taiwanAvailability || "待查核"}</dd></div>
      ${
        game.availabilityCheckedAt
          ? `<div><dt>查核日期</dt><dd>${game.availabilityCheckedAt}</dd></div>`
          : ""
      }
    </dl>
    <div class="tags">${game.tags.map((tag) => `<span class="tag">${tag}</span>`).join("")}</div>
    <div class="detail-actions">
      ${
        game.tutorialUrl
          ? `<a class="action-link primary-link" href="${game.tutorialUrl}" target="_blank" rel="noreferrer">開啟教學影片</a>`
          : `<a class="action-link primary-link" href="${game.chineseSearchUrl}" target="_blank" rel="noreferrer">搜尋中文教學</a>`
      }
      <a class="action-link" href="${game.chineseSearchUrl}" target="_blank" rel="noreferrer">中文 YouTube 搜尋</a>
      <a class="action-link" href="${game.englishSearchUrl}" target="_blank" rel="noreferrer">英文教學備援</a>
      ${
        game.imageSourceUrl
          ? `<a class="action-link" href="${game.imageSourceUrl}" target="_blank" rel="noreferrer">封面來源</a>`
          : ""
      }
      <a class="action-link" href="${imageSearchUrl(game)}" target="_blank" rel="noreferrer">Google 圖片搜尋</a>
      ${
        game.purchaseUrl
          ? `<a class="action-link" href="${game.purchaseUrl}" target="_blank" rel="noreferrer">臺灣購買查詢</a>`
          : ""
      }
      <button id="detailFavorite" type="button">${favoriteLabel}</button>
    </div>
  `;

  detail.append(media, info);
  elements.dialogContent.append(detail);
  elements.dialogContent.querySelector("#detailFavorite").addEventListener("click", () => {
    toggleFavorite(game.rank);
    openDetail(game);
  });
  elements.dialog.showModal();
}

elements.search.addEventListener("input", (event) => {
  state.query = event.target.value;
  render();
});

elements.category.addEventListener("change", (event) => {
  state.category = event.target.value;
  render();
});

elements.tag.addEventListener("change", (event) => {
  state.tag = event.target.value;
  render();
});

elements.sort.addEventListener("change", (event) => {
  state.sort = event.target.value;
  render();
});

elements.favoritesOnly.addEventListener("click", () => {
  state.favoritesOnly = !state.favoritesOnly;
  elements.favoritesOnly.setAttribute("aria-pressed", String(state.favoritesOnly));
  render();
});

elements.closeDialog.addEventListener("click", () => elements.dialog.close());
elements.dialog.addEventListener("click", (event) => {
  if (event.target === elements.dialog) elements.dialog.close();
});

populateFilters();
render();
