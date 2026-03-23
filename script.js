function initVitrine() {
  const grid = $("#gridCards");
  const emptyState = $("#emptyState");

  const fBusca = $("#fBusca");
  const fTipo = $("#fTipo");
  const fPreco = $("#fPreco");

  const propOverlay = $("#modalPropOverlay");
  const propBody = $("#modalPropBody");

  let currentGallery = { fotos: [], thumbs: [], idx: 0 };
  let cacheLista = [];

  function statusBadgeClass(status) {
    if (status === "disponivel") return "status-disponivel";
    if (status === "negociacao") return "status-negociacao";
    return "status-vendido";
  }

  function getPrecoNumber(imv) {
    const raw = imv?.precoTotal;
    const n = parseNumberSmart(raw);
    return Number.isFinite(n) ? n : 0;
  }

  function getFilteredList() {
    const lista = cacheLista;

    const q = (fBusca?.value || "").trim().toLowerCase();
    const tipo = fTipo?.value || "todos";

    const precoMaxStr = (fPreco?.value || "todos");
    const max = precoMaxStr === "todos" ? Infinity : Number(precoMaxStr);

    return lista.filter((imv) => {
      if (imv.status !== "disponivel") return false;

      const titulo = (imv.titulo || "").toLowerCase();
      const bairro = (imv.local?.bairro || "").toLowerCase();
      const cidade = (imv.local?.cidade || "").toLowerCase();

      const matchText =
        !q ||
        titulo.includes(q) ||
        bairro.includes(q) ||
        cidade.includes(q);

      const matchTipo = tipo === "todos" || imv.tipo === tipo;

      const precoNum = getPrecoNumber(imv);
      const matchPreco =
        max === Infinity ? true : precoNum > 0 && precoNum <= max;

      return matchText && matchTipo && matchPreco;
    });
  }

  function renderCards() {
    const lista = getFilteredList();
    grid.innerHTML = "";

    if (!lista.length) {
      emptyState.classList.remove("hidden");
      return;
    }
    emptyState.classList.add("hidden");

    lista.forEach((imv) => {
      const capa = cloudThumb(getCapa(imv), 820, 520);

      const card = document.createElement("article");
      card.className = "prop-card";
      card.dataset.id = imv.id;

      card.innerHTML = `
        <div class="prop-img">
          <img alt="Capa do imóvel" src="${capa}">
          <div class="prop-badges">
            <span class="badge ${statusBadgeClass(imv.status)}">
              ${STATUS_LABEL[imv.status] || imv.status}
            </span>
            <span class="badge tipo">
              ${TIPOS_LABEL[imv.tipo] || imv.tipo}
            </span>
          </div>
        </div>

        <div class="prop-body">
          <div class="prop-title">${escapeHtml(imv.titulo || "(Sem título)")}</div>
          <div class="prop-loc">${escapeHtml(imv.local?.bairro || "-")}, ${escapeHtml(imv.local?.cidade || "-")}</div>

          <div>
            <div class="price">${moneyBRL(imv.precoTotal)}</div>
          </div>

          <div class="prop-meta">
            <span>Área total: <b>${imv.areaTotal ? numBR(imv.areaTotal) : "-"}</b></span>
          </div>

          <div class="icons-row">
            <span class="ico">🛏️ ${Number(imv.estrutura?.quartos || 0)}</span>
            <span class="ico">🚿 ${Number(imv.estrutura?.banheiros || 0)}</span>
            <span class="ico">🚗 ${Number(imv.estrutura?.vagas || 0)}</span>
          </div>
        </div>
      `;

      grid.appendChild(card);
    });
  }

  function estruturaCardsIcons(e = {}) {
    const items = [
      ["Quartos", e.quartos ?? 0, "🛏️"],
      ["Suítes", e.suites ?? 0, "🛏️"],
      ["Banheiros", e.banheiros ?? 0, "🚿"],
      ["Vagas", e.vagas ?? 0, "🚗"],
      ["Salas", e.sala ?? 0, "📺"],
      ["Cozinhas", e.cozinha ?? 0, "🍽️"],
      ["Área gourmet", e.areaGourmet ?? 0, "🥂"],
      ["Piscina", e.piscina ?? 0, "🏊"],
    ];

    return items
      .filter(([, v]) => Number(v) > 0)
      .map(
        ([k, v, icon]) => `
          <div class="info-card icon-card">
            <div class="ic">${icon}</div>
            <div class="num">${Number(v) || 0}</div>
            <div class="lbl">${k}</div>
          </div>
        `
      )
      .join("");
  }

  function bindGalleryHandlers() {
    const img = $("#gMainImg", propBody);
    const prev = $("#gPrev", propBody);
    const next = $("#gNext", propBody);
    const count = $("#gCount", propBody);
    const thumbs = $("#gThumbs", propBody);

    function setIdx(i) {
      const total = currentGallery.fotos.length;
      if (!total) return;

      currentGallery.idx = (i + total) % total;
      img.src = currentGallery.fotos[currentGallery.idx];
      count.textContent = `${currentGallery.idx + 1}/${total}`;

      $$("#gThumbs button", propBody).forEach((b) =>
        b.classList.remove("active")
      );
      const active = $(
        `#gThumbs button[data-i="${currentGallery.idx}"]`,
        propBody
      );
      if (active) active.classList.add("active");
    }

    prev.addEventListener("click", () =>
      setIdx(currentGallery.idx - 1)
    );
    next.addEventListener("click", () =>
      setIdx(currentGallery.idx + 1)
    );

    thumbs.addEventListener("click", (e) => {
      const b = e.target.closest("button[data-i]");
      if (!b) return;
      setIdx(Number(b.dataset.i));
    });

    setIdx(0);
  }

  function openPropModal(imv) {
    const fotos =
      Array.isArray(imv.fotos) && imv.fotos.length
        ? imv.fotos
        : [PLACEHOLDER_IMG];

    const safeFotos = fotos.map((u) => safeUrl(u) || PLACEHOLDER_IMG);

    currentGallery = {
      fotos: safeFotos.map((u) => cloudFull(u, 1600)),
      thumbs: safeFotos.map((u) => cloudThumb(u, 240, 160)),
      idx: 0,
    };

    const cidadeUF = `${(imv.local?.cidade || "").trim()} ${(imv.local?.uf || "")
      .trim()
      .toUpperCase()}`.trim();

    const mapQuery = cidadeUF
      ? cidadeUF.replace(/\s+/g, "-")
      : "Brasil";

    const mapSrc = `https://www.google.com/maps?q=${encodeURIComponent(
      mapQuery
    )}&output=embed`;

    propBody.innerHTML = `
      <div class="prop-modal">
        <div class="gallery">
          <div class="g-main">
            <img id="gMainImg" alt="Foto do imóvel" src="${currentGallery.fotos[0]}">
            <div class="g-nav">
              <button type="button" id="gPrev">‹</button>
              <button type="button" id="gNext">›</button>
            </div>
            <div class="g-count" id="gCount">1/${currentGallery.fotos.length}</div>
          </div>

          <div class="g-thumbs" id="gThumbs">
            ${currentGallery.thumbs
              .map(
                (u, i) => `
              <button type="button" class="${i === 0 ? "active" : ""}" data-i="${i}">
                <img src="${u}">
              </button>
            `
              )
              .join("")}
          </div>
        </div>

        <div class="prop-title-big">${escapeHtml(imv.titulo || "(Sem título)")}</div>
        <div class="prop-loc-big">
          📍 ${escapeHtml(imv.local?.bairro || "-")},
          ${escapeHtml(imv.local?.cidade || "-")} - ${(imv.local?.uf || "-").toUpperCase()}
        </div>

        <div class="prop-price-big">${moneyBRL(imv.precoTotal)}</div>

        <div class="section-title">Descrição</div>
        <div class="desc-box">${escapeHtml(imv.descricao || "Sem descrição.")}</div>

        <div class="section-title">Localização</div>
        <div class="map-wrap">
          <iframe src="${mapSrc}" loading="lazy"></iframe>
        </div>
      </div>
    `;

    bindGalleryHandlers();
    propOverlay.classList.add("open");
  }

  function closePropModal() {
    propOverlay.classList.remove("open");
    propBody.innerHTML = "";
  }

  ["input", "change"].forEach((evt) => {
    if (fBusca) fBusca.addEventListener(evt, renderCards);
    if (fTipo) fTipo.addEventListener(evt, renderCards);
    if (fPreco) fPreco.addEventListener(evt, renderCards);
  });

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".prop-card[data-id]");
    if (!card) return;

    const id = card.dataset.id;
    const imv = cacheLista.find((x) => x.id === id);
    if (!imv) return;

    openPropModal(imv);
  });

  propOverlay.addEventListener("click", (e) => {
    if (e.target === propOverlay) closePropModal();
  });

  (async () => {
    cacheLista = await carregarImoveis();
    renderCards();
  })();
}/* =========================================================
Imobiliária Amaral - script.js (ADM + Vitrine)
- Vanilla JS, sem reload
- FIRESTORE (Firebase) como banco online
- Cloudinary (upload direto no ADM, sem backend)
========================================================= */

