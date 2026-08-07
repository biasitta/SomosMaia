const express = require("express");
const router = express.Router();

// Simulação de banco de dados em memória
let clientes = [];

// Middleware para as rotas de API que exigem login (retorna JSON, não redirect)
function exigirLoginApi(req, res, next) {
  if (req.session && req.session.usuarioEmail) {
    return next();
  }
  return res.status(401).json({ erro: "Não autenticado" });
}

// ===================== Cadastro =====================
router.post("/cadastro", (req, res) => {
  const { Nome, Email, Senha, DataNascimento, Fase, SemanasGestacao, Telefone } = req.body;

  const existente = clientes.find(c => c.Email === Email);
  if (existente) {
    return res.status(400).send("E-mail já cadastrado!");
  }

  clientes.push({ Nome, Email, Senha, DataNascimento, Fase, SemanasGestacao, Telefone });
  res.redirect("/login"); // depois de cadastrar, manda para a tela de login
});

// ===================== Login =====================
router.post("/login", (req, res) => {
  const { Email, Senha } = req.body;

  const cliente = clientes.find(c => c.Email === Email && c.Senha === Senha);
  if (!cliente) {
    return res.status(401).send("Credenciais inválidas");
  }

  // Marca a sessão como logada
  req.session.usuarioEmail = cliente.Email;
  res.redirect("/dashboard");
});

// ===================== Logout =====================
router.post("/logout", (req, res) => {
  req.session.destroy(() => {
    res.redirect("/");
  });
});

// ===================== Dados do usuário logado =====================
// Usado pelo dashboard e pela tela de perfil para saber quem está logado
router.get("/me", exigirLoginApi, (req, res) => {
  const cliente = clientes.find(c => c.Email === req.session.usuarioEmail);
  if (!cliente) return res.status(404).json({ erro: "Usuário não encontrado" });

  const { Senha, ...dadosSemSenha } = cliente;
  res.json(dadosSemSenha);
});

// ===================== Atualizar perfil =====================
router.post("/perfil", exigirLoginApi, (req, res) => {
  const cliente = clientes.find(c => c.Email === req.session.usuarioEmail);
  if (!cliente) return res.status(404).json({ erro: "Usuário não encontrado" });

  const { Nome, Telefone, Fase, SemanasGestacao } = req.body;
  if (Nome) cliente.Nome = Nome;
  if (Telefone) cliente.Telefone = Telefone;
  if (Fase) cliente.Fase = Fase;
  if (SemanasGestacao !== undefined) cliente.SemanasGestacao = SemanasGestacao;

  res.json({ ok: true });
});

module.exports = router;
