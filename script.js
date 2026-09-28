// ============================================================
// Endorfit Cross — Inscrições para Campeonatos Internos
// ============================================================
// Os dados ficam salvos neste navegador (localStorage). Como o
// sistema é usado em um único computador da recepção, isso é
// suficiente: nada se perde ao fechar a aba ou desligar o PC.
// ============================================================

const STUDENTS_KEY = "gym_students";
const EVENTS_KEY = "gym_events";
const INFO_KEY = "gym_info";

// ---------- Estado ----------
let events = [];
let students = [];
let info = { nome: "Endorfit Cross" };
let activeEventId = null;
let eventSearch = "";
let globalSearch = "";
let creatingEvent = false;
let eventBeingCreated = false;
let sortField = null;
let sortDirection = "asc";
let editingStudentId = null;

// ---------- Persistência (localStorage) ----------
function loadData() {
  try {
    const raw = localStorage.getItem(STUDENTS_KEY);
    if (raw) students = JSON.parse(raw);
  } catch (e) {}
  try {
    const raw = localStorage.getItem(EVENTS_KEY);
    if (raw) events = JSON.parse(raw);
  } catch (e) {}
  try {
    const raw = localStorage.getItem(INFO_KEY);
    if (raw) info = JSON.parse(raw);
  } catch (e) {}
  if (events.length > 0) activeEventId = events[0].id;
}

function saveStudents() {
  try {
    localStorage.setItem(STUDENTS_KEY, JSON.stringify(students));
  } catch (e) {
    showToast("Erro ao salvar. Tente novamente.");
  }
}

function saveEvents() {
  try {
    localStorage.setItem(EVENTS_KEY, JSON.stringify(events));
  } catch (e) {
    showToast("Erro ao salvar. Tente novamente.");
  }
}

function saveInfo() {
  try {
    localStorage.setItem(INFO_KEY, JSON.stringify(info));
  } catch (e) {
    showToast("Erro ao salvar. Tente novamente.");
  }
}

// ---------- Utilitários ----------
function uid() {
  return Date.now().toString() + Math.random().toString(36).slice(2, 7);
}