(() => {
"use strict";

/* -----------------------------
CONFIG / CHAVES / LINKS
----------------------------- */

const STORAGE_KEY_NEW = "amaral_imoveis_v1";
const STORAGE_KEY_OLD = "meus_imoveis";

const SOCIAL = {
  whatsapp: "https://wa.me/5514982104567",
  instagram: "https://www.instagram.com/imobiliariaamaralbariri?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==",
};

/* -----------------------------
CLOUDINARY (sem backend)
----------------------------- */

const CLOUDINARY = {
  cloudName: "drjkfdwyc",
  uploadPreset: "imobiliaria_unsigned",
  folder: "imobiliaria_amaral/imoveis",
};

const PLACEHOLDER_IMG = `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="750">
<defs>
<linearGradient id="g" x1="0" x2="1">
<stop offset="0" stop-color="#f0f4f8"/>
<stop offset="1" stop-color="#dfe8f1"/>
</linearGradient>
</defs>
<rect width="100%" height="100%" fill="url(#g)"/>
<g fill="#1a477b" opacity="0.9">
<path d="M600 170l260 200v310H690V520H510v160H340V370z"/>
</g>
<text x="50%" y="72%" text-anchor="middle" font-family="Arial, sans-serif" font-size="40" fill="#666">
Sem foto cadastrada
</text>
</svg>
`)}`;

/* -----------------------------
LABELS
----------------------------- */

const TIPOS_LABEL = {
  casa: "Casa",
  apartamento: "Apartamento",
  terreno: "Terreno",
  sitio: "Sítio",
  chacara: "Chácara",
};

const STATUS_LABEL = {
  disponivel: "Disponível",
  negociacao: "Em negociação",
  vendido: "Vendido",
};

/* -----------------------------
UTIL
----------------------------- */

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function onlyDigits(str) {
  return String(str || "").replace(/\D/g, "");
}

function formatCEP(v) {
  const d = onlyDigits(v).slice(0, 8);
  if (d.length <= 5) return d;
  return `${d.slice(0, 5)}-${d.slice(5)}`;
}

function parseNumberSmart(value) {
  const s = String(value ?? "").trim();
  if (!s) return 0;

  if (s.includes(",")) {
    const cleaned = s.replace(/\./g, "").replace(",", ".");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : 0;
  }

  const n = Number(s.replace(/[^\d.-]/g, ""));
  return Number.isFinite(n) ? n : 0;
}

function moneyBRL(n) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function numBR(n, digits = 0) {
  const v = Number(n) || 0;
  return v.toLocaleString("pt-BR", {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  });
}

function uid() {
  return `imv_${Date.now()}_${Math.random().toString(16).slice(2)}`;
}

function safeUrl(url) {
  const s = String(url || "").trim();
  if (!s) return "";
  if (/^https?:\/\//i.test(s) || /^data:image\//i.test(s)) return s;
  return "";
}
/* -----------------------------
CLOUDINARY HELPERS
----------------------------- */

function isCloudinaryUrl(url) {
  return (
    typeof url === "string" &&
    url.includes("res.cloudinary.com") &&
    url.includes("/image/upload/")
  );
}

function cloudTransformFromUrl(url, transform) {
  if (!isCloudinaryUrl(url)) return url;
  return url.replace("/image/upload/", `/image/upload/${transform}/`);
}

function cloudThumb(url, w = 520, h = 360) {
  return cloudTransformFromUrl(
    url,
    `f_auto,q_auto,c_fill,g_auto,w_${w},h_${h}`
  );
}

function cloudFull(url, w = 1400) {
  return cloudTransformFromUrl(
    url,
    `f_auto,q_auto,c_limit,w_${w}`
  );
}

async function uploadToCloudinaryUnsigned(file) {
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUDINARY.cloudName}/image/upload`;

  const form = new FormData();
  form.append("file", file);
  form.append("upload_preset", CLOUDINARY.uploadPreset);
  if (CLOUDINARY.folder) form.append("folder", CLOUDINARY.folder);

  const resp = await fetch(endpoint, {
    method: "POST",
    body: form,
  });

  if (!resp.ok) throw new Error("Falha no upload (Cloudinary).");

  const data = await resp.json();
  return data.secure_url;
}

