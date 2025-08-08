import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { createHash } from 'crypto';

interface CacheEntry {
  key: string;
  data: any;
  expiresAt: Date;
  hitCount: number;
}

@Injectable()
export class AICacheService {
  private readonly logger = new Logger(AICacheService.name);
  private readonly memoryCache = new Map<string, CacheEntry>();
  private readonly MAX_MEMORY_CACHE_SIZE = 100;
  private readonly MEMORY_CACHE_TTL = 30 * 60 * 1000; // 30 minutos

  constructor(private prisma: PrismaService) {
    // Limpeza automática do cache em memória a cada 10 minutos
    setInterval(() => this.cleanupMemoryCache(), 10 * 60 * 1000);
  }

  /**
   * Gera chave de cache baseada no conteúdo
   */
  private generateCacheKey(type: 'analysis' | 'question', content: string): string {
    const hash = createHash('sha256').update(content).digest('hex').substring(0, 16);
    return `${type}:${hash}`;
  }

  /**
   * Busca no cache (memória primeiro, depois banco)
   */
  async get(type: 'analysis' | 'question', content: string): Promise<any | null> {
    const key = this.generateCacheKey(type, content);

    // 1. Verificar cache em memória primeiro (mais rápido)
    const memoryEntry = this.memoryCache.get(key);
    if (memoryEntry && memoryEntry.expiresAt > new Date()) {
      memoryEntry.hitCount++;
      this.logger.debug(`Cache hit (memory): ${key}`);
      return memoryEntry.data;
    }

    // 2. Verificar cache no banco (para persistência entre restarts)
    try {
      const dbEntry = await this.prisma.$queryRaw`
        SELECT data, expires_at, hit_count 
        FROM ai_cache 
        WHERE cache_key = ${key} 
        AND expires_at > NOW()
        LIMIT 1
      ` as any[];

      if (dbEntry.length > 0) {
        const entry = dbEntry[0];
        
        // Atualizar contador de hits
        await this.prisma.$executeRaw`
          UPDATE ai_cache 
          SET hit_count = hit_count + 1, last_accessed = NOW()
          WHERE cache_key = ${key}
        `;

        // Adicionar ao cache em memória para próximas consultas
        this.addToMemoryCache(key, entry.data, new Date(entry.expires_at));
        
        this.logger.debug(`Cache hit (database): ${key}`);
        return entry.data;
      }
    } catch (error) {
      this.logger.warn(`Erro ao buscar cache no banco: ${(error as Error).message}`);
    }

    return null;
  }

  /**
   * Armazena no cache (memória e banco)
   */
  async set(type: 'analysis' | 'question', content: string, data: any, ttlMinutes: number = 60): Promise<void> {
    const key = this.generateCacheKey(type, content);
    const expiresAt = new Date(Date.now() + ttlMinutes * 60 * 1000);

    // 1. Adicionar ao cache em memória
    this.addToMemoryCache(key, data, expiresAt);

    // 2. Persistir no banco para durabilidade
    try {
      await this.prisma.$executeRaw`
        INSERT INTO ai_cache (cache_key, cache_type, content_hash, data, expires_at, created_at, hit_count, last_accessed)
        VALUES (${key}, ${type}, ${this.generateCacheKey(type, content)}, ${JSON.stringify(data)}, ${expiresAt}, NOW(), 0, NOW())
        ON CONFLICT (cache_key) 
        DO UPDATE SET 
          data = EXCLUDED.data,
          expires_at = EXCLUDED.expires_at,
          updated_at = NOW()
      `;
      
      this.logger.debug(`Cache stored: ${key} (TTL: ${ttlMinutes}min)`);
    } catch (error) {
      this.logger.warn(`Erro ao salvar cache no banco: ${(error as Error).message}`);
    }
  }

  /**
   * Adiciona entrada ao cache em memória
   */
  private addToMemoryCache(key: string, data: any, expiresAt: Date): void {
    // Limpar cache se estiver muito grande
    if (this.memoryCache.size >= this.MAX_MEMORY_CACHE_SIZE) {
      this.evictLeastUsed();
    }

    this.memoryCache.set(key, {
      key,
      data,
      expiresAt,
      hitCount: 0,
    });
  }

  /**
   * Remove entradas menos usadas do cache em memória
   */
  private evictLeastUsed(): void {
    const entries = Array.from(this.memoryCache.entries());
    entries.sort((a, b) => a[1].hitCount - b[1].hitCount);
    
    // Remove 20% das entradas menos usadas
    const toRemove = Math.ceil(entries.length * 0.2);
    for (let i = 0; i < toRemove; i++) {
      this.memoryCache.delete(entries[i][0]);
    }
  }

  /**
   * Limpeza automática do cache em memória
   */
  private cleanupMemoryCache(): void {
    const now = new Date();
    let removed = 0;

    for (const [key, entry] of this.memoryCache.entries()) {
      if (entry.expiresAt <= now) {
        this.memoryCache.delete(key);
        removed++;
      }
    }

    if (removed > 0) {
      this.logger.debug(`Limpeza automática: ${removed} entradas removidas do cache`);
    }
  }

  /**
   * Estatísticas do cache para monitoramento
   */
  async getCacheStats(): Promise<any> {
    const memoryStats = {
      size: this.memoryCache.size,
      maxSize: this.MAX_MEMORY_CACHE_SIZE,
      utilization: (this.memoryCache.size / this.MAX_MEMORY_CACHE_SIZE) * 100,
    };

    try {
      const dbStats = await this.prisma.$queryRaw`
        SELECT 
          cache_type,
          COUNT(*) as total_entries,
          AVG(hit_count) as avg_hits,
          MAX(hit_count) as max_hits,
          COUNT(CASE WHEN expires_at > NOW() THEN 1 END) as active_entries
        FROM ai_cache 
        GROUP BY cache_type
      ` as any[];

      return {
        memory: memoryStats,
        database: dbStats,
        timestamp: new Date(),
      };
    } catch (error) {
      return {
        memory: memoryStats,
        database: { error: (error as Error).message },
        timestamp: new Date(),
      };
    }
  }

  /**
   * Limpeza manual do cache expirado
   */
  async cleanupExpiredCache(): Promise<number> {
    try {
      const result = await this.prisma.$executeRaw`
        DELETE FROM ai_cache WHERE expires_at <= NOW()
      `;
      
      this.logger.log(`Cache cleanup: ${result} entradas expiradas removidas`);
      return result as number;
    } catch (error) {
      this.logger.error(`Erro na limpeza do cache: ${(error as Error).message}`);
      return 0;
    }
  }
}