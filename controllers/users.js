const { validationResult } = require("express-validator");
const { randomBytes } = require("crypto");
const { promisify } = require("util");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const Datastore = require('nedb-promises')

const transport = require("../emails/transport");
const db = {};
db.users = Datastore.create('./data/users.db');
db.users.corruptAlertThreshold=1;
const {
  resetPasswordTemplate,
  emailConfirmationTemplate,
} = require("../emails/templates");
const signup = async (req, res, next) => {
  try {
    const email = req.body.email;
    const password = req.body.password;
    const name = req.body.name;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const errArray = errors.array();
      const err = new Error(errArray[0].msg);
      err.statusCode = 422;
      err.data = errArray;
      throw err;
    }
    const exitUser=await db.users.findOne({ email: email })
    .then(response => response)
    .catch(err => {throw err})
    if(exitUser){
        const err = new Error("L'adresse mail existe déjà.");
        err.statusCode = 422;
         throw err; 
   }else{

    const hashedPassword = await bcrypt.hash(password, 12);
    const activationToken = (await promisify(randomBytes)(20)).toString("hex");
    const newUser = {
      email: email,
      password: hashedPassword,
      name: name,
      active:false,
      activationToken: activationToken,
    };
    let savedUser=await db.users.insert(newUser)
  .then(response => response)
  .catch(err =>{
    throw err
  } )
    await transport.sendMail({
      from: process.env.MAIL_SENDER,
      to: email,
      subject: "Confirmez votre adresse email",
      html: emailConfirmationTemplate(activationToken),
    });
    const token = jwt.sign(
      { userId: savedUser._id },
      process.env.JWT_KEY
    );
    const maxAge = 1000 * 60 * 60 * 24 * 3; // 3 days
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: maxAge,
      domain: process.env.DOMAIN,
    });

    res.status(201).json({
      message: "Utilisateur créé avec succès.",
      userId: savedUser._id,
    });
   }
  } catch (err) {
    next(err);
  }
};

const login =  async (req, res, next) => {

  try {
    const email = req.body.email;
    const password = req.body.password;
    
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error("La validation de l'entrée a échoué.");
      err.statusCode = 422;
      err.data = errors.array();
      throw err;
    }
    const existingUserLogin = await db.users.findOne({ email: email }).then(response => response)
    .catch(err => {
      throw err;
    });
    if (!existingUserLogin) {
      const err = new Error("Un utilisateur avec cet e-mail n'a pas pu être trouvé.");
      err.statusCode = 404;
      throw err;
    }

    const isEqual =  await bcrypt.compare(password, existingUserLogin.password);
    if (!isEqual) {
      const err = new Error("Mauvais mot de passe.");
      err.statusCode = 401;
      throw err;
    }

    const token = jwt.sign(
      { userId: existingUserLogin._id.toString() },
      process.env.JWT_KEY
    );

    // Set cookie in the browser to store authentication state
    const maxAge = 1000 * 60 * 60; // 1 hour
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: maxAge,
      domain: process.env.DOMAIN,
    });

    res.status(201).json({
      message: "L'utilisateur s'est connecté avec succès.",
      token: token,
      userId: existingUserLogin._id.toString(),
    });
  } catch (err) {
    next(err);
  }
};

const logout =  (req, res, next) => {
  const userId = req.userId;

  if (!userId) {
    const err = new Error("L'utilisateur n'est pas authentifié.");
    err.statusCode = 401;
    throw err;
  }

  res.clearCookie("token", { domain: process.env.DOMAIN });
  res.status(200).json({
    message: "L'utilisateur s'est déconnecté avec succès.",
    userId: userId,
  });
};

const getUser = async (req, res, next) => {
  const userId = req.userId;

  try {

    const dataUser = await db.users.findOne({ _id: userId })
    .then(response => response)
    .catch(err => {
      throw err;
    });
    if (!userId || !dataUser) {
      const err = new Error("L'utilisateur n'est pas authentifié.");
      err.statusCode = 401;
      throw err;
    }

    res.status(200).json({
      message: "Utilisateur récupéré avec succès.",
      userId: dataUser._id.toString(),
      email: dataUser.email,
      name: dataUser.name
    });
  } catch (err) {
    next(err);
  }
};

