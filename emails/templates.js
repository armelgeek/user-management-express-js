const globalStyle = `
    body {
        font-family: sans-serif;
        font-size: 16px;
        line-height: 1.5;
        color: #333333;
        padding: 20px;
    }
    a {
        color: #0F2E53;
        text-decoration: none;
        font-weight: bold;
    }
    a.button {
        display: inline-block;
        margin: 16px 0;
        border: 2px solid #0F2E53;
        border-radius: 8px; 
        padding: 6px 12px;
    }
`;
const resetPasswordTemplate = (resetToken) => `
    <html>
        <head>
            <title>Réinitialisez votre mot de passe</title>
            <style>${globalStyle}</style>
        </head>
        <body>
            <h1>Réinitialisez votre mot de passe</h1>
            <p>Salut !</p>
            <p>Vous êtes sur le point de réinitialiser votre mot de passe. Continuez ainsi en suivant ce lien :
            </p>
            <p><a class="button" href="${process.env.FRONTEND_URL}/resetPassword?token=${resetToken}" target="_blank">Réinitialiser le mot de passe</a></p>
        </body>
    </html>
`;
const emailConfirmationTemplate = (activationToken) => `
    <html>
        <head>
            <title>Confirmer votre email</title>
            <style>${globalStyle}</style>
        </head>
        <body>
            <h1>Confirmer votre email</h1>
            <p>Welcome to <strong>${process.env.FRONTEND_URL}</strong>!</p>
            <p>Confirmons votre adresse e-mail. Veuillez cliquer sur le bouton pour confirmer votre adresse e-mail et activer votre compte :</p>
            <p><a class="button" href="${process.env.FRONTEND_URL}/activateAccount?token=${activationToken}" target="_blank">Confirmez votre adresse email            </a></p>
            <p>Si vous ne confirmez pas votre adresse e-mail dans les prochaines 48 heures, votre compte sera automatiquement supprimé.</p>
        </body>
    </html>
`;
exports.resetPasswordTemplate = resetPasswordTemplate;
exports.emailConfirmationTemplate = emailConfirmationTemplate;
