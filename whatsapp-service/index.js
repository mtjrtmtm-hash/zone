/**
 * WhatsApp Service using Baileys
 * خدمة WhatsApp باستخدام مكتبة Baileys الأكثر استقراراً
 */

const { default: makeWASocket, DisconnectReason, useMultiFileAuthState } = require('@whiskeysockets/baileys');
const pino = require('pino');
const QRCode = require('qrcode');
const express = require('express');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// مسار حفظ الجلسة
const AUTH_FOLDER = '/app/whatsapp-service/auth_info';

// حالة الخدمة
let serviceStatus = {
    isReady: false,
    isAuthenticated: false,
    qrCode: null,
    qrCodeBase64: null,
    connectedNumber: null,
    lastError: null
};

// OTP Storage
const otpStorage = new Map();

// متغير للـ socket
let sock = null;

// دالة توليد OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// دالة بدء الاتصال
async function connectWhatsApp() {
    try {
        // استخدام الجلسة المحفوظة إن وجدت
        const { state, saveCreds } = await useMultiFileAuthState(AUTH_FOLDER);
        
        sock = makeWASocket({
            auth: state,
            printQRInTerminal: true,
            logger: pino({ level: 'silent' }),
            browser: ['Badel Platform', 'Chrome', '120.0.0']
        });

        // حفظ بيانات المصادقة
        sock.ev.on('creds.update', saveCreds);

        // معالجة تحديثات الاتصال
        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;
            
            if (qr) {
                console.log('📱 QR Code generated');
                serviceStatus.qrCode = qr;
                serviceStatus.isAuthenticated = false;
                serviceStatus.isReady = false;
                
                // تحويل QR إلى صورة base64
                try {
                    const qrBase64 = await QRCode.toDataURL(qr, {
                        width: 300,
                        margin: 2
                    });
                    serviceStatus.qrCodeBase64 = qrBase64;
                    console.log('✅ QR Code image ready');
                } catch (err) {
                    console.error('Error generating QR image:', err);
                }
            }
            
            if (connection === 'close') {
                const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
                console.log('❌ Connection closed, reconnecting:', shouldReconnect);
                
                serviceStatus.isReady = false;
                serviceStatus.isAuthenticated = false;
                serviceStatus.lastError = lastDisconnect?.error?.message || 'Connection closed';
                
                if (shouldReconnect) {
                    setTimeout(connectWhatsApp, 3000);
                } else {
                    // حذف بيانات الجلسة إذا تم تسجيل الخروج
                    if (fs.existsSync(AUTH_FOLDER)) {
                        fs.rmSync(AUTH_FOLDER, { recursive: true });
                    }
                    serviceStatus.qrCode = null;
                    serviceStatus.connectedNumber = null;
                }
            }
            
            if (connection === 'open') {
                console.log('✅ WhatsApp connected!');
                serviceStatus.isReady = true;
                serviceStatus.isAuthenticated = true;
                serviceStatus.qrCode = null;
                serviceStatus.qrCodeBase64 = null;
                serviceStatus.lastError = null;
                
                // الحصول على رقم الهاتف
                if (sock.user) {
                    serviceStatus.connectedNumber = sock.user.id.split(':')[0];
                    console.log(`📞 Connected number: ${serviceStatus.connectedNumber}`);
                }
            }
        });

        // معالجة الرسائل الواردة (اختياري)
        sock.ev.on('messages.upsert', async ({ messages }) => {
            // يمكن إضافة معالجة للرسائل الواردة هنا
        });

    } catch (err) {
        console.error('❌ Failed to connect:', err);
        serviceStatus.lastError = err.message;
        setTimeout(connectWhatsApp, 5000);
    }
}

// ==================== API ENDPOINTS ====================

