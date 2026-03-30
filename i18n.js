var I18n = (function () {
  'use strict';

  var languages = {
    en: { name: 'English' },
    de: { name: 'Deutsch' },
    fr: { name: 'Français' },
    it: { name: 'Italiano' },
    es: { name: 'Español' },
    pt: { name: 'Português' },
    ru: { name: 'Русский' },
    tr: { name: 'Türkçe' }
  };

  var VERSION = '1.2.2';

  var footer = 'Open Source &middot; No Tracking &middot; No KYC<br /><a href="https://github.com/schmidt1024/xmrpay" target="_blank" rel="noopener noreferrer">Source</a> &middot; <a href="http://mc6wfeaqc7oijgdcudrr5zsotmwok3jzk3tu2uezzyjisn7nzzjjizyd.onion" title="Tor Hidden Service">Onion</a> &middot; <a href="/privacy.html">Privacy &amp; Terms</a><br /><span class="version">v' + VERSION + '</span>';

  var translations = {
    en: {
      subtitle: 'Monero payment request in seconds',
      label_addr: 'XMR Address',
      placeholder_addr: '8...',
      label_amount: 'Amount',
      label_desc: 'Description (optional)',
      placeholder_desc: 'e.g. Invoice #42, freelance work...',
      label_timer: 'Payment deadline (optional)',
      days: 'days',
      placeholder_timer_custom: 'Days',
      btn_generate: 'Create payment request',
      btn_open_wallet: 'Open in wallet',
      btn_copy_uri: 'Copy payment URI',
      btn_copy_addr: 'Copy address',
      btn_download_pdf: 'PDF Invoice',
      pdf_title: 'Payment Request',
      pdf_address: 'XMR Address',
      pdf_amount: 'Amount',
      pdf_desc: 'Description',
      pdf_deadline: 'Payment deadline',
      pdf_deadline_days: '{d} days',
      pdf_date: 'Date',
      pdf_scan_qr: 'Scan QR code to pay',
      pdf_footer: 'Created with xmrpay',
      qr_hint: 'Click QR to save',
      self_host_banner: 'This is a public demo. For real payments, <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">host your own instance</a> — it takes 60 seconds.',
      footer: footer,
      aria_currency: 'Currency',
      label_share_link: 'Shareable link',
      shortlink_toggle_label: 'Use short link (requires server trust)',
      shortlink_toggle_hint: 'Trade-off: short links are convenient, but a compromised server could swap invoice data on first access.',
      btn_new_request: 'New payment request',
      toast_copied: 'Copied!',
      countdown_expired: 'Payment deadline expired',
      countdown_remaining_days: 'Deadline: {d} days, {h} hrs',
      countdown_remaining_hours: 'Deadline: {h}:{m} hrs',
      rates_offline: 'Rates unavailable — XMR amount only',
      btn_prove_payment: 'Prove payment',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 hex characters...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 hex characters...',
      btn_verify_proof: 'Verify payment',
      proof_verifying: 'Verifying...',
      proof_verified: 'Payment confirmed: {amount} XMR',
      proof_no_match: 'No matching output — TX key or address mismatch',
      proof_tx_not_found: 'Transaction not found',
      proof_error: 'Verification error',
      status_paid: 'Paid',
      status_pending: 'Pending',
      proof_confirmed_pending: 'Output found: {amount} XMR — {n}/10 confirmations. Auto-refreshing…',
      toast_integrity_warning: 'Warning: signature mismatch detected'
    },
    de: {
      subtitle: 'Monero-Zahlungsanforderung in Sekunden',
      label_addr: 'XMR-Adresse',
      placeholder_addr: '8...',
      label_amount: 'Betrag',
      label_desc: 'Beschreibung (optional)',
      placeholder_desc: 'z.B. Rechnung #42, Freelance-Arbeit...',
      label_timer: 'Zahlungsfrist (optional)',
      days: 'Tage',
      placeholder_timer_custom: 'Tage',
      btn_generate: 'Zahlungsanforderung erstellen',
      btn_open_wallet: 'In Wallet öffnen',
      btn_copy_uri: 'Zahlungs-URI kopieren',
      btn_copy_addr: 'Adresse kopieren',
      btn_download_pdf: 'PDF Rechnung',
      pdf_title: 'Zahlungsanforderung',
      pdf_address: 'XMR-Adresse',
      pdf_amount: 'Betrag',
      pdf_desc: 'Beschreibung',
      pdf_deadline: 'Zahlungsfrist',
      pdf_deadline_days: '{d} Tage',
      pdf_date: 'Datum',
      pdf_scan_qr: 'QR-Code scannen zum Bezahlen',
      pdf_footer: 'Erstellt mit xmrpay',
      self_host_banner: 'Dies ist eine öffentliche Demo. Für echte Zahlungen <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">eigene Instanz hosten</a> — dauert 60 Sekunden.',
      qr_hint: 'Klick auf QR zum Speichern',
      footer: footer,
      aria_currency: 'Währung',
      label_share_link: 'Teilbarer Link',
      shortlink_toggle_label: 'Kurzlink verwenden (Server-Vertrauen erforderlich)',
      shortlink_toggle_hint: 'Trade-off: Kurzlinks sind bequem, aber ein kompromittierter Server könnte Rechnungsdaten beim ersten Aufruf austauschen.',
      btn_new_request: 'Neue Zahlungsanforderung',
      toast_copied: 'Kopiert!',
      countdown_expired: 'Zahlungsfrist abgelaufen',
      countdown_remaining_days: 'Zahlungsfrist: {d} Tage, {h} Std.',
      countdown_remaining_hours: 'Zahlungsfrist: {h}:{m} Std.',
      rates_offline: 'Kurse nicht verfügbar — nur XMR-Betrag möglich',
      btn_prove_payment: 'Zahlung nachweisen',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 Hex-Zeichen...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 Hex-Zeichen...',
      btn_verify_proof: 'Zahlung verifizieren',
      proof_verifying: 'Verifiziere...',
      proof_verified: 'Zahlung bestätigt: {amount} XMR',
      proof_no_match: 'Kein passender Output — TX Key oder Adresse stimmt nicht',
      proof_tx_not_found: 'Transaktion nicht gefunden',
      proof_error: 'Fehler bei der Verifizierung',
      status_paid: 'Bezahlt',
      status_pending: 'Ausstehend',
      proof_confirmed_pending: 'Output gefunden: {amount} XMR — {n}/10 Bestätigungen. Wird aktualisiert…',
      toast_integrity_warning: 'Warnung: Signatur-Nichtübereinstimmung erkannt'
    },
    fr: {
      subtitle: 'Demande de paiement Monero en quelques secondes',
      label_addr: 'Adresse XMR',
      placeholder_addr: '8...',
      label_amount: 'Montant',
      label_desc: 'Description (facultatif)',
      placeholder_desc: 'ex. Facture #42, travail freelance...',
      label_timer: 'Date limite de paiement (facultatif)',
      days: 'jours',
      placeholder_timer_custom: 'Jours',
      btn_generate: 'Créer une demande de paiement',
      btn_open_wallet: 'Ouvrir dans le wallet',
      btn_copy_uri: 'Copier l\'URI de paiement',
      btn_copy_addr: 'Copier l\'adresse',
      btn_download_pdf: 'Facture PDF',
      pdf_title: 'Demande de paiement',
      pdf_address: 'Adresse XMR',
      pdf_amount: 'Montant',
      pdf_desc: 'Description',
      pdf_deadline: 'Date limite de paiement',
      pdf_deadline_days: '{d} jours',
      pdf_date: 'Date',
      pdf_scan_qr: 'Scanner le QR code pour payer',
      pdf_footer: 'Créé avec xmrpay',
      self_host_banner: 'Ceci est une démo publique. Pour de vrais paiements, <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">hébergez votre propre instance</a> — ça prend 60 secondes.',
      qr_hint: 'Cliquez sur le QR pour enregistrer',
      footer: footer,
      aria_currency: 'Devise',
      label_share_link: 'Lien partageable',
      shortlink_toggle_label: 'Utiliser un lien court (confiance serveur requise)',
      shortlink_toggle_hint: 'Compromis: les liens courts sont pratiques, mais un serveur compromis pourrait remplacer les donnees de facture au premier acces.',
      btn_new_request: 'Nouvelle demande de paiement',
      toast_copied: 'Copié !',
      countdown_expired: 'Délai de paiement expiré',
      countdown_remaining_days: 'Délai : {d} jours, {h} h',
      countdown_remaining_hours: 'Délai : {h}:{m} h',
      rates_offline: 'Taux indisponibles — montant en XMR uniquement',
      btn_prove_payment: 'Prouver le paiement',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 caractères hexadécimaux...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 caractères hexadécimaux...',
      btn_verify_proof: 'Vérifier le paiement',
      proof_verifying: 'Vérification...',
      proof_verified: 'Paiement confirmé : {amount} XMR',
      proof_no_match: 'Aucun output correspondant — TX Key ou adresse incorrecte',
      proof_tx_not_found: 'Transaction introuvable',
      proof_error: 'Erreur de vérification',
      status_paid: 'Payé',
      status_pending: 'En attente',
      proof_confirmed_pending: 'Sortie trouvée : {amount} XMR — {n}/10 confirmations. Actualisation automatique…',
      toast_integrity_warning: 'Avertissement : détection d\'une non-concordance de signature'
    },
    it: {
      subtitle: 'Richiesta di pagamento Monero in pochi secondi',
      label_addr: 'Indirizzo XMR',
      placeholder_addr: '8...',
      label_amount: 'Importo',
      label_desc: 'Descrizione (facoltativo)',
      placeholder_desc: 'es. Fattura #42, lavoro freelance...',
      label_timer: 'Scadenza pagamento (facoltativo)',
      days: 'giorni',
      placeholder_timer_custom: 'Giorni',
      btn_generate: 'Crea richiesta di pagamento',
      btn_open_wallet: 'Apri nel wallet',
      btn_copy_uri: 'Copia URI pagamento',
      btn_copy_addr: 'Copia indirizzo',
      btn_download_pdf: 'Fattura PDF',
      pdf_title: 'Richiesta di pagamento',
      pdf_address: 'Indirizzo XMR',
      pdf_amount: 'Importo',
      pdf_desc: 'Descrizione',
      pdf_deadline: 'Scadenza pagamento',
      pdf_deadline_days: '{d} giorni',
      pdf_date: 'Data',
      pdf_scan_qr: 'Scansiona il QR per pagare',
      pdf_footer: 'Creato con xmrpay',
      self_host_banner: 'Questa è una demo pubblica. Per pagamenti reali, <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">ospita la tua istanza</a> — ci vogliono 60 secondi.',
      qr_hint: 'Clicca sul QR per salvare',
      footer: footer,
      aria_currency: 'Valuta',
      label_share_link: 'Link condivisibile',
      shortlink_toggle_label: 'Usa link breve (richiede fiducia nel server)',
      shortlink_toggle_hint: 'Compromesso: i link brevi sono comodi, ma un server compromesso potrebbe sostituire i dati fattura al primo accesso.',
      btn_new_request: 'Nuova richiesta di pagamento',
      toast_copied: 'Copiato!',
      countdown_expired: 'Scadenza pagamento superata',
      countdown_remaining_days: 'Scadenza: {d} giorni, {h} ore',
      countdown_remaining_hours: 'Scadenza: {h}:{m} ore',
      rates_offline: 'Tassi non disponibili — solo importo in XMR',
      btn_prove_payment: 'Dimostra pagamento',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 caratteri esadecimali...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 caratteri esadecimali...',
      btn_verify_proof: 'Verifica pagamento',
      proof_verifying: 'Verifica in corso...',
      proof_verified: 'Pagamento confermato: {amount} XMR',
      proof_no_match: 'Nessun output corrispondente — TX Key o indirizzo errato',
      proof_tx_not_found: 'Transazione non trovata',
      proof_error: 'Errore di verifica',
      status_paid: 'Pagato',
      status_pending: 'In attesa',
      proof_confirmed_pending: 'Output trovato: {amount} XMR — {n}/10 conferme. Aggiornamento automatico…',
      toast_integrity_warning: 'Avviso: rilevata mancata corrispondenza della firma'
    },
    es: {
      subtitle: 'Solicitud de pago Monero en segundos',
      label_addr: 'Dirección XMR',
      placeholder_addr: '8...',
      label_amount: 'Monto',
      label_desc: 'Descripción (opcional)',
      placeholder_desc: 'ej. Factura #42, trabajo freelance...',
      label_timer: 'Plazo de pago (opcional)',
      days: 'días',
      placeholder_timer_custom: 'Días',
      btn_generate: 'Crear solicitud de pago',
      btn_open_wallet: 'Abrir en wallet',
      btn_copy_uri: 'Copiar URI de pago',
      btn_copy_addr: 'Copiar dirección',
      btn_download_pdf: 'Factura PDF',
      pdf_title: 'Solicitud de pago',
      pdf_address: 'Dirección XMR',
      pdf_amount: 'Monto',
      pdf_desc: 'Descripción',
      pdf_deadline: 'Plazo de pago',
      pdf_deadline_days: '{d} días',
      pdf_date: 'Fecha',
      pdf_scan_qr: 'Escanear QR para pagar',
      pdf_footer: 'Creado con xmrpay',
      self_host_banner: 'Esta es una demo pública. Para pagos reales, <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">aloja tu propia instancia</a> — toma 60 segundos.',
      qr_hint: 'Clic en QR para guardar',
      footer: footer,
      aria_currency: 'Moneda',
      label_share_link: 'Enlace compartible',
      shortlink_toggle_label: 'Usar enlace corto (requiere confiar en el servidor)',
      shortlink_toggle_hint: 'Compromiso: los enlaces cortos son comodos, pero un servidor comprometido podria cambiar los datos de la factura en el primer acceso.',
      btn_new_request: 'Nueva solicitud de pago',
      toast_copied: '¡Copiado!',
      countdown_expired: 'Plazo de pago vencido',
      countdown_remaining_days: 'Plazo: {d} días, {h} h',
      countdown_remaining_hours: 'Plazo: {h}:{m} h',
      rates_offline: 'Tasas no disponibles — solo monto en XMR',
      btn_prove_payment: 'Demostrar pago',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 caracteres hexadecimales...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 caracteres hexadecimales...',
      btn_verify_proof: 'Verificar pago',
      proof_verifying: 'Verificando...',
      proof_verified: 'Pago confirmado: {amount} XMR',
      proof_no_match: 'Ningún output coincidente — TX Key o dirección incorrecta',
      proof_tx_not_found: 'Transacción no encontrada',
      proof_error: 'Error de verificación',
      status_paid: 'Pagado',
      status_pending: 'Pendiente',
      proof_confirmed_pending: 'Output encontrado: {amount} XMR — {n}/10 confirmaciones. Actualización automática…',
      toast_integrity_warning: 'Advertencia: desajuste de firma detectado'
    },
    pt: {
      subtitle: 'Pedido de pagamento Monero em segundos',
      label_addr: 'Endereço XMR',
      placeholder_addr: '8...',
      label_amount: 'Valor',
      label_desc: 'Descrição (opcional)',
      placeholder_desc: 'ex. Fatura #42, trabalho freelance...',
      label_timer: 'Prazo de pagamento (opcional)',
      days: 'dias',
      placeholder_timer_custom: 'Dias',
      btn_generate: 'Criar pedido de pagamento',
      btn_open_wallet: 'Abrir na wallet',
      btn_copy_uri: 'Copiar URI de pagamento',
      btn_copy_addr: 'Copiar endereço',
      btn_download_pdf: 'Fatura PDF',
      pdf_title: 'Pedido de pagamento',
      pdf_address: 'Endereço XMR',
      pdf_amount: 'Valor',
      pdf_desc: 'Descrição',
      pdf_deadline: 'Prazo de pagamento',
      pdf_deadline_days: '{d} dias',
      pdf_date: 'Data',
      pdf_scan_qr: 'Digitalizar QR para pagar',
      pdf_footer: 'Criado com xmrpay',
      self_host_banner: 'Esta é uma demo pública. Para pagamentos reais, <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">hospede sua própria instância</a> — leva 60 segundos.',
      qr_hint: 'Clique no QR para guardar',
      footer: footer,
      aria_currency: 'Moeda',
      label_share_link: 'Link partilhável',
      shortlink_toggle_label: 'Usar link curto (requer confianca no servidor)',
      shortlink_toggle_hint: 'Compromisso: links curtos sao praticos, mas um servidor comprometido pode trocar os dados da fatura no primeiro acesso.',
      btn_new_request: 'Novo pedido de pagamento',
      toast_copied: 'Copiado!',
      countdown_expired: 'Prazo de pagamento expirado',
      countdown_remaining_days: 'Prazo: {d} dias, {h} h',
      countdown_remaining_hours: 'Prazo: {h}:{m} h',
      rates_offline: 'Taxas indisponíveis — apenas valor em XMR',
      btn_prove_payment: 'Comprovar pagamento',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 caracteres hexadecimais...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 caracteres hexadecimais...',
      btn_verify_proof: 'Verificar pagamento',
      proof_verifying: 'A verificar...',
      proof_verified: 'Pagamento confirmado: {amount} XMR',
      proof_no_match: 'Nenhum output correspondente — TX Key ou endereço incorreto',
      proof_tx_not_found: 'Transação não encontrada',
      proof_error: 'Erro de verificação',
      status_paid: 'Pago',
      status_pending: 'Pendente',
      proof_confirmed_pending: 'Output encontrado: {amount} XMR — {n}/10 confirmações. Atualização automática…',
      toast_integrity_warning: 'Aviso: incompatibilidade de assinatura detectada'
    },
    ru: {
      subtitle: 'Запрос на оплату Monero за секунды',
      label_addr: 'Адрес XMR',
      placeholder_addr: '8...',
      label_amount: 'Сумма',
      label_desc: 'Описание (необязательно)',
      placeholder_desc: 'напр. Счёт #42, фриланс...',
      label_timer: 'Срок оплаты (необязательно)',
      days: 'дней',
      placeholder_timer_custom: 'Дней',
      btn_generate: 'Создать запрос на оплату',
      btn_open_wallet: 'Открыть в кошельке',
      btn_copy_uri: 'Копировать платежный URI',
      btn_copy_addr: 'Копировать адрес',
      btn_download_pdf: 'PDF счёт',
      pdf_title: 'Запрос на оплату',
      pdf_address: 'Адрес XMR',
      pdf_amount: 'Сумма',
      pdf_desc: 'Описание',
      pdf_deadline: 'Срок оплаты',
      pdf_deadline_days: '{d} дней',
      pdf_date: 'Дата',
      pdf_scan_qr: 'Сканируйте QR для оплаты',
      pdf_footer: 'Создано с помощью xmrpay',
      self_host_banner: 'Это публичная демо-версия. Для реальных платежей <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">разверните свой экземпляр</a> — это займёт 60 секунд.',
      qr_hint: 'Нажмите на QR для сохранения',
      footer: footer,
      aria_currency: 'Валюта',
      label_share_link: 'Ссылка для отправки',
      shortlink_toggle_label: 'Использовать короткую ссылку (нужно доверять серверу)',
      shortlink_toggle_hint: 'Компромисс: короткие ссылки удобны, но скомпрометированный сервер может подменить данные счета при первом открытии.',
      btn_new_request: 'Новый запрос на оплату',
      toast_copied: 'Скопировано!',
      countdown_expired: 'Срок оплаты истёк',
      countdown_remaining_days: 'Срок: {d} дней, {h} ч',
      countdown_remaining_hours: 'Срок: {h}:{m} ч',
      rates_offline: 'Курсы недоступны — только сумма в XMR',
      btn_prove_payment: 'Подтвердить оплату',
      label_tx_hash: 'Transaction ID (TX Hash)',
      placeholder_tx_hash: '64 шестнадцатеричных символа...',
      label_tx_key: 'Transaction Key (TX Key)',
      placeholder_tx_key: '64 шестнадцатеричных символа...',
      btn_verify_proof: 'Проверить оплату',
      proof_verifying: 'Проверка...',
      proof_verified: 'Оплата подтверждена: {amount} XMR',
      proof_no_match: 'Соответствующий выход не найден — неверный TX Key или адрес',
      proof_tx_not_found: 'Транзакция не найдена',
      proof_error: 'Ошибка проверки',
      status_paid: 'Оплачено',
      status_pending: 'Ожидание',
      proof_confirmed_pending: 'Выход найден: {amount} XMR — {n}/10 подтверждений. Авт. обновление…',
      toast_integrity_warning: 'Предупреждение: обнаружено несоответствие подписи'
    },
    tr: {
      subtitle: 'Saniyeler içerisinde Monero ödeme talebi',
      label_addr: 'XMR Adresi',
      placeholder_addr: '8...',
      label_amount: 'Tutar',
      label_desc: 'Açıklama (isteğe bağlı)',
      placeholder_desc: 'örn. 42 numaralı Fatura, freelance iş için...',
      label_timer: 'Ödeme için son tarih (isteğe bağlı)',
      days: 'gün',
      placeholder_timer_custom: 'Gün',
      btn_generate: 'Ödeme talebi oluştur',
      btn_open_wallet: 'Cüzdanda aç',
      btn_copy_uri: 'URI kopyala',
      btn_copy_addr: 'Adresi kopyala',
      btn_download_pdf: 'Fatura (PDF)',
      pdf_title: 'Ödeme Talebi',
      pdf_address: 'XMR Adresi',
      pdf_amount: 'Tutar',
      pdf_desc: 'Açıklama',
      pdf_deadline: 'Ödeme için son tarih',
      pdf_deadline_days: '{d} gün',
      pdf_date: 'Tarih',
      pdf_scan_qr: 'Ödeme için QR kodu tara',
      pdf_footer: 'xmrpay ile oluşturulmuştur',
      qr_hint: 'QR kodu kaydetmek için tıkla',
      self_host_banner: 'Bu bir herkese açık demodur. Gerçek ödemeler için <a href="https://github.com/schmidt1024/xmrpay#self-host-in-60-seconds">kendi sunucunuzu kurun</a> — sadece 60 saniye sürer.',
      footer: footer,
      aria_currency: 'Para Birimi',
      label_share_link: 'Paylaşılabilir bağlantı',
      shortlink_toggle_label: 'Kısaltılmış bağlantı kullan (sunucuya güven gerektirir)',
      shortlink_toggle_hint: 'Olası dezavantaj: kısaltılmış bağlantılar kullanışlıdır, fakat ilgili sunucu güvende değil ise ilk erişimde fatura verileri değiştirilebilir.',
      btn_new_request: 'Yeni ödeme talebi',
      toast_copied: 'Kopyalandı!',
      countdown_expired: 'Ödeme için son tarih süresi doldu',
      countdown_remaining_days: 'Son Tarih: {d} gün, {h} saat',
      countdown_remaining_hours: 'Son Tarih: {h}:{m} saat',
      rates_offline: 'Kurlar mevcut değil — Yalnızca XMR tutarı',
      btn_prove_payment: 'Ödemeyi doğrula',
      label_tx_hash: 'İşlem kimliği (TX Hash)',
      placeholder_tx_hash: '64 hex karakteri...',
      label_tx_key: 'İşlem Anahtarı (TX Key)',
      placeholder_tx_key: '64 hex karakteri...',
      btn_verify_proof: 'Ödemeyi onayla',
      proof_verifying: 'Onaylanıyor...',
      proof_verified: 'Ödeme onaylandı: {amount} XMR',
      proof_no_match: 'Çıktılar eşleşmiyor — TX anahtarı ya da adresi eşleşmiyor',
      proof_tx_not_found: 'İşlem bulunamadı',
      proof_error: 'Onaylama hatası',
      status_paid: 'Ödeme yapıldı',
      status_pending: 'Beklemede',
      proof_confirmed_pending: 'Bulunan çıktı: {amount} XMR — {n}/10 tamamlanan. Otomatik yenileniyor…',
      toast_integrity_warning: 'Uyarı: eşleşmeyen imza tespit edildi'
    }
  };

  var currentLang = 'en';

  function detectLang() {
    var saved = null;
    try { saved = localStorage.getItem('xmrpay_lang'); } catch (e) {}
    if (saved && translations[saved]) return saved;

    var navLangs = navigator.languages || [navigator.language || 'en'];
    for (var i = 0; i < navLangs.length; i++) {
      var code = navLangs[i].substring(0, 2).toLowerCase();
      if (translations[code]) return code;
    }
    return 'en';
  }

  function applyDOM(t) {
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      el.textContent = t[el.getAttribute('data-i18n')] || '';
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(function (el) {
      el.placeholder = t[el.getAttribute('data-i18n-placeholder')] || '';
    });
    document.querySelectorAll('[data-i18n-html]').forEach(function (el) {
      el.innerHTML = t[el.getAttribute('data-i18n-html')] || '';
    });
    document.querySelectorAll('[data-i18n-aria]').forEach(function (el) {
      el.setAttribute('aria-label', t[el.getAttribute('data-i18n-aria')] || '');
    });
  }

  function apply(lang) {
    currentLang = lang;
    var t = translations[lang];
    document.documentElement.lang = lang;
    try { localStorage.setItem('xmrpay_lang', lang); } catch (e) {}

    applyDOM(t);

    // Update dropdown active state
    document.querySelectorAll('.lang-option').forEach(function (btn) {
      btn.classList.toggle('active', btn.getAttribute('data-lang') === lang);
    });

    // Notify listeners
    for (var i = 0; i < onChangeCallbacks.length; i++) {
      onChangeCallbacks[i](lang);
    }
  }

  var onChangeCallbacks = [];
  function onChange(fn) {
    onChangeCallbacks.push(fn);
  }

  function buildDropdown() {
    var dropdown = document.getElementById('langDropdown');
    if (!dropdown) return;

    dropdown.innerHTML = '';
    var keys = Object.keys(languages);
    for (var i = 0; i < keys.length; i++) {
      var code = keys[i];
      var btn = document.createElement('button');
      btn.className = 'lang-option';
      btn.setAttribute('data-lang', code);
      btn.textContent = languages[code].name;
      if (code === currentLang) btn.classList.add('active');
      btn.addEventListener('click', (function (c) {
        return function () {
          apply(c);
          closePicker();
        };
      })(code));
      dropdown.appendChild(btn);
    }
  }

  function closePicker() {
    var picker = document.getElementById('langPicker');
    if (picker) picker.classList.remove('open');
  }

  function initPicker() {
    var picker = document.getElementById('langPicker');
    var toggle = document.getElementById('langToggle');
    if (!picker || !toggle) return;

    toggle.addEventListener('click', function (e) {
      e.stopPropagation();
      picker.classList.toggle('open');
    });

    document.addEventListener('click', function (e) {
      if (!picker.contains(e.target)) closePicker();
    });
  }

  function t(key) {
    return (translations[currentLang] && translations[currentLang][key]) || key;
  }

  function getLang() {
    return currentLang;
  }

  // Init
  currentLang = detectLang();
  document.addEventListener('DOMContentLoaded', function () {
    buildDropdown();
    initPicker();
    apply(currentLang);
  });

  return { t: t, apply: apply, getLang: getLang, onChange: onChange };
})();