function todayBR() {
  return new Date().toLocaleDateString("pt-BR");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function formatPhone(raw) {
  const digits = (raw || "").replace(/\D/g, "").slice(0, 11);
  if (digits.length === 0) return "";
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  if (digits.length <= 10) return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7, 11)}`;
}

let toastTimeout = null;
function showToast(msg) {
  const el = document.getElementById("toast");
  el.textContent = msg;
  el.classList.remove("hidden");
  clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => el.classList.add("hidden"), 2200);
}

// ---------- Render: Cabeçalho ----------
function renderHeader() {
  document.getElementById("header-title").textContent = info.nome;
  const eventStudents = students.filter((s) => s.eventoId === activeEventId);
  const pagos = eventStudents.filter((s) => s.pago).length;
  document.getElementById("stat-inscritos").textContent = eventStudents.length;
  document.getElementById("stat-pagos").textContent = pagos;
  document.getElementById("stat-pendentes").textContent = eventStudents.length - pagos;
}

function startEditName() {
  const titleEl = document.getElementById("header-title");
  const inputEl = document.getElementById("header-title-input");
  titleEl.classList.add("hidden");
  inputEl.classList.remove("hidden");
  inputEl.value = info.nome;
  inputEl.focus();
  inputEl.select();
}

function saveNameEdit() {
  const inputEl = document.getElementById("header-title-input");
  const titleEl = document.getElementById("header-title");
  const trimmed = inputEl.value.trim();
  info.nome = trimmed || "Endorfit Cross";
  saveInfo();
  titleEl.textContent = info.nome;
  titleEl.classList.remove("hidden");
  inputEl.classList.add("hidden");
}

// ---------- Render: Busca geral ----------
function renderGlobalResults() {
  const container = document.getElementById("global-results");
  const clearBtn = document.getElementById("global-search-clear");
  clearBtn.classList.toggle("hidden", globalSearch.trim().length === 0);

  if (globalSearch.trim().length === 0) {
    container.innerHTML = "";
    return;
  }
  const term = globalSearch.toLowerCase();
  const results = students
    .filter((s) => s.nome.toLowerCase().includes(term))
    .map((s) => {
      const ev = events.find((e) => e.id === s.eventoId);
      return { ...s, eventoNome: ev ? ev.nome : "Evento removido" };
    });

  if (results.length === 0) {
    container.innerHTML = `<p class="empty-msg">Nenhum aluno encontrado com esse nome.</p>`;
    return;
  }

  container.innerHTML = results
    .map(
      (s) => `
      <div class="result-row">
        <div>
          <span class="result-name">${escapeHtml(s.nome)}</span>
          <span class="result-event">· ${escapeHtml(s.eventoNome)}</span>
        </div>
        <span class="badge ${s.pago ? "paid" : "pending"}">
          ${s.pago ? "✓ Pago" : "○ Pendente"}
        </span>
      </div>`
    )
    .join("");
}

// ---------- Render: Abas de eventos ----------
function renderTabs() {
  const tabsEl = document.getElementById("tabs");
  const tabsHtml = events
    .map(
      (ev) => `
      <button class="tab-btn ${ev.id === activeEventId ? "active" : ""}" data-action="select-event" data-id="${ev.id}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>
        <span>${escapeHtml(ev.nome)}</span>
        <span class="tab-close" data-action="delete-event" data-id="${ev.id}" data-nome="${escapeHtml(ev.nome)}" title="Excluir evento">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </span>
      </button>`
    )
    .join("");

  const newEventHtml = creatingEvent
    ? `<div class="new-event-input-wrap">
         <input id="new-event-input" type="text" placeholder="Nome do evento..." autocomplete="off" />
       </div>`
    : `<button class="new-event-btn display-font" data-action="new-event-toggle">
         <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>
         Novo evento
       </button>`;

  tabsEl.innerHTML = tabsHtml + newEventHtml;

  if (creatingEvent) {
    const input = document.getElementById("new-event-input");
    input.focus();
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        criarEvento(input.value);
      } else if (e.key === "Escape") {
        creatingEvent = false;
        renderTabs();
      }
    });
    input.addEventListener("blur", () => criarEvento(input.value));
  }

  document.getElementById("empty-events").classList.toggle("hidden", events.length > 0);
}

function criarEvento(nomeRaw) {
  if (eventBeingCreated) return;
  const nome = (nomeRaw || "").trim();
  creatingEvent = false;
  if (!nome) {
    renderTabs();
    return;
  }
  eventBeingCreated = true;
  const novo = { id: uid(), nome, criadoEm: todayBR() };
  events.push(novo);
  saveEvents();
  activeEventId = novo.id;
  showToast("Evento criado.");
  renderTabs();
  renderHeader();
  renderEventSection();
  setTimeout(() => {
    eventBeingCreated = false;
  }, 300);
}

function excluirEvento(id, nome) {
  if (!confirm(`Excluir o evento "${nome}"? Todas as inscrições dele também serão apagadas.`)) return;
  events = events.filter((ev) => ev.id !== id);
  students = students.filter((s) => s.eventoId !== id);
  saveEvents();
  saveStudents();
  if (activeEventId === id) {
    activeEventId = events.length > 0 ? events[0].id : null;
  }
  showToast("Evento excluído.");
  renderTabs();
  renderHeader();
  renderEventSection();
}

// ---------- Render: Seção do evento ativo (formulário + tabela) ----------
function renderEventSection() {
  const section = document.getElementById("event-section");
  const activeEvent = events.find((ev) => ev.id === activeEventId);

  if (!activeEventId || !activeEvent) {
    section.classList.add("hidden");
    return;
  }
  section.classList.remove("hidden");
  document.getElementById("form-event-name").textContent = activeEvent.nome;
  document.getElementById("event-search-input").placeholder = `Buscar aluno em "${activeEvent.nome}"...`;

  renderTable();
}

function sortStudents(list) {
  if (!sortField) return list;
  const sorted = [...list].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === "pago") {
      valA = valA ? 1 : 0;
      valB = valB ? 1 : 0;
    } else {
      valA = (valA || "").toString().toLowerCase();
      valB = (valB || "").toString().toLowerCase();
    }

    if (valA < valB) return sortDirection === "asc" ? -1 : 1;
    if (valA > valB) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });
  return sorted;
}

function updateSortArrows() {
  document.querySelectorAll(".sort-arrow").forEach((el) => {
    const field = el.dataset.arrow;
    if (field === sortField) {
      el.textContent = sortDirection === "asc" ? "▲" : "▼";
      el.classList.add("active");
    } else {
      el.textContent = "▲";
      el.classList.remove("active");
    }
  });
}

function handleSortClick(field) {
  if (sortField === field) {
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
  } else {
    sortField = field;
    sortDirection = "asc";
  }
  updateSortArrows();
  renderTable();
}

function renderTable() {
  const tbody = document.getElementById("student-tbody");
  const emptyBox = document.getElementById("table-empty");
  const emptyText = document.getElementById("table-empty-text");

  const eventStudents = students.filter((s) => s.eventoId === activeEventId);
  const term = eventSearch.toLowerCase();
  let filtered = eventStudents.filter((s) => s.nome.toLowerCase().includes(term));
  filtered = sortStudents(filtered);

  const clearBtn = document.getElementById("event-search-clear");
  clearBtn.classList.toggle("hidden", eventSearch.trim().length === 0);

  if (filtered.length === 0) {
    tbody.innerHTML = "";
    emptyBox.classList.remove("hidden");
    emptyText.textContent =
      eventStudents.length === 0
        ? "Nenhum aluno inscrito neste evento ainda. Use o formulário acima."
        : "Nenhum aluno encontrado com esse nome.";
    document.querySelector(".table-card table").classList.add("hidden");
    return;
  }

  document.querySelector(".table-card table").classList.remove("hidden");
  emptyBox.classList.add("hidden");

  tbody.innerHTML = filtered
    .map(
      (s, idx) => `
      <tr class="${idx % 2 !== 0 ? "even" : ""}">
        <td>
          <span class="student-name">${escapeHtml(s.nome)}</span>
          <div class="student-phone-mobile">${escapeHtml(formatPhone(s.telefone))}</div>
        </td>
        <td class="hide-mobile">${escapeHtml(formatPhone(s.telefone)) || "—"}</td>
        <td class="hide-tablet">${escapeHtml(s.modalidade)}</td>
        <td class="hide-tablet">${escapeHtml(s.categoria) || "—"}</td>
        <td>
          <span class="badge ${s.pago ? "paid" : "pending"}">${s.pago ? "✓ Pago" : "○ Pendente"}</span>
        </td>
        <td>
          <div class="actions-cell">
            <button class="toggle-pay-btn" data-action="toggle-pay" data-id="${s.id}">
              ${s.pago ? "Remover pagamento" : "Marcar como pago"}
            </button>
            <button class="edit-btn" data-action="edit-student" data-id="${s.id}" title="Editar aluno">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#35618C" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
            </button>
            <button class="delete-btn" data-action="delete-student" data-id="${s.id}" data-nome="${escapeHtml(s.nome)}" title="Excluir aluno">
              <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#B23A2E" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>
            </button>
          </div>
        </td>
      </tr>`
    )
    .join("");
}

// ---------- Ações: alunos ----------
function editStudent(id) {
  const s = students.find((st) => st.id === id);
  if (!s) return;
  editingStudentId = id;

  document.getElementById("f-nome").value = s.nome;
  document.getElementById("f-telefone").value = formatPhone(s.telefone);
  document.getElementById("f-nascimento").value = s.nascimento || "";
  document.getElementById("f-modalidade").value = s.modalidade;
  document.getElementById("f-categoria").value = s.categoria || "";

  document.getElementById("form-title-text").innerHTML = `Editando aluno — <span class="event-name">${escapeHtml(s.nome)}</span>`;
  document.getElementById("submit-btn").textContent = "Salvar alterações";
  document.getElementById("cancel-edit-btn").classList.remove("hidden");

  document.getElementById("student-form").scrollIntoView({ behavior: "smooth", block: "start" });
  document.getElementById("f-nome").focus();
}

function cancelEdit() {
  editingStudentId = null;
  document.getElementById("student-form").reset();
  document.getElementById("f-modalidade").value = "Musculação";
  const activeEvent = events.find((ev) => ev.id === activeEventId);
  document.getElementById("form-title-text").innerHTML = `Nova inscrição — <span class="event-name" id="form-event-name">${escapeHtml(activeEvent ? activeEvent.nome : "")}</span>`;
  document.getElementById("submit-btn").textContent = "Inscrever aluno";
  document.getElementById("cancel-edit-btn").classList.add("hidden");
}

function handleSubmit(e) {
  e.preventDefault();
  if (!activeEventId) {
    showToast("Crie ou selecione um evento primeiro.");
    return;
  }
  const nome = document.getElementById("f-nome").value.trim();
  if (!nome) {
    showToast("Digite o nome do aluno.");
    return;
  }

  const dados = {
    nome: nome,
    telefone: document.getElementById("f-telefone").value.trim(),
    nascimento: document.getElementById("f-nascimento").value,
    modalidade: document.getElementById("f-modalidade").value,
    categoria: document.getElementById("f-categoria").value.trim(),
  };

  if (editingStudentId) {
    const idx = students.findIndex((s) => s.id === editingStudentId);
    if (idx !== -1) {
      students[idx] = { ...students[idx], ...dados };
    }
    saveStudents();
    showToast("Alterações salvas.");
    cancelEdit();
  } else {
    const novo = {
      id: uid(),
      eventoId: activeEventId,
      ...dados,
      pago: false,
      dataInscricao: todayBR(),
    };
    students.unshift(novo);
    saveStudents();
    document.getElementById("student-form").reset();
    document.getElementById("f-modalidade").value = "Musculação";
    showToast("Aluno inscrito com sucesso.");
  }

  renderHeader();
  renderTable();
  if (globalSearch.trim()) renderGlobalResults();
}

function togglePagamento(id) {
  const s = students.find((st) => st.id === id);
  if (!s) return;
  s.pago = !s.pago;
  saveStudents();
  renderHeader();
  renderTable();
  if (globalSearch.trim()) renderGlobalResults();
}

function excluirAluno(id, nome) {
  if (!confirm(`Excluir a inscrição de ${nome}? Essa ação não pode ser desfeita.`)) return;
  students = students.filter((s) => s.id !== id);
  saveStudents();
  showToast("Inscrição excluída.");
  renderHeader();
  renderTable();
  if (globalSearch.trim()) renderGlobalResults();
}

// ---------- Exportar Excel ----------
function exportarExcel() {
  const activeEvent = events.find((ev) => ev.id === activeEventId);
  const eventStudents = students.filter((s) => s.eventoId === activeEventId);

  if (eventStudents.length === 0) {
    showToast("Nenhum aluno inscrito neste evento ainda.");
    return;
  }

  const rows = eventStudents.map((s) => ({
    Nome: s.nome,
    Telefone: formatPhone(s.telefone),
    "Data de Nascimento": s.nascimento,
    Modalidade: s.modalidade,
    "Categoria / Peso": s.categoria,
    Pagamento: s.pago ? "Pago" : "Pendente",
    "Data de Inscrição": s.dataInscricao,
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [{ wch: 26 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 16 }, { wch: 12 }, { wch: 16 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Inscrições");

  const nomeArquivo = (activeEvent ? activeEvent.nome : "evento").replace(/\s+/g, "_").toLowerCase();
  const dataArquivo = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(wb, `inscricoes-${nomeArquivo}-${dataArquivo}.xlsx`);
}

// ---------- Importação em massa (colar lista do WhatsApp) ----------
let pasteRows = [];

function phoneLike(str) {
  const digits = (str || "").replace(/\D/g, "");
  return digits.length >= 8;
}

// Divide um trecho pelo primeiro separador secundário encontrado (tab, " | " ou " - ").
// Usado para separar nome e telefone quando a vírgula não foi usada para isso.
function splitSecundario(chunk) {
  if (chunk.includes("\t")) return chunk.split("\t").map((p) => p.trim()).filter(Boolean);
  if (/ \| /.test(chunk)) return chunk.split(/ \| /).map((p) => p.trim()).filter(Boolean);
  if (/ - /.test(chunk)) return chunk.split(/ - /).map((p) => p.trim()).filter(Boolean);
  return [chunk.trim()];
}

function parseWhatsappList(text) {
  const lines = text
    .split("\n")
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  return lines.map((line) => {
    // remove numeração, marcadores e emojis comuns do início da linha (ex: "1.", "1)", "1 -", "-", "•", "*", "✅")
    let cleaned = line.replace(/^[\s\-•*✅✔☑️➡️👉📌.]*\d*[\s.\-)]*[\s\-•*✅✔☑️➡️👉📌]*/u, "");
    if (cleaned.trim().length === 0) cleaned = line.trim(); // nunca deixa a linha vazia por engano

    // primeiro separa por vírgula; depois, se o primeiro pedaço ainda tiver
    // um separador secundário (traço, tab ou " | "), separa nome e telefone dele também
    const commaParts = cleaned.split(",").map((p) => p.trim()).filter(Boolean);
    const firstChunk = splitSecundario(commaParts[0] || "");

    let nome = firstChunk[0] || "";
    let telefone = "";
    const extras = [];

    if (firstChunk.length >= 2 && phoneLike(firstChunk[1])) {
      telefone = formatPhone(firstChunk[1]);
      extras.push(...firstChunk.slice(2));
    } else if (firstChunk.length >= 2) {
      extras.push(...firstChunk.slice(1));
    }

    for (let i = 1; i < commaParts.length; i++) {
      if (!telefone && phoneLike(commaParts[i])) {
        telefone = formatPhone(commaParts[i]);
      } else {
        extras.push(commaParts[i]);
      }
    }

    return { nome, telefone, categoria: extras.filter(Boolean).join(", ") };
  });
}

function openPastePanel() {
  document.getElementById("paste-panel").classList.remove("hidden");
  document.getElementById("paste-preview").classList.add("hidden");
  document.getElementById("paste-textarea").value = "";
  document.getElementById("paste-textarea").focus();
  document.getElementById("paste-panel").scrollIntoView({ behavior: "smooth", block: "nearest" });
}

function closePastePanel() {
  document.getElementById("paste-panel").classList.add("hidden");
  pasteRows = [];
}

function analisarLista() {
  const text = document.getElementById("paste-textarea").value;
  const parsed = parseWhatsappList(text).filter((r) => r.nome.length > 0);

  if (parsed.length === 0) {
    showToast("Nenhum nome encontrado. Confira o texto colado.");
    return;
  }

  pasteRows = parsed;
  renderPastePreview();
  document.getElementById("paste-preview").classList.remove("hidden");
}

function renderPastePreview() {
  document.getElementById("paste-count").textContent = `${pasteRows.length} aluno${pasteRows.length !== 1 ? "s" : ""} encontrado${pasteRows.length !== 1 ? "s" : ""} — confira antes de cadastrar:`;

  const tbody = document.getElementById("paste-table-body");
  tbody.innerHTML = pasteRows
    .map(
      (r, idx) => `
      <tr>
        <td><input type="text" data-field="nome" data-idx="${idx}" value="${escapeHtml(r.nome)}" /></td>
        <td><input type="text" data-field="telefone" data-idx="${idx}" value="${escapeHtml(r.telefone)}" /></td>
        <td><input type="text" data-field="categoria" data-idx="${idx}" value="${escapeHtml(r.categoria)}" /></td>
        <td>
          <button type="button" class="paste-row-remove" data-action="remove-paste-row" data-idx="${idx}" title="Remover">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
          </button>
        </td>
      </tr>`
    )
    .join("");
}

function confirmarImportacao() {
  if (!activeEventId) {
    showToast("Crie ou selecione um evento primeiro.");
    return;
  }
  if (pasteRows.length === 0) return;

  const modalidade = document.getElementById("paste-modalidade").value;
  const novos = pasteRows
    .filter((r) => r.nome.trim().length > 0)
    .map((r) => ({
      id: uid(),
      eventoId: activeEventId,
      nome: r.nome.trim(),
      telefone: r.telefone.trim(),
      nascimento: "",
      modalidade: modalidade,
      categoria: r.categoria.trim(),
      pago: false,
      dataInscricao: todayBR(),
    }));

  students = [...novos, ...students];
  saveStudents();
  showToast(`${novos.length} aluno${novos.length !== 1 ? "s" : ""} inscrito${novos.length !== 1 ? "s" : ""} com sucesso.`);

  closePastePanel();
  renderHeader();
  renderTable();
  if (globalSearch.trim()) renderGlobalResults();
}

// ---------- Listeners ----------
function setupListeners() {
  document.getElementById("header-title").addEventListener("click", startEditName);
  const nameInput = document.getElementById("header-title-input");
  nameInput.addEventListener("blur", saveNameEdit);
  nameInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") nameInput.blur();
  });

  document.getElementById("global-search-input").addEventListener("input", (e) => {
    globalSearch = e.target.value;
    renderGlobalResults();
  });
  document.getElementById("global-search-clear").addEventListener("click", () => {
    globalSearch = "";
    document.getElementById("global-search-input").value = "";
    renderGlobalResults();
  });

  document.getElementById("event-search-input").addEventListener("input", (e) => {
    eventSearch = e.target.value;
    renderTable();
  });
  document.getElementById("event-search-clear").addEventListener("click", () => {
    eventSearch = "";
    document.getElementById("event-search-input").value = "";
    renderTable();
  });

  document.querySelectorAll("th.sortable").forEach((th) => {
    th.addEventListener("click", () => handleSortClick(th.dataset.sort));
  });

  document.getElementById("student-form").addEventListener("submit", handleSubmit);
  document.getElementById("cancel-edit-btn").addEventListener("click", cancelEdit);
  document.getElementById("f-telefone").addEventListener("input", (e) => {
    e.target.value = formatPhone(e.target.value);
  });

  document.getElementById("export-btn").addEventListener("click", exportarExcel);

  document.getElementById("open-paste-btn").addEventListener("click", openPastePanel);
  document.getElementById("cancel-paste-btn").addEventListener("click", closePastePanel);
  document.getElementById("discard-preview-btn").addEventListener("click", closePastePanel);
  document.getElementById("parse-list-btn").addEventListener("click", analisarLista);
  document.getElementById("confirm-paste-btn").addEventListener("click", confirmarImportacao);

  document.getElementById("paste-table-body").addEventListener("input", (e) => {
    const input = e.target;
    const idx = Number(input.dataset.idx);
    const field = input.dataset.field;
    if (pasteRows[idx]) pasteRows[idx][field] = input.value;
  });

  document.body.addEventListener("click", (e) => {
    const actionEl = e.target.closest("[data-action]");
    if (!actionEl) return;
    const action = actionEl.dataset.action;
    const id = actionEl.dataset.id;

    if (action === "select-event") {
      cancelEdit();
      activeEventId = id;
      eventSearch = "";
      renderTabs();
      renderHeader();
      renderEventSection();
    } else if (action === "delete-event") {
      e.stopPropagation();
      cancelEdit();
      excluirEvento(id, actionEl.dataset.nome);
    } else if (action === "new-event-toggle") {
      creatingEvent = true;
      renderTabs();
    } else if (action === "toggle-pay") {
      togglePagamento(id);
    } else if (action === "edit-student") {
      editStudent(id);
    } else if (action === "delete-student") {
      if (id === editingStudentId) cancelEdit();
      excluirAluno(id, actionEl.dataset.nome);
    } else if (action === "remove-paste-row") {
      const idx = Number(actionEl.dataset.idx);
      pasteRows.splice(idx, 1);
      if (pasteRows.length === 0) {
        closePastePanel();
      } else {
        renderPastePreview();
      }
    }
  });
}

// ---------- Inicialização ----------
if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}

document.addEventListener("DOMContentLoaded", () => {
  loadData();
  setupListeners();
  renderTabs();
  renderHeader();
  renderEventSection();
});
