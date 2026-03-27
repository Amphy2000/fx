async function testKey() {
  const apiKey = 'AIzaSyCIKHkVy6bwwh1KuUocLl0aIZ2ze_JMdgc';
  const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash:generateContent?key=${apiKey}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ contents: [{ role: 'user', parts: [{ text: 'hi' }] }] })
    });
    
    console.log('Status:', response.status);
    const data = await response.json();
    console.log('Data:', JSON.stringify(data, null, 2));
  } catch (e) {
    console.error('Fetch Error:', e.message);
  }
}

testKey();
