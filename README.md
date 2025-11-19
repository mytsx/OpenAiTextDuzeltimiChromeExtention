# AI Türkçe Metin Düzeltici - Chrome Extension

Web sayfalarındaki zengin metin düzenleyicilere (CKEditor, Summernote, TinyMCE, Quill) AI destekli Türkçe metin düzeltme butonu ekleyen Chrome Extension.

**Version:** 3.3.0

**IMPORTANT:** v3.1.0'dan itibaren extension **SADECE** rich text editörlerde (CKEditor, Summernote, TinyMCE, Quill) çalışır. Normal textarea/input alanlarında buton GÖRÜNMEZ.

## Özellikler

### Akıllı Buton Enjeksiyonu
- **CKEditor** (4.x ve 5.x) - Toolbar'a entegre
- **Summernote** - Toolbar'a entegre
- **TinyMCE** - Toolbar'a entegre
- **Quill** - Toolbar'a entegre
- Dinamik içerik desteği (MutationObserver)

### AI Düzeltme
- OpenAI GPT-4o ile güçlendirilmiş
- TDK (Türk Dil Kurumu) kurallarına uygun
- Resmi yazışma standartlarına uygun
- **Özelleştirilebilir Sistem Promptu** (v3.3.0) - Kendi düzeltme kurallarınızı tanımlayın
- Diff gösterimi ile değişiklikleri önizleme
- JSON response format ile tutarlı sonuçlar
- **Akıllı HTML Format Koruması:** Kelime sayısı değişmediğinde bold, italic, linkler korunur. Kelime ekleme/çıkarma durumunda kullanıcı uyarıyla plain text'e dönüştürülür.

## Kurulum

### 1. Chrome'a Yükleme

1. Chrome'da `chrome://extensions/` sayfasını açın
2. Sağ üstte "Developer mode" seçeneğini aktif edin
3. "Load unpacked" butonuna tıklayın
4. Bu klasörü seçin

### 2. Ayarları Yapılandırma

1. Extension ikonuna tıklayın
2. "⚙️ Ayarlar" butonuna tıklayın
3. **OpenAI API key'inizi girin** (sk-proj-... formatında) ve "API Key Kaydet" butonuna tıklayın
4. **(İsteğe Bağlı)** Sistem promptunu özelleştirin:
   - Varsayılan: TDK + Resmi yazışma kuralları
   - Özel: Kendi düzeltme kurallarınızı tanımlayabilirsiniz
   - "Promptu Kaydet" ile kaydedin veya "Varsayılanı Yükle" ile sıfırlayın
   - Boş bırakırsanız varsayılan kullanılır
5. "API Bağlantısını Test Et" ile bağlantıyı doğrulayın

## Kullanım

### Rich Text Editörler (CKEditor, Summernote, TinyMCE, Quill)
1. Editörün **toolbar**'ında "🤖 Düzelt" butonu otomatik olarak görünür
2. Metninizi yazın
3. Toolbar'daki "🤖 Düzelt" butonuna tıklayın
4. Değişiklikleri önizleyip kabul edin

## Desteklenen Platformlar

Rich text editör kullanan web siteleri:
- **WordPress** - CKEditor/TinyMCE toolbar
- **Drupal, Joomla** - CMS editör toolbar'ları
- **Notion** - Quill editör
- **Diğer CMS'ler** - CKEditor, Summernote, TinyMCE veya Quill kullanan tüm platformlar

## Proje Yapısı

```
.
├── manifest.json              # Extension yapılandırması (v3.3.0)
├── CLAUDE.md                  # Claude Code için geliştirici kılavuzu
├── icons/                     # Extension ikonları (16, 48, 128px)
├── content/
│   ├── content.js            # DOM manipulation, rich editor detection
│   └── content.css           # Buton ve modal stilleri
├── background/
│   ├── background.js         # Message handling, API orchestration
│   └── openai-provider.js    # OpenAI GPT-4o client
├── popup/
│   ├── popup.html/js/css     # Quick toggle UI
├── options/
│   ├── options.html/js/css   # Settings page: API key & custom prompt management
├── lib/
│   └── diff.min.js           # Text diffing (jsdiff)
└── prompts/
    └── turkish-official.txt  # TDK + resmi yazışma kuralları
```

