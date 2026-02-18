/**
 * Turkish dictionary — all UI strings.
 * EN can be added as en.ts with same keys.
 */

export const tr = {
    // ── Navigation ──
    nav: {
        panel: 'Panel',
        history: 'Geçmiş',
        appointments: 'Randevular',
        admin: 'Yönetim',
        logout: 'Çıkış Yap',
    },

    // ── Admin Sidebar ──
    adminNav: {
        title: 'Yönetim Paneli',
        services: 'Hizmetler',
        vehicles: 'Araç Sınıfları',
        packages: 'Paketler',
        pricing: 'Fiyatlandırma',
        staff: 'Personel',
        locations: 'Lokasyonlar',
        settings: 'Ayarlar',
        audit: 'İşlem Geçmişi',
    },

    // ── Services ──
    services: {
        title: 'Hizmetler',
        addNew: 'Yeni Hizmet',
        edit: 'Hizmeti Düzenle',
        name: 'Hizmet Adı',
        description: 'Açıklama',
        duration: 'Süre (dk)',
        active: 'Aktif',
        inactive: 'Pasif',
        confirmDisable: 'Bu hizmeti pasife almak istediğinize emin misiniz?',
        confirmDelete: 'Bu hizmeti silmek istediğinize emin misiniz?',
        saved: 'Hizmet kaydedildi',
        deleted: 'Hizmet silindi',
    },

    // ── Vehicle Classes ──
    vehicles: {
        title: 'Araç Sınıfları',
        addNew: 'Yeni Sınıf',
        edit: 'Sınıfı Düzenle',
        key: 'Kod',
        label: 'Görünen Ad',
        active: 'Aktif',
        inactive: 'Pasif',
        confirmDisable: 'Bu sınıfı pasife almak istediğinize emin misiniz?',
        saved: 'Araç sınıfı kaydedildi',
    },

    // ── Packages ──
    packages: {
        title: 'Paketler',
        addNew: 'Yeni Paket',
        edit: 'Paketi Düzenle',
        name: 'Paket Adı',
        description: 'Açıklama',
        items: 'İçerik',
        baseService: 'Ana Hizmet',
        addOnService: 'Ek Hizmet',
        saved: 'Paket kaydedildi',
    },

    // ── Pricing ──
    pricing: {
        title: 'Fiyatlandırma',
        priceLists: 'Fiyat Listeleri',
        addList: 'Yeni Liste',
        editList: 'Listeyi Düzenle',
        rules: 'Fiyat Kuralları',
        addRule: 'Yeni Kural',
        amount: 'Tutar',
        currency: 'Para Birimi',
        validFrom: 'Geçerlilik Başlangıcı',
        validTo: 'Geçerlilik Bitişi',
        noRule: 'Bu kombinasyon için fiyat kuralı bulunamadı',
        missingRuleWarning: '⚠ Fiyat kuralı eksik — manuel tutar girilmeli',
        saved: 'Fiyat kuralı kaydedildi',
    },

    // ── Staff ──
    staff: {
        title: 'Personel',
        addNew: 'Yeni Personel',
        edit: 'Personeli Düzenle',
        name: 'Ad Soyad',
        email: 'E-posta',
        phone: 'Telefon',
        role: 'Rol',
        roles: {
            super_admin: 'Süper Admin',
            partner: 'İş Ortağı',
            branch_admin: 'Şube Admini',
            manager: 'Yönetici',
            staff: 'Personel',
        },
        active: 'Aktif',
        inactive: 'Pasif',
        confirmDisable: 'Bu personeli pasife almak istediğinize emin misiniz?',
        saved: 'Personel kaydedildi',
    },

    // ── Locations ──
    locations: {
        title: 'Lokasyonlar',
        addNew: 'Yeni Lokasyon',
        edit: 'Lokasyonu Düzenle',
        name: 'Lokasyon Adı',
        address: 'Adres',
        phone: 'Telefon',
        workingHours: 'Çalışma Saatleri',
        valetWindows: 'Vale Saatleri',
        blackoutDates: 'Tatil Günleri',
        saved: 'Lokasyon kaydedildi',
    },

    // ── Settings ──
    settings: {
        title: 'Ayarlar',
        currency: 'Para Birimi',
        locale: 'Dil/Bölge',
        timezone: 'Saat Dilimi',
        saved: 'Ayarlar kaydedildi',
    },

    // ── Audit ──
    audit: {
        title: 'İşlem Geçmişi',
        user: 'Kullanıcı',
        action: 'İşlem',
        table: 'Tablo',
        time: 'Zaman',
        details: 'Detaylar',
    },

    // ── Common ──
    common: {
        save: 'Kaydet',
        cancel: 'İptal',
        delete: 'Sil',
        edit: 'Düzenle',
        create: 'Oluştur',
        search: 'Ara...',
        filter: 'Filtre',
        all: 'Tümü',
        active: 'Aktif',
        inactive: 'Pasif',
        confirm: 'Onayla',
        yes: 'Evet',
        no: 'Hayır',
        loading: 'Yükleniyor...',
        error: 'Bir hata oluştu',
        noData: 'Kayıt bulunamadı',
        sortOrder: 'Sıralama',
        actions: 'İşlemler',
        required: 'Bu alan zorunludur',
        saving: 'Kaydediliyor...',
    },

    // ── Days ──
    days: ['Pazar', 'Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi'],

    // ── Statuses (keys stored in DB) ──
    statuses: {
        queue: 'Sırada',
        washing: 'Yıkanıyor',
        drying: 'Kurulanıyor',
        completed: 'Tamamlandı',
        archived: 'Arşivlendi',
        pending: 'Bekliyor',
        paid: 'Ödendi',
    },
} as const

export type Dictionary = typeof tr