/* -----------------------------
LOCAL MIGRAÇÃO (compat)
----------------------------- */

function migrateIfNeeded() {
  const old = localStorage.getItem(STORAGE_KEY_OLD);
  const cur = localStorage.getItem(STORAGE_KEY_NEW);

  if (old && !cur) {
    localStorage.setItem(STORAGE_KEY_NEW, old);
    localStorage.removeItem(STORAGE_KEY_OLD);
  } else if (old && cur) {
    localStorage.removeItem(STORAGE_KEY_OLD);
  }
}

console.count("script.js carregou");

/* =========================================================
FIRESTORE: FUNÇÕES OBRIGATÓRIAS
========================================================= */

async function carregarImoveis() {
  if (!window.DB) {
    console.error(
      "window.DB não existe. Você colou o bloco do Firebase ANTES do script.js no HTML?"
    );
    return [];
  }

  try {
    const lista = await window.DB.listImoveis();
    return Array.isArray(lista) ? lista : [];
  } catch (err) {
    console.error("Erro ao carregar do Firestore:", err);
    return [];
  }
}

async function adicionarImovel(obj) {
  if (!window.DB) return [];
  await window.DB.upsertImovel(obj);
  return await carregarImoveis();
}

async function atualizarImovel(id, obj) {
  if (!window.DB) return [];
  await window.DB.upsertImovel({ ...obj, id });
  return await carregarImoveis();
}

async function excluirImovel(id) {
  if (!window.DB) return [];
  await window.DB.deleteImovel(id);
  return await carregarImoveis();
}

function calcularPrecoPorM2(preco, area) {
  const p = Number(preco) || 0;
  const a = Number(area) || 0;
  if (p <= 0 || a <= 0) return 0;
  return p / a;
}

/* -----------------------------
NORMALIZAÇÃO DE OBJETO
----------------------------- */

function makeImovelFromForm(state) {
  const now = new Date().toISOString();

  const fotos = (state.fotos || []).filter(Boolean);
  const capa = fotos[0] || "";

  return {
    id: state.id || uid(),
    idAnuncio: (state.idAnuncio || "").trim(),
    titulo: (state.titulo || "").trim(),
    tipo: state.tipo || "casa",
    status: state.status || "disponivel",

    local: {
      cep: formatCEP(state.cep || ""),
      rua: (state.rua || "").trim(),
      numero: (state.numero || "").trim(),
      bairro: (state.bairro || "").trim(),
      cidade: (state.cidade || "").trim(),
      uf: (state.uf || "").trim().toUpperCase().slice(0, 2),
      complemento: (state.complemento || "").trim(),
    },

    precoTotal: parseNumberSmart(state.precoTotal),
    areaTotal: parseNumberSmart(state.areaTotal),
    areaConstruida: parseNumberSmart(state.areaConstruida),

    estrutura: {
      quartos: Number(state.quartos) || 0,
      suites: Number(state.suites) || 0,
      banheiros: Number(state.banheiros) || 0,
      vagas: Number(state.vagas) || 0,
      sala: Number(state.sala) || 0,
      cozinha: Number(state.cozinha) || 0,
      areaGourmet: Number(state.areaGourmet) || 0,
      piscina: Number(state.piscina) || 0,
    },

    proprietario: {
      nome: (state.propNome || "").trim(),
      telefone: (state.propTelefone || "").trim(),
    },

    descricao: (state.descricao || "").trim(),
    fotos: fotos.length ? fotos : [PLACEHOLDER_IMG],

    criadoEm: state.criadoEm || now,
    atualizadoEm: now,
    _capa: capa,
  };
}

