const express = require("express");

const router = express.Router();

const clienteController = require("../controller/ClienteController");
 
// Middleware para as rotas de API que exigem login (retorna JSON, não redirect)

function exigirLoginApi(req, res, next) {

  if (req.session && req.session.usuarioEmail) {

    return next();

  }

  return res.status(401).json({ erro: "Não autenticado" });

}
 
router.post("/cadastro", clienteController.cadastrar);

router.post("/login", clienteController.login);

router.post("/logout", clienteController.logout);

router.get("/me", exigirLoginApi, clienteController.meusDados);

router.post("/perfil", exigirLoginApi, clienteController.atualizarPerfil);
 
module.exports = router;
 