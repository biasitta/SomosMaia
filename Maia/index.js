const express = require("express");
const path = require("path");
const session = require("express-session");

// Importação das rotas e do controller
const rotasCliente = require("./api/clienteRotas");
const clienteController = require("./controller/ClienteController");

const backend = express();

// ===================== Middlewares =====================
backend.use(express.json());
backend.use(express.urlencoded({ extended: true }));

// Configuração da Sessão
backend.use(
  session({
    secret: "troque-esta-chave-em-producao",
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 4 } // 4 horas de sessão
  })
);

// Arquivos públicos (CSS, imagens, JS do front e páginas HTML)
backend.use(express.static(path.join(__dirname, "public")));

// Middleware de proteção (exige login)
function exigirLogin(req, res, next) {
  if (req.session && req.session.usuarioEmail) {
    return next();
  }
  return res.redirect("/login");
}

// ===================== Rotas da API de Clientes =====================
backend.use("/cliente", rotasCliente);

// ===================== Páginas Públicas =====================
backend.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

backend.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

backend.get("/cadastro", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "cadastro.html"));
});

// ===================== Páginas Protegidas =====================
backend.get("/dashboard", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "dashboard.html"));
});

backend.get("/perfil", exigirLogin, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "perfil.html"));
});

// Páginas em construção
const paginasEmConstrucao = [
  "/diario",
  "/agendamento",
  "/rede-apoio",
  "/profissionais",
  "/telemedicina"
];

paginasEmConstrucao.forEach((rota) => {
  backend.get(rota, exigirLogin, (req, res) => {
    res.send("<h2>Página em construção 🛠️</h2>");
  });
});

// ===================== Inicialização =====================
backend.listen(3000, () => {
  console.log("🚀 Servidor rodando em http://localhost:3000");
});