const updateUser = async (req, res, next) => {
  const userId = req.userId;
  const name = req.body.name;
  const email = req.body.email;
  const password = req.body.password;
  try {
    const updateDataUser = await db.users.findOne({ _id: userId }).then(response => response).catch(err => {
      throw err;
    });
    if (!userId || !updateDataUser) {
      const err = new Error("L'utilisateur n'est pas authentifié.");
      err.statusCode = 401;
      throw err;
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 12);
      updateDataUser.password = hashedPassword;
    }
    updateDataUser.name = name;
    updateDataUser.email = email;
    const savedUser = await db.users.update({ _id:  updateDataUser._id },
      { $set: { name: updateDataUser.name,email:updateDataUser.email,password:updateDataUser.password } }).then(response => response).catch(err => {
        throw err;
      })
    res.status(201).json({
      message: "Utilisateur mis à jour avec succès.",
      userId: savedUser,
      name: updateDataUser.name,
      email: updateDataUser.email,
    });
  } catch (err) {
    next(err);
  }
};

const getResetToken = async (req, res, next) => {
  const email = req.body.email;

  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error("La validation de l'entrée a échoué.");
      err.statusCode = 422;
      err.data = errors.array();
      throw err;
    }
    const user = await db.users.findOne({ email: email }).then(response => response).catch(err =>{
      throw err;
    })
    if (!user) {
      const err = new Error("Un utilisateur avec cet e-mail n'a pas pu être trouvé.");
      err.statusCode = 404;
      throw err;
    }

    const resetToken = (await promisify(randomBytes)(20)).toString("hex");
    const resetTokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour from now
    user.resetToken = resetToken;
    user.resetTokenExpiry = resetTokenExpiry;
    const savedUser = await db.users.update({ _id:  user._id },
      { $set: { resetToken:user.resetToken,resetTokenExpiry:user.resetTokenExpiry } }).then(response => response).catch(err =>{
        throw err;
      });
    const userMail = await db.users.findOne({ _id: savedUser }).then(response => response).catch(err =>{
        throw err;
      });
    await transport.sendMail({
      from: process.env.MAIL_SENDER,
      to: userMail,
      subject: "Votre jeton de réinitialisation de mot de passe.",
      html: resetPasswordTemplate(resetToken),
    });

    res.status(200).json({
      message: "Réinitialisation du mot de passe demandée avec succès ! Vérifiez votre boîte de réception.",
    });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  const password = req.body.password;
  const resetToken = req.body.resetToken;
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      const err = new Error("La validation de l'entrée a échoué.");
      err.statusCode = 422;
      err.data = errors.array();
      throw err;
    }
    const user = await db.users.findOne({
      resetToken: resetToken,
      resetTokenExpiry: { $gt: Date.now() - 1000 * 60 * 60 },
    }).then(response => response).catch(err =>{
        throw err;
    });
    if (!user) {
      const err = new Error("Le jeton est soit invalide, soit expiré.");
      err.statusCode = 422;
      throw err;
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    user.password = hashedPassword;
    user.resetToken = null;
    user.resetTokenExpiry = null;
    const savedUser = await db.users.update({ _id: user._id },
      { $set: { password: user.password,resetToken:user.resetToken,resetTokenExpiry:user.resetTokenExpiry } }).then(response => response).catch(err =>{
        throw err;
      });
    // Connexion automatique de l'utilisateur après la réinitialisation du mot de passe
    const token = jwt.sign(
      { userId: savedUser },
      process.env.JWT_KEY
    );

    const maxAge = 1000 * 60 * 60; // 1 hour
    res.cookie("token", token, {
      httpOnly: true,
      maxAge: maxAge,
      domain: process.env.DOMAIN,
    });

    res.status(201).json({
      message: "Mot de passe changé avec succès. ",
      token: token,
      userId: savedUser,
    });
  } catch (err) {
    next(err);
  }
};

const activateAccount = async (req, res, next) => {
  const activationToken = req.body.activationToken;

  try {
    const user = await db.users.findOne({
      active: false,
      activationToken: activationToken,
    }).then(response => response).catch(err =>{
      throw err;
    });
    if (!user) {
      const err = new Error("Le code d'activation est invalide.");
      err.statusCode = 422;
      throw err;
    }

    const savedUser = await db.users.update({ _id: user._id },
      { $set: { active: true,activationToken:null} }).then(response => response).catch(err =>{
      throw err;
    });
    res.status(201).json({
      message: "Compte activé avec succès.",
      userId: savedUser,
    });
  } catch (err) {
    next(err);
  }
};

exports.signup = signup;
exports.login = login;
exports.logout = logout;
exports.getUser = getUser;
exports.updateUser = updateUser;
exports.getResetToken = getResetToken;
exports.resetPassword = resetPassword;
exports.activateAccount = activateAccount;