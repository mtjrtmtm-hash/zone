/**
 * WhatsApp Web Service
 * خدمة WhatsApp Web الحقيقية باستخدام whatsapp-web.js
 */

const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode');
const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

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

// إنشاء عميل WhatsApp
const client = new Client({
    authStrategy: new LocalAuth({
        dataPath: '/app/whatsapp-service/.wwebjs_auth'
    }),
    puppeteer: {
        headless: true,
        executablePath: '/opt/chrome-linux/chrome',
        args: [
            '--no-sandbox',
            '--disable-setuid-sandbox',
            '--disable-dev-shm-usage',
            '--disable-accelerated-2d-canvas',
            '--no-first-run',
            '--no-zygote',
            '--disable-gpu',
            '--single-process'
        ]
    }
});

// عند توليد QR Code
client.on('qr', async (qr) => {
    console.log('📱 QR Code generated - scan with WhatsApp');
    serviceStatus.qrCode = qr;
    serviceStatus.isAuthenticated = false;
    
    try {
        // تحويل QR إلى صورة base64
        const qrBase64 = await qrcode.toDataURL(qr, {
            width: 300,
            margin: 2,
            color: {
                dark: '#000000',
                light: '#ffffff'
            }
        });
        serviceStatus.qrCodeBase64 = qrBase64;
        console.log('✅ QR Code ready for display');
    } catch (err) {
        console.error('❌ Error generating QR image:', err);
        serviceStatus.lastError = err.message;
    }
});

// عند نجاح المصادقة
client.on('authenticated', async () => {
    console.log('✅ WhatsApp authenticated successfully');
    serviceStatus.isAuthenticated = true;
    serviceStatus.qrCode = null;
    serviceStatus.qrCodeBase64 = null;
    
    // انتظر قليلاً ثم حاول الحصول على المعلومات
    setTimeout(async () => {
        try {
            if (client.info && client.info.wid) {
                serviceStatus.isReady = true;
                serviceStatus.connectedNumber = client.info.wid.user;
                console.log(`📞 Connected number (from auth): ${client.info.wid.user}`);
            }
        } catch (err) {
            console.log('⚠️ Could not get client info after auth:', err.message);
        }
    }, 3000);
});

// عند جاهزية العميل
client.on('ready', async () => {
    console.log('✅ WhatsApp client is ready!');
    serviceStatus.isReady = true;
    serviceStatus.isAuthenticated = true;
    
    try {
        const info = client.info;
        if (info && info.wid) {
            serviceStatus.connectedNumber = info.wid.user;
            console.log(`📞 Connected number: ${info.wid.user}`);
        }
    } catch (err) {
        console.error('Error getting client info:', err);
    }
});

// عند فشل المصادقة
client.on('auth_failure', (msg) => {
    console.error('❌ Authentication failed:', msg);
    serviceStatus.isAuthenticated = false;
    serviceStatus.lastError = msg;
});

// عند قطع الاتصال
client.on('disconnected', (reason) => {
    console.log('❌ WhatsApp disconnected:', reason);
    serviceStatus.isReady = false;
    serviceStatus.isAuthenticated = false;
    serviceStatus.connectedNumber = null;
    
    // إعادة التهيئة
    setTimeout(() => {
        console.log('🔄 Reinitializing client...');
        client.initialize();
    }, 5000);
});

// ==================== API ENDPOINTS ====================

