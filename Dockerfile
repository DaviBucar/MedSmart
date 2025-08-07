FROM node:18 AS builder
WORKDIR /app

# Copiar package files
COPY package.json package-lock.json ./
RUN npm ci --only=production=false

# Copiar Prisma e gerar cliente
COPY prisma ./prisma
RUN npx prisma generate

# Copiar configurações de build
COPY tsconfig.json tsconfig.build.json nest-cli.json ./

# Copiar código fonte
COPY src/ ./src/

# Build da aplicação (limpo)
RUN rm -rf dist/ && npm run build

FROM node:18-alpine AS runner
WORKDIR /app

# Instalar dependências de produção
COPY package.json package-lock.json ./
RUN npm ci --omit=dev && npm cache clean --force

# Copiar apenas o necessário do builder
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/node_modules/.prisma/client ./node_modules/.prisma/client
COPY --from=builder /app/node_modules/@prisma/client ./node_modules/@prisma/client

# Configurações finais
ENV NODE_ENV=production
EXPOSE 3000

# Verificar se main.js existe antes de executar
RUN ls -la dist/ && test -f dist/main.js

CMD ["node", "dist/main.js"]
