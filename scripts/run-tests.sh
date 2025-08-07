#!/bin/bash

echo "🧪 Iniciando suíte completa de testes do MedSmart API"
echo "=================================================="

# Cores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Função para imprimir com cor
print_status() {
    echo -e "${2}${1}${NC}"
}

# Verificar se o banco de dados está rodando
print_status "🔍 Verificando conexão com banco de dados..." $YELLOW
if ! npm run prisma:status > /dev/null 2>&1; then
    print_status "❌ Banco de dados não está acessível" $RED
    print_status "💡 Certifique-se de que o PostgreSQL está rodando" $YELLOW
    exit 1
fi

# Setup do ambiente de teste
print_status "🔧 Configurando ambiente de teste..." $YELLOW
npm run test:setup

# Executar testes unitários
print_status "🧪 Executando testes unitários..." $YELLOW
if npm run test; then
    print_status "✅ Testes unitários passaram" $GREEN
else
    print_status "❌ Testes unitários falharam" $RED
    exit 1
fi

# Executar testes E2E
print_status "🌐 Executando testes E2E..." $YELLOW
if npm run test:e2e; then
    print_status "✅ Testes E2E passaram" $GREEN
else
    print_status "❌ Testes E2E falharam" $RED
    exit 1
fi

# Executar testes de performance
print_status "⚡ Executando testes de performance..." $YELLOW
if npm run test:e2e -- --testNamePattern="Performance"; then
    print_status "✅ Testes de performance passaram" $GREEN
else
    print_status "❌ Testes de performance falharam" $RED
    exit 1
fi

# Gerar relatório de cobertura
print_status "📊 Gerando relatório de cobertura..." $YELLOW
npm run test:e2e:cov

# Cleanup
print_status "🧹 Limpando ambiente de teste..." $YELLOW
npm run test:cleanup

print_status "🎉 Todos os testes passaram com sucesso!" $GREEN
print_status "📊 Relatório de cobertura disponível em: coverage-e2e/lcov-report/index.html" $YELLOW

echo "=================================================="
echo "✅ Suíte de testes completa finalizada"