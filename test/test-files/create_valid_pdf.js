const fs = require('fs');
const path = require('path');

// Create a simple but valid PDF with correct structure
const createValidPDF = () => {
  const pdfContent = `%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
/Resources <<
/Font <<
/F1 5 0 R
>>
>>
>>
endobj

4 0 obj
<<
/Length 450
>>
stream
BT
/F1 12 Tf
50 750 Td
(MedSmart - Sistema de Estudos Medicos) Tj
0 -30 Td
(Documento de Teste para Cardiologia) Tj
0 -50 Td
(Conteudo Educacional:) Tj
0 -30 Td
(1. Anatomia e Fisiologia Cardiovascular) Tj
0 -20 Td
(2. Patologias Cardiacas Comuns) Tj
0 -20 Td
(3. Metodos Diagnosticos) Tj
0 -20 Td
(4. Tratamentos e Intervencoes) Tj
0 -20 Td
(5. Prevencao e Cuidados) Tj
0 -50 Td
(Este documento contem texto extraivel para testes.) Tj
0 -20 Td
(Sistema MedSmart - Educacao Medica Inteligente) Tj
0 -30 Td
(Teste de integracao completo do sistema.) Tj
ET
endstream
endobj

5 0 obj
<<
/Type /Font
/Subtype /Type1
/BaseFont /Helvetica
>>
endobj

xref
0 6
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000274 00000 n 
0000000776 00000 n 
trailer
<<
/Size 6
/Root 1 0 R
>>
startxref
873
%%EOF`;

  // Create sample.pdf
  fs.writeFileSync(path.join(__dirname, 'sample.pdf'), pdfContent);
  
  // Create integration-test.pdf
  fs.writeFileSync(path.join(__dirname, 'integration-test.pdf'), pdfContent);
  
  console.log('✅ Valid PDFs created: sample.pdf and integration-test.pdf');
};

createValidPDF();