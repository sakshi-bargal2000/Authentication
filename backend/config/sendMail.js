import { createTransport } from 'nodemailer'


const sendMail = async ({ email, subject, html }) => {

    try {
        const transport = createTransport({
            host: "smtp.gmail.com",
            port: 465,
            secure: true,
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASS,

            },

        });
        try {
            //console.log("Before verify");

            //enable 2step verification auth from gmail and 
            // add app passwords using https://myaccount.google.com/apppasswords 

            //await transport.verify();

            //console.log("SMTP verified");

        } catch (err) {
            console.error("VERIFY ERROR:", err);
        }
        const info = await transport.sendMail({
            from: process.env.EMAIL_USER,
            to: email,
            subject,
            html,
        });

        console.log("Mail sent:", info.messageId);
    } catch (err) {
        console.error("MAIL ERROR:", err);
        throw err;
    }
};

export default sendMail;