const express = require("express");

const path = require("path");

const session = require("express-session");
 
const rotasCliente = require("./api/clienteRotas");

const clienteController = require("./controller/ClienteController");
 
const backend = express();
 
backend.use(express.json());

backend.use(express.urlencoded({ extended: true }));
 
backend.use(session({

  secret: "troque-esta-chave-em-producao",

  resave: false,

  saveUninitialized: false,

  cookie: { maxAge: 1000 * 60 * 60 * 4 }

}));
 
// Configuração do EJS

backend.set("view engine", "ejs");

backend.set("views", path.join(__dirname, "views"));
 
// Arquivos públicos (CSS, imagens, JS)

backend.use(express.static(path.join(__dirname, "public")));
 
// Rotas de cliente

backend.use("/cliente", rotasCliente);
 
// Middleware de login

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

backend.get("/dashboard", exigirLogin, (req, res) => {

  // Renderiza dashboard.ejs dentro de views

  res.render("dashboard", { usuarioEmail: req.session.usuarioEmail });

});
 
backend.get("/perfil", exigirLogin, clienteController.paginaPerfil);
 
// Páginas em construção

const paginasEmConstrucao = ["/diario", "/agendamento", "/rede-apoio", "/profissionais", "/telemedicina"];

paginasEmConstrucao.forEach((rota) => {

  backend.get(rota, exigirLogin, (req, res) => {

    res.render("em-construcao");

  });

});
 
backend.listen(3000, () => {

  console.log("Servidor rodando em http://localhost:3000");

});
 