function getCapa(imovel) {
  const fotos = Array.isArray(imovel.fotos) ? imovel.fotos : [];
  return safeUrl(fotos[0]) || PLACEHOLDER_IMG;
}

/* -----------------------------
VIA CEP
----------------------------- */

async function buscarCEP(cepDigits) {
  const c = onlyDigits(cepDigits);
  if (c.length !== 8) return null;

  try {
    const res = await fetch(`https://viacep.com.br/ws/${c}/json/`);
    if (!res.ok) return null;

    const data = await res.json();
    if (data.erro) return null;

    return data;
  } catch {
    return null;
  }
}
   /* -----------------------------
ÍCONES (SVG)
----------------------------- */

const ICONS = {
  bed: `<svg viewBox="0 0 24 24"><path d="M7 13h10a3 3 0 0 1 3 3v4h-2v-2H6v2H4V8a2 2 0 0 1 2-2h2a3 3 0 0 1 3 3v2H7v2zm6-3h4V9a1 1 0 0 0-1-1h-3v2z"/></svg>`,
  bath: `<svg viewBox="0 0 24 24"><path d="M7 4h10a3 3 0 0 1 3 3v6H4V7a3 3 0 0 1 3-3zm-1 11h14v2a4 4 0 0 1-4 4H10a4 4 0 0 1-4-4v-2z"/></svg>`,
  car: `<svg viewBox="0 0 24 24"><path d="M5 11l2-5h10l2 5v8h-2v-2H7v2H5v-8zm3.5-3l-.8 2h8.6l-.8-2H8.5zM7 13a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3zm10 0a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z"/></svg>`,
};

/* =========================================================
ADM PAGE
========================================================= */

