import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { PromptService } from './prompt.service';

@Injectable()
export class AiService {
  constructor(
    private readonly http: HttpService,
    private readonly prompt: PromptService,
  ) {}

  private getApiConfig() {
    const url = process.env.DEEPSEEK_URL;
    const key = process.env.DEEPSEEK_API_KEY;
    if (!url)
      throw new InternalServerErrorException('DEEPSEEK_URL não configurada');
    if (!key)
      throw new InternalServerErrorException(
        'DEEPSEEK_API_KEY não configurada',
      );
    return { url, key };
  }

  async generatePdfSummary(text: string): Promise<string> {
    const promptText = this.prompt.buildPdfSummaryPrompt(text);
    const { url, key } = this.getApiConfig();
    try {
      const res = await firstValueFrom(
        this.http.post(
          url,
          { prompt: promptText },
          {
            headers: { Authorization: `Bearer ${key}` },
          },
        ),
      );
      return res.data.text;
    } catch {
      throw new InternalServerErrorException('Falha ao gerar resumo via IA');
    }
  }

  async generateMindMap(text: string): Promise<any> {
    const promptText = this.prompt.buildMindMapPrompt(text);
    const { url, key } = this.getApiConfig();
    try {
      const res = await firstValueFrom(
        this.http.post(
          url,
          { prompt: promptText },
          {
            headers: { Authorization: `Bearer ${key}` },
          },
        ),
      );
      return JSON.parse(res.data.text); // espera JSON serializado
    } catch {
      throw new InternalServerErrorException(
        'Falha ao gerar mapa mental via IA',
      );
    }
  }

  async generateQuestions(text: string, count: number): Promise<any[]> {
    const promptText = this.prompt.buildQuestionsPrompt(text, count);
    const { url, key } = this.getApiConfig();
    try {
      const res = await firstValueFrom(
        this.http.post(
          url,
          { prompt: promptText },
          {
            headers: { Authorization: `Bearer ${key}` },
          },
        ),
      );
      return JSON.parse(res.data.text); // espera array JSON
    } catch {
      throw new InternalServerErrorException('Falha ao gerar questões via IA');
    }
  }
}
