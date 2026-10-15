/* ============================================================
   EduControl — app.js (frontend)
   ============================================================ */

const API = 'http://localhost:3000/api';
const $  = (s, ctx=document) => ctx.querySelector(s);
const $$ = (s, ctx=document) => [...ctx.querySelectorAll(s)];

/* ---------- HTTP ---------- */
async function http(metodo, rota, dados=null){
  const opts = { method: metodo, headers: { 'Content-Type': 'application/json' } };
  if(dados) opts.body = JSON.stringify(dados);
  const r = await fetch(API + rota, opts);
  const json = await r.json();
  if(!r.ok || json.erro) throw new Error(json.erro || 'Erro na API');
  return json;
}
const get  = (rota)    => http('GET', rota);
const post = (rota, d) => http('POST', rota, d);
const del  = (rota)    => http('DELETE', rota);

/* ---------- Toast ---------- */
function toast(msg, tipo=''){
  let t = document.getElementById('toast');
  if(!t){
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.className = 'toast show ' + tipo;
  clearTimeout(t._t);
  t._t = setTimeout(() => t.className = 'toast', 3000);
}

/* ---------- Bind genérico ---------- */
function bind(idForm, rota, montarDados, msgOk, depois){
  const f = document.getElementById(idForm);
  if(!f) return;
  f.addEventListener('submit', async e => {
    e.preventDefault();
    try {
      await post(rota, montarDados(e.target));
      e.target.reset();
      if(depois) await depois();
      toast(msgOk, 'success');
    } catch(err){ toast(err.message, 'error'); }
  });
}

/* ---------- Excluir genérico ---------- */
async function excluir(recurso, id, depois){
  if(!confirm('Deseja realmente excluir?')) return;
  try {
    await del(`/${recurso}/${id}`);
    if(depois) await depois();
    toast('Registro excluído.', 'success');
  } catch(err){ toast(err.message, 'error'); }
}

/* ============================================================
   PÁGINA: ESCOLAS & DOCENTES
   ============================================================ */
async function carregarEscolasPage(){
  const tbEsc = $('#tabela-escolas tbody');
  const tbProf = $('#tabela-professores tbody');
  if(!tbEsc && !tbProf) return;

  try {
    const [escolas, professores] = await Promise.all([
      get('/escolas'),
      get('/professores').catch(() => [])
    ]);

    if(tbEsc){
      tbEsc.innerHTML = escolas.length
        ? escolas.map(e => `
          <tr>
            <td>${e.id_escola}</td>
            <td>${e.nome}</td>
            <td>${e.endereco||'—'}</td>
            <td>${e.cnpj||'—'}</td>
            <td><button class="btn-del" onclick="excluirEscola(${e.id_escola})">Excluir</button></td>
          </tr>`).join('')
        : `<tr><td colspan="5" class="empty">Nenhuma escola cadastrada.</td></tr>`;
    }

    if(tbProf){
      tbProf.innerHTML = professores.length
        ? professores.map(p => `
          <tr>
            <td>${p.id_professor}</td>
            <td>${p.nome}</td>
            <td>${p.cpf}</td>
            <td>${p.email}</td>
            <td>${p.escola||'—'}</td>
            <td><button class="btn-del" onclick="excluirProfessor(${p.id_professor})">Excluir</button></td>
          </tr>`).join('')
        : `<tr><td colspan="6" class="empty">Nenhum professor cadastrado.</td></tr>`;
    }

    const selEsc = $('#select-escola-prof');
    if(selEsc){
      selEsc.innerHTML = '<option value="">Selecione...</option>' +
        escolas.map(e => `<option value="${e.id_escola}">${e.nome}</option>`).join('');
    }

  } catch(err){
    console.error('Erro ao carregar escolas:', err);
    if(tbEsc) tbEsc.innerHTML = `<tr><td colspan="5" class="empty">Erro: ${err.message}</td></tr>`;
  }

  bind('form-escola', '/escolas', f => ({
    nome: f.nome.value.trim(),
    endereco: f.endereco.value.trim(),
    cnpj: f.cnpj.value.trim()
  }), 'Escola cadastrada!', carregarEscolasPage);

  bind('form-professor', '/professores', f => ({
    nome: f.nome.value.trim(),
    cpf: f.cpf.value.trim(),
    email: f.email.value.trim(),
    id_escola: f.id_escola.value
  }), 'Professor cadastrado!', carregarEscolasPage);
}

window.excluirEscola = (id) => excluir('escolas', id, carregarEscolasPage);
window.excluirProfessor = (id) => excluir('professores', id, carregarEscolasPage);

/* ============================================================
   PÁGINA: DISCIPLINAS
   ============================================================ */
async function carregarDisciplinasPage(){
  const tb = $('#tabela-disciplinas tbody');
  if(!tb) return;

  try {
    const disciplinas = await get('/disciplinas');
    tb.innerHTML = disciplinas.length
      ? disciplinas.map(d => `
        <tr>
          <td>${d.id_disciplina}</td>
          <td>${d.nome}</td>
          <td>${d.carga_horaria?d.carga_horaria+'h':'—'}</td>
          <td><button class="btn-del" onclick="excluirDisciplina(${d.id_disciplina})">Excluir</button></td>
        </tr>`).join('')
      : `<tr><td colspan="4" class="empty">Nenhuma disciplina cadastrada.</td></tr>`;
  } catch(err){
    tb.innerHTML = `<tr><td colspan="4" class="empty">Erro: ${err.message}</td></tr>`;
  }

  bind('form-disciplina', '/disciplinas', f => ({
    nome: f.nome.value.trim(),
    carga: f.carga.value
  }), 'Disciplina cadastrada!', carregarDisciplinasPage);
}

window.excluirDisciplina = (id) => excluir('disciplinas', id, carregarDisciplinasPage);

/* ============================================================
   PÁGINA: TURMAS
   ============================================================ */
async function carregarTurmasPage(){
  const tb = $('#tabela-turmas tbody');
  if(!tb) return;

  try {
    const [turmas, escolas] = await Promise.all([get('/turmas'), get('/escolas')]);

    tb.innerHTML = turmas.length
      ? turmas.map(t => `
        <tr>
          <td>${t.id_turma}</td><td>${t.serie}</td><td>${t.ano_letivo}</td>
          <td>${t.numero_chamada||'—'}</td><td>${t.capacidade||'—'}</td>
          <td>${t.quantidade_aluno||0}</td><td>${t.escola||'—'}</td>
          <td><button class="btn-del" onclick="excluirTurma(${t.id_turma})">Excluir</button></td>
        </tr>`).join('')
      : `<tr><td colspan="8" class="empty">Nenhuma turma cadastrada.</td></tr>`;

    const sel = $('#select-escola-turma');
    if(sel) sel.innerHTML = '<option value="">Selecione...</option>' +
      escolas.map(e => `<option value="${e.id_escola}">${e.nome}</option>`).join('');

  } catch(err){
    tb.innerHTML = `<tr><td colspan="8" class="empty">Erro: ${err.message}</td></tr>`;
  }

  bind('form-turma', '/turmas', f => ({
    serie: f.serie.value.trim(),
    ano: f.ano.value,
    numero_chamada: f.chamada.value,
    capacidade: f.capacidade.value,
    id_escola: f.id_escola.value
  }), 'Turma criada!', carregarTurmasPage);
}

window.excluirTurma = (id) => excluir('turmas', id, carregarTurmasPage);

/* ============================================================
   PÁGINA: ALUNOS E RESPONSÁVEIS
   ============================================================ */
async function carregarAlunosPage(){
  const tbAl = $('#tabela-alunos tbody');
  const tbRes = $('#tabela-responsaveis tbody');
  if(!tbAl && !tbRes) return;

  try {
    const [alunos, responsaveis, turmas] = await Promise.all([
      get('/alunos'), get('/responsaveis'), get('/turmas')
    ]);

    if(tbAl){
      tbAl.innerHTML = alunos.length
        ? alunos.map(a => `
          <tr>
            <td>${a.id_aluno}</td><td>${a.nome}</td><td>${a.cpf}</td>
            <td>${a.data_nascimento||'—'}</td><td>${a.idade||'—'}</td>
            <td>${a.turma||'—'}</td>
            <td><button class="btn-del" onclick="excluirAluno(${a.id_aluno})">Excluir</button></td>
          </tr>`).join('')
        : `<tr><td colspan="7" class="empty">Nenhum aluno cadastrado.</td></tr>`;
    }

    if(tbRes){
      tbRes.innerHTML = responsaveis.length
        ? responsaveis.map(r => `
          <tr>
            <td>${r.id_responsavel}</td><td>${r.nome}</td>
            <td>${r.cpf}</td><td>${r.telefone||'—'}</td>
            <td><button class="btn-del" onclick="excluirResponsavel(${r.id_responsavel})">Excluir</button></td>
          </tr>`).join('')
        : `<tr><td colspan="5" class="empty">Nenhum responsável cadastrado.</td></tr>`;
    }

    const selTurma = $('#select-turma-aluno');
    if(selTurma) selTurma.innerHTML = '<option value="">Sem turma</option>' +
      turmas.map(t => `<option value="${t.id_turma}">${t.serie} (${t.ano_letivo})</option>`).join('');

    const selAluno = $('#select-aluno-resp');
    if(selAluno) selAluno.innerHTML = '<option value="">Selecione...</option>' +
      alunos.map(a => `<option value="${a.id_aluno}">${a.nome}</option>`).join('');

  } catch(err){
    if(tbAl) tbAl.innerHTML = `<tr><td colspan="7" class="empty">Erro: ${err.message}</td></tr>`;
  }

  bind('form-aluno', '/alunos', f => ({
    nome: f.nome.value.trim(),
    cpf: f.cpf.value.trim(),
    nascimento: f.nascimento.value,
    id_turma: f.id_turma.value || null
  }), 'Aluno cadastrado!', carregarAlunosPage);

  bind('form-responsavel', '/responsaveis', f => ({
    nome: f.nome.value.trim(),
    cpf: f.cpf.value.trim(),
    telefone: f.telefone.value.trim(),
    id_aluno: f.id_aluno.value,
    parentesco: f.parentesco.value
  }), 'Responsável cadastrado!', carregarAlunosPage);
}

window.excluirAluno = (id) => excluir('alunos', id, carregarAlunosPage);
window.excluirResponsavel = (id) => excluir('responsaveis', id, carregarAlunosPage);

/* ============================================================
   PÁGINA: DASHBOARD
   ============================================================ */
async function carregarDashboard(){
  const el = id => document.getElementById(id);
  if(!el('stat-escolas')) return;

  try {
    const [esc, prof, disc, tur, alu] = await Promise.all([
      get('/escolas'), get('/professores'), get('/disciplinas'),
      get('/turmas'), get('/alunos')
    ]);
    el('stat-escolas').textContent = esc.length;
    el('stat-professores').textContent = prof.length;
    el('stat-disciplinas').textContent = disc.length;
    el('stat-turmas').textContent = tur.length;
    el('stat-alunos').textContent = alu.length;
    if(el('stat-matriculas')) el('stat-matriculas').textContent = '0';
  } catch(err){ console.error(err); }
}

/* ============================================================
   INICIALIZAÇÃO
   ============================================================ */
carregarDashboard();
carregarEscolasPage();
carregarDisciplinasPage();
carregarTurmasPage();
carregarAlunosPage();