function initADM() {
  const form = $("#admForm");
  const tableBody = $("#admTableBody");
  const countEl = $("#countImoveis");

  const formOverlay = $("#modalFormOverlay");
  const modalFormTitle = $("#modalFormTitle");
  const btnNovoImovel = $("#btnNovoImovel");

  const admModeHint = $("#admModeHint");
  const btnSalvar = $("#btnSalvar");
  const btnEditar = $("#btnEditar");
  const btnCancelar = $("#btnCancelar");
  const editingId = $("#editingId");

  // GALERIA
  const fotoFiles = $("#fotoFiles");
  const btnUploadFotos = $("#btnUploadFotos");
  const photoGrid = $("#photoGrid");
  const fileName = $("#fileName");

  const cepEl = $("#cep");

  const reportOverlay = $("#modalReportOverlay");
  const reportBody = $("#modalReportBody");
  const btnPrintReport = $("#btnPrintReport");

  const dashTotal = $("#dashTotal");
  const dashDisponiveis = $("#dashDisponiveis");
  const dashNegociacao = $("#dashNegociacao");
  const dashVendidos = $("#dashVendidos");

  let fotosState = [];
  let drawerOpenId = null;

  function statusBadgeClass(status) {
    if (status === "disponivel") return "status-disponivel";
    if (status === "negociacao") return "status-negociacao";
    return "status-vendido";
  }

  function refreshDashboard(lista) {
    if (!dashTotal) return;

    const total = lista.length;
    const disp = lista.filter((i) => i.status === "disponivel").length;
    const nego = lista.filter((i) => i.status === "negociacao").length;
    const vend = lista.filter((i) => i.status === "vendido").length;

    dashTotal.textContent = String(total);
    dashDisponiveis.textContent = String(disp);
    dashNegociacao.textContent = String(nego);
    dashVendidos.textContent = String(vend);
  }

  function openFormModal(mode, imv = null) {
    if (!formOverlay) {
      window.scrollTo({ top: 0, behavior: "smooth" });
      if (mode === "edit" && imv) fillForm(imv);
      else clearForm();
      return;
    }

    if (mode === "edit" && imv) {
      if (modalFormTitle) modalFormTitle.textContent = "Editar Imóvel";
      fillForm(imv);
    } else {
      if (modalFormTitle) modalFormTitle.textContent = "Novo Imóvel";
      clearForm();
    }

    formOverlay.classList.add("open");
    formOverlay.setAttribute("aria-hidden", "false");

    const t = $("#titulo");
    if (t) setTimeout(() => t.focus(), 50);
  }

  function closeFormModal() {
    if (!formOverlay) return;
    formOverlay.classList.remove("open");
    formOverlay.setAttribute("aria-hidden", "true");
  }

  if (formOverlay) {
    formOverlay.addEventListener("click", (e) => {
      if (e.target === formOverlay) closeFormModal();

      const btn = e.target.closest("[data-close-modal='form']");
      if (btn) closeFormModal();
    });
  }

  if (btnNovoImovel) {
    btnNovoImovel.addEventListener("click", () => openFormModal("create"));
  }

  function setMode(mode) {
    if (mode === "edit") {
      btnSalvar.classList.add("hidden");
      btnEditar.classList.remove("hidden");
      admModeHint.innerHTML = `Modo: <b>Edição</b> ✏️`;
    } else {
      btnSalvar.classList.remove("hidden");
      btnEditar.classList.add("hidden");
      admModeHint.innerHTML = `Modo: <b>Cadastro</b>`;
    }
  }

  function clearForm() {
    form.reset();
    editingId.value = "";
    fotosState = [];

    if (fotoFiles) fotoFiles.value = "";

    renderPhotoGrid();
    setMode("create");
  }

  function readFormState() {
    return {
      id: editingId.value || null,
      idAnuncio: $("#idAnuncio").value,
      titulo: $("#titulo").value,
      tipo: $("#tipo").value,
      status: $("#status").value,

      cep: $("#cep").value,
      rua: $("#rua").value,
      numero: $("#numero").value,
      bairro: $("#bairro").value,
      cidade: $("#cidade").value,
      uf: $("#uf").value,
      complemento: $("#complemento").value,

      precoTotal: $("#precoTotal").value,
      areaTotal: $("#areaTotal").value,
      areaConstruida: $("#areaConstruida").value,

      quartos: $("#quartos").value,
      suites: $("#suites").value,
      banheiros: $("#banheiros").value,
      vagas: $("#vagas").value,
      sala: $("#sala").value,
      cozinha: $("#cozinha").value,
      areaGourmet: $("#areaGourmet").value,
      piscina: $("#piscina").value,

      propNome: $("#propNome").value,
      propTelefone: $("#propTelefone").value,
      descricao: $("#descricao").value,

      fotos: fotosState.slice(),
    };
  }
     function fillForm(imv) {
    $("#idAnuncio").value = imv.idAnuncio || "";
    $("#titulo").value = imv.titulo || "";
    $("#tipo").value = imv.tipo || "casa";
    $("#status").value = imv.status || "disponivel";

    $("#cep").value = imv.local?.cep || "";
    $("#rua").value = imv.local?.rua || "";
    $("#numero").value = imv.local?.numero || "";
    $("#bairro").value = imv.local?.bairro || "";
    $("#cidade").value = imv.local?.cidade || "";
    $("#uf").value = (imv.local?.uf || "").toUpperCase();
    $("#complemento").value = imv.local?.complemento || "";

    $("#precoTotal").value = imv.precoTotal || "";
    $("#areaTotal").value = imv.areaTotal || "";
    $("#areaConstruida").value = imv.areaConstruida || "";

    $("#quartos").value = imv.estrutura?.quartos ?? 0;
    $("#suites").value = imv.estrutura?.suites ?? 0;
    $("#banheiros").value = imv.estrutura?.banheiros ?? 0;
    $("#vagas").value = imv.estrutura?.vagas ?? 0;
    $("#sala").value = imv.estrutura?.sala ?? 0;
    $("#cozinha").value = imv.estrutura?.cozinha ?? 0;
    $("#areaGourmet").value = imv.estrutura?.areaGourmet ?? 0;
    $("#piscina").value = imv.estrutura?.piscina ?? 0;

    $("#propNome").value = imv.proprietario?.nome || "";
    $("#propTelefone").value = imv.proprietario?.telefone || "";
    $("#descricao").value = imv.descricao || "";

    fotosState = Array.isArray(imv.fotos) ? imv.fotos.slice() : [];

    editingId.value = imv.id;

    if (fotoFiles) fotoFiles.value = "";

    renderPhotoGrid();
    setMode("edit");
  }

  function renderPhotoGrid() {
    photoGrid.innerHTML = "";

    fotosState.forEach((url, idx) => {
      const div = document.createElement("div");
      div.className = "thumb";
      div.draggable = true;
      div.dataset.index = idx;

      const img = document.createElement("img");
      img.alt = `Foto ${idx + 1}`;
      const safe = safeUrl(url) || PLACEHOLDER_IMG;
      img.src = cloudThumb(safe, 260, 180);

      const btn = document.createElement("button");
      btn.type = "button";
      btn.title = "Remover foto";
      btn.textContent = "X";
      btn.dataset.action = "removeFoto";
      btn.dataset.idx = String(idx);

      div.appendChild(img);

      if (idx === 0) {
        const cap = document.createElement("div");
        cap.className = "cap";
        cap.textContent = "Capa";
        div.appendChild(cap);
      }

      div.appendChild(btn);
      photoGrid.appendChild(div);
    });

    if (!fotosState.length) {
      const hint = document.createElement("div");
      hint.className = "subtle";
      hint.style.gridColumn = "1 / -1";
      hint.textContent =
        "Nenhuma foto adicionada. Se salvar assim, será usado um placeholder.";
      photoGrid.appendChild(hint);
    }
  }

  let dragSrcIndex = null;

  photoGrid.addEventListener("dragstart", (e) => {
    const thumb = e.target.closest(".thumb");
    if (!thumb) return;
    dragSrcIndex = Number(thumb.dataset.index);
  });

  photoGrid.addEventListener("dragover", (e) => {
    e.preventDefault();
  });

  photoGrid.addEventListener("drop", (e) => {
    e.preventDefault();

    const thumb = e.target.closest(".thumb");
    if (!thumb) return;

    const targetIndex = Number(thumb.dataset.index);

    if (dragSrcIndex === null || dragSrcIndex === targetIndex) return;

    const moved = fotosState.splice(dragSrcIndex, 1)[0];
    fotosState.splice(targetIndex, 0, moved);

    renderPhotoGrid();
    dragSrcIndex = null;
  });

  /* -----------------------------
  UPLOAD CLOUDINARY
  ----------------------------- */

  if (btnUploadFotos) {
    btnUploadFotos.addEventListener("click", async () => {
      const files = fotoFiles?.files ? Array.from(fotoFiles.files) : [];

      if (!files.length) {
        alert("Selecione pelo menos 1 foto.");
        return;
      }

      btnUploadFotos.disabled = true;
      const oldText = btnUploadFotos.textContent;
      btnUploadFotos.textContent = "Enviando...";

      try {
        for (const f of files) {
          if (f.size > 10 * 1024 * 1024) {
            alert(`Arquivo muito grande (máx 10MB): ${f.name}`);
            continue;
          }

          const url = await uploadToCloudinaryUnsigned(f);
          fotosState.push(url);
        }

        if (fotoFiles) fotoFiles.value = "";
        if (fileName) fileName.textContent = "Nenhum arquivo selecionado";

        renderPhotoGrid();
      } catch (err) {
        console.error(err);
        alert("Deu erro ao enviar as fotos. Veja o console (F12).");
      } finally {
        btnUploadFotos.disabled = false;
        btnUploadFotos.textContent = oldText;
      }
    });
  }

  photoGrid.addEventListener("click", (e) => {
    const btn = e.target.closest("button[data-action='removeFoto']");
    if (!btn) return;

    const idx = Number(btn.dataset.idx);
    fotosState.splice(idx, 1);

    renderPhotoGrid();
  });

  /* -----------------------------
  CEP AUTO
  ----------------------------- */

  cepEl.addEventListener("input", async (e) => {
    const formatted = formatCEP(e.target.value);
    e.target.value = formatted;

    const digits = onlyDigits(formatted);

    if (digits.length === 8) {
      const data = await buscarCEP(digits);

      if (data) {
        $("#rua").value = data.logradouro || "";
        $("#bairro").value = data.bairro || "";
        $("#cidade").value = data.localidade || "";
        $("#uf").value = (data.uf || "").toUpperCase();
        $("#numero").focus();
      }
    }
  });
     function fmt(v) {
    const s = String(v ?? "").trim();
    return s ? escapeHtml(s) : "-";
  }

  function fullEndereco(l = {}) {
    const parts = [];

    parts.push(`<div><b>CEP:</b> ${fmt(l.cep)}</div>`);
    parts.push(`<div><b>Rua:</b> ${fmt(l.rua)}</div>`);
    parts.push(`<div><b>Número:</b> ${fmt(l.numero)}</div>`);
    parts.push(`<div><b>Bairro:</b> ${fmt(l.bairro)}</div>`);
    parts.push(`<div><b>Cidade:</b> ${fmt(l.cidade)}</div>`);
    parts.push(`<div><b>UF:</b> ${fmt(l.uf)}</div>`);
    parts.push(`<div><b>Complemento:</b> ${fmt(l.complemento)}</div>`);

    return parts.join("");
  }

  function fullComodos(e = {}) {
    const itens = [
      ["Quartos", e.quartos ?? 0],
      ["Suítes", e.suites ?? 0],
      ["Banheiros", e.banheiros ?? 0],
      ["Vagas", e.vagas ?? 0],
      ["Salas", e.sala ?? 0],
      ["Cozinhas", e.cozinha ?? 0],
      ["Área gourmet", e.areaGourmet ?? 0],
      ["Piscina", e.piscina ?? 0],
    ];

    return `
      <div class="drawer-grid">
        ${itens
          .map(
            ([k, v]) => `
          <div class="drawer-box">
            <b>${k}</b>
            <span>${Number(v) || 0}</span>
          </div>
        `
          )
          .join("")}
      </div>
    `;
  }

  function buildDrawerHTML(imv) {
    const precoM2 = calcularPrecoPorM2(imv.precoTotal, imv.areaTotal);

    return `
      <div class="drawer-wrap">

        <div class="drawer-title">
          <div>
            <div class="subtle">Detalhes completos</div>
            <div><b>${escapeHtml(imv.titulo || "(Sem título)")}</b></div>
          </div>

          <div>
            <span class="badge tipo">${TIPOS_LABEL[imv.tipo] || imv.tipo}</span>
            <span class="badge ${statusBadgeClass(imv.status)}">
              ${STATUS_LABEL[imv.status] || imv.status}
            </span>
          </div>
        </div>

        <div class="drawer-grid">

          <div class="drawer-box">
            <b>ID</b>
            <span>${escapeHtml(imv.idAnuncio || "-")}</span>
          </div>

          <div class="drawer-box">
            <b>Preço</b>
            <span>${moneyBRL(imv.precoTotal)}</span>
          </div>

          <div class="drawer-box">
            <b>Preço/m²</b>
            <span>${precoM2 ? moneyBRL(precoM2) : "-"}</span>
          </div>

          <div class="drawer-box">
            <b>Área total</b>
            <span>${imv.areaTotal ? numBR(imv.areaTotal) + " m²" : "-"}</span>
          </div>

          <div class="drawer-box">
            <b>Área construída</b>
            <span>${imv.areaConstruida ? numBR(imv.areaConstruida) + " m²" : "-"}</span>
          </div>

          <div class="drawer-box full">
            <b>Endereço</b>
            ${fullEndereco(imv.local)}
          </div>

          <div class="drawer-box full">
            <b>Estrutura</b>
            ${fullComodos(imv.estrutura)}
          </div>

          <div class="drawer-box full">
            <b>Proprietário</b>
            <div>
              <div><b>Nome:</b> ${escapeHtml(imv.proprietario?.nome || "-")}</div>
              <div><b>Telefone:</b> ${escapeHtml(imv.proprietario?.telefone || "-")}</div>
            </div>
          </div>

          <div class="drawer-box full">
            <b>Descrição</b>
            <div>${escapeHtml(imv.descricao || "Sem descrição.")}</div>
          </div>

        </div>
      </div>
    `;
  }

  function resumoEstruturaBasico(e = {}) {
    const q = Number(e.quartos || 0);
    const b = Number(e.banheiros || 0);
    const v = Number(e.vagas || 0);

    return `${q} qts • ${b} banh • ${v} vgs`;
  }

  function toggleDrawer(id) {
    if (drawerOpenId && drawerOpenId !== id) {
      const prev = $(`tr.drawer[data-drawer-for="${drawerOpenId}"]`);
      if (prev) prev.classList.add("hidden");
    }

    const drawer = $(`tr.drawer[data-drawer-for="${id}"]`);
    if (!drawer) return;

    const willOpen = drawer.classList.contains("hidden");
    drawer.classList.toggle("hidden");

    drawerOpenId = willOpen ? id : null;
  }

  function renderTable(lista) {
    countEl.textContent = String(lista.length);
    tableBody.innerHTML = "";

    lista.forEach((imv) => {
      const tr = document.createElement("tr");
      tr.className = "row-clickable";
      tr.dataset.id = imv.id;

      const precoM2 = calcularPrecoPorM2(imv.precoTotal, imv.areaTotal);
      const capa = cloudThumb(getCapa(imv), 260, 180);

      tr.innerHTML = `
        <td><img src="${capa}"></td>

        <td>
          <b>${escapeHtml(imv.titulo)}</b>
          <div class="subtle">${resumoEstruturaBasico(imv.estrutura)}</div>
        </td>

        <td>
          ${escapeHtml(imv.local?.bairro || "-")}
          <div class="subtle">${escapeHtml(imv.local?.cidade || "-")}</div>
        </td>

        <td>${TIPOS_LABEL[imv.tipo] || imv.tipo}</td>

        <td><b>${moneyBRL(imv.precoTotal)}</b></td>

        <td>${precoM2 ? moneyBRL(precoM2) : "-"}</td>

        <td>
          <span class="badge ${statusBadgeClass(imv.status)}">
            ${STATUS_LABEL[imv.status] || imv.status}
          </span>
        </td>

        <td>
          <button data-action="edit">✏️</button>
          <button data-action="report">📄</button>
          <button data-action="call">📞</button>
          <button data-action="delete">❌</button>
        </td>
      `;

      tableBody.appendChild(tr);

      const drawer = document.createElement("tr");
      drawer.className = "drawer hidden";
      drawer.dataset.drawerFor = imv.id;

      drawer.innerHTML = `
        <td colspan="8">
          ${buildDrawerHTML(imv)}
        </td>
      `;

      tableBody.appendChild(drawer);
    });
  }
     async function refreshADM() {
    const lista = await carregarImoveis();
    renderTable(lista);
    refreshDashboard(lista);
  }

  function openReport(imv) {
    const precoM2 = calcularPrecoPorM2(imv.precoTotal, imv.areaTotal);

    const html = `
      <html>
      <head>
        <title>Relatório</title>
        <style>
          body { font-family: Arial; padding: 20px; }
        </style>
      </head>
      <body>

        <h1>${escapeHtml(imv.titulo)}</h1>

        <p><b>Preço:</b> ${moneyBRL(imv.precoTotal)}</p>
        <p><b>Preço/m²:</b> ${precoM2 ? moneyBRL(precoM2) : "-"}</p>

        <p><b>Cidade:</b> ${escapeHtml(imv.local?.cidade || "-")}</p>

        <p><b>Descrição:</b></p>
        <pre>${escapeHtml(imv.descricao)}</pre>

        <button onclick="window.print()">Imprimir</button>

      </body>
      </html>
    `;

    document.open();
    document.write(html);
    document.close();
  }

  function closeReport() {
    reportOverlay.classList.remove("open");
    reportBody.innerHTML = "";
  }

  if (btnPrintReport) {
    btnPrintReport.addEventListener("click", () => window.print());
  }

  btnCancelar.addEventListener("click", () => {
    clearForm();
    closeFormModal();
  });

  /* -----------------------------
  CADASTRO
  ----------------------------- */

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const st = readFormState();

    if (!st.titulo.trim()) {
      alert("Título obrigatório");
      return;
    }

    const imv = makeImovelFromForm(st);

    await adicionarImovel(imv);
    await refreshADM();

    clearForm();
    closeFormModal();
  });

  /* -----------------------------
  EDIÇÃO
  ----------------------------- */

  btnEditar.addEventListener("click", async () => {
    const id = editingId.value;
    if (!id) return;

    const st = readFormState();

    const lista = await carregarImoveis();
    const atual = lista.find((x) => x.id === id);

    const imv = makeImovelFromForm({
      ...st,
      id,
      criadoEm: atual.criadoEm,
    });

    await atualizarImovel(id, imv);
    await refreshADM();

    clearForm();
    closeFormModal();
  });

  /* -----------------------------
  AÇÕES DA TABELA
  ----------------------------- */

  tableBody.addEventListener("click", async (e) => {
    const tr = e.target.closest("tr[data-id]");
    if (!tr) return;

    const id = tr.dataset.id;

    const lista = await carregarImoveis();
    const imv = lista.find((x) => x.id === id);

    const actionBtn = e.target.closest("button[data-action]");

    if (actionBtn) {
      const action = actionBtn.dataset.action;

      if (action === "edit") {
        openFormModal("edit", imv);
        return;
      }

      if (action === "report") {
        openReport(imv);
        return;
      }

      if (action === "call") {
        const tel = onlyDigits(imv.proprietario?.telefone || "");

        if (!tel) {
          alert("Sem telefone");
          return;
        }

        window.open(`https://wa.me/55${tel}`);
        return;
      }

      if (action === "delete") {
        if (!confirm("Excluir?")) return;

        await excluirImovel(id);
        await refreshADM();
        return;
      }

      return;
    }

    toggleDrawer(id);
  });

  /* -----------------------------
  INIT
  ----------------------------- */

  clearForm();
  refreshADM();
  closeFormModal();
}
/* =========================================================
VITRINE PAGE
========================================================= */