// حالة الخدمة
app.get('/status', (req, res) => {
    res.json({
        connected: serviceStatus.isReady && serviceStatus.isAuthenticated,
        authenticated: serviceStatus.isAuthenticated,
        hasQR: serviceStatus.qrCodeBase64 !== null,
        connectedNumber: serviceStatus.connectedNumber,
        lastError: serviceStatus.lastError
    });
});

// الحصول على QR Code
app.get('/qr', (req, res) => {
    if (serviceStatus.isReady && serviceStatus.isAuthenticated) {
        return res.json({
            status: 'authenticated',
            message: 'WhatsApp متصل بالفعل',
            connectedNumber: serviceStatus.connectedNumber
        });
    }
    
    if (serviceStatus.qrCodeBase64) {
        return res.json({
            status: 'pending',
            qr_code: serviceStatus.qrCodeBase64,
            message: 'امسح الكود من WhatsApp على جوالك'
        });
    }
    
    return res.json({
        status: 'loading',
        message: 'جاري توليد QR Code...'
    });
});

// توليد QR جديد
app.post('/generate-qr', async (req, res) => {
    if (serviceStatus.isReady && serviceStatus.isAuthenticated) {
        return res.json({
            status: 'already_connected',
            message: 'WhatsApp متصل بالفعل',
            connectedNumber: serviceStatus.connectedNumber
        });
    }
    
    // إعادة الاتصال للحصول على QR جديد
    if (!serviceStatus.qrCode) {
        // حذف الجلسة القديمة
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true });
        }
        connectWhatsApp();
    }
    
    // انتظر حتى يتم توليد QR
    let attempts = 0;
    while (!serviceStatus.qrCode && attempts < 30) {
        await new Promise(r => setTimeout(r, 1000));
        attempts++;
        
        if (serviceStatus.isAuthenticated) {
            return res.json({
                status: 'already_connected',
                message: 'WhatsApp متصل بالفعل',
                connectedNumber: serviceStatus.connectedNumber
            });
        }
    }
    
    if (serviceStatus.qrCode) {
        return res.json({
            status: 'success',
            qr_code: serviceStatus.qrCode,
            message: 'امسح الكود من WhatsApp على جوالك'
        });
    }
    
    return res.status(500).json({
        status: 'error',
        message: 'فشل توليد QR Code'
    });
});

// قطع الاتصال
app.post('/disconnect', async (req, res) => {
    try {
        if (sock) {
            await sock.logout();
        }
        
        // حذف بيانات الجلسة
        if (fs.existsSync(AUTH_FOLDER)) {
            fs.rmSync(AUTH_FOLDER, { recursive: true });
        }
        
        serviceStatus.isReady = false;
        serviceStatus.isAuthenticated = false;
        serviceStatus.connectedNumber = null;
        serviceStatus.qrCode = null;
        
        res.json({
            status: 'disconnected',
            message: 'تم قطع الاتصال بنجاح'
        });
        
        // إعادة الاتصال للحصول على QR جديد
        setTimeout(connectWhatsApp, 2000);
        
    } catch (err) {
        console.error('Error disconnecting:', err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// إرسال OTP
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'رقم الهاتف مطلوب'
            });
        }
        
        if (!serviceStatus.isReady || !sock) {
            return res.status(503).json({
                status: 'error',
                message: 'خدمة WhatsApp غير متصلة'
            });
        }
        
        // تنظيف الرقم
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
        else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        
        console.log(`📱 Sending OTP to: ${cleanPhone}`);
        
        // التحقق من تسجيل الرقم
        const [result] = await sock.onWhatsApp(cleanPhone);
        if (!result?.exists) {
            return res.status(400).json({
                status: 'error',
                message: 'هذا الرقم غير مسجل في WhatsApp'
            });
        }
        
        // توليد OTP
        const otp = generateOTP();
        otpStorage.set(cleanPhone, {
            code: otp,
            expiresAt: Date.now() + (10 * 60 * 1000),
            attempts: 0
        });
        
        // رسالة التحقق
        const message = `مرحباً بك في منصة بدل! 🎉

رمز التحقق الخاص بك:
*${otp}*

صالح لمدة 10 دقائق.
لا تشارك هذا الرمز مع أي شخص.

شكراً لاستخدام بدل 🇸🇾`;
        
        // إرسال الرسالة
        const jid = result.jid;
        await sock.sendMessage(jid, { text: message });
        
        console.log(`✅ OTP sent to ${cleanPhone}: ${otp}`);
        
        res.json({
            status: 'sent',
            message: 'تم إرسال كود التحقق بنجاح'
        });
        
    } catch (err) {
        console.error('❌ Error sending OTP:', err);
        res.status(500).json({
            status: 'error',
            message: 'فشل إرسال الرسالة: ' + err.message
        });
    }
});

