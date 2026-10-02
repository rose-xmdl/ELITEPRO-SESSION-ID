const {
    EliteProTechId,
    removeFile
} = require('../ids');

const QRCode = require('qrcode');
const express = require('express');
const path = require('path');
const fs = require('fs');
const pino = require('pino');

const {
    default: EliteProTechConnect,
    useMultiFileAuthState,
    makeCacheableSignalKeyStore,
    Browsers,
    delay,
    fetchLatestBaileysVersion
} = require("@whiskeysockets/baileys");

const sessionDir = path.join(__dirname, "session");

let router = express.Router();

router.get('/', async (req, res) => {
    const id = EliteProTechId();
    let responseSent = false;
    let sessionCleanedUp = false;

    async function cleanUpSession() {
        if (!sessionCleanedUp) {
            try {
                await removeFile(path.join(sessionDir, id));
            } catch (cleanupError) {
                console.error("Cleanup error:", cleanupError);
            }
            sessionCleanedUp = true;
        }
    }

    async function EliteProTech_QR_CODE() {
        const { version } = await fetchLatestBaileysVersion();
        console.log(version);

        const { state, saveCreds } = await useMultiFileAuthState(
            path.join(sessionDir, id)
        );

        try {
            const EliteProTech = EliteProTechConnect({
                version,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(
                        state.keys,
                        pino({ level: "fatal" }).child({ level: "fatal" })
                    )
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: Browsers.macOS("Safari"),
                syncFullHistory: false,
                generateHighQualityLinkPreview: true,
                shouldIgnoreJid: jid => !!jid?.endsWith('@g.us'),
                getMessage: async () => undefined,
                markOnlineOnConnect: true,
                connectTimeoutMs: 60000,
                keepAliveIntervalMs: 30000
            });

            EliteProTech.ev.on('creds.update', saveCreds);

            EliteProTech.ev.on("connection.update", async (s) => {
                const { connection, lastDisconnect, qr } = s;

                if (qr && !responseSent) {
                    try {
                        const qrImage = await QRCode.toDataURL(qr);

                        if (!res.headersSent) {
                            res.send(`
<!DOCTYPE html>
<html>
<head>
    <title>EliteProTech-MD | QR CODE</title>
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <style>
        body {
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #000;
            font-family: Arial, sans-serif;
            color: #fff;
            text-align: center;
            padding: 20px;
            box-sizing: border-box;
        }

        .container {
            width: 100%;
            max-width: 600px;
        }

        .qr-container {
            position: relative;
            margin: 20px auto;
            width: 300px;
            height: 300px;
            display: flex;
            justify-content: center;
            align-items: center;
        }

        .qr-code {
            width: 300px;
            height: 300px;
            padding: 10px;
            background: white;
            border-radius: 20px;
            box-shadow:
                0 0 0 10px rgba(255,255,255,0.1),
                0 0 0 20px rgba(255,255,255,0.05),
                0 0 30px rgba(255,255,255,0.2);
        }

        .qr-code img {
            width: 100%;
            height: 100%;
        }

        h1 {
            color: #fff;
            margin: 0 0 15px 0;
            font-size: 28px;
            font-weight: 800;
            text-shadow: 0 0 10px rgba(255,255,255,0.3);
        }

        p {
            color: #ccc;
            margin: 20px 0;
            font-size: 16px;
        }

        .back-btn {
            display: inline-block;
            padding: 12px 25px;
            margin-top: 15px;
            background: linear-gradient(135deg, #6e48aa 0%, #9d50bb 100%);
            color: white;
            text-decoration: none;
            border-radius: 30px;
            font-weight: bold;
            border: none;
            cursor: pointer;
            transition: all 0.3s ease;
            box-shadow: 0 4px 15px rgba(0,0,0,0.2);
        }

        .back-btn:hover {
            transform: translateY(-2px);
            box-shadow: 0 6px 20px rgba(0,0,0,0.3);
        }

        .pulse {
            animation: pulse 2s infinite;
        }

        @keyframes pulse {
            0% {
                box-shadow: 0 0 0 0 rgba(255,255,255,0.4);
            }

            70% {
                box-shadow: 0 0 0 15px rgba(255,255,255,0);
            }

            100% {
                box-shadow: 0 0 0 0 rgba(255,255,255,0);
            }
        }

        @media (max-width: 480px) {
            .qr-container {
                width: 260px;
                height: 260px;
            }

            .qr-code {
                width: 220px;
                height: 220px;
            }

            h1 {
                font-size: 24px;
            }
        }
    </style>
</head>
<body>
    <div class="container">
        <h1>EliteProTech QR CODE</h1>

        <div class="qr-container">
            <div class="qr-code pulse">
                <img src="${qrImage}" alt="QR Code"/>
            </div>
        </div>

        <p>Scan this QR code with your phone to connect</p>

        <a href="./" class="back-btn">Back</a>
    </div>

    <script>
        document.querySelector('.back-btn').addEventListener('mousedown', function() {
            this.style.transform = 'translateY(1px)';
            this.style.boxShadow = '0 2px 10px rgba(0,0,0,0.2)';
        });

        document.querySelector('.back-btn').addEventListener('mouseup', function() {
            this.style.transform = 'translateY(-2px)';
            this.style.boxShadow = '0 6px 20px rgba(0,0,0,0.3)';
        });
    </script>
</body>
</html>
                            `);

                            responseSent = true;
                        }
                    } catch (qrError) {
                        console.error("QR generation error:", qrError);
                    }
                }

                if (connection === "open") {
                    try {
                        await EliteProTech.newsletterFollow(
                            "120363287352245413@newsletter"
                        );
                    } catch (error) {
                        console.error("Newsletter error:", error);
                    }

                    await delay(50000);

                    let sessionData = null;
                    let attempts = 0;
                    const maxAttempts = 15;

                    while (attempts < maxAttempts && !sessionData) {
                        try {
                            const credsPath = path.join(
                                sessionDir,
                                id,
                                "creds.json"
                            );

                            if (fs.existsSync(credsPath)) {
                                const data = fs.readFileSync(credsPath);

                                if (data && data.length > 100) {
                                    sessionData = data;
                                    break;
                                }
                            }

                            await delay(8000);
                            attempts++;
                        } catch (readError) {
                            console.error("Read error:", readError);
                            await delay(2000);
                            attempts++;
                        }
                    }

                    if (!sessionData) {
                        await cleanUpSession();
                        return;
                    }

                    try {
                        await delay(5000);

                        const sessionJson = JSON.parse(
                            sessionData.toString()
                        );

                        const oneLineJson = JSON.stringify(sessionJson);

                        let sessionSent = false;
                        let sendAttempts = 0;
                        const maxSendAttempts = 5;
                        let Sess = null;

                        while (
                            sendAttempts < maxSendAttempts &&
                            !sessionSent
                        ) {
                            try {
                                Sess = await EliteProTech.sendMessage(
                                    EliteProTech.user.id,
                                    {
                                        text: oneLineJson
                                    }
                                );

                                sessionSent = true;
                            } catch (sendError) {
                                console.error(
                                    "Send error:",
                                    sendError
                                );

                                sendAttempts++;

                                if (sendAttempts < maxSendAttempts) {
                                    await delay(3000);
                                }
                            }
                        }

                        if (!sessionSent) {
                            await cleanUpSession();
                            return;
                        }

                        await delay(3000);

                        const EliteProTech_TEXT = `✅ *SESSION ID OBTAINED SUCCESSFULLY!*  
📁 Save and upload the *SESSION_ID* (text) to the \`session\` folder as \`creds.json\`, or add it to your \`.env\` file like this:  
\`SESSION_ID=your_session_id\`

📢 *Stay Updated — Follow Our Channels:*

➊ *Telegram*  
https://t.me/eliteprotechs

➋ *YouTube*  
https://youtube.com/@eliteprotechs

🌐 *Explore more tools on our website:*  
https://eliteprotech.zone.id`;

                        try {
                            const EliteProTechMess = {
                                image: {
                                    url: 'https://i.ibb.co/m5nZGQ11/img-c0dmriah.jpg'
                                },
                                caption: EliteProTech_TEXT,
                                contextInfo: {
                                    mentionedJid: [
                                        EliteProTech.user.id
                                    ],
                                    forwardingScore: 5,
                                    isForwarded: true,
                                    forwardedNewsletterMessageInfo: {
                                        newsletterJid:
                                            '120363287352245413@newsletter',
                                        newsletterName:
                                            "ᴇʟɪᴛᴇᴘʀᴏ-ᴛᴇᴄʜ-ꜱᴜᴘᴘᴏʀᴛ",
                                        serverMessageId: 143
                                    }
                                }
                            };

                            await EliteProTech.sendMessage(
                                EliteProTech.user.id,
                                EliteProTechMess,
                                { quoted: Sess }
                            );
                        } catch (messageError) {
                            console.error(
                                "Message send error:",
                                messageError
                            );
                        }

                        await delay(2000);
                        await EliteProTech.ws.close();
                    } catch (sessionError) {
                        console.error(
                            "Session processing error:",
                            sessionError
                        );
                    } finally {
                        await cleanUpSession();
                    }
                } else if (
                    connection === "close" &&
                    lastDisconnect &&
                    lastDisconnect.error &&
                    lastDisconnect.error.output.statusCode != 401
                ) {
                    console.log("Reconnecting...");
                    await delay(5000);
                    EliteProTech_QR_CODE();
                }
            });
        } catch (err) {
            console.error("Main error:", err);

            if (!responseSent && !res.headersSent) {
                res.status(500).json({
                    code: "QR Service is Currently Unavailable"
                });

                responseSent = true;
            }

            await cleanUpSession();
        }
    }

    try {
        await EliteProTech_QR_CODE();
    } catch (finalError) {
        console.error("Final error:", finalError);

        await cleanUpSession();

        if (!responseSent && !res.headersSent) {
            res.status(500).json({
                code: "Service Error"
            });
        }
    }
});

module.exports = router;