## Teknik Detaylar

- **Manifest Version**: 3 (modern ve güvenli)
- **Model**: OpenAI GPT-4o (gpt-4o)
- **Temperature**: 0.3 (tutarlı sonuçlar için)
- **Response Format**: JSON object
- **Storage**:
  - API Key: `chrome.storage.local` (güvenlik)
  - Custom Prompt: `chrome.storage.local` (8KB sync limiti aşımı)
  - Enable/Disable: `chrome.storage.sync` (cihazlar arası senkronizasyon)
- **Permissions**: storage, activeTab
- **Host Permissions**: https://api.openai.com/*
- **Content Security Policy**: XSS korumalı

## Geliştirme

### Debug

- **Background script**: `chrome://extensions/` → Extension → "Inspect views: service worker"
- **Content script**: Web sayfasında F12 → Console tab
- **Popup**: Extension ikonuna sağ tık → "Inspect popup"

### Güncelleme

Değişiklik yaptıktan sonra:
1. `chrome://extensions/` → Extension → 🔄 Reload
2. Test sayfasını yenile (F5)

### Mimari

```
Content Script → chrome.runtime.sendMessage({ action: 'correctText', text })
                ↓
Background Script → OpenAI API (GPT-4o)
                ↓
OpenAI Response → { "corrected_text": "..." }
                ↓
Content Script → Diff modal göster
```

Detaylı bilgi için `CLAUDE.md` dosyasına bakın.

## Güvenlik

- **API key'ler** ve **özel promptlar** cihazınızda (`chrome.storage.local`) güvenle saklanır
- Chrome sync ile paylaşılmaz (gizlilik koruması)
- Manifest V3 güvenlik standartları
- Content Security Policy koruması
- XSS koruması (DOMParser kullanımı)
- Input sanitization

## Gizlilik Politikası

Uzantı minimal veri toplar ve gizliliğinizi korur:

- ✅ API key ve ayarlar sadece cihazınızda saklanır
- ✅ Düzeltilecek metin sadece OpenAI'a gönderilir (sizin kontrolünüzde)
- ❌ Hiçbir veri bizim sunucularımıza gönderilmez
- ❌ Analitik, tracking veya reklam yok

Detaylı bilgi için [PRIVACY.md](PRIVACY.md) dosyasına bakın.

## Lisans

Bu proje eğitim amaçlıdır.

## Katkıda Bulunma

1. Fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Commit edin (`git commit -m 'Add amazing feature'`)
4. Push edin (`git push origin feature/amazing-feature`)
5. Pull Request açın

## Sorun Giderme

### "Extension yüklenmiyor"
- ✅ Developer mode aktif mi kontrol edin
- ✅ Manifest.json dosyasının geçerli olduğundan emin olun
- ✅ Console'da hata mesajı var mı bakın

### "API hatası alıyorum"
- ✅ API key doğru girildi mi? (sk-proj-... formatında)
- ✅ OpenAI hesabınızda kredi var mı?
- ✅ Network bağlantınızı kontrol edin
- ✅ Background script console'u kontrol edin

### "Butonlar görünmüyor"
- ✅ Extension popup'tan aktif mi?
- ✅ Sayfayı yenileyin (F5)
- ✅ Rich text editörler için 1-2 saniye bekleyin (yüklenme süresi)
- ✅ Console'da hata olup olmadığını kontrol edin

### "Butonlar iki kez görünüyor"
- Bu sorun v2.0.0'da düzeltildi
- Extension'ı reload edin
- Rich text editörlerde sadece toolbar'da buton görünmeli

### "Diff modal açılmıyor"
- lib/diff.min.js yüklendi mi kontrol edin
- Console'da JavaScript hatası var mı bakın

## İletişim

- **GitHub:** https://github.com/mytsx/duzelt-ai
- **Issues:** https://github.com/mytsx/duzelt-ai/issues
- **Geliştirici:** Mehmet Yerli