// الحصول على حالة الخدمة
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
    if (serviceStatus.isAuthenticated) {
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

// توليد QR جديد (إعادة تهيئة)
app.post('/generate-qr', async (req, res) => {
    try {
        if (serviceStatus.isAuthenticated) {
            return res.json({
                status: 'already_connected',
                message: 'WhatsApp متصل بالفعل',
                connectedNumber: serviceStatus.connectedNumber
            });
        }
        
        // إذا لم يكن هناك QR، أعد تهيئة العميل
        if (!serviceStatus.qrCodeBase64) {
            console.log('🔄 Reinitializing for new QR...');
            await client.initialize();
        }
        
        // انتظر حتى يتم توليد QR
        let attempts = 0;
        while (!serviceStatus.qrCodeBase64 && attempts < 30) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            attempts++;
        }
        
        if (serviceStatus.qrCodeBase64) {
            return res.json({
                status: 'success',
                qr_code: serviceStatus.qrCodeBase64,
                message: 'امسح الكود من WhatsApp على جوالك'
            });
        }
        
        return res.status(500).json({
            status: 'error',
            message: 'فشل توليد QR Code'
        });
        
    } catch (err) {
        console.error('Error generating QR:', err);
        return res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// قطع الاتصال
app.post('/disconnect', async (req, res) => {
    try {
        if (serviceStatus.isReady) {
            await client.logout();
        }
        
        serviceStatus.isReady = false;
        serviceStatus.isAuthenticated = false;
        serviceStatus.connectedNumber = null;
        serviceStatus.qrCode = null;
        serviceStatus.qrCodeBase64 = null;
        
        res.json({
            status: 'disconnected',
            message: 'تم قطع الاتصال بنجاح'
        });
    } catch (err) {
        console.error('Error disconnecting:', err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// توليد OTP
function generateOTP() {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// إرسال رسالة OTP
app.post('/send-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'رقم الهاتف مطلوب'
            });
        }
        
        if (!serviceStatus.isReady || !serviceStatus.isAuthenticated) {
            return res.status(503).json({
                status: 'error',
                message: 'خدمة WhatsApp غير متصلة'
            });
        }
        
        // تنظيف رقم الهاتف - إزالة كل شيء عدا الأرقام
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        
        // إذا بدأ بـ 00 نزيلها
        if (cleanPhone.startsWith('00')) {
            cleanPhone = cleanPhone.substring(2);
        }
        // إذا بدأ بـ 0 فقط نزيلها
        else if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        
        console.log(`📱 Attempting to send OTP to: ${cleanPhone}`);
        
        const chatId = `${cleanPhone}@c.us`;
        
        // التحقق من أن الرقم مسجل في WhatsApp
        try {
            const isRegistered = await client.isRegisteredUser(chatId);
            if (!isRegistered) {
                console.log(`❌ Number ${cleanPhone} is not registered on WhatsApp`);
                return res.status(400).json({
                    status: 'error',
                    message: 'هذا الرقم غير مسجل في WhatsApp'
                });
            }
        } catch (checkErr) {
            console.log(`⚠️ Could not verify if number is registered: ${checkErr.message}`);
        }
        
        // توليد OTP
        const otp = generateOTP();
        const expiresAt = Date.now() + (10 * 60 * 1000); // 10 دقائق
        
        // حفظ OTP
        otpStorage.set(cleanPhone, {
            code: otp,
            expiresAt: expiresAt,
            attempts: 0
        });
        
        // رسالة التحقق
        const message = `مرحباً بك في منصة بدل! 🎉

رمز التحقق الخاص بك:
*${otp}*

صالح لمدة 10 دقائق.
لا تشارك هذا الرمز مع أي شخص.

شكراً لاستخدام بدل 🇸🇾`;
        
        // إرسال الرسالة باستخدام getNumberId بدلاً من sendMessage مباشرة
        console.log(`📤 Sending message to ${chatId}...`);
        
        try {
            // الحصول على chat object
            const numberId = await client.getNumberId(cleanPhone);
            if (numberId) {
                const sentMsg = await client.sendMessage(numberId._serialized, message);
                console.log(`✅ OTP sent successfully to ${cleanPhone}: ${otp}`);
                return res.json({
                    status: 'sent',
                    message: 'تم إرسال كود التحقق بنجاح'
                });
            }
        } catch (innerErr) {
            console.log(`⚠️ First method failed, trying alternative: ${innerErr.message}`);
        }
        
        // طريقة بديلة - إرسال مباشر
        try {
            const sentMsg = await client.sendMessage(chatId, message);
            if (sentMsg) {
                console.log(`✅ OTP sent successfully (alt) to ${cleanPhone}: ${otp}`);
                return res.json({
                    status: 'sent',
                    message: 'تم إرسال كود التحقق بنجاح'
                });
            }
        } catch (altErr) {
            console.error(`❌ Alternative method also failed: ${altErr.message}`);
        }
        
        throw new Error('Failed to send message with both methods');
        
    } catch (err) {
        console.error('❌ Error sending OTP:', err.message);
        res.status(500).json({
            status: 'error',
            message: 'فشل إرسال الرسالة. تأكد من أن الرقم صحيح ومسجل في WhatsApp'
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
        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        
        const otpData = otpStorage.get(cleanPhone);
        
        if (!otpData) {
            return res.status(400).json({
                status: 'error',
                message: 'لم يتم إرسال كود لهذا الرقم'
            });
        }
        
        // التحقق من انتهاء الصلاحية
        if (Date.now() > otpData.expiresAt) {
            otpStorage.delete(cleanPhone);
            return res.status(400).json({
                status: 'error',
                message: 'انتهت صلاحية الكود'
            });
        }
        
        // التحقق من عدد المحاولات
        if (otpData.attempts >= 3) {
            otpStorage.delete(cleanPhone);
            return res.status(400).json({
                status: 'error',
                message: 'تجاوزت الحد الأقصى للمحاولات'
            });
        }
        
        // التحقق من الكود
        if (otpData.code === code) {
            otpStorage.delete(cleanPhone);
            return res.json({
                status: 'verified',
                message: 'تم التحقق بنجاح'
            });
        }
        
        // زيادة عدد المحاولات
        otpData.attempts++;
        
        return res.status(400).json({
            status: 'error',
            message: 'كود غير صحيح',
            remainingAttempts: 3 - otpData.attempts
        });
        
    } catch (err) {
        console.error('Error verifying OTP:', err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// إعادة إرسال OTP
app.post('/resend-otp', async (req, res) => {
    try {
        const { phone } = req.body;
        
        // حذف OTP القديم إن وجد
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        otpStorage.delete(cleanPhone);
        
        // إعادة التوجيه لإرسال OTP جديد
        req.body.phone = phone;
        return app._router.handle(req, res, () => {});
        
    } catch (err) {
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// إرسال رسالة عامة
app.post('/send-message', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'رقم الهاتف والرسالة مطلوبان'
            });
        }
        
        if (!serviceStatus.isReady || !serviceStatus.isAuthenticated) {
            return res.status(503).json({
                status: 'error',
                message: 'خدمة WhatsApp غير متصلة'
            });
        }
        
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        const chatId = `${cleanPhone}@c.us`;
        
        await client.sendMessage(chatId, message);
        
        res.json({
            status: 'sent',
            message: 'تم إرسال الرسالة بنجاح'
        });
        
    } catch (err) {
        console.error('Error sending message:', err);
        res.status(500).json({
            status: 'error',
            message: err.message
        });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// اختبار إرسال رسالة (للأدمن)
app.post('/test-send', async (req, res) => {
    try {
        const { phone, message } = req.body;
        
        if (!phone) {
            return res.status(400).json({
                status: 'error',
                message: 'رقم الهاتف مطلوب'
            });
        }
        
        if (!serviceStatus.isReady || !serviceStatus.isAuthenticated) {
            return res.status(503).json({
                status: 'error',
                message: 'خدمة WhatsApp غير متصلة',
                details: serviceStatus
            });
        }
        
        // تنظيف رقم الهاتف
        let cleanPhone = phone.replace(/[^0-9]/g, '');
        if (cleanPhone.startsWith('00')) {
            cleanPhone = cleanPhone.substring(2);
        } else if (cleanPhone.startsWith('0')) {
            cleanPhone = cleanPhone.substring(1);
        }
        
        const testMessage = message || `🔔 رسالة اختبار من منصة بدل\n\nالوقت: ${new Date().toLocaleString('ar-SY')}`;
        
        console.log(`📤 Test sending to ${cleanPhone}...`);
        
        // التحقق من تسجيل الرقم
        const numberId = await client.getNumberId(cleanPhone);
        
        if (!numberId) {
            return res.status(400).json({
                status: 'error',
                message: 'هذا الرقم غير مسجل في WhatsApp',
                phone: cleanPhone
            });
        }
        
        console.log(`📱 Number ID: ${numberId._serialized}`);
        
        // إرسال الرسالة
        const sentMsg = await client.sendMessage(numberId._serialized, testMessage);
        
        console.log(`✅ Test message sent to ${cleanPhone}`);
        
        res.json({
            status: 'sent',
            message: 'تم إرسال رسالة الاختبار بنجاح! تحقق من WhatsApp',
            to: cleanPhone,
            messageId: sentMsg?.id?._serialized || 'sent'
        });
        
    } catch (err) {
        console.error('❌ Test send error:', err.message);
        res.status(500).json({
            status: 'error',
            message: 'فشل إرسال الرسالة: ' + err.message
        });
    }
});

// بدء الخادم
const PORT = process.env.WHATSAPP_SERVICE_PORT || 8002;

app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 WhatsApp Service running on port ${PORT}`);
    
    // تهيئة عميل WhatsApp
    console.log('🔄 Initializing WhatsApp client...');
    client.initialize().catch(err => {
        console.error('❌ Failed to initialize WhatsApp client:', err);
        serviceStatus.lastError = err.message;
    });
});
