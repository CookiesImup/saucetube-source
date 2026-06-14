import makeWASocket, { useMultiFileAuthState } from '@whiskeysockets/baileys';
import QRCode from 'qrcode-terminal';
import pino from 'pino';
import { readFileSync, writeFileSync } from 'fs';

const TARGET_GROUP_ID = '120363409326490555@g.us';

let messageCounts = new Map();

// Load data counter
try {
    const data = JSON.parse(readFileSync('counter.json', 'utf8'));
    messageCounts = new Map(Object.entries(data));
    console.log('📂 Load counter:', messageCounts.size, 'users');
} catch (e) {}

function saveData() {
    const obj = Object.fromEntries(messageCounts);
    writeFileSync('counter.json', JSON.stringify(obj, null, 2));
}

async function startBot() {
    console.log('\n🚀 Starting bot...\n');
    const { state, saveCreds } = await useMultiFileAuthState('auth_info');
    
    const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        logger: pino({ level: 'error' })
    });

    sock.ev.on('connection.update', (update) => {
        const { qr, connection } = update;
        
        if (qr) {
            console.log('📱 SCAN QR CODE:\n');
            QRCode.generate(qr, { small: true });
        }
        
        if (connection === 'open') {
            console.log('\n✅ BOT SIAP!');
            console.log(`🎯 Target grup: ${TARGET_GROUP_ID}\n`);
        }
    });

    sock.ev.on('creds.update', saveCreds);

    // Event untuk welcome & goodbye (DIPERBAIKI)
    sock.ev.on('group-participants.update', async (update) => {
        const { id, participants, action } = update;
        
        console.log(`\n👥 Debug event:`, { id, action, participants });
        
        // Cuma proses di grup target
        if (id !== TARGET_GROUP_ID) return;
        
        // Pastikan participants adalah array
        let participantList = [];
        if (Array.isArray(participants)) {
            participantList = participants;
        } else if (typeof participants === 'string') {
            participantList = [participants];
        } else {
            console.log('⚠️ Participants format tidak dikenal:', typeof participants);
            return;
        }
        
        for (const participant of participantList) {
            // Pastikan participant adalah string
            const participantJid = typeof participant === 'string' ? participant : participant.id || participant;
            
            if (!participantJid || typeof participantJid !== 'string') {
                console.log('⚠️ Skip participant invalid:', participant);
                continue;
            }
            
            const participantName = participantJid.split('@')[0];
            
            if (action === 'add') {
                const welcomeMsg = `welkom member baru @${participantName}, intro dulu, intro bisa minta yg lain\n> Sy hanya bot`;
                await sock.sendMessage(id, {
                    text: welcomeMsg,
                    mentions: [participantJid]
                });
                console.log(`✅ Welcome sent to ${participantJid}`);
            } 
            else if (action === 'remove') {
                const goodbyeMsg = `by @${participantName}, titip ayam hoyeng yaa\n> Sy bot`;
                await sock.sendMessage(id, {
                    text: goodbyeMsg,
                    mentions: [participantJid]
                });
                console.log(`✅ Goodbye sent to ${participantJid}`);
            }
        }
    });

    sock.ev.on('messages.upsert', async (m) => {
        const msg = m.messages[0];
        if (!msg.message) return;
        
        const chatId = msg.key.remoteJid;
        
        if (chatId !== TARGET_GROUP_ID) return;
        
        console.log(`\n📨 [${new Date().toLocaleTimeString()}] Pesan masuk di grup target`);
        
        const sender = msg.key.participant || chatId;
        
        if (sender === sock.user.id) return;
        
        // Deteksi tipe pesan
        const msgTypes = ['conversation', 'imageMessage', 'videoMessage', 'audioMessage', 
                          'stickerMessage', 'documentMessage', 'extendedTextMessage'];
        
        let isValid = false;
        let msgType = 'unknown';
        
        for (const type of msgTypes) {
            if (msg.message[type]) {
                isValid = true;
                msgType = type;
                break;
            }
        }
        
        if (msg.message?.audioMessage?.ptv === true) {
            isValid = true;
            msgType = 'voiceNote';
        }
        
        if (!isValid) return;
        
        console.log(`👤 Pengirim: ${sender.split('@')[0]}`);
        console.log(`📝 Tipe: ${msgType}`);
        
        // Update counter untuk pengirim
        const current = messageCounts.get(sender) || 0;
        const newCount = current + 1;
        messageCounts.set(sender, newCount);
        saveData();
        console.log(`📊 Total pesan pengirim: ${newCount}`);
        
        // Ambil teks pesan
        let text = '';
        if (msg.message.conversation) text = msg.message.conversation;
        if (msg.message.extendedTextMessage?.text) text = msg.message.extendedTextMessage.text;
        
        // Handle command !itung
        if (text && text.trim().toLowerCase().startsWith('!itung')) {
            console.log('🎯 Command !itung detected!');
            
            let targetUser = sender;
            let targetName = 'Lu';
            
            // Parse command
            const parts = text.trim().toLowerCase().split(/\s+/);
            let mentionOrNumber = null;
            
            if (parts.length > 1) {
                mentionOrNumber = parts[1];
            }
            
            // Cek dari mention
            const mentionedJids = msg.message.extendedTextMessage?.contextInfo?.mentionedJid;
            
            if (mentionedJids && mentionedJids.length > 0) {
                targetUser = mentionedJids[0];
                console.log(`📌 Target dari mention: ${targetUser}`);
            } 
            else if (mentionOrNumber && mentionOrNumber.startsWith('@')) {
                const rawNumber = mentionOrNumber.slice(1);
                if (rawNumber.match(/^[0-9]+$/)) {
                    targetUser = rawNumber + '@s.whatsapp.net';
                    console.log(`📌 Target dari @nomor: ${targetUser}`);
                }
            }
            else if (mentionOrNumber && mentionOrNumber.match(/^[0-9]{10,15}$/)) {
                targetUser = mentionOrNumber + '@s.whatsapp.net';
                console.log(`📌 Target dari nomor: ${targetUser}`);
            }
            
            // Dapatkan nama target
            try {
                const contact = await sock.getContact(targetUser);
                targetName = contact.name || contact.notify || targetUser.split('@')[0];
            } catch (e) {
                targetName = targetUser.split('@')[0];
            }
            
            const count = messageCounts.get(targetUser) || 0;
            
            let replyText;
            if (targetUser === sender) {
                replyText = `lu udah ketik ${count} pesan di grup ini wok`;
            } else {
                replyText = `@${targetUser.split('@')[0]} udah ketik ${count} pesan di grup ini wok`;
            }
            
            await sock.sendMessage(chatId, {
                text: replyText,
                reply: msg.key,
                mentions: [targetUser]
            });
            console.log(`✅ Balasan: "${replyText}"`);
        }
    });
}

console.log('='.repeat(50));
console.log('🤖 BOT COUNTER GRUP');
console.log(`🎯 ID Grup: ${TARGET_GROUP_ID}`);
console.log('📌 Command: !itung');
console.log('📌 Fitur: Welcome & Goodbye');
console.log('='.repeat(50));

startBot();
