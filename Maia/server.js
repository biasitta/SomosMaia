const express = require("express");
const path = require("path");
const session = require("express-session");

const rotasCliente = require("./api/clienteRotas");

const backend = express();
backend.use(express.json());
backend.use(express.urlencoded({ extended: true })); // necessário para ler os campos do <form>

// Sessão do usuário: controla quem está logado.
// Em produção, troque o "secret" por uma variável de ambiente.
backend.use(session({
  secret: "troque-esta-chave-em-producao",
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 } // sessão dura 4 horas
}));

// Arquivos públicos: página inicial, login, cadastro, css/imagens
backend.use(express.static(path.join(__dirname, "public")));

// Rotas de cliente (login, cadastro, perfil, logout)
backend.use("/cliente", rotasCliente);

// Middleware: exige login para acessar uma página.
// Se não estiver logada, manda direto para a tela de login.
function exigirLogin(req, res, next) {
  if (req.session && req.session.usuarioEmail) {
    return next();
  }
  return res.redirect("/login");
}

// ===================== Páginas públicas =====================
backend.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

backend.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

backend.get("/cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cadastro.html"));
});

// ===================== Páginas que exigem login =====================
// Ficam em /views (fora da pasta pública), então só são entregues
// passando pelo middleware exigirLogin - não dá pra acessar direto pela URL do arquivo.

backend.get("/dashboard", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "dashboard.html"));
});

backend.get("/perfil", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "views", "perfil.html"));
});

// Funcionalidades ainda não construídas em detalhe - por enquanto mostram
// uma tela "em construção" já protegida por login, para o fluxo funcionar de ponta a ponta.
const paginasEmConstrucao = ["/diario", "/agendamento", "/rede-apoio", "/profissionais", "/telemedicina"];
paginasEmConstrucao.forEach((rota) => {
  backend.get(rota, exigirLogin, (req, res) => {
    res.sendFile(path.join(__dirname, "views", "em-construcao.html"));
  });
});

backend.listen(3000, () => {
  console.log("Servidor rodando em http://localhost:3000");
});