function initVitrine() {
  const grid = $("#gridCards");
  const emptyState = $("#emptyState");

  const fBusca = $("#fBusca");
  const fTipo = $("#fTipo");
  const fPreco = $("#fPreco");

  let cacheLista = [];

  function statusBadgeClass(status) {
    if (status === "disponivel") return "status-disponivel";
    if (status === "negociacao") return "status-negociacao";
    return "status-vendido";
  }

  function getPrecoNumber(imv) {
    return parseNumberSmart(imv?.precoTotal);
  }

  function getFilteredList() {
    const q = (fBusca?.value || "").toLowerCase();
    const tipo = fTipo?.value || "todos";
    const max = fPreco?.value === "todos" ? Infinity : Number(fPreco.value);

    return cacheLista.filter((imv) => {
      if (imv.status !== "disponivel") return false;

      const titulo = (imv.titulo || "").toLowerCase();
      const bairro = (imv.local?.bairro || "").toLowerCase();

      const matchText =
        !q || titulo.includes(q) || bairro.includes(q);

      const matchTipo = tipo === "todos" || imv.tipo === tipo;

      const preco = getPrecoNumber(imv);
      const matchPreco =
        max === Infinity ? true : preco <= max;

      return matchText && matchTipo && matchPreco;
    });
  }

  function renderCards() {
    const lista = getFilteredList();

    grid.innerHTML = "";

    if (!lista.length) {
      emptyState.classList.remove("hidden");
      return;
    }

    emptyState.classList.add("hidden");

    lista.forEach((imv) => {
      const capa = cloudThumb(getCapa(imv), 820, 520);

      const card = document.createElement("article");
      card.className = "prop-card";
      card.dataset.id = imv.id;

      card.innerHTML = `
        <img src="${capa}">

        <h3>${escapeHtml(imv.titulo)}</h3>

        <p>${escapeHtml(imv.local?.bairro)}, ${escapeHtml(imv.local?.cidade)}</p>

        <b>${moneyBRL(imv.precoTotal)}</b>
      `;

      grid.appendChild(card);
    });
  }

  grid.addEventListener("click", (e) => {
    const card = e.target.closest(".prop-card");
    if (!card) return;

    const id = card.dataset.id;
    const imv = cacheLista.find((x) => x.id === id);

    alert(imv.titulo); // modal simplificado
  });

  ["input", "change"].forEach((evt) => {
    if (fBusca) fBusca.addEventListener(evt, renderCards);
    if (fTipo) fTipo.addEventListener(evt, renderCards);
    if (fPreco) fPreco.addEventListener(evt, renderCards);
  });

  (async () => {
    cacheLista = await carregarImoveis();
    renderCards();
  })();
}

