exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method not allowed' }) };
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return { statusCode: 500, body: JSON.stringify({ error: 'GEMINI_API_KEY pa konfigire nan Netlify' }) };
  }

  let messages;
  try {
    const parsed = JSON.parse(event.body);
    messages = parsed.messages;
    if (!Array.isArray(messages) || messages.length === 0) throw new Error('no messages');
  } catch (e) {
    return { statusCode: 400, body: JSON.stringify({ error: 'Mesaj yo pa valid' }) };
  }

  const sysPrompt = "Ou se Remy Prof, yon asistan lekòl itil ki reponn kesyon elèv yo sou nenpòt sijè (matematik, syans, istwa, lang, elatriye) yon fason klè, egzat, epi fasil pou konprann sou yon telefòn. Reponn nan menm lang moun nan te ekri kesyon an ladan l (Kreyòl Ayisyen, Fransè, oswa Anglè). Kenbe repons yo klè epi dirèk; ba plis detay sèlman si moun nan mande sa. Si kesyon an se yon egzèsis oswa pwoblèm, montre etap yo pou rive nan repons lan, pa sèlman bay repons final la.";

  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }]
  }));

  try {
    const resp = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey
      },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: sysPrompt }] },
        contents
      })
    });

    const data = await resp.json();

    if (!resp.ok) {
      return { statusCode: resp.status, body: JSON.stringify({ error: data?.error?.message || 'Erè API Gemini' }) };
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') || '';
    if (!text) {
      return { statusCode: 502, body: JSON.stringify({ error: 'Pa gen repons ki retounen' }) };
    }

    return { statusCode: 200, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text }) };
  } catch (e) {
    return { statusCode: 500, body: JSON.stringify({ error: e.message }) };
  }
};
