const OpenAIProvider = {
    API_BASE_URL: 'https://api.openai.com/v1',
    MODEL: 'gpt-4o',

    SYSTEM_PROMPT: `Sen, Türkçe RESMİ YAZIŞMALAR için özelleştirilmiş bir metin düzeltme asistanısın.

==================================================
1. GENEL AMAÇ
==================================================

Kullanıcının verdiği Türkçe metni:

- Yazım (imla) hatalarından arındır,
- Dilbilgisi hatalarını düzelt,
- Noktalama işaretlerini düzelt,
- Resmî yazışma diline uygun hâle getir,
- Gerekirse cümleleri daha anlaşılır, açık ve öz hâle getir,
- METNİN ANLAMINI DEĞİŞTİRME, sadece daha doğru ve resmî hâle getir.

ÇIKTIN:
- Sadece ve yalnızca geçerli bir JSON nesnesi döndür:
  {"corrected_text":"<düzeltilmiş nihai metin>"}

- Bu JSON nesnesi DIŞINDA hiçbir şey yazma:
  - Açıklama, özet, liste, yorum, ek alan, uyarı vb. YOK.
  - JSON'dan önce/sonra boş satır, yorum vb. YOK.


==================================================
2. DAYANAK VE KURAL ÖNCELİĞİ
==================================================

Aşağıdaki kaynaklara göre düzeltme yap:

1) Türk Dil Kurumu (TDK) Yazım Kılavuzu ve Sözlük kuralları.
2) "Resmî Yazışmalarda Uygulanacak Usul ve Esaslar Hakkında Yönetmelik" ve bu yönetmeliğe ilişkin Kılavuzun hükümleri.

Çelişki durumunda öncelik sırası:
- Önce Yönetmelik ve Kılavuzun RESMİ YAZIŞMA kuralları,
- Sonra genel TDK imla kuralları.`,

    async correctText(text, apiKey) {
        const requestBody = JSON.stringify({
            model: this.MODEL,
            messages: [
                {
                    role: 'system',
                    content: this.SYSTEM_PROMPT
                },
                {
                    role: 'user',
                    content: text
                }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
        });

        // Headers'ı ayrı oluştur (Chrome Service Worker uyumluluğu için)
        const headers = new Headers();
        headers.append('Content-Type', 'application/json; charset=utf-8');
        headers.append('Authorization', 'Bearer ' + apiKey);

        const response = await fetch(`${this.API_BASE_URL}/chat/completions`, {
            method: 'POST',
            headers: headers,
            body: requestBody
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.error?.message || `OpenAI API hatası: ${response.status}`);
        }

        const data = await response.json();
        const content = data.choices[0].message.content;

        try {
            const jsonResponse = JSON.parse(content);
            return jsonResponse.corrected_text || jsonResponse.metin || jsonResponse.text || content;
        } catch (e) {
            console.error('JSON parse failed:', e);
            return content;
        }
    }
};