/* -----------------------------
ESCAPE HTML
----------------------------- */

function escapeHtml(str) {
  return String(str ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================================================
BOOT
========================================================= */

document.addEventListener("DOMContentLoaded", () => {
  if (window.__AMARAL_INIT__) return;
  window.__AMARAL_INIT__ = true;

  const page = document.body.dataset.page;

  migrateIfNeeded();

  if (page === "adm") initADM();
  if (page === "vitrine") initVitrine();
});

/* -----------------------------
THEME
----------------------------- */

(function themeInit() {
  const KEY = "amaral_theme";
  const root = document.documentElement;

  function setTheme(t) {
    root.setAttribute("data-theme", t);
    localStorage.setItem(KEY, t);
  }

  const saved = localStorage.getItem(KEY);
  setTheme(saved || "light");

  document.addEventListener("click", (e) => {
    const tgl = e.target.closest("#themeToggle");
    if (!tgl) return;

    const cur = root.getAttribute("data-theme") || "light";
    setTheme(cur === "dark" ? "light" : "dark");
  });
})();

/* -----------------------------
DEBUG
----------------------------- */

window.carregarImoveis = carregarImoveis;
window.adicionarImovel = adicionarImovel;
window.atualizarImovel = atualizarImovel;
window.excluirImovel = excluirImovel;
window.calcularPrecoPorM2 = calcularPrecoPorM2;

})();
