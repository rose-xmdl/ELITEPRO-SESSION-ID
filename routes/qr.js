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
    fetchLatestBaileysVersion,
    DisconnectReason
} = require("@whiskeysockets/baileys");

const router = express.Router();

const sessionDir = path.join(__dirname, "session");

router.get('/', async (req, res) => {
    const id = EliteProTechId();
    const currentSessionDir = path.join(sessionDir, id);

    let responseSent = false;
    let sessionCleanedUp = false;
    let finished = false;
    let starting = false;
    let restartCount = 0;
    const maxRestarts = 5;

    async function cleanUpSession() {
        if (sessionCleanedUp || finished) return;

        sessionCleanedUp = true;

        try {
            await removeFile(currentSessionDir);
        } catch (error) {
            console.error("Session cleanup error:", error);
        }
    }

    async function sendSession(EliteProTech, saveCreds) {
        if (finished) return;

        await saveCreds();
        await delay(5000);
        await saveCreds();

        const credsPath = path.join(
            currentSessionDir,
            "creds.json"
        );

        let sessionData = null;
        let sessionJson = null;

        for (let attempts = 0; attempts < 15; attempts++) {
            try {
                await saveCreds();

                if (fs.existsSync(credsPath)) {
                    const data = fs.readFileSync(
                        credsPath,
                        "utf8"
                    );

                    if (data && data.length > 100) {
                        const parsed = JSON.parse(data);

                        if (parsed.me?.id) {
                            sessionData = data;
                            sessionJson = parsed;
                            break;
                        }
                    }
                }
            } catch (error) {
                console.error(
                    "Credential read error:",
                    error.message
                );
            }

            await delay(2000);
        }

        if (!sessionData || !sessionJson) {
            throw new Error(
                "Could not read WhatsApp session credentials"
            );
        }

        console.log(
            "QR session credentials:",
            {
                registered: sessionJson.registered,
                me: sessionJson.me?.id,
                lid: sessionJson.me?.lid,
                platform: sessionJson.platform
            }
        );

        const oneLineJson = JSON.stringify(sessionJson);

        const Sess = await EliteProTech.sendMessage(
            EliteProTech.user.id,
            {
                text: oneLineJson
            }
        );

        const EliteProTech_TEXT = `✅ *SESSION ID OBTAINED SUCCESSFULLY!*

📁 Save and upload the *SESSION_ID* (text) to the \`session\` folder as \`creds.json\`, or add it to your \`.env\` file like this:

\`SESSION_ID=your_session_id\`

📢 *Stay Updated — Follow Our Channels:*

➊ *Telegram*
https://t.me/eliteprotechs

➋ *YouTube*
https://youtube.com/@eliteprotechs

🚫 *Do NOT share your session ID or creds.json with anyone.*

🌐 *Explore more tools on our website:*
https://eliteprotech.zone.id`;

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
            {
                quoted: Sess
            }
        );

        finished = true;

        await delay(2000);

        try {
            EliteProTech.ws.close();
        } catch {}

        await delay(1000);

        try {
            await removeFile(currentSessionDir);
        } catch (error) {
            console.error(
                "Final cleanup error:",
                error.message
            );
        }
    }

    async function startQrSession() {
        if (finished || starting) return;

        starting = true;

        try {
            const { version } =
                await fetchLatestBaileysVersion();

            console.log(
                "QR Baileys version:",
                version
            );

            const {
                state,
                saveCreds
            } = await useMultiFileAuthState(
                currentSessionDir
            );

            const EliteProTech =
                EliteProTechConnect({
                    version,
                    logger: pino({
                        level: "silent"
                    }),
                    printQRInTerminal: false,
                    browser: Browsers.macOS("Safari"),
                    auth: {
                        creds: state.creds,
                        keys:
                            makeCacheableSignalKeyStore(
                                state.keys,
                                pino({
                                    level: "fatal"
                                }).child({
                                    level: "fatal"
                                })
                            )
                    },
                    connectTimeoutMs: 60000,
                    keepAliveIntervalMs: 30000,
                    markOnlineOnConnect: true,
                    emitOwnEvents: true,
                    defaultQueryTimeoutMs: 60000,
                    syncFullHistory: false,
                    generateHighQualityLinkPreview: true,
                    fireInitQueries: false
                });

            EliteProTech.ev.on(
                'creds.update',
                async () => {
                    try {
                        await saveCreds();
                    } catch (error) {
                        console.error(
                            "saveCreds error:",
                            error.message
                        );
                    }
                }
            );

            EliteProTech.ev.on(
                "connection.update",
                async update => {
                    const {
                        connection,
                        lastDisconnect,
                        qr
                    } = update;

                    if (
                        qr &&
                        !responseSent &&
                        !finished
                    ) {
                        try {
                            const qrImage =
                                await QRCode.toDataURL(qr);

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
            background: linear-gradient(
                135deg,
                #6e48aa 0%,
                #9d50bb 100%
            );
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
                box-shadow:
                    0 0 0 0
                    rgba(255,255,255,0.4);
            }

            70% {
                box-shadow:
                    0 0 0 15px
                    rgba(255,255,255,0);
            }

            100% {
                box-shadow:
                    0 0 0 0
                    rgba(255,255,255,0);
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
                <img
                    src="${qrImage}"
                    alt="QR Code"
                />
            </div>
        </div>

        <p>
            Scan this QR code with your phone
            to connect
        </p>

        <a href="./" class="back-btn">
            Back
        </a>
    </div>

    <script>
        document
            .querySelector('.back-btn')
            .addEventListener(
                'mousedown',
                function() {
                    this.style.transform =
                        'translateY(1px)';
                    this.style.boxShadow =
                        '0 2px 10px rgba(0,0,0,0.2)';
                }
            );

        document
            .querySelector('.back-btn')
            .addEventListener(
                'mouseup',
                function() {
                    this.style.transform =
                        'translateY(-2px)';
                    this.style.boxShadow =
                        '0 6px 20px rgba(0,0,0,0.3)';
                }
            );
    </script>
</body>
</html>
                                `);

                                responseSent = true;
                            }
                        } catch (error) {
                            console.error(
                                "QR generation error:",
                                error
                            );
                        }
                    }

                    if (
                        connection === "open" &&
                        !finished
                    ) {
                        console.log(
                            "QR CONNECTION OPEN"
                        );

                        try {
                            await saveCreds();

                            await delay(5000);

                            await saveCreds();

                            console.log(
                                "Preparing QR session..."
                            );

                            await sendSession(
                                EliteProTech,
                                saveCreds
                            );
                        } catch (error) {
                            console.error(
                                "Session send error:",
                                error
                            );
                        }

                        return;
                    }

                    if (
                        connection === "close" &&
                        !finished
                    ) {
                        const statusCode =
                            lastDisconnect?.error
                                ?.output?.statusCode;

                        console.log(
                            "QR CONNECTION CLOSED:",
                            statusCode
                        );

                        if (
                            statusCode ===
                                DisconnectReason.loggedOut ||
                            statusCode === 401
                        ) {
                            console.log(
                                "QR session logged out"
                            );

                            await cleanUpSession();
                            return;
                        }

                        if (
                            restartCount >=
                            maxRestarts
                        ) {
                            console.log(
                                "Maximum QR reconnect attempts reached"
                            );

                            await cleanUpSession();

                            if (
                                !responseSent &&
                                !res.headersSent
                            ) {
                                res.status(500).json({
                                    code:
                                        "QR authentication failed"
                                });

                                responseSent = true;
                            }

                            return;
                        }

                        restartCount++;

                        console.log(
                            `Reconnecting QR session (${restartCount}/${maxRestarts})...`
                        );

                        try {
                            EliteProTech.ws.close();
                        } catch {}

                        await delay(3000);

                        starting = false;

                        if (!finished) {
                            await startQrSession();
                        }
                    }
                }
            );
        } catch (error) {
            starting = false;
            throw error;
        }

        starting = false;
    }

    try {
        await fs.promises.mkdir(
            sessionDir,
            { recursive: true }
        );

        await fs.promises.mkdir(
            currentSessionDir,
            { recursive: true }
        );

        await startQrSession();
    } catch (error) {
        console.error(
            "Final QR error:",
            error
        );

        await cleanUpSession();

        if (
            !responseSent &&
            !res.headersSent
        ) {
            res.status(500).json({
                code:
                    "QR Service is Currently Unavailable"
            });

            responseSent = true;
        }
    }
});

module.exports = router;
