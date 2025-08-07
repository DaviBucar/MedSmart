import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import * as dotenv from 'dotenv';

// Configurar timeout global para testes
jest.setTimeout(120000);

// Carregar variáveis de ambiente de teste
const envTestPath = path.join(__dirname, '.env.test');
if (fs.existsSync(envTestPath)) {
  dotenv.config({ path: envTestPath });
  console.log('🔧 Variáveis de ambiente de teste carregadas');
} else {
  console.warn('⚠️ Arquivo .env.test não encontrado');
}

// Setup do ambiente de teste
async function setupTestEnvironment() {
  console.log('🔧 Configurando ambiente de teste...');

  // Criar diretório de uploads de teste
  const testUploadsDir = path.join(__dirname, '..', 'test-uploads');
  if (!fs.existsSync(testUploadsDir)) {
    fs.mkdirSync(testUploadsDir, { recursive: true });
    console.log('📁 Diretório de uploads de teste criado');
  }

  // Criar diretório de arquivos de teste
  const testFilesDir = path.join(__dirname, 'test-files');
  if (!fs.existsSync(testFilesDir)) {
    fs.mkdirSync(testFilesDir, { recursive: true });
    console.log('📁 Diretório de arquivos de teste criado');
  }

  // Executar migrações do Prisma para o banco de teste
  try {
    console.log('🗄️ Executando migrações do banco de teste...');
    execSync('npx prisma migrate deploy', { 
      stdio: 'inherit',
      env: { ...process.env },
      timeout: 60000 // 60 segundos para migrações
    });
    console.log('✅ Migrações executadas com sucesso');
  } catch (error) {
    console.error('❌ Erro ao executar migrações:', error);
  }

  console.log('✅ Ambiente de teste configurado com sucesso!');
}

// Cleanup do ambiente de teste
async function cleanupTestEnvironment() {
  console.log('🧹 Limpando ambiente de teste...');

  // Remover arquivos de upload de teste
  const testUploadsDir = path.join(__dirname, '..', 'test-uploads');
  if (fs.existsSync(testUploadsDir)) {
    fs.rmSync(testUploadsDir, { recursive: true, force: true });
    console.log('🗑️ Arquivos de upload de teste removidos');
  }

  console.log('✅ Limpeza concluída!');
}

// Configuração global para testes
beforeAll(async () => {
  await setupTestEnvironment();
}, 180000); // 3 minutos para setup

afterAll(async () => {
  await cleanupTestEnvironment();
}, 60000); // 1 minuto para cleanup

// Executar setup se chamado diretamente
if (require.main === module) {
  const command = process.argv[2];
  
  if (command === 'setup') {
    setupTestEnvironment();
  } else if (command === 'cleanup') {
    cleanupTestEnvironment();
  } else {
    console.log('Uso: ts-node test/setup.ts [setup|cleanup]');
  }
}

export { setupTestEnvironment, cleanupTestEnvironment };