// التحقق من OTP
app.post('/verify-otp', (req, res) => {
    try {
        const { phone, code } = req.body;
        
        if (!phone || !code) {
            return res.status(400).json({
                status: 'error',
                message: 'رقم الهاتف والكود مطلوبان'
            });
        }
        
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
        else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        
        const otpData = otpStorage.get(cleanPhone);
        
        if (!otpData) {
            return res.status(400).json({
                status: 'error',
                message: 'لم يتم إرسال كود لهذا الرقم'
            });
        }
        
        if (Date.now() > otpData.expiresAt) {
            otpStorage.delete(cleanPhone);
            return res.status(400).json({
                status: 'error',
                message: 'انتهت صلاحية الكود'
            });
        }
        
        if (otpData.attempts >= 3) {
            otpStorage.delete(cleanPhone);
            return res.status(400).json({
                status: 'error',
                message: 'تجاوزت الحد الأقصى للمحاولات'
            });
        }
        
        if (otpData.code === code) {
            otpStorage.delete(cleanPhone);
            return res.json({
                status: 'verified',
                message: 'تم التحقق بنجاح'
            });
        }
        
        otpData.attempts++;
        return res.status(400).json({
            status: 'error',
            message: 'كود غير صحيح',
            remainingAttempts: 3 - otpData.attempts
        });
        
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// اختبار إرسال رسالة
app.post('/test-send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'رقم الهاتف مطلوب'
            });
        }
        
        if (!serviceStatus.isReady || !sock) {
            return res.status(503).json({
                status: 'error',
                message: 'خدمة WhatsApp غير متصلة',
                details: serviceStatus
            });
        }
        
        // تنظيف الرقم
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('00')) cleanPhone = cleanPhone.substring(2);
        else if (cleanPhone.startsWith('0')) cleanPhone = cleanPhone.substring(1);
        
        console.log(`📤 Test sending to ${cleanPhone}...`);
        
        // التحقق من تسجيل الرقم
        const [result] = await sock.onWhatsApp(cleanPhone);
        if (!result?.exists) {
            return res.status(400).json({
                status: 'error',
                message: 'هذا الرقم غير مسجل في WhatsApp',
                phone: cleanPhone
            });
        }
        
        const testMessage = message || `🔔 رسالة اختبار من منصة بدل\n\nالوقت: ${new Date().toLocaleString('ar-SY')}`;
        
        // إرسال الرسالة
        await sock.sendMessage(result.jid, { text: testMessage });
        
        console.log(`✅ Test message sent to ${cleanPhone}`);
        
        res.json({
            status: 'sent',
            message: 'تم إرسال رسالة الاختبار بنجاح! تحقق من WhatsApp',
            to: cleanPhone
        });
        
    } catch (err) {
        console.error('❌ Test send error:', err);
        res.status(500).json({
            status: 'error',
            message: 'فشل إرسال الرسالة: ' + err.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// بدء الخادم
const PORT = process.env.WHATSAPP_SERVICE_PORT || 8002;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WhatsApp Service (Baileys) running on port ${PORT}`);
    console.log('🔄 Initializing WhatsApp connection...');
    connectWhatsApp();
});
